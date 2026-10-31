from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.deps import require_role, get_current_active_user
from app.core.exceptions import NotFoundException, BadRequestException
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.repositories.user_repo import UserRepository
from app.schemas.user import UserCreate, UserUpdate, UserResponse, UserListResponse

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("", response_model=UserListResponse)
def list_users(
    role: Optional[UserRole] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: User = require_role(UserRole.ADMIN, UserRole.STAFF),
    db: Session = Depends(get_db)
):
    repo = UserRepository(db)
    if current_user.role == UserRole.STAFF and role != UserRole.CUSTOMER:
        role = UserRole.CUSTOMER

    items, total = repo.list_users(role=role, search=search, page=page, size=size)
    pages = (total + size - 1) // size if total > 0 else 1

    return UserListResponse(
        items=[UserResponse.model_validate(u) for u in items],
        total=total,
        page=page,
        size=size,
        pages=pages
    )

@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user_in: UserCreate,
    current_user: User = require_role(UserRole.ADMIN),
    db: Session = Depends(get_db)
):
    repo = UserRepository(db)
    existing = repo.get_by_email(user_in.email)
    if existing:
        raise BadRequestException(
            "Email already exists",
            fields={"email": "Email already exists"}
        )

    user = User(
        email=user_in.email.lower().strip(),
        hashed_password=get_password_hash(user_in.password),
        name=user_in.name.strip(),
        phone=user_in.phone.strip() if user_in.phone else None,
        role=user_in.role or UserRole.CUSTOMER,
        is_active=True
    )
    created = repo.create(user)
    return UserResponse.model_validate(created)

@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    current_user: User = require_role(UserRole.ADMIN, UserRole.STAFF),
    db: Session = Depends(get_db)
):
    repo = UserRepository(db)
    user = repo.get_by_id(user_id)
    if not user:
        raise NotFoundException(f"User {user_id} not found")
    return UserResponse.model_validate(user)

@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    update_in: UserUpdate,
    current_user: User = require_role(UserRole.ADMIN),
    db: Session = Depends(get_db)
):
    repo = UserRepository(db)
    user = repo.get_by_id(user_id)
    if not user:
        raise NotFoundException(f"User {user_id} not found")

    if update_in.name is not None:
        user.name = update_in.name.strip()
    if update_in.phone is not None:
        user.phone = update_in.phone.strip()
    if update_in.role is not None:
        user.role = update_in.role
    if update_in.is_active is not None:
        user.is_active = update_in.is_active

    updated = repo.update(user)
    return UserResponse.model_validate(updated)

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    current_user: User = require_role(UserRole.ADMIN),
    db: Session = Depends(get_db)
):
    repo = UserRepository(db)
    user = repo.get_by_id(user_id)
    if not user:
        raise NotFoundException(f"User {user_id} not found")
    if user.id == current_user.id:
        raise BadRequestException("Cannot delete currently logged in administrator")
    repo.delete(user)
