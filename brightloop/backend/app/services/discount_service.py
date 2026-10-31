from datetime import date
from decimal import Decimal
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from app.models.discount import Discount, DiscountType
from app.repositories.discount_repo import DiscountRepository

class DiscountService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = DiscountRepository(db)

    def is_eligible(
        self,
        discount: Discount,
        subtotal: Decimal,
        total_quantity: int,
        target_product_id: Optional[int] = None,
        check_date: Optional[date] = None
    ) -> Tuple[bool, str]:
        if not discount.is_active:
            return False, "Discount is inactive"

        today = check_date or date.today()
        if discount.start_date and today < discount.start_date:
            return False, "Discount code has not started yet"
        if discount.end_date and today > discount.end_date:
            return False, "Discount code has expired"

        if discount.usage_limit is not None and discount.used_count >= discount.usage_limit:
            return False, "Discount usage limit reached"

        if discount.minimum_purchase_amount is not None:
            if subtotal < Decimal(str(discount.minimum_purchase_amount)):
                return False, f"Minimum purchase amount of ${discount.minimum_purchase_amount} not met"

        if discount.minimum_quantity is not None:
            if total_quantity < discount.minimum_quantity:
                return False, f"Minimum quantity of {discount.minimum_quantity} items not met"

        if discount.applies_to_product_id is not None:
            if target_product_id is None or discount.applies_to_product_id != target_product_id:
                return False, "Discount does not apply to this product"

        return True, "Eligible"

    def compute_discount_amount(self, discount: Discount, subtotal: Decimal) -> Decimal:
        if discount.discount_type == DiscountType.PERCENTAGE:
            pct = Decimal(str(discount.value)) / Decimal("100.00")
            amount = subtotal * pct
        else:
            amount = Decimal(str(discount.value))

        if amount > subtotal:
            amount = subtotal
        return amount.quantize(Decimal("0.01"))
