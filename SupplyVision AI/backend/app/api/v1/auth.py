from datetime import timedelta, datetime, timezone
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from app.core.database import get_db, User, Organisation, RefreshToken
from app.core.security import (
    verify_password, create_access_token, create_refresh_token, 
    decode_refresh_token, get_password_hash
)
from app.models.schemas import LoginRequest, TokenResponse, UserCreate, UserResponse
from app.core.config import settings
from app.models.rbac import get_current_user
from app.core.limiter import limiter


router = APIRouter()

@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
def login(request: Request, login_data: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_data.email).first()

    
    # 1. Lockout Check
    if user and user.locked_until:
        # Check if lockout has expired
        if datetime.now(timezone.utc) < user.locked_until.replace(tzinfo=timezone.utc):
            time_left = int((user.locked_until.replace(tzinfo=timezone.utc) - datetime.now(timezone.utc)).total_seconds() / 60)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Account locked due to multiple failed login attempts. Try again in {time_left} minutes.",
            )
        else:
            # Lockout expired, reset it
            user.locked_until = None
            user.failed_login_attempts = 0
            db.commit()

    # 2. Verify credentials
    if not user or not verify_password(login_data.password, user.password_hash):
        if user:
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= settings.MAX_LOGIN_ATTEMPTS:
                user.locked_until = datetime.now(timezone.utc) + timedelta(minutes=settings.LOCKOUT_MINUTES)
            db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

        
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account",
        )
    
    # Reset failed attempts
    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()
    
    # Generate tokens
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=user.id,
        org_id=user.org_id,
        role=user.role,
        email=user.email,
        preferred_lang=user.preferred_lang,
        expires_delta=access_token_expires
    )
    
    refresh_token, jti = create_refresh_token(subject=user.id)
    
    # Store refresh token in database
    db_refresh = RefreshToken(
        jti=jti,
        user_id=user.id,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    db.add(db_refresh)
    db.commit()
    
    # Set cookies
    response.set_cookie(
        key=settings.JWT_COOKIE_NAME,
        value=access_token,
        httponly=True,
        secure=settings.SECURE_COOKIES,
        samesite=settings.cookie_samesite,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )
    response.set_cookie(
        key=settings.REFRESH_COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        secure=settings.SECURE_COOKIES,
        samesite=settings.cookie_samesite,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600
    )
    
    return TokenResponse(
        access_token=access_token,
        role=user.role,
        org_id=user.org_id,
        full_name=user.full_name,
        preferred_lang=user.preferred_lang
    )

@router.post("/signup", response_model=TokenResponse)
@limiter.limit("10/minute")
def signup(request: Request, signup_data: UserCreate, response: Response, db: Session = Depends(get_db)):
    # Check if email exists
    existing_user = db.query(User).filter(User.email == signup_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address already registered",
        )
    
    # Create a default organisation for the new sign-up
    new_org = Organisation(
        name=f"{signup_data.full_name}'s Organisation",
        plan="starter",
        max_suppliers=25,
        whatsapp_numbers=[signup_data.phone_in] if signup_data.phone_in else []
    )

    db.add(new_org)
    db.commit()
    db.refresh(new_org)
    
    # Create the user associated with this new organisation
    new_user = User(
        org_id=new_org.id,
        email=signup_data.email,
        phone_in=signup_data.phone_in,
        role="sme_owner", # Registered users default to Owner
        full_name=signup_data.full_name,
        password_hash=get_password_hash(signup_data.password),
        preferred_lang=signup_data.preferred_lang,
        is_active=True
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Generate tokens
    access_token = create_access_token(
        subject=new_user.id,
        org_id=new_user.org_id,
        role=new_user.role,
        email=new_user.email,
        preferred_lang=new_user.preferred_lang
    )
    refresh_token, jti = create_refresh_token(subject=new_user.id)
    
    db_refresh = RefreshToken(
        jti=jti,
        user_id=new_user.id,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    db.add(db_refresh)
    db.commit()
    
    # Set cookies
    response.set_cookie(
        key=settings.JWT_COOKIE_NAME,
        value=access_token,
        httponly=True,
        secure=settings.SECURE_COOKIES,
        samesite=settings.cookie_samesite,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )
    response.set_cookie(
        key=settings.REFRESH_COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        secure=settings.SECURE_COOKIES,
        samesite=settings.cookie_samesite,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600
    )
    
    return TokenResponse(
        access_token=access_token,
        role=new_user.role,
        org_id=new_user.org_id,
        full_name=new_user.full_name,
        preferred_lang=new_user.preferred_lang
    )

@router.post("/refresh", response_model=TokenResponse)
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    # 1. Extract refresh token from cookies
    refresh_token = request.cookies.get(settings.REFRESH_COOKIE_NAME)
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing",
        )
    
    # 2. Decode and validate structure
    payload = decode_refresh_token(refresh_token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )
    
    jti = payload.get("jti")
    user_id = payload.get("sub")
    
    # 3. Check db record
    db_token = db.query(RefreshToken).filter(RefreshToken.jti == jti).first()
    if not db_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not found or revoked",
        )
    
    # 4. Check if token was previously revoked (Reuse Detection / Breach)
    if db_token.revoked:
        # Revoke all tokens for this user!
        db.query(RefreshToken).filter(RefreshToken.user_id == user_id).update({"revoked": True})
        db.commit()
        # Clear cookies
        response.delete_cookie(settings.JWT_COOKIE_NAME)
        response.delete_cookie(settings.REFRESH_COOKIE_NAME)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token reuse detected. All sessions revoked.",
        )
        
    # Check expiry
    if db_token.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token expired",
        )
        
    # 5. Revoke old token
    db_token.revoked = True
    db.commit()
    
    # 6. Fetch user
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )
        
    # 7. Generate new tokens (RTR)
    access_token = create_access_token(
        subject=user.id,
        org_id=user.org_id,
        role=user.role,
        email=user.email,
        preferred_lang=user.preferred_lang
    )
    new_refresh_token, new_jti = create_refresh_token(subject=user.id)
    
    # Store new refresh token
    db_new_refresh = RefreshToken(
        jti=new_jti,
        user_id=user.id,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    db.add(db_new_refresh)
    db.commit()
    
    # 8. Set cookies
    response.set_cookie(
        key=settings.JWT_COOKIE_NAME,
        value=access_token,
        httponly=True,
        secure=settings.SECURE_COOKIES,
        samesite=settings.cookie_samesite,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )
    response.set_cookie(
        key=settings.REFRESH_COOKIE_NAME,
        value=new_refresh_token,
        httponly=True,
        secure=settings.SECURE_COOKIES,
        samesite=settings.cookie_samesite,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600
    )
    
    return TokenResponse(
        access_token=access_token,
        role=user.role,
        org_id=user.org_id,
        full_name=user.full_name,
        preferred_lang=user.preferred_lang
    )

@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    refresh_token = request.cookies.get(settings.REFRESH_COOKIE_NAME)
    if refresh_token:
        payload = decode_refresh_token(refresh_token)
        if payload:
            jti = payload.get("jti")
            db_token = db.query(RefreshToken).filter(RefreshToken.jti == jti).first()
            if db_token:
                db_token.revoked = True
                db.commit()
                
    response.delete_cookie(settings.JWT_COOKIE_NAME)
    response.delete_cookie(settings.REFRESH_COOKIE_NAME)
    return {"message": "Logged out successfully"}

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

@router.post("/forgot-password")
@limiter.limit("10/minute")
def forgot_password(request: Request, forgot_data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == forgot_data.email).first()
    if user:
        reset_token = str(uuid.uuid4())
        user.password_reset_token = reset_token
        user.password_reset_expires = datetime.now(timezone.utc) + timedelta(hours=1)
        db.commit()
        # Log to stdout for testing and validation
        print(f"\n[FORGOT_PASSWORD] Reset token for {forgot_data.email} generated: {reset_token}\n")
        
    return {"message": f"Password reset instructions sent to {forgot_data.email}"}


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

@router.post("/reset-password")
@limiter.limit("10/minute")
def reset_password(request: Request, reset_data: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.password_reset_token == reset_data.token).first()
    if not user or not user.password_reset_expires:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )
        
    if user.password_reset_expires.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )
        
    user.password_hash = get_password_hash(reset_data.new_password)
    user.password_reset_token = None
    user.password_reset_expires = None
    user.failed_login_attempts = 0
    user.locked_until = None
    db.commit()
    
    return {"message": "Password has been successfully updated"}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user_id = current_user.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
