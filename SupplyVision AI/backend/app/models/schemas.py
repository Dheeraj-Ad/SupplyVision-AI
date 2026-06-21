from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime

# Auth Schemas
class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    org_id: Optional[str] = None
    full_name: str
    preferred_lang: str

# Organisation Schemas
class OrganisationCreate(BaseModel):
    name: str
    gstin: Optional[str] = None
    plan: str = "starter"
    max_suppliers: int = 25
    whatsapp_numbers: List[str] = []

class OrganisationResponse(BaseModel):
    id: str
    name: str
    gstin: Optional[str]
    plan: str
    max_suppliers: int
    whatsapp_numbers: List[str]
    created_at: datetime
    is_active: bool

    class Config:
        from_attributes = True

# User Schemas
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: str
    full_name: str
    preferred_lang: str = "en"
    phone_in: Optional[str] = None

class UserInvite(BaseModel):
    email: EmailStr
    role: str
    full_name: str
    phone_in: Optional[str] = None
    preferred_lang: str = "en"

class UserResponse(BaseModel):
    id: str
    org_id: Optional[str]
    email: str
    phone_in: Optional[str]
    role: str
    full_name: str
    preferred_lang: str
    is_active: bool
    created_at: datetime
    last_login_at: Optional[datetime]

    class Config:
        from_attributes = True

# Supplier schemas
class SupplierCreate(BaseModel):
    name: str
    city: str
    state: str
    location_lat: float
    location_lng: float
    category: str = "tier-1" # tier-1 | tier-2 | tier-3
    lead_time_days: int = 5
    is_single_source: bool = False
    tier: int = 1 # 1: critical, 2: important, 3: standard
    revenue_exposure_inr: int = 0
    capacity_units: int = 1000
    reliability_score: int = 95

class SupplierResponse(BaseModel):
    node_id: str
    org_id: str
    name: str
    city: str
    state: str
    location_lat: float
    location_lng: float
    category: str
    lead_time_days: int
    is_single_source: bool
    tier: int
    revenue_exposure_inr: int
    capacity_units: int
    reliability_score: int
    current_risk_score: int = 0

# Route schemas
class RouteCreate(BaseModel):
    mode: str # road | rail | air | sea
    origin_id: str
    destination_id: str
    avg_transit_days: int
    cost_per_unit: int

# Order schemas
class OrderCreate(BaseModel):
    order_id: str
    supplier_id: str
    value_inr: int
    units: int
    required_by_date: str # YYYY-MM-DD
    status: str = "active" # active | pending | completed

# Simulation schemas
class SimulationRequest(BaseModel):
    scenario: str # cyclone | flood | port_strike | supplier_failure | commodity_spike
    location_name: str # e.g. "Tirupur" or "Chennai Port" or "Supplier S1"
    severity: int = 3 # 1 to 5

class SimulationResponse(BaseModel):
    scenario: str
    location_name: str
    severity: int
    affected_nodes: List[Dict[str, Any]]
    exposed_orders: List[Dict[str, Any]]
    total_exposed_value_inr: int
    simulated_risk_score: int
    recovery_options: List[Dict[str, Any]]  # Fixed: was `recovery_plan: Dict` which didn't match API response
    injected: bool = False
    injected_alert_id: Optional[str] = None

# Alert resolve schema
class ResolveAlertRequest(BaseModel):
    status_update: str  # resolved | false_positive

# Alert schemas
class AlertResponse(BaseModel):
    id: str
    org_id: str
    node_id: str
    node_type: str
    risk_score: int
    rupees_at_risk: int
    signals_json: List[Dict[str, Any]]
    status: str
    created_at: datetime
    resolved_at: Optional[datetime]
    revenue_exposure_details: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True

# Recovery action schemas
class AcceptRecoveryRequest(BaseModel):
    option_idx: int

class RecoveryPlanResponse(BaseModel):
    id: str
    alert_id: str
    org_id: str
    options_json: List[Dict[str, Any]]
    accepted_option_idx: Optional[int]
    accepted_by: Optional[str]
    accepted_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True

# Audit log schemas
class AuditLogResponse(BaseModel):
    id: str
    org_id: Optional[str]
    user_id: Optional[str]
    user_name: Optional[str]
    action: str
    resource_type: Optional[str]
    resource_id: Optional[str]
    meta_json: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True
