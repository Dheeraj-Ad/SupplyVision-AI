import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db, AuditLog, Organisation
from app.models.rbac import require_role, Role
from app.models.schemas import SupplierCreate, SupplierResponse, RouteCreate
from app.services.graph import graph_service

router = APIRouter()

@router.get("", response_model=List[SupplierResponse])
def get_suppliers(
    current_user: dict = Depends(require_role(Role.WAREHOUSE_STAFF)),
    db: Session = Depends(get_db)
):
    # Enforce multi-tenant isolation
    org_id = current_user["org_id"]
    suppliers = graph_service.get_suppliers(org_id)
    return [SupplierResponse(**s) for s in suppliers]

@router.post("", response_model=SupplierResponse)
def add_supplier(
    request: SupplierCreate,
    current_user: dict = Depends(require_role(Role.SC_MANAGER)),
    db: Session = Depends(get_db)
):
    org_id = current_user["org_id"]

    # Gap 6: Enforce plan-based supplier tier limits
    org = db.query(Organisation).filter(Organisation.id == org_id).first()
    existing_suppliers = graph_service.get_suppliers(org_id)
    max_allowed = org.max_suppliers if org else 25
    if len(existing_suppliers) >= max_allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Supplier limit reached. Your current plan allows a maximum of "
                f"{max_allowed} suppliers. Please contact your administrator to upgrade."
            ),
        )

    # Generate unique node_id
    supplier_id = f"supplier_{uuid.uuid4().hex[:8]}"
    
    supplier_data = request.model_dump()
    graph_service.add_supplier(org_id, supplier_id, supplier_data)
    
    # Log action to audit log
    audit_entry = AuditLog(
        org_id=org_id,
        user_id=current_user["sub"],
        action="added_supplier",
        resource_type="Supplier",
        resource_id=supplier_id,
        meta_json={"name": request.name, "city": request.city}
    )
    db.add(audit_entry)
    db.commit()
    
    # Fetch record to verify
    suppliers = graph_service.get_suppliers(org_id)
    supplier_node = next((s for s in suppliers if s["node_id"] == supplier_id), None)
    
    if not supplier_node:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve newly created supplier node."
        )
        
    return SupplierResponse(**supplier_node)

@router.delete("/{supplier_id}")
def delete_supplier(
    supplier_id: str,
    current_user: dict = Depends(require_role(Role.SME_OWNER)),
    db: Session = Depends(get_db)
):
    org_id = current_user["org_id"]
    
    # Check if supplier exists
    suppliers = graph_service.get_suppliers(org_id)
    supplier_node = next((s for s in suppliers if s["node_id"] == supplier_id), None)
    if not supplier_node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found"
        )
        
    graph_service.delete_supplier(org_id, supplier_id)
    
    # Log audit entry
    audit_entry = AuditLog(
        org_id=org_id,
        user_id=current_user["sub"],
        action="deleted_supplier",
        resource_type="Supplier",
        resource_id=supplier_id,
        meta_json={"name": supplier_node.get("name")}
    )
    db.add(audit_entry)
    db.commit()
    
    return {"message": f"Supplier {supplier_id} deleted successfully."}

@router.post("/routes")
def add_route(
    request: RouteCreate,
    current_user: dict = Depends(require_role(Role.SC_MANAGER)),
    db: Session = Depends(get_db)
):
    org_id = current_user["org_id"]
    route_id = f"route_{uuid.uuid4().hex[:8]}"
    
    graph_service.add_route(
        org_id=org_id,
        route_id=route_id,
        mode=request.mode,
        origin_id=request.origin_id,
        destination_id=request.destination_id,
        avg_transit_days=request.avg_transit_days,
        cost_per_unit=request.cost_per_unit
    )
    
    # Log to audit log
    audit_entry = AuditLog(
        org_id=org_id,
        user_id=current_user["sub"],
        action="added_route",
        resource_type="Route",
        resource_id=route_id,
        meta_json={"mode": request.mode, "origin": request.origin_id, "dest": request.destination_id}
    )
    db.add(audit_entry)
    db.commit()
    
    return {"route_id": route_id, "message": "Route registered successfully."}
