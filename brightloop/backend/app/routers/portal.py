from typing import List, Dict, Any, Optional
from datetime import date, timedelta
from decimal import Decimal
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.core.deps import get_current_active_user
from app.core.exceptions import NotFoundException, ForbiddenException, BadRequestException
from app.models.user import User, UserRole
from app.models.subscription import Subscription, SubscriptionStatus
from app.models.plan import BillingPeriod
from app.models.invoice import Invoice, InvoiceStatus
from app.models.payment import Payment
from app.repositories.subscription_repo import SubscriptionRepository
from app.repositories.invoice_repo import InvoiceRepository
from app.services.subscription_service import SubscriptionService
from app.schemas.subscription import SubscriptionResponse
from app.schemas.invoice import InvoiceResponse

router = APIRouter(prefix="/portal", tags=["Customer Portal"])

def get_subscription_recurring_total(sub: Optional[Subscription]) -> Decimal:
    if not sub:
        return Decimal("0.00")
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

def compute_subscription_next_billing(sub: Subscription, db: Session) -> Optional[date]:
    if sub.status != SubscriptionStatus.ACTIVE:
        return None
    latest_inv = db.query(Invoice).filter(
        Invoice.subscription_id == sub.id,
        Invoice.status != InvoiceStatus.CANCELLED
    ).order_by(Invoice.period_end.desc()).first()

    base_date = latest_inv.period_end if (latest_inv and latest_inv.period_end) else (sub.start_date or date.today())
    period = sub.plan.billing_period if sub.plan else BillingPeriod.MONTHLY

    if period == BillingPeriod.DAILY:
        return base_date + timedelta(days=1)
    elif period == BillingPeriod.WEEKLY:
        return base_date + timedelta(weeks=1)
    elif period == BillingPeriod.MONTHLY:
        return base_date + timedelta(days=30)
    elif period == BillingPeriod.YEARLY:
        return base_date + timedelta(days=365)
    return base_date + timedelta(days=30)

