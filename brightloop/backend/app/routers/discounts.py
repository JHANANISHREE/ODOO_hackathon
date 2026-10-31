from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.deps import require_role, get_current_active_user
from app.core.exceptions import NotFoundException, BadRequestException
from app.models.user import User, UserRole
from app.models.discount import Discount, DiscountType
from app.repositories.discount_repo import DiscountRepository
from app.repositories.product_repo import ProductRepository
from app.schemas.discount import (
    DiscountCreate,
    DiscountUpdate,
    DiscountResponse,
    DiscountListResponse
)

router = APIRouter(prefix="/discounts", tags=["Discounts"])

@router.get("", response_model=DiscountListResponse)
def list_discounts(
    active_only: bool = False,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    repo = DiscountRepository(db)
    items, total = repo.list_discounts(
        active_only=active_only,
        search=search,
        page=page,
        size=size
    )
    pages = (total + size - 1) // size if total > 0 else 1
    return DiscountListResponse(
        items=[DiscountResponse.model_validate(d) for d in items],
        total=total,
        page=page,
        size=size,
        pages=pages
    )

@router.post("", response_model=DiscountResponse, status_code=status.HTTP_201_CREATED)
def create_discount(
    disc_in: DiscountCreate,
    current_user: User = require_role(UserRole.ADMIN),
    db: Session = Depends(get_db)
):
    repo = DiscountRepository(db)
    existing = repo.get_by_code(disc_in.code)
    if existing:
        raise BadRequestException(f"Discount code '{disc_in.code}' already exists")

    if disc_in.applies_to_product_id:
        prod_repo = ProductRepository(db)
        if not prod_repo.get_by_id(disc_in.applies_to_product_id):
            raise NotFoundException(f"Product {disc_in.applies_to_product_id} not found")

    discount = Discount(
        code=disc_in.code.strip().upper(),
        discount_type=disc_in.discount_type,
        value=disc_in.value,
        minimum_purchase_amount=disc_in.minimum_purchase_amount,
        minimum_quantity=disc_in.minimum_quantity,
        start_date=disc_in.start_date,
        end_date=disc_in.end_date,
        usage_limit=disc_in.usage_limit,
        used_count=0,
        applies_to_product_id=disc_in.applies_to_product_id,
        is_active=disc_in.is_active
    )
    created = repo.create(discount)
    return DiscountResponse.model_validate(created)

@router.get("/{discount_id}", response_model=DiscountResponse)
def get_discount(
    discount_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    repo = DiscountRepository(db)
    discount = repo.get_by_id(discount_id)
    if not discount:
        raise NotFoundException(f"Discount {discount_id} not found")
    return DiscountResponse.model_validate(discount)

@router.put("/{discount_id}", response_model=DiscountResponse)
def update_discount(
    discount_id: int,
    disc_in: DiscountUpdate,
    current_user: User = require_role(UserRole.ADMIN),
    db: Session = Depends(get_db)
):
    repo = DiscountRepository(db)
    discount = repo.get_by_id(discount_id)
    if not discount:
        raise NotFoundException(f"Discount {discount_id} not found")

    if disc_in.code is not None:
        discount.code = disc_in.code.strip().upper()
    if disc_in.discount_type is not None:
        discount.discount_type = disc_in.discount_type
    if disc_in.value is not None:
        discount.value = disc_in.value
    if disc_in.minimum_purchase_amount is not None:
        discount.minimum_purchase_amount = disc_in.minimum_purchase_amount
    if disc_in.minimum_quantity is not None:
        discount.minimum_quantity = disc_in.minimum_quantity
    if disc_in.start_date is not None:
        discount.start_date = disc_in.start_date
    if disc_in.end_date is not None:
        discount.end_date = disc_in.end_date
    if disc_in.usage_limit is not None:
        discount.usage_limit = disc_in.usage_limit
    if disc_in.applies_to_product_id is not None:
        discount.applies_to_product_id = disc_in.applies_to_product_id
    if disc_in.is_active is not None:
        discount.is_active = disc_in.is_active

    updated = repo.update(discount)
    return DiscountResponse.model_validate(updated)

@router.delete("/{discount_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_discount(
    discount_id: int,
    current_user: User = require_role(UserRole.ADMIN),
    db: Session = Depends(get_db)
):
    repo = DiscountRepository(db)
    discount = repo.get_by_id(discount_id)
    if not discount:
        raise NotFoundException(f"Discount {discount_id} not found")
    repo.delete(discount)
