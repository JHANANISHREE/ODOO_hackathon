import re
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator
from app.models.user import UserRole

PASSWORD_REGEX = re.compile(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{9,}$')

def validate_password_strength(v: str) -> str:
    if len(v) <= 8:
        raise ValueError("Password must be more than 8 characters long")
    if not re.search(r'[a-z]', v):
        raise ValueError("Password must contain at least one lowercase letter")
    if not re.search(r'[A-Z]', v):
        raise ValueError("Password must contain at least one uppercase letter")
    if not re.search(r'[^a-zA-Z0-9]', v):
        raise ValueError("Password must contain at least one special character")
    return v

class UserBase(BaseModel):
    email: EmailStr
    name: str
    phone: Optional[str] = None

class UserCreate(UserBase):
    password: str
    role: Optional[UserRole] = UserRole.CUSTOMER

    @field_validator("password")
    @classmethod
    def check_password(cls, v: str) -> str:
        return validate_password_strength(v)

class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None

class UserResponse(UserBase):
    id: int
    role: UserRole
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class UserListResponse(BaseModel):
    items: list[UserResponse]
    total: int
    page: int
    size: int
    pages: int
