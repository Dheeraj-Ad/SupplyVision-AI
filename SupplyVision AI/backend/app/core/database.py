import os
import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    create_engine, Column, String, Integer, Boolean, DateTime, ForeignKey, BigInteger, Text, JSON
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from app.core.config import settings

# Determine database URL: check settings.DATABASE_URL
# If not provided, fallback to SQLite database in the local workspace directory
db_url = settings.DATABASE_URL
if not db_url:
    # Ensure temporary/workspace directory structure
    workspace_db_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data")
    os.makedirs(workspace_db_dir, exist_ok=True)
    db_path = os.path.join(workspace_db_dir, "supplyvision.db")
    db_url = f"sqlite:///{db_path}"

# Supabase and some providers return 'postgres://' which SQLAlchemy 1.4+ doesn't accept.
# Auto-convert to 'postgresql://'
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

# For SQLite, enable check_same_thread fallback
connect_args = {}
if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

# Build engine kwargs based on database type
engine_kwargs = {
    "connect_args": connect_args,
}

# Add connection pool settings for PostgreSQL (production)
if not db_url.startswith("sqlite"):
    engine_kwargs["pool_pre_ping"] = True
    engine_kwargs["pool_size"] = 5
    engine_kwargs["max_overflow"] = 10
    engine_kwargs["pool_recycle"] = 300

engine = create_engine(db_url, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# SQLAlchemy Models matching the Postgres DDL
class Organisation(Base):
    __tablename__ = "organisations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    gstin = Column(String(15), unique=True, nullable=True)
    plan = Column(String(50), nullable=False, default="starter")
    max_suppliers = Column(Integer, nullable=False, default=25)
    whatsapp_numbers = Column(JSON, default=list) # Stored as JSON array
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    is_active = Column(Boolean, nullable=False, default=True)

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id = Column(String(36), ForeignKey("organisations.id", ondelete="CASCADE"), nullable=True) # Null for super_admin
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone_in = Column(String(20), nullable=True)
    role = Column(String(50), nullable=False) # super_admin | sme_owner | sc_manager | warehouse_staff | auditor
    full_name = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=False)
    preferred_lang = Column(String(10), nullable=False, default="en")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_login_at = Column(DateTime, nullable=True)
    failed_login_attempts = Column(Integer, nullable=False, default=0)
    locked_until = Column(DateTime, nullable=True)
    password_reset_token = Column(String(255), nullable=True)
    password_reset_expires = Column(DateTime, nullable=True)

    organisation = relationship("Organisation")

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    jti = Column(String(255), unique=True, nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False, index=True)
    revoked = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User")

class AlertEvent(Base):
    __tablename__ = "alert_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id = Column(String(36), ForeignKey("organisations.id", ondelete="CASCADE"), nullable=False, index=True)
    node_id = Column(String(100), nullable=False, index=True)
    node_type = Column(String(50), nullable=False)
    risk_score = Column(Integer, nullable=False)
    rupees_at_risk = Column(BigInteger, nullable=False)
    signals_json = Column(JSON, nullable=False, default=list)
    status = Column(String(50), nullable=False, default="open", index=True) # open | in_progress | resolved | false_positive
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    resolved_at = Column(DateTime, nullable=True)

    organisation = relationship("Organisation")

class RecoveryPlan(Base):
    __tablename__ = "recovery_plans"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    alert_id = Column(String(36), ForeignKey("alert_events.id", ondelete="CASCADE"), nullable=False, index=True)
    org_id = Column(String(36), ForeignKey("organisations.id", ondelete="CASCADE"), nullable=False, index=True)
    options_json = Column(JSON, nullable=False)
    accepted_option_idx = Column(Integer, nullable=True)
    accepted_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    accepted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    alert = relationship("AlertEvent")
    organisation = relationship("Organisation")

class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id = Column(String(36), ForeignKey("organisations.id", ondelete="CASCADE"), nullable=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(100), nullable=False) # e.g. 'accepted_recovery_plan', 'added_supplier'
    resource_type = Column(String(50), nullable=True)
    resource_id = Column(String(100), nullable=True)
    meta_json = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    organisation = relationship("Organisation")
    user = relationship("User")

class SignalEvent(Base):
    __tablename__ = "signal_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    source = Column(String(100), nullable=False) # OpenWeather | IMD | GDACS | NewsAPI | RSS | Commodity
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    confidence = Column(Integer, nullable=False, default=100) # 0 to 100
    severity = Column(Integer, nullable=False, default=1) # 1 to 5
    location = Column(String(255), nullable=False)
    affected_nodes = Column(JSON, nullable=False, default=list) # JSON list of node IDs
    raw_data = Column(JSON, nullable=True)

# Dependency to get db session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Create tables in the engine
def init_db():
    Base.metadata.create_all(bind=engine)
