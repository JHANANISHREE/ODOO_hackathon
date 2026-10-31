from decimal import Decimal
from typing import Optional
from sqlalchemy.orm import Session
from app.core.exceptions import BadRequestException, NotFoundException
from app.models.product import Product
from app.models.variant import ProductVariant
from app.models.plan import Plan
from app.repositories.product_repo import ProductRepository
from app.repositories.plan_repo import PlanRepository

class CatalogService:
    def __init__(self, db: Session):
        self.db = db
        self.product_repo = ProductRepository(db)
        self.plan_repo = PlanRepository(db)

    def compute_effective_unit_price(self, product_id: int, variant_id: Optional[int] = None) -> Decimal:
        product = self.product_repo.get_by_id(product_id)
        if not product:
            raise NotFoundException(f"Product {product_id} not found")

        unit_price = Decimal(str(product.sales_price))

        if variant_id:
            variant = self.product_repo.get_variant_by_id(variant_id)
            if not variant:
                raise NotFoundException(f"Product variant {variant_id} not found")
            if variant.product_id != product.id:
                raise BadRequestException(f"Variant {variant_id} does not belong to product {product_id}")
            unit_price += Decimal(str(variant.extra_price))

        return unit_price

    def validate_plan_for_subscription(self, plan_id: int, quantity: int = 1) -> Plan:
        plan = self.plan_repo.get_by_id(plan_id)
        if not plan:
            raise NotFoundException(f"Plan {plan_id} not found")
        if not plan.is_active:
            raise BadRequestException("Selected plan is not currently active")
        if quantity < plan.minimum_quantity:
            raise BadRequestException(
                f"Minimum quantity required for plan '{plan.name}' is {plan.minimum_quantity}"
            )
        return plan
