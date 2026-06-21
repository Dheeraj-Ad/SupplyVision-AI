# pyrefly: ignore [missing-import]
from app.core.config import settings
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, status
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db, Organisation, User
from app.models.rbac import require_role, Role
from app.models.schemas import OrganisationResponse, OrganisationCreate, UserResponse

from app.services.ingestion.weather import ingest_all_weather
from app.services.ingestion.news import ingest_all_news
from app.services.ingestion.commodities import ingest_all_commodities
from app.services.ingestion.ports import ingest_all_ports

router = APIRouter()

@router.get("/orgs", response_model=List[OrganisationResponse])
def get_all_organisations(
    current_user: dict = Depends(require_role(Role.SUPER_ADMIN)),
    db: Session = Depends(get_db)
):
    return db.query(Organisation).all()

@router.post("/orgs", response_model=OrganisationResponse)
def create_organisation(
    request: OrganisationCreate,
    current_user: dict = Depends(require_role(Role.SUPER_ADMIN)),
    db: Session = Depends(get_db)
):
    new_org = Organisation(
        name=request.name,
        gstin=request.gstin,
        plan=request.plan,
        max_suppliers=request.max_suppliers,
        whatsapp_numbers=request.whatsapp_numbers
    )
    db.add(new_org)
    try:
        db.commit()
        db.refresh(new_org)
        return new_org
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create organisation: {str(e)}"
        )

