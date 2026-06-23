from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from datetime import datetime, timezone, timedelta
from app.core.database import get_db, SignalEvent
from app.models.rbac import require_role, Role
from app.services.graph import graph_service
from app.services.signals import signals_service
from app.services.ai_service import ai_service

router = APIRouter()


def _fetch_live_signals(db: Session, node: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Query SignalEvent rows from the last 48 hours and convert them into the
    typed signal dicts that SignalsService.compute_composite_risk() expects.

    Signals are considered relevant to a node when:
      - Weather / GDACS: always included (regional events affect all nodes)
      - Port signals: always included (port congestion affects all supply chains)
      - News / commodity: always included (market-wide signals)

    If no signals exist in the DB yet (first run before ingestion completes),
    returns an empty list — the composite score will be 0 and the explanation
    will reflect the absence of data.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(hours=48)
    rows = (
        db.query(SignalEvent)
        .filter(SignalEvent.timestamp >= cutoff)
        .order_by(SignalEvent.timestamp.desc())
        .limit(30)
        .all()
    )

    live: List[Dict[str, Any]] = []
    for sig in rows:
        rd = sig.raw_data or {}
        src = sig.source

        if src in ("OpenWeather", "IMD", "GDACS"):
            sig_type = "weather"
        elif "port" in src.lower() or "ipa" in src.lower() or "jnpa" in src.lower():
            sig_type = "port"
        else:
            sig_type = "news"

        live.append({
            "id": sig.id,
            "type": sig_type,
            "source": src,
            "event": rd.get("event") or rd.get("title") or rd.get("port_name") or sig.location,
            "location": sig.location,
            "severity": sig.severity,
            # weather-specific
            "intensity": rd.get("severity", sig.severity),
            "distance_km": rd.get("distance_km", 200),
            "eta_hours": rd.get("eta_hours", 24),
            # port-specific
            "congestion_pct": rd.get("yard_utilization_pct", 0),
            "strike_active": rd.get("strike_active", False),
            "recent_delays": rd.get("avg_turnaround_days", 0),
            "timestamp": sig.timestamp.isoformat(),
        })

    return live


@router.get("/scores")
def get_risk_scores(
    current_user: dict = Depends(require_role(Role.WAREHOUSE_STAFF)),
    db: Session = Depends(get_db),
):
    org_id = current_user["org_id"]
    user_role = current_user["role"]

    graph_data = graph_service.get_graph_data(org_id)
    nodes = graph_data.get("nodes", [])

    scores = []
    for node in nodes:
        node_type = node.get("label")

        if user_role == Role.WAREHOUSE_STAFF.value and node_type != "Warehouse":
            continue

        scores.append({
            "node_id": node.get("id"),
            "node_type": node_type,
            "name": node.get("name") or node.get("code") or node.get("order_id"),
            "risk_score": node.get("current_risk_score", 0),
            "city": node.get("city", "N/A"),
            "state": node.get("state", "N/A"),
        })

    return scores


@router.get("/scores/{node_id}")
def get_node_risk_details(
    node_id: str,
    current_user: dict = Depends(require_role(Role.WAREHOUSE_STAFF)),
    db: Session = Depends(get_db),
):
    org_id = current_user["org_id"]
    user_role = current_user["role"]

    graph_data = graph_service.get_graph_data(org_id)
    nodes = graph_data.get("nodes", [])
    node = next((n for n in nodes if n["id"] == node_id), None)

    if not node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Node not found in Digital Twin",
        )

    node_type = node.get("label")

    if user_role == Role.WAREHOUSE_STAFF.value and node_type != "Warehouse":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Warehouse staff can only view warehouse node details.",
        )

    # ── Gap 3 fix: pull live signals from DB instead of hardcoded mocks ──────
    live_signals = _fetch_live_signals(db, node)

    # Compute score using real signals (empty list → all sub-scores 0 except inventory)
    score, breakdown = signals_service.compute_composite_risk(node, live_signals)

    # ── Gap 1 fix: AI-generated explanation ──────────────────────────────────
    node_name = node.get("name") or node.get("code") or node_id
    stored_score = node.get("current_risk_score", score)

    explanation = ai_service.explain_risk(
        node_name=node_name,
        risk_score=stored_score,
        breakdown=breakdown,
        signals=live_signals,
    )

    unique_sources = list({s["source"] for s in live_signals})

    return {
        "node_id": node_id,
        "node_type": node_type,
        "name": node_name,
        "risk_score": stored_score,
        "breakdown": breakdown,
        "signals": live_signals,
        "signals_count": len(live_signals),
        "explanation": explanation,
        "ai_powered": ai_service.available,
        "confidence": 95 if live_signals else 40,
        "data_freshness_hours": 48,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "sources": unique_sources,
    }
