from typing import Dict, Any
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.deps import get_current_active_user
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    RefreshTokenRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    ResetPasswordResponse
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def signup(user_in: UserCreate, db: Session = Depends(get_db)):
    service = AuthService(db)
    user = service.register(user_in)
    return UserResponse.model_validate(user)

@router.post("/login", response_model=TokenResponse)
def login(login_in: LoginRequest, db: Session = Depends(get_db)):
    service = AuthService(db)
    return service.login(login_in.email, login_in.password)

@router.post("/refresh", response_model=TokenResponse)
def refresh_token(refresh_in: RefreshTokenRequest, db: Session = Depends(get_db)):
    service = AuthService(db)
    return service.refresh(refresh_in.refresh_token)

@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    service = AuthService(db)
    success, link = service.forgot_password(req.email)
    return {
        "success": True,
        "message": "If this email is registered, a password reset link has been dispatched.",
        "dev_reset_link": link
    }

@router.post("/reset-password", response_model=ResetPasswordResponse)
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    service = AuthService(db)
    service.reset_password(req.token, req.new_password)
    return ResetPasswordResponse(success=True, message="Password has been reset successfully.")

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_active_user)):
    return UserResponse.model_validate(current_user)
