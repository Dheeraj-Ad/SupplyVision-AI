"""
SupplyVision AI — LangGraph Multi-Agent Pipeline
=================================================
Four discrete agents run in sequence every ingestion cycle:

  IntelligenceAgent  →  RiskAnalysisAgent  →  ImpactAgent  →  RecoveryAgent

If langgraph is not installed the module degrades gracefully: run_pipeline()
falls back to a plain sequential call that produces identical results.
"""

import logging
from typing import Dict, List, Any, TypedDict

logger = logging.getLogger("agent_pipeline")

# ── Shared pipeline state ─────────────────────────────────────────────────────

class PipelineState(TypedDict):
    org_id: str
    raw_signals: List[Dict[str, Any]]        # gathered by IntelligenceAgent
    risk_assessments: List[Dict[str, Any]]   # scored by RiskAnalysisAgent
    high_risk_nodes: List[Dict[str, Any]]    # nodes with score >= 60
    impact_map: Dict[str, Dict]              # node_id → {affected_nodes, exposed_orders}
    recovery_plans: List[Dict[str, Any]]     # generated RecoveryPlan records
    alerts_created: int
    log: List[str]


# ── Agent node functions ──────────────────────────────────────────────────────

def intelligence_agent(state: PipelineState) -> PipelineState:
    """
    Run all ingestion pipelines (weather, news, commodities, ports) and
    fetch the resulting SignalEvents from the database.
    """
    from app.core.database import SessionLocal, SignalEvent
    from app.services.ingestion.weather import ingest_all_weather
    from app.services.ingestion.news import ingest_all_news
    from app.services.ingestion.commodities import ingest_all_commodities
    from app.services.ingestion.ports import ingest_all_ports
    from datetime import datetime, timezone, timedelta

    db = SessionLocal()
    try:
        ingest_all_weather(db)
        ingest_all_news(db)
        ingest_all_commodities(db)
        ingest_all_ports(db)

        cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
        rows = (
            db.query(SignalEvent)
            .filter(SignalEvent.timestamp >= cutoff)
            .order_by(SignalEvent.timestamp.desc())
            .limit(100)
            .all()
        )

        raw = [
            {
                "id": s.id,
                "source": s.source,
                "severity": s.severity,
                "location": s.location,
                "confidence": s.confidence,
                "raw_data": s.raw_data or {},
                "timestamp": s.timestamp.isoformat(),
            }
            for s in rows
        ]

        msg = f"IntelligenceAgent: ingestion complete - {len(raw)} signal(s) in last 24h"
        logger.info(msg)
        return {**state, "raw_signals": raw, "log": state["log"] + [msg]}

    except Exception as exc:
        logger.error(f"IntelligenceAgent error: {exc}")
        return {**state, "log": state["log"] + [f"IntelligenceAgent ERROR: {exc}"]}
    finally:
        db.close()


