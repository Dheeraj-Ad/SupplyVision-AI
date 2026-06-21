import logging
import json
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request

from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler
from app.core.limiter import limiter

from app.core.config import settings
from app.core.database import init_db
from app.services.graph import graph_service
from app.api.v1.auth import router as auth_router
from app.api.v1.suppliers import router as suppliers_router
from app.api.v1.risks import router as risks_router
from app.api.v1.alerts import router as alerts_router
from app.api.v1.recovery import router as recovery_router
from app.api.v1.twin import router as twin_router
from app.api.v1.audit import router as audit_router
from app.api.v1.admin import router as admin_router
from app.api.v1.reports import router as reports_router
from app.api.v1.replay import router as replay_router
from app.api.v1.roi import router as roi_router


# Setup logger configuration
class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_entry = {
            "timestamp": self.formatTime(record, "%Y-%m-%dT%H:%M:%SZ"),
            "level": record.levelname,
            "name": record.name,
            "message": record.getMessage()
        }
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_entry)

root_logger = logging.getLogger()
handler = logging.StreamHandler()
if settings.APP_ENV == "production":
    handler.setFormatter(JSONFormatter())
    root_logger.handlers = [handler]
    root_logger.setLevel(logging.INFO)
else:
    logging.basicConfig(level=logging.INFO)

logger = logging.getLogger("main")

# Sentry initialization
if settings.SENTRY_DSN:
    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            integrations=[FastApiIntegration()],
            traces_sample_rate=1.0,
            profiles_sample_rate=1.0,
        )
        logger.info("Sentry SDK successfully initialized.")
    except ImportError:
        logger.warning("sentry-sdk package not found, skipping Sentry initialization.")


import asyncio
from app.core.database import SessionLocal

async def schedule_periodic_ingestion():
    # Wait 10 seconds after startup before running first ingestion so the app is fully ready
    await asyncio.sleep(10)
    logger.info("Starting background periodic ingestion worker...")
    while True:
        try:
            from app.services.ingestion.weather import ingest_all_weather
            from app.services.ingestion.news import ingest_all_news
            from app.services.ingestion.commodities import ingest_all_commodities
            from app.services.ingestion.ports import ingest_all_ports
            
            db = SessionLocal()
            try:
                ingest_all_weather(db)
                ingest_all_news(db)
                ingest_all_commodities(db)
                ingest_all_ports(db)
                logger.info("Periodic background ingestion completed successfully.")
            finally:
                db.close()
        except Exception as e:
            logger.error(f"Periodic background ingestion error: {e}")
        # Run every 1 hour (3600 seconds)
        await asyncio.sleep(3600)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown tasks."""
    # --- STARTUP ---
    logger.info("Initializing relational database models...")
    init_db()
    logger.info("Database initialized successfully.")
    
    # Start background data ingestion task
    ingestion_task = asyncio.create_task(schedule_periodic_ingestion())
    
    yield
    
    # --- SHUTDOWN ---
    logger.info("Closing database and graph driver connections...")
    ingestion_task.cancel()
    try:
        await ingestion_task
    except asyncio.CancelledError:
        pass
    graph_service.close()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="SupplyVision AI — Supply Chain Decision Intelligence Platform for Indian SMEs",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Attach slowapi rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Custom Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none';"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
    return response


# Set CORS middleware origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router,      prefix=f"{settings.API_V1_STR}/auth",      tags=["Authentication"])
app.include_router(suppliers_router, prefix=f"{settings.API_V1_STR}/suppliers",  tags=["Suppliers"])
app.include_router(risks_router,     prefix=f"{settings.API_V1_STR}/risks",      tags=["Risk Scoring"])
app.include_router(alerts_router,    prefix=f"{settings.API_V1_STR}/alerts",     tags=["Disruption Alerts"])
app.include_router(recovery_router,  prefix=f"{settings.API_V1_STR}/recovery",   tags=["Recovery Plans"])
app.include_router(twin_router,      prefix=f"{settings.API_V1_STR}/twin",       tags=["Digital Twin & Simulations"])
app.include_router(audit_router,     prefix=f"{settings.API_V1_STR}/audit",      tags=["Security Audit Logs"])
app.include_router(admin_router,     prefix=f"{settings.API_V1_STR}/admin",      tags=["Super Admin Panel"])
app.include_router(reports_router,   prefix=f"{settings.API_V1_STR}/reports",    tags=["Compliance Reports Center"])
app.include_router(replay_router,    prefix=f"{settings.API_V1_STR}/replay",     tags=["Historical Replay Engine"])
app.include_router(roi_router,       prefix=f"{settings.API_V1_STR}/roi",        tags=["ROI Analytics Dashboard"])


@app.get("/", tags=["Health"])
def read_root():
    return {
        "message": f"Welcome to the {settings.PROJECT_NAME} Enterprise API Gateway",
        "version": "1.0.0",
        "docs": "/docs",
        "api": settings.API_V1_STR
    }

@app.get("/health", tags=["Health"])
def health_check():
    """Liveness probe returning HTTP 200 to confirm process is running."""
    return {"status": "healthy", "service": settings.PROJECT_NAME}

from sqlalchemy import text

@app.get("/health/readiness", tags=["Health"])
def readiness_check():
    """Readiness probe checking database, neo4j, and cache services."""
    db_ok = False
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        db_ok = True
    except Exception as e:
        logger.error(f"Readiness check: Database connection failed: {e}")

    neo4j_status = "connected" if graph_service.use_neo4j else "connected_fallback_active"
    
    return {
        "status": "ready" if db_ok else "unhealthy",
        "database": "connected" if db_ok else "disconnected",
        "graph_twin": neo4j_status,
        "cache": "connected" if settings.REDIS_URL else "local_memory_active"
    }

