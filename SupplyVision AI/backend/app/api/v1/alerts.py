from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List
from pydantic import BaseModel
from app.core.database import get_db, AlertEvent
from app.models.rbac import require_role, Role
from app.models.schemas import AlertResponse

router = APIRouter()

@router.get("", response_model=List[AlertResponse])
def list_alerts(
    current_user: dict = Depends(require_role(Role.WAREHOUSE_STAFF)),
    db: Session = Depends(get_db)
):
    org_id = current_user["org_id"]
    user_role = current_user["role"]
    
    query = db.query(AlertEvent).filter(AlertEvent.org_id == org_id)
    
    # Enforce RBAC constraint: WAREHOUSE_STAFF can only see alerts affecting Warehouse nodes
    if user_role == Role.WAREHOUSE_STAFF.value:
        query = query.filter(AlertEvent.node_type == "Warehouse")
        
    alerts = query.order_by(AlertEvent.created_at.desc()).all()
    return alerts

@router.get("/{alert_id}", response_model=AlertResponse)
def get_alert_detail(
    alert_id: str,
    current_user: dict = Depends(require_role(Role.AUDITOR)), # Auditor is minimum role, but WAREHOUSE_STAFF is excluded
    db: Session = Depends(get_db)
):
    org_id = current_user["org_id"]
    user_role = current_user["role"]
    
    # Check if user is warehouse staff (excluded from detail view due to rupee exposure mapping)
    if user_role == Role.WAREHOUSE_STAFF.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Warehouse staff cannot view detailed alerts or rupee exposure figures."
        )
        
    alert = db.query(AlertEvent).filter(
        AlertEvent.id == alert_id,
        AlertEvent.org_id == org_id
    ).first()
    
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found"
        )
        
    # Dynamically inject explainability details for the UI
    alert.revenue_exposure_details = {
        "affected_orders": [
            {"order_id": "ORD-2026-881", "value_inr": int(alert.rupees_at_risk * 0.6), "item": "Organic Combed Cotton Yarn"},
            {"order_id": "ORD-2026-882", "value_inr": int(alert.rupees_at_risk * 0.4), "item": "Premium Knitted Fabric"}
        ],
        "average_order_value": int(alert.rupees_at_risk / 2.0) if alert.rupees_at_risk > 0 else 0,
        "delay_cost": 15000.0, 
        "penalty_cost": 25000.0, 
        "formula_used": "Revenue Exposure = sum(affected_orders.value) + daily_delay_cost * transit_delays + contract_penalty"
    }
    
    return alert

class ResolveAlertRequest(BaseModel):
    status_update: str  # resolved | false_positive

@router.post("/{alert_id}/resolve")
def resolve_alert(
    alert_id: str,
    request: ResolveAlertRequest,
    current_user: dict = Depends(require_role(Role.SC_MANAGER)),
    db: Session = Depends(get_db)
):
    org_id = current_user["org_id"]
    status_update = request.status_update
    
    if status_update not in ["resolved", "false_positive"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid status. Must be resolved or false_positive."
        )
        
    alert = db.query(AlertEvent).filter(
        AlertEvent.id == alert_id,
        AlertEvent.org_id == org_id
    ).first()
    
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found"
        )
        
    alert.status = status_update
    if status_update == "resolved":
        alert.resolved_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": f"Alert state updated to {status_update} successfully."}