@router.get("/overview")
def get_customer_portal_overview(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    inv_repo = InvoiceRepository(db)

    active_subs = db.query(Subscription).filter(
        Subscription.customer_id == current_user.id,
        Subscription.status == SubscriptionStatus.ACTIVE
    ).all()

    if active_subs:
        active_subs.sort(key=lambda s: (s.expiry_date is None, s.expiry_date or date.max, -get_subscription_recurring_total(s)))
        featured_sub = active_subs[0]
    else:
        featured_sub = db.query(Subscription).filter(
            Subscription.customer_id == current_user.id
        ).order_by(Subscription.id.desc()).first()

    subs_count = db.query(func.count(Subscription.id)).filter(
        Subscription.customer_id == current_user.id
    ).scalar() or 0

    invoices = inv_repo.get_by_customer(current_user.id)

    valid_invoices = [inv for inv in invoices if inv.status not in (InvoiceStatus.DRAFT, InvoiceStatus.CANCELLED)]
    lifetime_invoiced = sum(inv.total_amount for inv in valid_invoices)
    total_spent = sum(inv.amount_paid for inv in valid_invoices)

    outstanding_balance = sum(
        max(Decimal("0.00"), inv.total_amount - inv.amount_paid)
        for inv in valid_invoices
        if inv.status == InvoiceStatus.CONFIRMED and inv.amount_paid < inv.total_amount
    )

    if outstanding_balance > lifetime_invoiced:
        outstanding_balance = lifetime_invoiced

    interval_mapping = {
        "daily": "day",
        "weekly": "week",
        "monthly": "month",
        "yearly": "year"
    }

    featured_sub_data = None
    if featured_sub:
        raw_interval = featured_sub.plan.billing_period.value.lower() if featured_sub.plan else "monthly"
        billing_interval = interval_mapping.get(raw_interval, raw_interval)
        recurring_total = get_subscription_recurring_total(featured_sub)
        next_billing = compute_subscription_next_billing(featured_sub, db)

        featured_sub_data = {
            "id": featured_sub.id,
            "subscription_number": featured_sub.subscription_number,
            "plan_name": featured_sub.plan.name if featured_sub.plan else "Custom Plan",
            "billing_interval": billing_interval,
            "status": featured_sub.status.value,
            "is_paused": featured_sub.is_paused,
            "recurring_total": float(round(recurring_total, 2)),
            "next_billing_date": next_billing.isoformat() if next_billing else None,
            "start_date": featured_sub.start_date.isoformat()
        }

    recent_invoices = [
        {
            "id": inv.id,
            "invoice_number": inv.invoice_number,
            "issue_date": inv.issue_date.isoformat(),
            "due_date": inv.due_date.isoformat(),
            "total_amount": float(inv.total_amount),
            "amount_paid": float(inv.amount_paid),
            "outstanding_balance": float(max(0, inv.total_amount - inv.amount_paid)),
            "status": inv.status.value
        }
        for inv in invoices[:5]
    ]

    return {
        "customer": {
            "id": current_user.id,
            "name": current_user.name,
            "email": current_user.email,
            "phone": current_user.phone
        },
        "active_subscription": featured_sub_data,
        "subscriptions_count": subs_count,
        "lifetime_invoiced": float(round(lifetime_invoiced, 2)),
        "total_spent": float(round(total_spent, 2)),
        "outstanding_balance": float(round(outstanding_balance, 2)),
        "recent_invoices": recent_invoices
    }

@router.get("/subscriptions")
def list_my_subscriptions(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    repo = SubscriptionRepository(db)
    items, total = repo.list_subscriptions(customer_id=current_user.id, size=100)
    results = []
    for s in items:
        resp = SubscriptionResponse.model_validate(s)
        rec_tot = get_subscription_recurring_total(s)
        resp.recurring_total = rec_tot
        resp.total_amount = rec_tot
        resp.next_billing_date = compute_subscription_next_billing(s, db)
        results.append(resp)
    return results

@router.get("/invoices")
def list_my_invoices(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    repo = InvoiceRepository(db)
    items = repo.get_by_customer(current_user.id)
    results = []
    for inv in items:
        resp = InvoiceResponse.model_validate(inv)
        resp.outstanding_balance = max(0, inv.total_amount - inv.amount_paid)
        resp.is_overdue = bool(inv.due_date < date.today() and inv.amount_paid < inv.total_amount and inv.status != InvoiceStatus.CANCELLED)
        results.append(resp)
    return results

@router.post("/subscriptions/{sub_id}/pause")
def pause_my_subscription(
    sub_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    repo = SubscriptionRepository(db)
    sub = repo.get_by_id(sub_id)
    if not sub:
        raise NotFoundException(f"Subscription {sub_id} not found")
    if sub.customer_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise ForbiddenException("Access denied to this subscription")

    service = SubscriptionService(db)
    if not sub.is_paused:
        updated = service.toggle_pause(subscription_id=sub.id, user_id=current_user.id)
    else:
        updated = sub
    resp = SubscriptionResponse.model_validate(updated)
    resp.recurring_total = get_subscription_recurring_total(updated)
    resp.next_billing_date = compute_subscription_next_billing(updated, db)
    return resp

@router.post("/subscriptions/{sub_id}/resume")
def resume_my_subscription(
    sub_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    repo = SubscriptionRepository(db)
    sub = repo.get_by_id(sub_id)
    if not sub:
        raise NotFoundException(f"Subscription {sub_id} not found")
    if sub.customer_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise ForbiddenException("Access denied to this subscription")

    service = SubscriptionService(db)
    if sub.is_paused:
        updated = service.toggle_pause(subscription_id=sub.id, user_id=current_user.id)
    else:
        updated = sub
    resp = SubscriptionResponse.model_validate(updated)
    resp.recurring_total = get_subscription_recurring_total(updated)
    resp.next_billing_date = compute_subscription_next_billing(updated, db)
    return resp

@router.post("/subscriptions/{sub_id}/cancel")
def cancel_my_subscription(
    sub_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    repo = SubscriptionRepository(db)
    sub = repo.get_by_id(sub_id)
    if not sub:
        raise NotFoundException(f"Subscription {sub_id} not found")
    if sub.customer_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise ForbiddenException("Access denied to this subscription")

    service = SubscriptionService(db)
    updated = service.transition_status(
        subscription_id=sub.id,
        target_status=SubscriptionStatus.CLOSED,
        user_id=current_user.id,
        note="Cancelled by customer via portal"
    )
    resp = SubscriptionResponse.model_validate(updated)
    resp.recurring_total = get_subscription_recurring_total(updated)
    resp.next_billing_date = None
    return resp
