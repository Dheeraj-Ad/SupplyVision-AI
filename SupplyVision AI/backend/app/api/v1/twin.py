from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from app.core.database import get_db, AlertEvent, RecoveryPlan, AuditLog, Organisation
from app.models.rbac import require_role, Role
from app.models.schemas import SimulationRequest, SimulationResponse
from app.services.graph import graph_service
from app.services.signals import signals_service
from app.services.recovery_engine import recovery_engine
from app.services.notifications.whatsapp import send_risk_alert_whatsapp, send_recovery_recommendation_whatsapp

router = APIRouter()


class NodePatchRequest(BaseModel):
    current_stock_units: Optional[int] = None
    daily_burn_rate: Optional[float] = None

@router.get("/graph")
def get_graph(
    current_user: dict = Depends(require_role(Role.AUDITOR))
):
    org_id = current_user["org_id"]
    return graph_service.get_graph_data(org_id)

@router.post("/simulate")
def run_simulation(
    request: SimulationRequest,
    inject: bool = False, # If true, writes the simulated alert to the DB as a live active alert
    current_user: dict = Depends(require_role(Role.SC_MANAGER)),
    db: Session = Depends(get_db)
):
    org_id = current_user["org_id"]
    
    # 1. Match the location/supplier name in the digital twin
    graph_data = graph_service.get_graph_data(org_id)
    nodes = graph_data.get("nodes", [])
    
    # Find matching node
    target_node = None
    for node in nodes:
        name = node.get("name") or node.get("code") or node.get("id")
        if name and (request.location_name.lower() in name.lower() or request.location_name.lower() in node.get("id").lower()):
            target_node = node
            break
            
    if not target_node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Supply chain node '{request.location_name}' not found. Please try 'Supplier S1' or 'Warehouse A'."
        )
        
    target_id = target_node.get("id")
    target_type = target_node.get("label", "Supplier")
    
    # 2. Run graph impact traversal
    affected_nodes, exposed_orders = graph_service.traverse_disruption_impact(
        org_id=org_id,
        target_node_id=target_id,
        severity=request.severity
    )
    
    # Calculate revenue exposure
    total_exposed_value = sum(o.get("value_inr", 0) for o in exposed_orders)

    # Gap 7: Build simulated signals first so the real risk engine can score them
    scenario_type = (
        "weather" if request.scenario in ("cyclone", "flood")
        else "port" if request.scenario == "port_strike"
        else "news"
    )
    simulated_signals = [
        {
            "type": scenario_type,
            "source": "Simulation Engine",
            "event": f"Simulated {request.scenario.replace('_', ' ').title()} Alert (Severity {request.severity}/5)",
            "intensity": request.severity,
            "distance_km": 100,
            "eta_hours": 24,
            "congestion_pct": request.severity * 18 if scenario_type == "port" else 0,
            "strike_active": scenario_type == "port" and request.severity >= 3,
            "recent_delays": float(request.severity) if scenario_type == "port" else 0.0,
        }
    ]

    # Score with the real risk engine (falls back to severity formula on any error)
    try:
        simulated_risk_score, _ = signals_service.compute_composite_risk(target_node, simulated_signals)
    except Exception:
        simulated_risk_score = min(100, int(request.severity * 20 + 15))

    # Estimate delay days: 2 days per severity level + half the connected route's transit time.
    # avg_transit_days lives on Route NODES, not on links — find connected Route nodes.
    delay_days: float = float(request.severity * 2)
    all_links = graph_data.get("links", [])
    connected_node_ids = {
        lnk["target"] for lnk in all_links if lnk.get("source") == target_id
    } | {
        lnk["source"] for lnk in all_links if lnk.get("target") == target_id
    }
    for node in nodes:
        if node.get("label") == "Route" and node.get("id") in connected_node_ids:
            transit = node.get("avg_transit_days") or 0
            if transit:
                delay_days += float(transit) / 2.0
                break
    delay_days = round(delay_days, 1)
    
    # 3. Generate recovery plans
    options = recovery_engine.generate_recovery_plan(
        org_id=org_id,
        alert_id="simulation",
        node_id=target_id,
        node_type=target_type,
        exposed_orders=exposed_orders,
        severity=request.severity
    )
    
    # 4. If inject = True, write this alert and recovery plan to the DB
    injected_alert_id = None
    if inject:
        # Create alert event
        new_alert = AlertEvent(
            org_id=org_id,
            node_id=target_id,
            node_type=target_type,
            risk_score=simulated_risk_score,
            rupees_at_risk=total_exposed_value,
            signals_json=simulated_signals,
            status="open"
        )
        db.add(new_alert)
        db.commit()
        db.refresh(new_alert)
        
        # Save recovery options
        new_plan = RecoveryPlan(
            alert_id=new_alert.id,
            org_id=org_id,
            options_json=options
        )
        db.add(new_plan)
        db.commit()

        # Send WhatsApp alerts to the organisation
        org = db.query(Organisation).filter(Organisation.id == org_id).first()
        if org and org.whatsapp_numbers:
            recipient = org.whatsapp_numbers[0]
            send_risk_alert_whatsapp(
                to_number=recipient,
                node_name=target_node.get("name") or target_id,
                risk_score=simulated_risk_score,
                severity=request.severity,
                rupees_at_risk=total_exposed_value
            )
            if options:
                best_opt = options[0]
                send_recovery_recommendation_whatsapp(
                    to_number=recipient,
                    node_name=target_node.get("name") or target_id,
                    alternative_supplier=best_opt.get("title", "Alternate Supplier"),
                    expected_savings=best_opt.get("expected_savings_inr", 0),
                    lead_time_days=best_opt.get("lead_time_days", 3)
                )
        
        # Log to audit log
        audit_entry = AuditLog(
            org_id=org_id,
            user_id=current_user["sub"],
            action="injected_simulated_event",
            resource_type="alert",
            resource_id=str(new_alert.id),
            meta_json={"scenario": request.scenario, "node": target_id, "score": simulated_risk_score}
        )
        db.add(audit_entry)
        db.commit()

        injected_alert_id = str(new_alert.id)

        # Propagate the updated risk score back to the graph node
        graph_service.update_risk_score(org_id, target_id, simulated_risk_score)

    return {
        "scenario": request.scenario,
        "location_name": request.location_name,
        "severity": request.severity,
        "affected_nodes": affected_nodes,
        "exposed_orders": exposed_orders,
        "total_exposed_value_inr": total_exposed_value,
        "simulated_risk_score": simulated_risk_score,
        "delay_days": delay_days,
        "recovery_options": options,
        "injected": inject,
        "injected_alert_id": injected_alert_id
    }


