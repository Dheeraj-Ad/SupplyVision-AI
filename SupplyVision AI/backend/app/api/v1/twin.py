from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any, List
from app.core.database import get_db, AlertEvent, RecoveryPlan, AuditLog, Organisation
from app.models.rbac import require_role, Role
from app.models.schemas import SimulationRequest, SimulationResponse
from app.services.graph import graph_service
from app.services.signals import signals_service
from app.services.recovery_engine import recovery_engine
from app.services.notifications.whatsapp import send_risk_alert_whatsapp, send_recovery_recommendation_whatsapp

router = APIRouter()

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
    
    # Calculate mock risk score for simulation
    # High severity = high score
    simulated_risk_score = min(100, int(request.severity * 20 + 15))
    
    # Create simulated weather/news signals for attribution
    simulated_signals = [
        {
            "type": "weather" if request.scenario in ["cyclone", "flood"] else "port" if request.scenario == "port_strike" else "news",
            "source": "Simulation Engine",
            "event": f"Simulated {request.scenario.replace('_', ' ').title()} Alert (Severity {request.severity}/5)",
            "intensity": request.severity,
            "distance_km": 100,
            "eta_hours": 24
        }
    ]
    
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
        "recovery_options": options,
        "injected": inject,
        "injected_alert_id": injected_alert_id
    }
