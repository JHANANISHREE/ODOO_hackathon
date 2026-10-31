from datetime import datetime, date, timedelta, timezone
from decimal import Decimal
from typing import Optional, List
from sqlalchemy.orm import Session

from app.core.exceptions import (
    BadRequestException,
    NotFoundException,
    ConflictException
)
from app.models.subscription import Subscription, SubscriptionLine, SubscriptionStatus
from app.models.audit import SubscriptionAuditLog
from app.models.plan import Plan, BillingPeriod
from app.models.user import User
from app.repositories.subscription_repo import SubscriptionRepository
from app.repositories.plan_repo import PlanRepository
from app.repositories.product_repo import ProductRepository
from app.repositories.template_repo import TemplateRepository
from app.services.catalog_service import CatalogService
from app.services.tax_service import TaxService
from app.schemas.subscription import SubscriptionCreate, SubscriptionFromTemplateCreate

ALLOWED_TRANSITIONS = {
    SubscriptionStatus.DRAFT: [SubscriptionStatus.QUOTATION],
    SubscriptionStatus.QUOTATION: [SubscriptionStatus.CONFIRMED, SubscriptionStatus.DRAFT],
    SubscriptionStatus.CONFIRMED: [SubscriptionStatus.ACTIVE, SubscriptionStatus.DRAFT],
    SubscriptionStatus.ACTIVE: [SubscriptionStatus.CLOSED],
    SubscriptionStatus.CLOSED: []
}

