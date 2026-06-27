"""
Dashboard intelligence endpoints.

GET /dashboard/briefing  — AI-generated daily summary of org supply chain health
GET /dashboard/chart     — Last-7-day daily average risk score for the trend chart
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta

from app.core.database import get_db, AlertEvent, Organisation
from app.models.rbac import require_role, Role
from app.services.graph import graph_service
from app.services.ai_service import ai_service

router = APIRouter()


@router.get("/briefing")
def get_daily_briefing(
    current_user: dict = Depends(require_role(Role.WAREHOUSE_STAFF)),
    db: Session = Depends(get_db),
):
    """Return an AI-generated 2-3 sentence briefing about today's supply chain health."""
    org_id = current_user.get("org_id", "")

    # Gather live context
    open_alerts = (
        db.query(AlertEvent)
        .filter(AlertEvent.org_id == org_id, AlertEvent.status == "open")
        .order_by(AlertEvent.created_at.desc())
        .limit(5)
        .all()
    )
    total_open = len(open_alerts)

    try:
        graph_data = graph_service.get_graph_data(org_id)
        nodes = graph_data.get("nodes", [])
        supplier_nodes = [n for n in nodes if n.get("label") == "Supplier"]
        high_risk_nodes = [n for n in nodes if (n.get("current_risk_score") or 0) >= 60]
    except Exception:
        supplier_nodes = []
        high_risk_nodes = []

    # Top alert info
    top_alert_context = ""
    if open_alerts:
        a = open_alerts[0]
        top_alert_context = (
            f"The most critical node is '{a.node_id}' with a risk score of {a.risk_score} "
            f"and ₹{a.rupees_at_risk:,} at risk."
        )

    system_prompt = (
        "You are SupplyVision AI, a supply chain risk intelligence assistant for Indian SMEs. "
        "Generate a concise, professional 2-3 sentence daily briefing for the executive dashboard. "
        "Tone: direct, data-driven, actionable. Use ₹ for rupees. Mention specific numbers."
    )

    user_message = (
        f"Today's supply chain briefing request:\n"
        f"- Total open disruption alerts: {total_open}\n"
        f"- Suppliers monitored: {len(supplier_nodes)}\n"
        f"- High-risk nodes (score ≥60): {len(high_risk_nodes)}\n"
        f"- {top_alert_context}\n\n"
        f"Write 2-3 sentences summarising the current supply chain health, "
        f"the most urgent action needed, and a brief forward-looking note."
    )

    try:
        briefing = ai_service.chat_completion(
            system=system_prompt,
            messages=[{"role": "user", "content": user_message}],
        )
    except Exception:
        # Fallback rule-based briefing
        if total_open == 0:
            briefing = (
                f"Your supply chain is operating within normal parameters — "
                f"{len(supplier_nodes)} supplier(s) are being monitored with no active disruptions detected. "
                "Continue to watch lead time fluctuations and port congestion signals daily."
            )
        else:
            briefing = (
                f"⚠️ {total_open} active disruption alert(s) detected across your supply chain. "
                f"{len(high_risk_nodes)} node(s) are scoring above the critical threshold of 60. "
                "Review the Alert Center immediately and activate the top-ranked recovery plan."
            )

    return {
        "briefing": briefing,
        "ai_powered": ai_service.available,
        "open_alerts": total_open,
        "high_risk_count": len(high_risk_nodes),
        "supplier_count": len(supplier_nodes),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/chart")
def get_risk_chart(
    days: int = 7,
    current_user: dict = Depends(require_role(Role.WAREHOUSE_STAFF)),
    db: Session = Depends(get_db),
):
    """Return daily average risk scores for the last N days (default 7)."""
    org_id = current_user.get("org_id", "")
    days = min(max(days, 1), 30)

    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    alerts = (
        db.query(AlertEvent)
        .filter(AlertEvent.org_id == org_id, AlertEvent.created_at >= cutoff)
        .order_by(AlertEvent.created_at.asc())
        .all()
    )

    # Bucket into daily averages
    daily: dict = {}
    for a in alerts:
        day_key = a.created_at.strftime("%d/%m") if a.created_at else "?"
        if day_key not in daily:
            daily[day_key] = []
        daily[day_key].append(a.risk_score or 0)

    # Build ordered chart data (last N days)
    chart_data = []
    for i in range(days - 1, -1, -1):
        d = datetime.now(timezone.utc) - timedelta(days=i)
        key = d.strftime("%d/%m")
        scores = daily.get(key, [])
        avg_score = int(sum(scores) / len(scores)) if scores else None
        chart_data.append({"name": key, "score": avg_score, "count": len(scores)})

    # Fill gaps with interpolated baseline from graph node scores
    try:
        graph_data = graph_service.get_graph_data(org_id)
        nodes = graph_data.get("nodes", [])
        baseline = (
            int(sum(n.get("current_risk_score", 0) for n in nodes) / len(nodes))
            if nodes else 20
        )
    except Exception:
        baseline = 20

    for point in chart_data:
        if point["score"] is None:
            point["score"] = baseline

    return {"data": chart_data, "baseline": baseline}
