from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field, model_validator
from app.models.plan import BillingPeriod

class PlanBase(BaseModel):
    name: str
    price: Decimal = Field(gt=0)
    billing_period: BillingPeriod = BillingPeriod.MONTHLY
    minimum_quantity: int = Field(default=1, ge=1)
    available_from: Optional[date] = None
    available_to: Optional[date] = None
    auto_close: bool = False
    closable: bool = True
    pausable: bool = True
    renewable: bool = True
    is_active: bool = True

    @model_validator(mode="after")
    def check_dates(self):
        if self.available_from and self.available_to:
            if self.available_to < self.available_from:
                raise ValueError("available_to date must be greater than or equal to available_from date")
        return self

class PlanCreate(PlanBase):
    pass

class PlanUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[Decimal] = Field(default=None, gt=0)
    billing_period: Optional[BillingPeriod] = None
    minimum_quantity: Optional[int] = Field(default=None, ge=1)
    available_from: Optional[date] = None
    available_to: Optional[date] = None
    auto_close: Optional[bool] = None
    closable: Optional[bool] = None
    pausable: Optional[bool] = None
    renewable: Optional[bool] = None
    is_active: Optional[bool] = None

    @model_validator(mode="after")
    def check_dates(self):
        if self.available_from and self.available_to:
            if self.available_to < self.available_from:
                raise ValueError("available_to date must be greater than or equal to available_from date")
        return self

class PlanResponse(PlanBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class PlanListResponse(BaseModel):
    items: List[PlanResponse]
    total: int
    page: int
    size: int
    pages: int
