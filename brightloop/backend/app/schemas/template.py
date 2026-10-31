from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field
from app.schemas.product import ProductResponse, VariantResponse
from app.schemas.plan import PlanResponse

class TemplateLineCreate(BaseModel):
    product_id: int
    variant_id: Optional[int] = None
    quantity: int = Field(default=1, ge=1)
    unit_price: Decimal = Field(gt=0)

class TemplateLineResponse(BaseModel):
    id: int
    template_id: int
    product_id: int
    variant_id: Optional[int] = None
    quantity: int
    unit_price: Decimal
    product: Optional[ProductResponse] = None
    variant: Optional[VariantResponse] = None

    class Config:
        from_attributes = True

class TemplateCreate(BaseModel):
    name: str
    validity_days: int = Field(default=30, ge=1)
    plan_id: int
    lines: List[TemplateLineCreate] = []

class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    validity_days: Optional[int] = Field(default=None, ge=1)
    plan_id: Optional[int] = None
    lines: Optional[List[TemplateLineCreate]] = None

class TemplateResponse(BaseModel):
    id: int
    name: str
    validity_days: int
    plan_id: int
    created_at: datetime
    updated_at: datetime
    plan: Optional[PlanResponse] = None
    lines: List[TemplateLineResponse] = []

    class Config:
        from_attributes = True

class TemplateListResponse(BaseModel):
    items: List[TemplateResponse]
    total: int
    page: int
    size: int
    pages: int
