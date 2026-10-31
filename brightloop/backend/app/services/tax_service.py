from decimal import Decimal
from typing import Optional
from sqlalchemy.orm import Session
from app.models.tax import Tax, TaxType
from app.repositories.tax_repo import TaxRepository

class TaxService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = TaxRepository(db)

    def calculate_line_tax(self, base_amount: Decimal, tax_id: Optional[int]) -> Decimal:
        if not tax_id:
            return Decimal("0.00")
        tax = self.repo.get_by_id(tax_id)
        if not tax or not tax.is_active:
            return Decimal("0.00")

        if tax.tax_type == TaxType.PERCENTAGE:
            rate = Decimal(str(tax.rate))
            tax_val = (base_amount * rate) / Decimal("100.00")
            return tax_val.quantize(Decimal("0.01"))
        else:
            return Decimal(str(tax.rate)).quantize(Decimal("0.01"))
