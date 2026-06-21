from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db, AuditLog, User
from app.models.rbac import require_role, Role
from app.models.schemas import AuditLogResponse

router = APIRouter()

@router.get("", response_model=List[AuditLogResponse])
def get_audit_logs(
    current_user: dict = Depends(require_role(Role.AUDITOR)), # Auditor is minimum role, WAREHOUSE_STAFF and SC_MANAGER are blocked
    db: Session = Depends(get_db)
):
    org_id = current_user["org_id"]
    user_role = current_user["role"]
    
    # Block SC_MANAGER (since require_role(Role.AUDITOR) passes AUDITOR and above.
    # Wait, the ROLE_HIERARCHY index:
    # 0: WAREHOUSE_STAFF
    # 1: AUDITOR
    # 2: SC_MANAGER
    # 3: SME_OWNER
    # 4: SUPER_ADMIN
    # Under standard hierarchy checks, SC_MANAGER would pass require_role(Role.AUDITOR) because 2 >= 1.
    # However, according to the DESIGN permission matrix:
    # "View audit log: Super Admin ✅ | SME Owner ✅ | SC Manager ❌ | Warehouse Staff ❌ | Auditor 📖"
    # This means SC_MANAGER and WAREHOUSE_STAFF must be explicitly blocked from viewing audit logs!
    # Let's write an explicit guard to block SC_MANAGER and WAREHOUSE_STAFF.
    
    if user_role in [Role.SC_MANAGER.value, Role.WAREHOUSE_STAFF.value]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Supply chain managers and warehouse staff cannot view security audit logs."
        )
        
    # Query logs
    query = db.query(AuditLog, User.full_name.label("user_name")).outerjoin(User, AuditLog.user_id == User.id)
    
    # Non-super_admin users can only see their own organisation's logs
    if user_role != Role.SUPER_ADMIN.value:
        query = query.filter(AuditLog.org_id == org_id)
        
    results = query.order_by(AuditLog.created_at.desc()).all()
    
    logs = []
    for log, user_name in results:
        # RBAC spec: Auditor can only see alert and recovery plan audit entries
        if user_role == Role.AUDITOR.value:
            auditor_allowed_actions = [
                "accepted_recovery_plan", "injected_simulated_event",
                "alert_marked_false_positive", "alert_marked_resolved"
            ]
            if log.action not in auditor_allowed_actions:
                continue
        logs.append(AuditLogResponse(
            id=log.id,
            org_id=log.org_id,
            user_id=log.user_id,
            user_name=user_name or "System / External API",
            action=log.action,
            resource_type=log.resource_type,
            resource_id=log.resource_id,
            meta_json=log.meta_json,
            created_at=log.created_at
        ))
        
    return logs
