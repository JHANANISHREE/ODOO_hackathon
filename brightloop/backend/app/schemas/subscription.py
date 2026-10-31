from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field
from app.models.subscription import SubscriptionStatus
from app.schemas.user import UserResponse
from app.schemas.plan import PlanResponse
from app.schemas.product import ProductResponse, VariantResponse
from app.schemas.tax import TaxResponse

class SubscriptionLineCreate(BaseModel):
    product_id: int
    variant_id: Optional[int] = None
    quantity: int = Field(default=1, ge=1)
    tax_id: Optional[int] = None
    unit_price: Optional[Decimal] = None

class SubscriptionLineResponse(BaseModel):
    id: int
    subscription_id: int
    product_id: int
    variant_id: Optional[int] = None
    quantity: int
    unit_price: Decimal
    tax_id: Optional[int] = None
    tax_amount: Decimal
    line_amount: Decimal
    product: Optional[ProductResponse] = None
    variant: Optional[VariantResponse] = None
    tax: Optional[TaxResponse] = None

    class Config:
        from_attributes = True

class SubscriptionAuditResponse(BaseModel):
    id: int
    subscription_id: int
    from_status: str
    to_status: str
    action_note: Optional[str] = None
    user_id: Optional[int] = None
    created_at: datetime
    user: Optional[UserResponse] = None

    class Config:
        from_attributes = True

class SubscriptionCreate(BaseModel):
    customer_id: int
    plan_id: int
    start_date: Optional[date] = None
    expiry_date: Optional[date] = None
    payment_terms: str = "Immediate Payment"
    lines: List[SubscriptionLineCreate] = []

class SubscriptionFromTemplateCreate(BaseModel):
    template_id: int
    customer_id: int
    start_date: Optional[date] = None
    payment_terms: Optional[str] = "Immediate Payment"

class SubscriptionTransitionRequest(BaseModel):
    action: str
    note: Optional[str] = None

class SubscriptionResponse(BaseModel):
    id: int
    subscription_number: str
    customer_id: int
    plan_id: int
    status: SubscriptionStatus
    is_paused: bool
    start_date: date
    expiry_date: Optional[date] = None
    payment_terms: str
    total_amount: Decimal
    created_at: datetime
    updated_at: datetime
    customer: Optional[UserResponse] = None
    plan: Optional[PlanResponse] = None
    lines: List[SubscriptionLineResponse] = []
    audit_logs: List[SubscriptionAuditResponse] = []

    class Config:
        from_attributes = True

class SubscriptionListResponse(BaseModel):
    items: List[SubscriptionResponse]
    total: int
    page: int
    size: int
    pages: int
