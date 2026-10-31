from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field
from app.models.payment import PaymentMethod

class PaymentCreate(BaseModel):
    invoice_id: int
    payment_method: PaymentMethod
    amount: Decimal = Field(gt=0)
    transaction_reference: Optional[str] = None
    notes: Optional[str] = None

class PaymentResponse(BaseModel):
    id: int
    invoice_id: int
    payment_method: PaymentMethod
    amount: Decimal
    payment_date: datetime
    transaction_reference: Optional[str] = None
    notes: Optional[str] = None
    invoice_number: Optional[str] = None
    customer_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class PaymentListResponse(BaseModel):
    items: List[PaymentResponse]
    total: int
    page: int
    size: int
    pages: int
