import os
from pydantic_settings import BaseSettings
from typing import Optional, List

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
    SECURE_COOKIES: bool = False  # Set to True in production
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
    
    # OpenAI/Claude
    OPENAI_API_KEY: Optional[str] = None
    
    # External feeds keys
    OPENWEATHER_API_KEY: Optional[str] = None
    NEWSAPI_KEY: Optional[str] = None
    
    # Sentry SDK DSN
    SENTRY_DSN: Optional[str] = None
    
    # CORS Origins
    BACKEND_CORS_ORIGINS: List[str] = ["*"]
    
    class Config:
        case_sensitive = True
        
        # Determine environment file dynamically
        app_env = os.getenv("APP_ENV", "development").lower()
        if app_env == "production":
            env_file = ".env.production"
        elif app_env == "staging":
            env_file = ".env.staging"
        elif app_env == "development":
            env_file = ".env.development"
        else:
            env_file = ".env"

settings = Settings()
