from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field
from app.models.invoice import InvoiceStatus
from app.schemas.user import UserResponse
from app.schemas.product import ProductResponse, VariantResponse
from app.schemas.discount import DiscountResponse

class InvoiceLineResponse(BaseModel):
    id: int
    invoice_id: int
    product_id: int
    variant_id: Optional[int] = None
    quantity: int
    unit_price: Decimal
    tax_amount: Decimal
    line_total: Decimal
    product: Optional[ProductResponse] = None
    variant: Optional[VariantResponse] = None

    class Config:
        from_attributes = True

class InvoiceResponse(BaseModel):
    id: int
    invoice_number: str
    subscription_id: int
    customer_id: int
    period_start: date
    period_end: date
    issue_date: date
    due_date: date
    subtotal: Decimal
    discount_amount: Decimal
    discount_id: Optional[int] = None
    tax_amount: Decimal
    total_amount: Decimal
    amount_paid: Decimal
    outstanding_balance: Optional[Decimal] = None
    is_overdue: Optional[bool] = None
    status: InvoiceStatus
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    customer: Optional[UserResponse] = None
    discount: Optional[DiscountResponse] = None
    lines: List[InvoiceLineResponse] = []

    class Config:
        from_attributes = True

class InvoiceListResponse(BaseModel):
    items: List[InvoiceResponse]
    total: int
    page: int
    size: int
    pages: int

class InvoiceTransitionRequest(BaseModel):
    action: str

class BillingRunSummary(BaseModel):
    created: int
    skipped: int
    failed: int
    details: List[str] = []
