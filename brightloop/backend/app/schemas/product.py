from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field
from app.models.product import ProductType

class VariantBase(BaseModel):
    attribute_name: str
    attribute_value: str
    extra_price: Decimal = Field(default=Decimal("0.00"), ge=0)

class VariantCreate(VariantBase):
    pass

class VariantResponse(VariantBase):
    id: int
    product_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class ProductBase(BaseModel):
    name: str
    type: ProductType = ProductType.SOFTWARE
    sales_price: Decimal = Field(gt=0)
    cost_price: Decimal = Field(ge=0)
    notes: Optional[str] = None
    is_active: bool = True

class ProductCreate(ProductBase):
    variants: Optional[List[VariantCreate]] = None

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[ProductType] = None
    sales_price: Optional[Decimal] = Field(default=None, gt=0)
    cost_price: Optional[Decimal] = Field(default=None, ge=0)
    notes: Optional[str] = None
    is_active: Optional[bool] = None

class ProductResponse(ProductBase):
    id: int
    created_at: datetime
    updated_at: datetime
    variants: List[VariantResponse] = []

    class Config:
        from_attributes = True

class ProductListResponse(BaseModel):
    items: List[ProductResponse]
    total: int
    page: int
    size: int
    pages: int
