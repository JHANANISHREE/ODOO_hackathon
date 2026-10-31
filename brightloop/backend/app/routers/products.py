from typing import Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.deps import require_role, get_current_active_user
from app.core.exceptions import NotFoundException, BadRequestException
from app.models.user import User, UserRole
from app.models.product import Product, ProductType
from app.models.variant import ProductVariant
from app.repositories.product_repo import ProductRepository
from app.schemas.product import (
    ProductCreate,
    ProductUpdate,
    ProductResponse,
    ProductListResponse,
    VariantCreate,
    VariantResponse
)

router = APIRouter(prefix="/products", tags=["Products"])

@router.get("", response_model=ProductListResponse)
@router.get("/", response_model=ProductListResponse, include_in_schema=False)
def list_products(
    product_type: Optional[ProductType] = None,
    active_only: bool = False,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    repo = ProductRepository(db)
    items, total = repo.list_products(
        product_type=product_type,
        active_only=active_only,
        search=search,
        page=page,
        size=size
    )
    pages = (total + size - 1) // size if total > 0 else 1
    return ProductListResponse(
        items=[ProductResponse.model_validate(p) for p in items],
        total=total,
        page=page,
        size=size,
        pages=pages
    )

@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    prod_in: ProductCreate,
    current_user: User = require_role(UserRole.ADMIN),
    db: Session = Depends(get_db)
):
    repo = ProductRepository(db)
    product = Product(
        name=prod_in.name.strip(),
        type=prod_in.type,
        sales_price=prod_in.sales_price,
        cost_price=prod_in.cost_price,
        notes=prod_in.notes,
        is_active=prod_in.is_active
    )
    if prod_in.variants:
        for v in prod_in.variants:
            product.variants.append(
                ProductVariant(
                    attribute_name=v.attribute_name.strip(),
                    attribute_value=v.attribute_value.strip(),
                    extra_price=v.extra_price
                )
            )

    created = repo.create(product)
    return ProductResponse.model_validate(created)

@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    repo = ProductRepository(db)
    product = repo.get_by_id(product_id)
    if not product:
        raise NotFoundException(f"Product {product_id} not found")
    return ProductResponse.model_validate(product)

@router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    prod_in: ProductUpdate,
    current_user: User = require_role(UserRole.ADMIN),
    db: Session = Depends(get_db)
):
    repo = ProductRepository(db)
    product = repo.get_by_id(product_id)
    if not product:
        raise NotFoundException(f"Product {product_id} not found")

    if prod_in.name is not None:
        product.name = prod_in.name.strip()
    if prod_in.type is not None:
        product.type = prod_in.type
    if prod_in.sales_price is not None:
        product.sales_price = prod_in.sales_price
    if prod_in.cost_price is not None:
        product.cost_price = prod_in.cost_price
    if prod_in.notes is not None:
        product.notes = prod_in.notes
    if prod_in.is_active is not None:
        product.is_active = prod_in.is_active

    updated = repo.update(product)
    return ProductResponse.model_validate(updated)

@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int,
    current_user: User = require_role(UserRole.ADMIN),
    db: Session = Depends(get_db)
):
    repo = ProductRepository(db)
    product = repo.get_by_id(product_id)
    if not product:
        raise NotFoundException(f"Product {product_id} not found")
    repo.delete(product)

@router.post("/{product_id}/variants", response_model=VariantResponse, status_code=status.HTTP_201_CREATED)
def add_product_variant(
    product_id: int,
    var_in: VariantCreate,
    current_user: User = require_role(UserRole.ADMIN),
    db: Session = Depends(get_db)
):
    repo = ProductRepository(db)
    product = repo.get_by_id(product_id)
    if not product:
        raise NotFoundException(f"Product {product_id} not found")

    variant = ProductVariant(
        product_id=product_id,
        attribute_name=var_in.attribute_name.strip(),
        attribute_value=var_in.attribute_value.strip(),
        extra_price=var_in.extra_price
    )
    created = repo.add_variant(variant)
    return VariantResponse.model_validate(created)

@router.delete("/{product_id}/variants/{variant_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product_variant(
    product_id: int,
    variant_id: int,
    current_user: User = require_role(UserRole.ADMIN),
    db: Session = Depends(get_db)
):
    repo = ProductRepository(db)
    variant = repo.get_variant_by_id(variant_id)
    if not variant or variant.product_id != product_id:
        raise NotFoundException("Variant not found on product")
    repo.delete_variant(variant)
