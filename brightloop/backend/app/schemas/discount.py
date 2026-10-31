from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field, model_validator
from app.models.discount import DiscountType
from app.schemas.product import ProductResponse

class DiscountBase(BaseModel):
    code: str
    discount_type: DiscountType = DiscountType.PERCENTAGE
    value: Decimal = Field(gt=0)
    minimum_purchase_amount: Optional[Decimal] = Field(default=None, ge=0)
    minimum_quantity: Optional[int] = Field(default=None, ge=1)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    usage_limit: Optional[int] = Field(default=None, ge=1)
    applies_to_product_id: Optional[int] = None
    is_active: bool = True

    @model_validator(mode="after")
    def validate_discount(self):
        if self.discount_type == DiscountType.PERCENTAGE and self.value > 100:
            raise ValueError("Percentage discount value cannot exceed 100%")
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValueError("end_date cannot be earlier than start_date")
        return self

class DiscountCreate(DiscountBase):
    pass

class DiscountUpdate(BaseModel):
    code: Optional[str] = None
    discount_type: Optional[DiscountType] = None
    value: Optional[Decimal] = Field(default=None, gt=0)
    minimum_purchase_amount: Optional[Decimal] = Field(default=None, ge=0)
    minimum_quantity: Optional[int] = Field(default=None, ge=1)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    usage_limit: Optional[int] = Field(default=None, ge=1)
    applies_to_product_id: Optional[int] = None
    is_active: Optional[bool] = None

class DiscountResponse(DiscountBase):
    id: int
    used_count: int
    created_at: datetime
    updated_at: datetime
    product: Optional[ProductResponse] = None

    class Config:
        from_attributes = True

class DiscountListResponse(BaseModel):
    items: List[DiscountResponse]
    total: int
    page: int
    size: int
    pages: int
