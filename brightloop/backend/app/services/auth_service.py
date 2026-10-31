from datetime import datetime, timedelta, timezone
from typing import Tuple, Optional
from sqlalchemy.orm import Session

from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_reset_token,
    hash_token
)
from app.core.exceptions import (
    BadRequestException,
    UnauthorizedException,
    NotFoundException
)
from app.models.user import User, UserRole
from app.repositories.user_repo import UserRepository
from app.schemas.user import UserCreate
from app.schemas.auth import TokenResponse, UserResponse

class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = UserRepository(db)

    def register(self, user_in: UserCreate) -> User:
        existing = self.repo.get_by_email(user_in.email)
        if existing:
            raise BadRequestException(
                "Entered email is already registered",
                fields={"email": "Entered email is already registered"}
            )

        hashed_password = get_password_hash(user_in.password)
        user = User(
            email=user_in.email.lower().strip(),
            hashed_password=hashed_password,
            name=user_in.name.strip(),
            phone=user_in.phone.strip() if user_in.phone else None,
            role=user_in.role or UserRole.CUSTOMER,
            is_active=True
        )
        return self.repo.create(user)

    def login(self, email: str, password: str) -> TokenResponse:
        user = self.repo.get_by_email(email)
        if not user or not verify_password(password, user.hashed_password):
            raise UnauthorizedException("Invalid email or password", fields={"general": "Invalid email or password"})

        if not user.is_active:
            raise UnauthorizedException("Account is disabled", fields={"general": "Account is disabled"})

        access_token = create_access_token(subject=user.id, role=user.role.value)
        refresh_token = create_refresh_token(subject=user.id, role=user.role.value)

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=UserResponse.model_validate(user)
        )

    def refresh(self, refresh_token: str) -> TokenResponse:
        payload = decode_token(refresh_token)
        if not payload or payload.get("type") != "refresh":
            raise UnauthorizedException("Invalid or expired refresh token")

        user_id = payload.get("sub")
        if not user_id:
            raise UnauthorizedException("Malformed refresh token")

        user = self.repo.get_by_id(int(user_id))
        if not user or not user.is_active:
            raise UnauthorizedException("User not found or disabled")

        access_token = create_access_token(subject=user.id, role=user.role.value)
        new_refresh = create_refresh_token(subject=user.id, role=user.role.value)

        return TokenResponse(
            access_token=access_token,
            refresh_token=new_refresh,
            user=UserResponse.model_validate(user)
        )

    def forgot_password(self, email: str) -> Tuple[bool, Optional[str]]:
        user = self.repo.get_by_email(email)
        if not user:
            return True, None

        raw_token, token_hash = generate_reset_token()
        user.reset_token_hash = token_hash
        user.reset_token_expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
        self.repo.update(user)

        reset_link = f"/reset-password.html?token={raw_token}"
        print(f"[AUTH DEV LOG] Password reset link generated for {user.email}: {reset_link}")
        return True, reset_link

    def reset_password(self, raw_token: str, new_password: str) -> bool:
        token_hash = hash_token(raw_token)
        user = self.repo.get_by_reset_token_hash(token_hash)
        if not user:
            raise BadRequestException("Invalid or expired reset token", fields={"token": "Reset token is invalid"})

        now = datetime.now(timezone.utc)
        expires_at = user.reset_token_expires_at
        if expires_at and expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if not expires_at or expires_at < now:
            raise BadRequestException("Reset token has expired", fields={"token": "Reset token has expired"})

        user.hashed_password = get_password_hash(new_password)
        user.reset_token_hash = None
        user.reset_token_expires_at = None
        self.repo.update(user)
        return True
