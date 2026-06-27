import os
from pydantic import field_validator
from pydantic_settings import BaseSettings
from typing import Optional, List, Any

class Settings(BaseSettings):
    PROJECT_NAME: str = "SupplyVision AI"
    API_V1_STR: str = "/api/v1"
    APP_ENV: str = "development"
    
    # Security config
    SECRET_KEY: str = "super-secret-key-replace-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    MAX_LOGIN_ATTEMPTS: int = 5
    LOCKOUT_MINUTES: int = 15
    SECURE_COOKIES: bool = False  # Set to True in production (Railway env var)
    JWT_COOKIE_NAME: str = "access_token"
    REFRESH_COOKIE_NAME: str = "refresh_token"
    
    # Databases
    DATABASE_URL: Optional[str] = None # If None, fallback to local sqlite
    
    # Neo4j Graph database
    NEO4J_URI: Optional[str] = None
    NEO4J_USER: Optional[str] = "neo4j"
    NEO4J_PASSWORD: Optional[str] = None
    
    # Redis Cache
    REDIS_URL: Optional[str] = None
    
    # Twilio (WhatsApp)
    TWILIO_ACCOUNT_SID: Optional[str] = None
    TWILIO_AUTH_TOKEN: Optional[str] = None
    TWILIO_NUMBER: Optional[str] = None
    
    # OpenAI / Anthropic Claude
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    
    # External feeds keys
    OPENWEATHER_API_KEY: Optional[str] = None
    NEWSAPI_KEY: Optional[str] = None
    
    # Email / SMTP (Gmail, SendGrid, or any SMTP server)
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None        # e.g. yourapp@gmail.com
    SMTP_PASSWORD: Optional[str] = None    # Gmail App Password (not account password)
    EMAIL_FROM: str = "noreply@supplyvision.ai"

    # Sentry SDK DSN
    SENTRY_DSN: Optional[str] = None
    
    # CORS Origins — accepts a comma-separated string from env or a JSON list
    # Example env: BACKEND_CORS_ORIGINS=https://myapp.vercel.app,https://www.myapp.com
    BACKEND_CORS_ORIGINS: Any = ["*"]
    
    @property
    def cookie_samesite(self) -> str:
        """Return 'none' for cross-domain (production) or 'lax' for same-domain (dev)."""
        if self.SECURE_COOKIES:
            return "none"
        return "lax"
    
    class Config:
        case_sensitive = True
        
        # Determine environment file dynamically
        app_env = os.getenv("APP_ENV", "development").lower()
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        
        # Load .env first, then environment-specific overrides if they exist
        env_files = []
        dot_env_path = os.path.join(base_dir, ".env")
        if os.path.exists(dot_env_path):
            env_files.append(dot_env_path)
            
        spec_env_path = os.path.join(base_dir, f".env.{app_env}")
        if os.path.exists(spec_env_path):
            env_files.append(spec_env_path)
            
        if not env_files:
            env_file = dot_env_path
        else:
            env_file = tuple(env_files)
        
    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: any) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, (list, str)):
            if isinstance(v, str):
                import json
                return json.loads(v)
            return v
        raise ValueError(v)

settings = Settings()