class SubscriptionService:
    def __init__(self, db: Session):
        self.db = db
        self.sub_repo = SubscriptionRepository(db)
        self.plan_repo = PlanRepository(db)
        self.prod_repo = ProductRepository(db)
        self.temp_repo = TemplateRepository(db)
        self.catalog_service = CatalogService(db)
        self.tax_service = TaxService(db)

    def create_subscription(
        self,
        sub_in: SubscriptionCreate,
        user_id: Optional[int] = None,
        initial_status: SubscriptionStatus = SubscriptionStatus.DRAFT
    ) -> Subscription:
        total_quantity = sum(line.quantity for line in sub_in.lines) if sub_in.lines else 1
        plan = self.catalog_service.validate_plan_for_subscription(sub_in.plan_id, quantity=total_quantity)

        sub_number = self.sub_repo.get_next_subscription_number()
        start = sub_in.start_date or date.today()

        expiry = sub_in.expiry_date
        if not expiry:
            if plan.billing_period == BillingPeriod.DAILY:
                expiry = start + timedelta(days=1)
            elif plan.billing_period == BillingPeriod.WEEKLY:
                expiry = start + timedelta(weeks=1)
            elif plan.billing_period == BillingPeriod.MONTHLY:
                expiry = start + timedelta(days=30)
            elif plan.billing_period == BillingPeriod.YEARLY:
                expiry = start + timedelta(days=365)

        subscription = Subscription(
            subscription_number=sub_number,
            customer_id=sub_in.customer_id,
            plan_id=sub_in.plan_id,
            status=initial_status,
            is_paused=False,
            start_date=start,
            expiry_date=expiry,
            payment_terms=sub_in.payment_terms,
            total_amount=Decimal("0.00")
        )

        total_amount = Decimal("0.00")

        for line_in in sub_in.lines:
            unit_price = line_in.unit_price
            if unit_price is None:
                unit_price = self.catalog_service.compute_effective_unit_price(
                    line_in.product_id,
                    line_in.variant_id
                )

            base_line = Decimal(str(unit_price)) * Decimal(line_in.quantity)
            tax_amount = self.tax_service.calculate_line_tax(base_line, line_in.tax_id)
            line_total = base_line + tax_amount

            total_amount += line_total

            subscription.lines.append(
                SubscriptionLine(
                    product_id=line_in.product_id,
                    variant_id=line_in.variant_id,
                    quantity=line_in.quantity,
                    unit_price=Decimal(str(unit_price)),
                    tax_id=line_in.tax_id,
                    tax_amount=tax_amount,
                    line_amount=line_total
                )
            )

        subscription.total_amount = total_amount
        created_sub = self.sub_repo.create(subscription)

        audit_log = SubscriptionAuditLog(
            subscription_id=created_sub.id,
            from_status="NONE",
            to_status=initial_status.value,
            action_note="Subscription initiated",
            user_id=user_id
        )
        self.sub_repo.add_audit_log(audit_log)

        return created_sub

    def create_from_template(
        self,
        req: SubscriptionFromTemplateCreate,
        user_id: Optional[int] = None
    ) -> Subscription:
        template = self.temp_repo.get_by_id(req.template_id)
        if not template:
            raise NotFoundException(f"Template {req.template_id} not found")

        start = req.start_date or date.today()
        expiry = start + timedelta(days=template.validity_days)

        sub_in = SubscriptionCreate(
            customer_id=req.customer_id,
            plan_id=template.plan_id,
            start_date=start,
            expiry_date=expiry,
            payment_terms=req.payment_terms or "Immediate Payment",
            lines=[
                SubscriptionLineCreate(
                    product_id=line.product_id,
                    variant_id=line.variant_id,
                    quantity=line.quantity,
                    unit_price=line.unit_price,
                    tax_id=None
                )
                for line in template.lines
            ]
        )

        return self.create_subscription(
            sub_in=sub_in,
            user_id=user_id,
            initial_status=SubscriptionStatus.QUOTATION
        )

    def transition_status(
        self,
        subscription_id: int,
        target_status: SubscriptionStatus,
        user_id: Optional[int] = None,
        note: Optional[str] = None
    ) -> Subscription:
        sub = self.sub_repo.get_by_id(subscription_id)
        if not sub:
            raise NotFoundException(f"Subscription {subscription_id} not found")

        current_status = sub.status
        allowed = ALLOWED_TRANSITIONS.get(current_status, [])

        if target_status not in allowed:
            raise ConflictException(
                f"Illegal status transition from '{current_status.value}' to '{target_status.value}'. Allowed: {[s.value for s in allowed]}"
            )

        if target_status == SubscriptionStatus.CLOSED and not sub.plan.closable:
            raise ConflictException("This subscription's plan does not permit manual closing")

        sub.status = target_status
        updated = self.sub_repo.update(sub)

        audit_log = SubscriptionAuditLog(
            subscription_id=sub.id,
            from_status=current_status.value,
            to_status=target_status.value,
            action_note=note or f"Status changed to {target_status.value}",
            user_id=user_id
        )
        self.sub_repo.add_audit_log(audit_log)

        return updated

    def toggle_pause(self, subscription_id: int, user_id: Optional[int] = None) -> Subscription:
        sub = self.sub_repo.get_by_id(subscription_id)
        if not sub:
            raise NotFoundException(f"Subscription {subscription_id} not found")

        if sub.status != SubscriptionStatus.ACTIVE:
            raise ConflictException("Only active subscriptions can be paused or resumed")

        if not sub.plan.pausable and not sub.is_paused:
            raise ConflictException("This subscription's plan does not permit pausing")

        sub.is_paused = not sub.is_paused
        updated = self.sub_repo.update(sub)

        action_label = "Paused" if sub.is_paused else "Resumed"
        audit_log = SubscriptionAuditLog(
            subscription_id=sub.id,
            from_status=sub.status.value,
            to_status=sub.status.value,
            action_note=f"Subscription {action_label}",
            user_id=user_id
        )
        self.sub_repo.add_audit_log(audit_log)

        return updated

    def renew_subscription(self, subscription_id: int, user_id: Optional[int] = None) -> Subscription:
        sub = self.sub_repo.get_by_id(subscription_id)
        if not sub:
            raise NotFoundException(f"Subscription {subscription_id} not found")

        if not sub.plan.renewable:
            raise ConflictException("This subscription's plan does not permit renewal")

        if sub.status not in (SubscriptionStatus.ACTIVE, SubscriptionStatus.CLOSED):
            raise ConflictException("Only active or closed subscriptions can be renewed")

        start = sub.expiry_date if sub.expiry_date and sub.expiry_date >= date.today() else date.today()
        period = sub.plan.billing_period

        if period == BillingPeriod.DAILY:
            expiry = start + timedelta(days=1)
        elif period == BillingPeriod.WEEKLY:
            expiry = start + timedelta(weeks=1)
        elif period == BillingPeriod.MONTHLY:
            expiry = start + timedelta(days=30)
        elif period == BillingPeriod.YEARLY:
            expiry = start + timedelta(days=365)
        else:
            expiry = start + timedelta(days=30)

        sub.expiry_date = expiry
        sub.status = SubscriptionStatus.ACTIVE
        sub.is_paused = False
        updated = self.sub_repo.update(sub)

        audit_log = SubscriptionAuditLog(
            subscription_id=sub.id,
            from_status=sub.status.value,
            to_status=SubscriptionStatus.ACTIVE.value,
            action_note=f"Subscription renewed until {expiry}",
            user_id=user_id
        )
        self.sub_repo.add_audit_log(audit_log)

        return updated