def risk_analysis_agent(state: PipelineState) -> PipelineState:
    """
    Convert raw SignalEvents to typed signal dicts, then call
    SignalsService.compute_composite_risk for every node in the graph.
    Nodes scoring >= 60 are tagged as high-risk.
    """
    from app.services.graph import graph_service
    from app.services.signals import signals_service

    raw_signals = state["raw_signals"]

    # Map DB rows → format expected by SignalsService
    typed_signals: List[Dict[str, Any]] = []
    for sig in raw_signals:
        rd = sig["raw_data"]
        src = sig["source"]
        if src in ("OpenWeather", "IMD", "GDACS"):
            sig_type = "weather"
        elif "port" in src.lower() or "ipa" in src.lower() or "jnpa" in src.lower():
            sig_type = "port"
        else:
            sig_type = "news"

        typed_signals.append({
            "type": sig_type,
            "source": src,
            "event": rd.get("event") or rd.get("title") or sig["location"],
            "location": sig["location"],
            "severity": sig["severity"],
            # weather fields
            "intensity": rd.get("severity", sig["severity"]),
            "distance_km": rd.get("distance_km", 200),
            "eta_hours": rd.get("eta_hours", 24),
            # port fields
            "congestion_pct": rd.get("yard_utilization_pct", 0),
            "strike_active": rd.get("strike_active", False),
            "recent_delays": rd.get("avg_turnaround_days", 0),
        })

    try:
        graph_data = graph_service.get_graph_data(state["org_id"])
    except Exception as exc:
        logger.error(f"RiskAnalysisAgent: graph fetch failed: {exc}")
        return {**state, "log": state["log"] + [f"RiskAnalysisAgent ERROR: {exc}"]}

    nodes = graph_data.get("nodes", [])
    assessments: List[Dict[str, Any]] = []
    high_risk: List[Dict[str, Any]] = []

    for node in nodes:
        try:
            score, breakdown = signals_service.compute_composite_risk(node, typed_signals)
            graph_service.update_risk_score(state["org_id"], node["id"], score)

            assessment = {
                "node_id": node["id"],
                "node_type": node.get("label"),
                "name": node.get("name") or node.get("code") or node["id"],
                "risk_score": score,
                "breakdown": breakdown,
            }
            assessments.append(assessment)
            if score >= 60:
                high_risk.append(assessment)
        except Exception as exc:
            logger.warning(f"RiskAnalysisAgent: scoring failed for {node.get('id')}: {exc}")

    msg = f"RiskAnalysisAgent: {len(nodes)} node(s) scored - {len(high_risk)} high-risk (>=60)"
    logger.info(msg)
    return {
        **state,
        "risk_assessments": assessments,
        "high_risk_nodes": high_risk,
        "log": state["log"] + [msg],
    }


