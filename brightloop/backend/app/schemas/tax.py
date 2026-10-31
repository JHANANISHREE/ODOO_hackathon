from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field
from app.models.tax import TaxType

class TaxBase(BaseModel):
    name: str
    tax_type: TaxType = TaxType.PERCENTAGE
    rate: Decimal = Field(ge=0)
    applies_to_category: Optional[str] = None
    is_active: bool = True

class TaxCreate(TaxBase):
    pass

class TaxUpdate(BaseModel):
    name: Optional[str] = None
    tax_type: Optional[TaxType] = None
    rate: Optional[Decimal] = Field(default=None, ge=0)
    applies_to_category: Optional[str] = None
    is_active: Optional[bool] = None

class TaxResponse(TaxBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class TaxListResponse(BaseModel):
    items: List[TaxResponse]
    total: int
    page: int
    size: int
    pages: int
