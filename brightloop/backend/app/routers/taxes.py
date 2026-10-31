from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.deps import require_role, get_current_active_user
from app.core.exceptions import NotFoundException, BadRequestException
from app.models.user import User, UserRole
from app.models.tax import Tax, TaxType
from app.repositories.tax_repo import TaxRepository
from app.schemas.tax import (
    TaxCreate,
    TaxUpdate,
    TaxResponse,
    TaxListResponse
)

router = APIRouter(prefix="/taxes", tags=["Taxes"])

@router.get("", response_model=TaxListResponse)
@router.get("/", response_model=TaxListResponse, include_in_schema=False)
def list_taxes(
    active_only: bool = False,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    repo = TaxRepository(db)
    items, total = repo.list_taxes(
        active_only=active_only,
        search=search,
        page=page,
        size=size
    )
    pages = (total + size - 1) // size if total > 0 else 1
    return TaxListResponse(
        items=[TaxResponse.model_validate(t) for t in items],
        total=total,
        page=page,
        size=size,
        pages=pages
    )

@router.post("", response_model=TaxResponse, status_code=status.HTTP_201_CREATED)
def create_tax(
    tax_in: TaxCreate,
    current_user: User = require_role(UserRole.ADMIN),
    db: Session = Depends(get_db)
):
    repo = TaxRepository(db)
    existing = repo.get_by_name(tax_in.name)
    if existing:
        raise BadRequestException(f"Tax rule with name '{tax_in.name}' already exists")

    tax = Tax(
        name=tax_in.name.strip(),
        tax_type=tax_in.tax_type,
        rate=tax_in.rate,
        applies_to_category=tax_in.applies_to_category,
        is_active=tax_in.is_active
    )
    created = repo.create(tax)
    return TaxResponse.model_validate(created)

@router.get("/{tax_id}", response_model=TaxResponse)
def get_tax(
    tax_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    repo = TaxRepository(db)
    tax = repo.get_by_id(tax_id)
    if not tax:
        raise NotFoundException(f"Tax rule {tax_id} not found")
    return TaxResponse.model_validate(tax)

@router.put("/{tax_id}", response_model=TaxResponse)
def update_tax(
    tax_id: int,
    tax_in: TaxUpdate,
    current_user: User = require_role(UserRole.ADMIN),
    db: Session = Depends(get_db)
):
    repo = TaxRepository(db)
    tax = repo.get_by_id(tax_id)
    if not tax:
        raise NotFoundException(f"Tax rule {tax_id} not found")

    if tax_in.name is not None:
        tax.name = tax_in.name.strip()
    if tax_in.tax_type is not None:
        tax.tax_type = tax_in.tax_type
    if tax_in.rate is not None:
        tax.rate = tax_in.rate
    if tax_in.applies_to_category is not None:
        tax.applies_to_category = tax_in.applies_to_category
    if tax_in.is_active is not None:
        tax.is_active = tax_in.is_active

    updated = repo.update(tax)
    return TaxResponse.model_validate(updated)

@router.delete("/{tax_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tax(
    tax_id: int,
    current_user: User = require_role(UserRole.ADMIN),
    db: Session = Depends(get_db)
):
    repo = TaxRepository(db)
    tax = repo.get_by_id(tax_id)
    if not tax:
        raise NotFoundException(f"Tax rule {tax_id} not found")
    repo.delete(tax)