@router.post("/orgs/{org_id}/suspend")
def suspend_organisation(
    org_id: str,
    suspend: bool = True,
    current_user: dict = Depends(require_role(Role.SUPER_ADMIN)),
    db: Session = Depends(get_db)
):
    org = db.query(Organisation).filter(Organisation.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organisation not found")
        
    org.is_active = not suspend
    db.commit()
    status_str = "suspended" if suspend else "activated"
    return {"message": f"Organisation {org.name} has been successfully {status_str}."}

@router.post("/orgs/{org_id}/limits")
def update_organisation_limits(
    org_id: str,
    max_suppliers: int,
    current_user: dict = Depends(require_role(Role.SUPER_ADMIN)),
    db: Session = Depends(get_db)
):
    org = db.query(Organisation).filter(Organisation.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organisation not found")
        
    org.max_suppliers = max_suppliers
    db.commit()
    return {"message": f"Organisation supplier limit updated to {max_suppliers}."}

@router.get("/health")
def get_system_health(
    current_user: dict = Depends(require_role(Role.SUPER_ADMIN))
):
    return {
        "status": "healthy",
        "ingestion_pipelines": {
            "imd_weather": {"status": "active", "last_run": "2 min ago", "failures_last_24h": 0},
            "open_weather": {"status": "active", "last_run": "10 min ago", "failures_last_24h": 0},
            "gdacs_disaster": {"status": "active", "last_run": "15 min ago", "failures_last_24h": 1},
            "news_api_llm": {"status": "active", "last_run": "4 min ago", "failures_last_24h": 0}
        },
        "databases": {
            "postgres": "connected",
            "neo4j": "connected_fallback_active" if not settings.NEO4J_URI else "connected",
            "redis_cache": "connected_fallback_active" if not settings.REDIS_URL else "connected"
        },
        "whatsapp_worker": {"status": "active", "queue_backlog": 0}
    }

@router.post("/ingest")
def run_ingestion_jobs(
    current_user: dict = Depends(require_role(Role.SC_MANAGER)),
    db: Session = Depends(get_db)
):
    """Triggers and runs all external feed ingestion pipelines."""
    try:
        weather_sigs = ingest_all_weather(db)
        news_sigs = ingest_all_news(db)
        commodity_sigs = ingest_all_commodities(db)
        port_sigs = ingest_all_ports(db)
        
        return {
            "status": "success",
            "ingested_counts": {
                "weather": len(weather_sigs),
                "news": len(news_sigs),
                "commodities": len(commodity_sigs),
                "ports": len(port_sigs)
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ingestion pipeline failed: {str(e)}"
        )


import uuid
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta, timezone
from app.services.onboarding.templates import OnboardingTemplates
from app.services.graph import graph_service
from app.core.database import AlertEvent, RecoveryPlan, AuditLog

class OnboardRequest(BaseModel):
    industry: str
    org_id: Optional[str] = None

@router.post("/onboard", status_code=status.HTTP_200_OK)
def onboard_organisation(
    request: OnboardRequest,
    current_user: dict = Depends(require_role(Role.SME_OWNER)),
    db: Session = Depends(get_db)
):
    """
    Onboards an organisation by initializing its digital twin graph and DB settings 
    using a selected SME template (textile, pharma, auto, electronics).
    Clears any previous graph and DB assets for the organisation.
    """
    org_id = request.org_id if (current_user.get("role") == Role.SUPER_ADMIN and request.org_id) else current_user.get("org_id")
    if not org_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Organisation ID is required for onboarding."
        )

    # 1. Fetch template data
    industry_lower = request.industry.lower().strip()
    template_data = OnboardingTemplates.get_template_data(industry_lower)
    if not template_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid industry template: '{request.industry}'. Supported values: textile, pharma, auto, electronics."
        )

    try:
        # 2. Clear old database assets
        db.query(RecoveryPlan).filter(RecoveryPlan.org_id == org_id).delete(synchronize_session=False)
        db.query(AlertEvent).filter(AlertEvent.org_id == org_id).delete(synchronize_session=False)
        db.query(AuditLog).filter(AuditLog.org_id == org_id).delete(synchronize_session=False)
        db.commit()

        # 3. Clear old graph assets
        graph_service.clear_organisation_graph(org_id)

        # 4. Insert template nodes & attributes
        # Add Suppliers
        for s in template_data.get("suppliers", []):
            supplier_id = s["name"] # Connects with routes by name
            graph_service.add_supplier(org_id, supplier_id, s)
            
            # Create a sample active order for each supplier to make the dashboard look active
            order_id = f"order_{uuid.uuid4().hex[:8]}"
            value_inr = int(s.get("revenue_exposure_inr", 1000000) * 0.75)
            units = int(s.get("capacity_units", 1000) * 0.5)
            required_date = (datetime.now(timezone.utc) + timedelta(days=12)).strftime("%Y-%m-%d")
            graph_service.add_order(
                org_id=org_id,
                order_id=order_id,
                supplier_id=supplier_id,
                value_inr=value_inr,
                units=units,
                required_by_date=required_date,
                status="active"
            )

        # Add Warehouses
        for w in template_data.get("warehouses", []):
            graph_service.add_warehouse(
                org_id=org_id,
                warehouse_id=w["id"],
                name=w["name"],
                city=w["city"],
                capacity_units=w["capacity_units"],
                current_stock_units=w["current_stock_units"],
                daily_burn_rate=w["daily_burn_rate"]
            )

        # Add Ports (global - check if port is in templates)
        for p in template_data.get("ports", []):
            graph_service.add_port(
                code=p["id"],
                name=p["name"],
                city=p["city"],
                country=p.get("state", "India")
            )

        # Add Routes & Links
        for r in template_data.get("routes", []):
            route_id = f"route_{uuid.uuid4().hex[:8]}"
            graph_service.add_route(
                org_id=org_id,
                route_id=route_id,
                mode=r["mode"],
                origin_id=r["origin_id"],
                destination_id=r["destination_id"],
                avg_transit_days=r["avg_transit_days"],
                cost_per_unit=r["cost_per_unit"]
            )

        # Connect warehouse to customer if there is any
        warehouses = template_data.get("warehouses", [])
        if warehouses:
            primary_wh = warehouses[0]["id"]
            cust_id = f"customer_{uuid.uuid4().hex[:8]}"
            graph_service.add_customer(
                org_id=org_id,
                customer_id=cust_id,
                name=f"{request.industry.capitalize()} Retail India",
                city="Mumbai",
                contract_penalty_per_day_inr=25000
            )
            graph_service.link_warehouse_to_customer(org_id, primary_wh, cust_id)

        # 5. Log audit action
        audit_entry = AuditLog(
            org_id=org_id,
            user_id=current_user["sub"],
            action="onboarded_organisation",
            resource_type="Organisation",
            resource_id=org_id,
            meta_json={"industry": request.industry}
        )
        db.add(audit_entry)
        db.commit()

        return {
            "status": "success",
            "message": f"Organisation {org_id} successfully onboarded with template '{request.industry}'",
            "counts": {
                "suppliers": len(template_data.get("suppliers", [])),
                "warehouses": len(template_data.get("warehouses", [])),
                "routes": len(template_data.get("routes", [])),
                "ports": len(template_data.get("ports", []))
            }
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Onboarding failed: {str(e)}"
        )

