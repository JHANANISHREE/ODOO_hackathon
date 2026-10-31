from typing import List, Dict, Any, Optional
from datetime import date
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.core.deps import get_current_active_user
from app.core.exceptions import NotFoundException, ForbiddenException, BadRequestException
from app.models.user import User, UserRole
from app.models.subscription import Subscription, SubscriptionStatus
from app.models.invoice import Invoice, InvoiceStatus
from app.models.payment import Payment
from app.repositories.subscription_repo import SubscriptionRepository
from app.repositories.invoice_repo import InvoiceRepository
from app.services.subscription_service import SubscriptionService
from app.schemas.subscription import SubscriptionResponse
from app.schemas.invoice import InvoiceResponse

router = APIRouter(prefix="/portal", tags=["Customer Portal"])

@router.get("/overview")
def get_customer_portal_overview(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    inv_repo = InvoiceRepository(db)

    active_sub = db.query(Subscription).filter(
        Subscription.customer_id == current_user.id,
        Subscription.status == SubscriptionStatus.ACTIVE
    ).first()

    subs_count = db.query(func.count(Subscription.id)).filter(
        Subscription.customer_id == current_user.id
    ).scalar() or 0

    invoices = inv_repo.get_by_customer(current_user.id)
    total_spent = sum(inv.amount_paid for inv in invoices)
    outstanding_balance = sum((inv.total_amount - inv.amount_paid) for inv in invoices if inv.status != InvoiceStatus.CANCELLED)

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
        "active_subscription": {
            "id": active_sub.id,
            "subscription_number": active_sub.subscription_number,
            "plan_name": active_sub.plan.name if active_sub.plan else "Custom Plan",
            "billing_interval": active_sub.plan.billing_period.value if active_sub.plan else "monthly",
            "status": active_sub.status.value,
            "is_paused": active_sub.is_paused,
            "recurring_total": float(active_sub.total_amount),
            "next_billing_date": active_sub.expiry_date.isoformat() if active_sub.expiry_date else None,
            "start_date": active_sub.start_date.isoformat()
        } if active_sub else None,
        "subscriptions_count": subs_count,
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
    return [SubscriptionResponse.model_validate(s) for s in items]

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
    return SubscriptionResponse.model_validate(updated)

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
    return SubscriptionResponse.model_validate(updated)

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
    return SubscriptionResponse.model_validate(updated)
