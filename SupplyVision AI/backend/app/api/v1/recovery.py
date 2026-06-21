from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List
from app.core.database import get_db, RecoveryPlan, AlertEvent, AuditLog
from app.models.rbac import require_role, Role
from app.models.schemas import RecoveryPlanResponse, AcceptRecoveryRequest

router = APIRouter()

@router.get("/plans/{alert_id}", response_model=RecoveryPlanResponse)
def get_recovery_plan(
    alert_id: str,
    current_user: dict = Depends(require_role(Role.AUDITOR)), # Auditor is minimum role, WAREHOUSE_STAFF is excluded
    db: Session = Depends(get_db)
):
    org_id = current_user["org_id"]
    user_role = current_user["role"]
    
    # Block WAREHOUSE_STAFF (double check just in case, since require_role(Role.AUDITOR) passes WAREHOUSE_STAFF or blocks?
    # WAREHOUSE_STAFF is lower than AUDITOR in hierarchy, so require_role(Role.AUDITOR) automatically blocks WAREHOUSE_STAFF!
    # Yes, ROLE_HIERARCHY index: WAREHOUSE_STAFF is 0, AUDITOR is 1. WAREHOUSE_STAFF is blocked.
    
    plan = db.query(RecoveryPlan).filter(
        RecoveryPlan.alert_id == alert_id,
        RecoveryPlan.org_id == org_id
    ).first()
    
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recovery plan not found for this alert"
        )
        
    return plan

@router.post("/plans/{alert_id}/accept")
def accept_recovery_option(
    alert_id: str,
    request: AcceptRecoveryRequest,
    current_user: dict = Depends(require_role(Role.SC_MANAGER)), # SC_MANAGER or higher
    db: Session = Depends(get_db)
):
    org_id = current_user["org_id"]
    user_id = current_user["sub"]
    
    plan = db.query(RecoveryPlan).filter(
        RecoveryPlan.alert_id == alert_id,
        RecoveryPlan.org_id == org_id
    ).first()
    
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recovery plan not found"
        )
        
    options = plan.options_json
    if request.option_idx < 0 or request.option_idx >= len(options):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid option index. Must be between 0 and {len(options)-1}."
        )
        
    accepted_option = options[request.option_idx]
    
    # Update plan details
    plan.accepted_option_idx = request.option_idx
    plan.accepted_by = user_id
    plan.accepted_at = datetime.now(timezone.utc)
    
    # Update corresponding alert status to in_progress or resolved
    alert = db.query(AlertEvent).filter(AlertEvent.id == alert_id).first()
    if alert:
        alert.status = "in_progress"
        
    # Create audit log entry
    audit_entry = AuditLog(
        org_id=org_id,
        user_id=user_id,
        action="accepted_recovery_plan",
        resource_type="recovery_plan",
        resource_id=str(plan.id),
        meta_json={
            "alert_id": alert_id,
            "option_idx": request.option_idx,
            "option_title": accepted_option.get("title"),
            "expected_savings_inr": accepted_option.get("expected_savings_inr", 0),
            "confidence_percent": accepted_option.get("confidence_percent", 0),
            "implementation_time_hours": accepted_option.get("implementation_time_hours", 24)
        }
    )
    db.add(audit_entry)
    db.commit()
    
    return {
        "message": f"Successfully accepted option: {accepted_option.get('title')}",
        "accepted_option_idx": request.option_idx,
        "accepted_at": plan.accepted_at
    }
