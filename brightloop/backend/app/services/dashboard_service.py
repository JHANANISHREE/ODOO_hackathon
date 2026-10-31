from datetime import datetime, date, timedelta, timezone
from decimal import Decimal
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.subscription import Subscription, SubscriptionStatus
from app.models.plan import Plan, BillingPeriod
from app.models.invoice import Invoice, InvoiceStatus
from app.models.payment import Payment
from app.models.user import User

class DashboardService:
    def __init__(self, db: Session):
        self.db = db

    def _compute_subscription_recurring_amount(self, sub: Subscription) -> Decimal:
        if sub.lines:
            line_sum = sum(
                Decimal(str(line.line_amount or (line.unit_price * line.quantity + (line.tax_amount or 0))))
                for line in sub.lines
            )
            if line_sum > Decimal("0.00"):
                return line_sum
        if sub.total_amount and sub.total_amount > Decimal("0.00"):
            return sub.total_amount
        if sub.plan and sub.plan.price:
            return sub.plan.price
        return Decimal("0.00")

    def get_summary(self) -> Dict[str, Any]:
        today = date.today()

        active_subs = self.db.query(Subscription).filter(
            Subscription.status == SubscriptionStatus.ACTIVE
        ).all()
        active_count = len(active_subs)
        total_subs_count = self.db.query(func.count(Subscription.id)).scalar() or 0

        mrr = Decimal("0.00")
        plan_counts: Dict[str, int] = {}

        for sub in active_subs:
            plan = sub.plan
            amount = self._compute_subscription_recurring_amount(sub)
            if plan:
                p_name = plan.name
                plan_counts[p_name] = plan_counts.get(p_name, 0) + 1
                if plan.billing_period == BillingPeriod.DAILY:
                    mrr += amount * Decimal("30")
                elif plan.billing_period == BillingPeriod.WEEKLY:
                    mrr += amount * Decimal("4.3333")
                elif plan.billing_period == BillingPeriod.MONTHLY:
                    mrr += amount
                elif plan.billing_period == BillingPeriod.YEARLY:
                    mrr += amount / Decimal("12")
            else:
                mrr += amount

        arr = mrr * Decimal("12")

        total_rev = self.db.query(func.coalesce(func.sum(Payment.amount), Decimal("0.00"))).scalar()

        valid_invoices = self.db.query(Invoice).filter(
            Invoice.status.notin_([InvoiceStatus.DRAFT, InvoiceStatus.CANCELLED])
        ).all()

        lifetime_invoiced = sum(inv.total_amount for inv in valid_invoices)
        outstanding = sum(
            max(Decimal("0.00"), inv.total_amount - inv.amount_paid)
            for inv in valid_invoices
            if inv.status == InvoiceStatus.CONFIRMED and inv.amount_paid < inv.total_amount
        )

        if outstanding > lifetime_invoiced:
            outstanding = lifetime_invoiced

        overdue_count = sum(
            1 for inv in valid_invoices
            if inv.due_date < today and inv.amount_paid < inv.total_amount and inv.status != InvoiceStatus.PAID
        )

        recent_subs_models = self.db.query(Subscription).order_by(
            Subscription.created_at.desc()
        ).limit(6).all()

        recent_subscriptions = []
        for s in recent_subs_models:
            rec_val = self._compute_subscription_recurring_amount(s)
            recent_subscriptions.append({
                "id": s.id,
                "subscription_number": s.subscription_number,
                "customer_name": s.customer.name if s.customer else "Customer",
                "customer_email": s.customer.email if s.customer else "",
                "plan_name": s.plan.name if s.plan else "Custom Plan",
                "status": s.status.value,
                "recurring_total": float(round(rec_val, 2)),
                "created_at": s.created_at.isoformat()
            })

        months_labels = []
        months_revenue = []

        for i in range(5, -1, -1):
            m_date = today.replace(day=1) - timedelta(days=i * 28)
            m_start = m_date.replace(day=1)
            next_m = (m_start.replace(day=28) + timedelta(days=4)).replace(day=1)
            label = m_start.strftime("%b %Y")
            months_labels.append(label)

            m_sum = self.db.query(func.coalesce(func.sum(Payment.amount), Decimal("0.00"))).filter(
                Payment.created_at >= datetime(m_start.year, m_start.month, m_start.day, tzinfo=timezone.utc),
                Payment.created_at < datetime(next_m.year, next_m.month, next_m.day, tzinfo=timezone.utc)
            ).scalar()
            months_revenue.append(float(m_sum))

        return {
            "active_subscriptions": active_count,
            "total_subscriptions": total_subs_count,
            "mrr": float(round(mrr, 2)),
            "arr": float(round(arr, 2)),
            "lifetime_invoiced": float(round(lifetime_invoiced, 2)),
            "total_revenue": float(round(total_rev, 2)),
            "outstanding_balance": float(round(outstanding, 2)),
            "overdue_invoices_count": overdue_count,
            "plan_distribution": {
                "labels": list(plan_counts.keys()),
                "data": list(plan_counts.values())
            },
            "revenue_chart": {
                "labels": months_labels,
                "data": months_revenue
            },
            "recent_subscriptions": recent_subscriptions
        }
