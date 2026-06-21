from enum import Enum
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from app.core.security import decode_access_token
from app.core.config import settings

class Role(str, Enum):
    SUPER_ADMIN      = "super_admin"
    SME_OWNER        = "sme_owner"
    SC_MANAGER       = "sc_manager"
    WAREHOUSE_STAFF  = "warehouse_staff"
    AUDITOR          = "auditor"

# Role hierarchy: index 0 is lowest privilege, index 4 is highest
ROLE_HIERARCHY = [
    Role.WAREHOUSE_STAFF,
    Role.AUDITOR,
    Role.SC_MANAGER,
    Role.SME_OWNER,
    Role.SUPER_ADMIN,
]

def has_minimum_role(user_role: Role, minimum: Role) -> bool:
    try:
        user_idx = ROLE_HIERARCHY.index(user_role)
        min_idx = ROLE_HIERARCHY.index(minimum)
        return user_idx >= min_idx
    except ValueError:
        return False

# Security token scheme
security_scheme = HTTPBearer(auto_error=False)

def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme)
) -> dict:
    token = None
    if request.cookies and settings.JWT_COOKIE_NAME in request.cookies:
        token = request.cookies.get(settings.JWT_COOKIE_NAME)
    elif credentials:
        token = credentials.credentials
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials or token expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload # Returns dict like: {"sub": user_id, "org_id": org_id, "role": role, "email": email, "preferred_lang": preferred_lang}

def require_role(minimum_role: Role):
    def dependency(current_user: dict = Depends(get_current_user)) -> dict:
        user_role = Role(current_user.get("role"))
        if not has_minimum_role(user_role, minimum_role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: Action requires role {minimum_role.value} or higher."
            )
        return current_user
    return dependency