def impact_agent(state: PipelineState) -> PipelineState:
    """
    For each high-risk node, traverse the digital twin graph to find all
    downstream affected nodes and exposed active orders.
    """
    from app.services.graph import graph_service

    impact_map: Dict[str, Dict] = {}

    for node in state["high_risk_nodes"]:
        node_id = node["node_id"]
        severity = max(1, node["risk_score"] // 20)
        try:
            affected_nodes, exposed_orders = graph_service.traverse_disruption_impact(
                state["org_id"], node_id, severity
            )
            if affected_nodes or exposed_orders:
                impact_map[node_id] = {
                    "affected_nodes": affected_nodes,
                    "exposed_orders": list(exposed_orders),
                    "total_value_inr": sum(
                        o.get("value_inr", 0) for o in exposed_orders
                    ),
                }
        except Exception as exc:
            logger.warning(f"ImpactAgent: traversal failed for {node_id}: {exc}")

    msg = f"ImpactAgent: {len(impact_map)} node(s) with downstream exposure mapped"
    logger.info(msg)
    return {**state, "impact_map": impact_map, "log": state["log"] + [msg]}


def recovery_agent(state: PipelineState) -> PipelineState:
    """
    For each high-risk node that has exposed orders, create an AlertEvent
    and a RecoveryPlan in the database.  Uses AI service to enrich
    recovery option descriptions when a key is available.
    """
    from app.core.database import SessionLocal, AlertEvent, RecoveryPlan
    from app.services.recovery_engine import recovery_engine
    from app.services.ai_service import ai_service

    db = SessionLocal()
    alerts_created = 0
    plans: List[Dict[str, Any]] = []

    try:
        for node in state["high_risk_nodes"]:
            node_id = node["node_id"]
            impact = state["impact_map"].get(node_id)
            if not impact:
                continue

            exposed_orders = impact.get("exposed_orders", [])
            rupees_at_risk = impact.get("total_value_inr", 0)
            total_units = sum(o.get("units", 0) for o in exposed_orders)

            if rupees_at_risk == 0:
                continue

            # Create AlertEvent
            alert = AlertEvent(
                org_id=state["org_id"],
                node_id=node_id,
                node_type=node["node_type"] or "Supplier",
                risk_score=node["risk_score"],
                rupees_at_risk=int(rupees_at_risk),
                signals_json=state["raw_signals"][:10],
                status="open",
            )
            db.add(alert)
            db.flush()  # get alert.id

            # Generate recovery plan
            severity = max(1, node["risk_score"] // 20)
            options = recovery_engine.generate_recovery_plan(
                org_id=state["org_id"],
                alert_id=alert.id,
                node_id=node_id,
                node_type=node["node_type"] or "Supplier",
                exposed_orders=exposed_orders,
                severity=severity,
            )

            # Enrich option descriptions via AI if available
            if ai_service.available:
                for opt in options:
                    opt["description"] = ai_service.enhance_recovery_description(
                        option=opt,
                        node_name=node["name"],
                        rupees_at_risk=int(rupees_at_risk),
                        total_units=total_units,
                    )

            plan = RecoveryPlan(
                alert_id=alert.id,
                org_id=state["org_id"],
                options_json=options,
            )
            db.add(plan)
            alerts_created += 1
            plans.append({
                "alert_id": alert.id,
                "node_id": node_id,
                "node_name": node["name"],
                "risk_score": node["risk_score"],
                "rupees_at_risk": int(rupees_at_risk),
                "options_count": len(options),
            })

        db.commit()

    except Exception as exc:
        db.rollback()
        logger.error(f"RecoveryAgent: DB commit failed: {exc}")
        return {**state, "log": state["log"] + [f"RecoveryAgent ERROR: {exc}"]}
    finally:
        db.close()

    msg = f"RecoveryAgent: {alerts_created} alert(s) + recovery plan(s) committed"
    logger.info(msg)
    return {
        **state,
        "recovery_plans": plans,
        "alerts_created": alerts_created,
        "log": state["log"] + [msg],
    }


# ── Build the LangGraph pipeline (with graceful fallback) ─────────────────────

def _build_langgraph_pipeline():
    """Compile a LangGraph StateGraph. Returns None if langgraph not installed."""
    try:
        from langgraph.graph import StateGraph, END

        wf = StateGraph(PipelineState)
        wf.add_node("intelligence", intelligence_agent)
        wf.add_node("risk_analysis", risk_analysis_agent)
        wf.add_node("impact", impact_agent)
        wf.add_node("recovery", recovery_agent)

        wf.set_entry_point("intelligence")
        wf.add_edge("intelligence", "risk_analysis")
        wf.add_edge("risk_analysis", "impact")
        wf.add_edge("impact", "recovery")
        wf.add_edge("recovery", END)

        compiled = wf.compile()
        logger.info("LangGraph pipeline compiled successfully.")
        return compiled

    except ImportError:
        logger.warning(
            "langgraph not installed — pipeline will use sequential fallback. "
            "Run: pip install langgraph langchain-core"
        )
        return None


_pipeline = _build_langgraph_pipeline()


def _sequential_fallback(org_id: str) -> PipelineState:
    """Run agents sequentially when LangGraph is not available."""
    state: PipelineState = {
        "org_id": org_id,
        "raw_signals": [],
        "risk_assessments": [],
        "high_risk_nodes": [],
        "impact_map": {},
        "recovery_plans": [],
        "alerts_created": 0,
        "log": ["[sequential-fallback] LangGraph not available"],
    }
    state = intelligence_agent(state)
    state = risk_analysis_agent(state)
    state = impact_agent(state)
    state = recovery_agent(state)
    return state


def run_pipeline(org_id: str) -> PipelineState:
    """
    Entry point for the background task.
    Uses LangGraph when available, falls back to sequential execution.
    """
    initial: PipelineState = {
        "org_id": org_id,
        "raw_signals": [],
        "risk_assessments": [],
        "high_risk_nodes": [],
        "impact_map": {},
        "recovery_plans": [],
        "alerts_created": 0,
        "log": [],
    }

    if _pipeline is not None:
        try:
            return _pipeline.invoke(initial)
        except Exception as exc:
            logger.error(f"LangGraph pipeline invoke failed, switching to fallback: {exc}")

    return _sequential_fallback(org_id)
