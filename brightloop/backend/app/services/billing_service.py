from datetime import date, timedelta
from decimal import Decimal
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import select

from app.core.exceptions import BadRequestException, NotFoundException, ConflictException
from app.models.subscription import Subscription, SubscriptionStatus
from app.models.plan import BillingPeriod
from app.models.invoice import Invoice, InvoiceLine, InvoiceStatus
from app.models.discount import Discount
from app.repositories.subscription_repo import SubscriptionRepository
from app.repositories.invoice_repo import InvoiceRepository
from app.repositories.discount_repo import DiscountRepository
from app.services.discount_service import DiscountService
from app.schemas.invoice import BillingRunSummary

class BillingService:
    def __init__(self, db: Session):
        self.db = db
        self.sub_repo = SubscriptionRepository(db)
        self.inv_repo = InvoiceRepository(db)
        self.disc_repo = DiscountRepository(db)
        self.disc_service = DiscountService(db)

    def get_period_duration(self, period: BillingPeriod) -> timedelta:
        if period == BillingPeriod.DAILY:
            return timedelta(days=1)
        elif period == BillingPeriod.WEEKLY:
            return timedelta(weeks=1)
        elif period == BillingPeriod.MONTHLY:
            return timedelta(days=30)
        elif period == BillingPeriod.YEARLY:
            return timedelta(days=365)
        return timedelta(days=30)

    def generate_subscription_invoice(
        self,
        subscription_id: int,
        period_start: Optional[date] = None,
        period_end: Optional[date] = None
    ) -> Invoice:
        sub = self.sub_repo.get_by_id(subscription_id)
        if not sub:
            raise NotFoundException(f"Subscription {subscription_id} not found")

        duration = self.get_period_duration(sub.plan.billing_period)
        p_start = period_start or sub.start_date
        p_end = period_end or (p_start + duration)

        existing = self.inv_repo.get_by_subscription_period(sub.id, p_start, p_end)
        if existing:
            return existing

        inv_number = self.inv_repo.get_next_invoice_number()
        today = date.today()
        due = today + timedelta(days=15)

        subtotal = Decimal("0.00")
        tax_total = Decimal("0.00")
        total_qty = 0

        invoice = Invoice(
            invoice_number=inv_number,
            subscription_id=sub.id,
            customer_id=sub.customer_id,
            period_start=p_start,
            period_end=p_end,
            issue_date=today,
            due_date=due,
            subtotal=Decimal("0.00"),
            discount_amount=Decimal("0.00"),
            discount_id=None,
            tax_amount=Decimal("0.00"),
            total_amount=Decimal("0.00"),
            amount_paid=Decimal("0.00"),
            status=InvoiceStatus.CONFIRMED
        )

        for line in sub.lines:
            line_sub = Decimal(str(line.unit_price)) * Decimal(line.quantity)
            subtotal += line_sub
            tax_total += Decimal(str(line.tax_amount))
            total_qty += line.quantity

            invoice.lines.append(
                InvoiceLine(
                    product_id=line.product_id,
                    variant_id=line.variant_id,
                    quantity=line.quantity,
                    unit_price=line.unit_price,
                    tax_amount=line.tax_amount,
                    line_total=line.line_amount
                )
            )

        invoice.subtotal = subtotal
        invoice.tax_amount = tax_total

        active_discounts, _ = self.disc_repo.list_discounts(active_only=True, size=100)
        best_discount = None
        best_discount_amt = Decimal("0.00")

        for d in active_discounts:
            eligible, _ = self.disc_service.is_eligible(d, subtotal, total_qty, check_date=today)
            if eligible:
                calc_amt = self.disc_service.compute_discount_amount(d, subtotal)
                if calc_amt > best_discount_amt:
                    best_discount_amt = calc_amt
                    best_discount = d

        if best_discount and best_discount_amt > Decimal("0.00"):
            invoice.discount_id = best_discount.id
            invoice.discount_amount = best_discount_amt
            self.disc_repo.increment_used_count(best_discount.id)

        net_total = (subtotal - invoice.discount_amount) + tax_total
        invoice.total_amount = net_total if net_total > Decimal("0.00") else Decimal("0.00")

        try:
            return self.inv_repo.create(invoice)
        except IntegrityError:
            self.db.rollback()
            existing = self.inv_repo.get_by_subscription_period(sub.id, p_start, p_end)
            if existing:
                return existing
            raise

    def run_automated_billing(self, as_of_date: Optional[date] = None) -> BillingRunSummary:
        target_date = as_of_date or date.today()
        summary = BillingRunSummary(created=0, skipped=0, failed=0, details=[])

        stmt = select(Subscription).where(
            Subscription.status == SubscriptionStatus.ACTIVE,
            Subscription.is_paused == False
        )
        active_subs = list(self.db.execute(stmt).scalars().all())

        for sub in active_subs:
            duration = self.get_period_duration(sub.plan.billing_period)
            curr_start = sub.start_date

            while curr_start < target_date:
                curr_end = curr_start + duration
                if curr_end > target_date + timedelta(days=1):
                    break

                existing = self.inv_repo.get_by_subscription_period(sub.id, curr_start, curr_end)
                if existing:
                    summary.skipped += 1
                else:
                    try:
                        self.generate_subscription_invoice(
                            subscription_id=sub.id,
                            period_start=curr_start,
                            period_end=curr_end
                        )
                        summary.created += 1
                        summary.details.append(f"Generated invoice for {sub.subscription_number} ({curr_start} - {curr_end})")
                    except Exception as exc:
                        summary.failed += 1
                        summary.details.append(f"Failed {sub.subscription_number} ({curr_start} - {curr_end}): {str(exc)}")

                curr_start = curr_end

        return summary