@router.get("/node/{node_id}/explain")
def explain_node_risk(
    node_id: str,
    current_user: dict = Depends(require_role(Role.AUDITOR)),
):
    """Return an AI-generated plain-language explanation of why this node has its current risk score."""
    from app.services.ai_service import ai_service

    org_id = current_user["org_id"]
    graph_data = graph_service.get_graph_data(org_id)
    nodes = graph_data.get("nodes", [])

    node = next((n for n in nodes if n.get("id") == node_id), None)
    if not node:
        return {"explanation": "Node not found in the digital twin.", "ai_powered": False}

    score = node.get("current_risk_score", 0)
    label = node.get("label", "Node")
    name = node.get("name") or node.get("code") or node_id
    city = node.get("city", "")

    # Build a rich context prompt
    lead_time = node.get("lead_time_days", "")
    single_src = node.get("is_single_source", False)
    stock = node.get("current_stock_units", "")
    burn = node.get("daily_burn_rate", "")
    revenue = node.get("revenue_exposure_inr", "")

    details = []
    if lead_time:
        details.append(f"Lead time: {lead_time} days")
    if single_src:
        details.append("Single source (no backup supplier)")
    if stock:
        details.append(f"Current stock: {stock} units")
    if burn:
        details.append(f"Daily burn rate: {burn} units/day")
    if revenue:
        details.append(f"Revenue exposure: ₹{int(revenue):,}")

    detail_str = "; ".join(details) if details else "Standard supply chain node"

    system_prompt = (
        "You are SupplyVision AI. Explain a supply chain node's risk score in 2-3 plain sentences "
        "that an Indian SME owner would understand. Be specific about what is driving the risk "
        "and what they should do about it. Use ₹ for rupees."
    )
    user_msg = (
        f"Node: {name} ({label}), located in {city or 'India'}\n"
        f"Current risk score: {score}/100\n"
        f"Details: {detail_str}\n\n"
        f"Explain why this node has a risk score of {score} and what action the owner should take."
    )

    try:
        explanation = ai_service.chat_completion(
            system=system_prompt,
            messages=[{"role": "user", "content": user_msg}],
        )
    except Exception:
        # Rule-based fallback
        if score >= 65:
            explanation = (
                f"{name} is in a CRITICAL state (score {score}/100). "
                f"{'As a single-source supplier with no backup, any disruption will directly halt production. ' if single_src else ''}"
                f"Activate your recovery plan immediately — switch to an alternate supplier or pre-order buffer stock."
            )
        elif score >= 30:
            explanation = (
                f"{name} shows elevated risk (score {score}/100). "
                f"{'Long lead times of ' + str(lead_time) + ' days are increasing your vulnerability. ' if lead_time else ''}"
                f"Review your buffer stock levels and consider pre-positioning inventory."
            )
        else:
            explanation = (
                f"{name} is operating within safe parameters (score {score}/100). "
                f"Continue monitoring weather signals and port congestion for early warning signs."
            )

    return {
        "node_id": node_id,
        "node_name": name,
        "risk_score": score,
        "explanation": explanation,
        "ai_powered": ai_service.available,
    }


@router.patch("/node/{node_id}")
def patch_node_properties(
    node_id: str,
    body: NodePatchRequest,
    current_user: dict = Depends(require_role(Role.WAREHOUSE_STAFF)),
):
    """Update writable node properties (stock levels, burn rate) and persist to the digital twin."""
    org_id = current_user["org_id"]
    updated = {}

    if body.current_stock_units is not None:
        graph_service.update_node_property(org_id, node_id, "current_stock_units", body.current_stock_units)
        updated["current_stock_units"] = body.current_stock_units

    if body.daily_burn_rate is not None:
        graph_service.update_node_property(org_id, node_id, "daily_burn_rate", body.daily_burn_rate)
        updated["daily_burn_rate"] = body.daily_burn_rate

    if not updated:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No updatable fields provided.")

    return {"node_id": node_id, "updated": updated, "message": "Node properties persisted to digital twin."}
