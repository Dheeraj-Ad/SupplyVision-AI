from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from pydantic import BaseModel

from app.core.database import get_db, AlertEvent, RecoveryPlan, AuditLog
from app.models.rbac import require_role, Role
from app.services.graph import graph_service

router = APIRouter()

class HealthScoreBreakdown(BaseModel):
    unresolved_alerts_deduction: int
    single_source_deduction: int
    active_risk_deduction: int

class SavingsEvent(BaseModel):
    date: str
    savings: int
    cost: int
    title: str

class ROIDashboardResponse(BaseModel):
    total_at_risk: int
    total_protected: int
    expected_savings: int
    total_recovery_costs: int
    roi_multiple: float
    business_health_score: int
    active_alerts_count: int
    resolved_alerts_count: int
    single_source_risk_count: int
    health_score_breakdown: HealthScoreBreakdown
    savings_history: List[SavingsEvent]

@router.get("", response_model=ROIDashboardResponse)
def get_roi_dashboard_data(
    current_user: dict = Depends(require_role(Role.WAREHOUSE_STAFF)),
    db: Session = Depends(get_db)
):
    """
    Retrieve aggregated ROI and Business Health metrics for the logged-in user's organization.
    """
    org_id = current_user.get("org_id")
    if not org_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with any organisation."
        )

    # 1. Total Revenue at Risk (Active alerts)
    active_alerts = db.query(AlertEvent).filter(
        AlertEvent.org_id == org_id,
        AlertEvent.status.in_(["open", "in_progress"])
    ).all()
    total_at_risk = sum(a.rupees_at_risk for a in active_alerts)

    # 2. Resolved alerts count
    resolved_alerts_count = db.query(AlertEvent).filter(
        AlertEvent.org_id == org_id,
        AlertEvent.status.in_(["resolved"])
    ).count()

    # 3. Process Accepted Recovery Plans
    accepted_plans = db.query(RecoveryPlan).filter(
        RecoveryPlan.org_id == org_id,
        RecoveryPlan.accepted_option_idx.isnot(None)
    ).all()

    total_protected = 0
    expected_savings = 0
    total_recovery_costs = 0
    savings_history = []

    for plan in accepted_plans:
        # Fetch rupees at risk from corresponding alert if available
        alert = db.query(AlertEvent).filter(AlertEvent.id == plan.alert_id).first()
        alert_val = alert.rupees_at_risk if alert else 0
        total_protected += alert_val

        # Extract values from options json
        try:
            options = plan.options_json
            idx = plan.accepted_option_idx
            if options and 0 <= idx < len(options):
                opt = options[idx]
                cost = opt.get("recovery_cost_inr", 0)
                savs = opt.get("expected_savings_inr", 0)
                title = opt.get("title", "Recovery Action")
                
                total_recovery_costs += cost
                expected_savings += savs
                
                date_str = plan.accepted_at.strftime("%Y-%m-%d") if plan.accepted_at else plan.created_at.strftime("%Y-%m-%d")
                savings_history.append(SavingsEvent(
                    date=date_str,
                    savings=savs,
                    cost=cost,
                    title=title
                ))
        except Exception:
            pass

    # Sort history chronologically
    savings_history.sort(key=lambda x: x.date)

    # Calculate ROI Multiple: Savings / Recovery Cost
    roi_multiple = float(expected_savings) / float(total_recovery_costs) if total_recovery_costs > 0 else 0.0
    roi_multiple = round(roi_multiple, 2)

    # 4. Graph Redundancy & Single Source Analysis
    single_source_risk_count = 0
    try:
        graph_data = graph_service.get_graph_data(org_id)
        nodes = graph_data.get("nodes", [])
        links = graph_data.get("links", [])
        
        suppliers = [n for n in nodes if n.get("label") == "Supplier"]
        has_alternate_sources = set()
        for l in links:
            if l.get("type") == "HAS_ALTERNATE":
                has_alternate_sources.add(l.get("source"))

        for s in suppliers:
            # Check is_single_source
            if s.get("is_single_source") and s.get("id") not in has_alternate_sources:
                single_source_risk_count += 1
    except Exception:
        pass

    # 5. Compute Business Health Score (0-100)
    # Deductions:
    # - 5 points per unresolved active alert
    # - 8 points per single-source supplier with no alternate redundancy
    # - 0.3 * average risk score of active alerts
    unresolved_alerts_deduction = len(active_alerts) * 5
    single_source_deduction = single_source_risk_count * 8
    
    active_risk_deduction = 0
    if active_alerts:
        avg_risk = sum(a.risk_score for a in active_alerts) / len(active_alerts)
        active_risk_deduction = int(avg_risk * 0.3)

    total_deductions = unresolved_alerts_deduction + single_source_deduction + active_risk_deduction
    business_health_score = max(10, min(100, int(100 - total_deductions)))

    return ROIDashboardResponse(
        total_at_risk=total_at_risk,
        total_protected=total_protected,
        expected_savings=expected_savings,
        total_recovery_costs=total_recovery_costs,
        roi_multiple=roi_multiple,
        business_health_score=business_health_score,
        active_alerts_count=len(active_alerts),
        resolved_alerts_count=resolved_alerts_count,
        single_source_risk_count=single_source_risk_count,
        health_score_breakdown=HealthScoreBreakdown(
            unresolved_alerts_deduction=unresolved_alerts_deduction,
            single_source_deduction=single_source_deduction,
            active_risk_deduction=active_risk_deduction
        ),
        savings_history=savings_history
    )
