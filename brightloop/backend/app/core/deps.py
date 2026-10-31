from typing import Generator
from fastapi import Depends, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import decode_token
from app.core.exceptions import UnauthorizedException, ForbiddenException
from app.models.user import User, UserRole
from app.repositories.user_repo import UserRepository

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token", auto_error=False)

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    if not token:
        raise UnauthorizedException("Authentication token is required")

    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise UnauthorizedException("Invalid or expired access token")

    user_id = payload.get("sub")
    if not user_id:
        raise UnauthorizedException("Malformed access token payload")

    repo = UserRepository(db)
    user = repo.get_by_id(int(user_id))
    if not user:
        raise UnauthorizedException("User not found")

    return user

def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    if not current_user.is_active:
        raise ForbiddenException("User account is inactive")
    return current_user

class RoleChecker:
    def __init__(self, allowed_roles: list[UserRole]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: User = Depends(get_current_active_user)) -> User:
        if current_user.role not in self.allowed_roles:
            raise ForbiddenException(f"Access forbidden for role: {current_user.role.value}")
        return current_user

def require_role(*roles: UserRole):
    return Depends(RoleChecker(list(roles)))
