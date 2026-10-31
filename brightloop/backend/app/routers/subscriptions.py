from typing import Optional
from datetime import date
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.deps import get_current_active_user, require_role
from app.core.exceptions import NotFoundException, ForbiddenException, BadRequestException
from app.models.user import User, UserRole
from app.models.subscription import SubscriptionStatus
from app.repositories.subscription_repo import SubscriptionRepository
from app.services.subscription_service import SubscriptionService
from app.routers.portal import get_subscription_recurring_total, compute_subscription_next_billing
from app.schemas.subscription import (
    SubscriptionCreate,
    SubscriptionFromTemplateCreate,
    SubscriptionTransitionRequest,
    SubscriptionResponse,
    SubscriptionListResponse
)

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])

@router.get("", response_model=SubscriptionListResponse)
@router.get("/", response_model=SubscriptionListResponse, include_in_schema=False)
def list_subscriptions(
    customer_id: Optional[int] = None,
    status: Optional[SubscriptionStatus] = None,
    search: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    repo = SubscriptionRepository(db)

    if current_user.role == UserRole.CUSTOMER:
        customer_id = current_user.id

    items, total = repo.list_subscriptions(
        customer_id=customer_id,
        status=status,
        search=search,
        start_date=start_date,
        end_date=end_date,
        page=page,
        size=size
    )
    pages = (total + size - 1) // size if total > 0 else 1

    responses = []
    for s in items:
        resp = SubscriptionResponse.model_validate(s)
        rec_tot = get_subscription_recurring_total(s)
        resp.recurring_total = rec_tot
        resp.total_amount = rec_tot
        resp.next_billing_date = compute_subscription_next_billing(s, db)
        responses.append(resp)

    return SubscriptionListResponse(
        items=responses,
        total=total,
        page=page,
        size=size,
        pages=pages
    )

@router.post("", response_model=SubscriptionResponse, status_code=status.HTTP_201_CREATED)
def create_subscription(
    sub_in: SubscriptionCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role == UserRole.CUSTOMER:
        sub_in.customer_id = current_user.id

    service = SubscriptionService(db)
    created = service.create_subscription(sub_in, user_id=current_user.id)
    resp = SubscriptionResponse.model_validate(created)
    rec_tot = get_subscription_recurring_total(created)
    resp.recurring_total = rec_tot
    resp.total_amount = rec_tot
    resp.next_billing_date = compute_subscription_next_billing(created, db)
    return resp

@router.post("/from-template", response_model=SubscriptionResponse, status_code=status.HTTP_201_CREATED)
def create_from_template(
    req: SubscriptionFromTemplateCreate,
    current_user: User = require_role(UserRole.ADMIN, UserRole.STAFF),
    db: Session = Depends(get_db)
):
    service = SubscriptionService(db)
    created = service.create_from_template(req, user_id=current_user.id)
    resp = SubscriptionResponse.model_validate(created)
    rec_tot = get_subscription_recurring_total(created)
    resp.recurring_total = rec_tot
    resp.total_amount = rec_tot
    resp.next_billing_date = compute_subscription_next_billing(created, db)
    return resp

@router.get("/{subscription_id}", response_model=SubscriptionResponse)
def get_subscription(
    subscription_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    repo = SubscriptionRepository(db)
    sub = repo.get_by_id(subscription_id)
    if not sub:
        raise NotFoundException(f"Subscription {subscription_id} not found")

    if current_user.role == UserRole.CUSTOMER and sub.customer_id != current_user.id:
        raise ForbiddenException("Access forbidden to this subscription record")

    resp = SubscriptionResponse.model_validate(sub)
    rec_tot = get_subscription_recurring_total(sub)
    resp.recurring_total = rec_tot
    resp.total_amount = rec_tot
    resp.next_billing_date = compute_subscription_next_billing(sub, db)
    return resp

@router.post("/{subscription_id}/transition", response_model=SubscriptionResponse)
def transition_subscription(
    subscription_id: int,
    req: SubscriptionTransitionRequest,
    current_user: User = require_role(UserRole.ADMIN, UserRole.STAFF),
    db: Session = Depends(get_db)
):
    try:
        target_status = SubscriptionStatus(req.action.lower())
    except ValueError:
        raise BadRequestException(f"Unknown status action: {req.action}")

    service = SubscriptionService(db)
    updated = service.transition_status(
        subscription_id=subscription_id,
        target_status=target_status,
        user_id=current_user.id,
        note=req.note
    )
    resp = SubscriptionResponse.model_validate(updated)
    rec_tot = get_subscription_recurring_total(updated)
    resp.recurring_total = rec_tot
    resp.total_amount = rec_tot
    resp.next_billing_date = compute_subscription_next_billing(updated, db)
    return resp

@router.post("/{subscription_id}/toggle-pause", response_model=SubscriptionResponse)
def toggle_pause_subscription(
    subscription_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    repo = SubscriptionRepository(db)
    sub = repo.get_by_id(subscription_id)
    if not sub:
        raise NotFoundException(f"Subscription {subscription_id} not found")

    if current_user.role == UserRole.CUSTOMER and sub.customer_id != current_user.id:
        raise ForbiddenException("Access forbidden")

    service = SubscriptionService(db)
    updated = service.toggle_pause(subscription_id, user_id=current_user.id)
    resp = SubscriptionResponse.model_validate(updated)
    rec_tot = get_subscription_recurring_total(updated)
    resp.recurring_total = rec_tot
    resp.total_amount = rec_tot
    resp.next_billing_date = compute_subscription_next_billing(updated, db)
    return resp

@router.post("/{subscription_id}/renew", response_model=SubscriptionResponse)
def renew_subscription(
    subscription_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    repo = SubscriptionRepository(db)
    sub = repo.get_by_id(subscription_id)
    if not sub:
        raise NotFoundException(f"Subscription {subscription_id} not found")

    if current_user.role == UserRole.CUSTOMER and sub.customer_id != current_user.id:
        raise ForbiddenException("Access forbidden")

    service = SubscriptionService(db)
    updated = service.renew_subscription(subscription_id, user_id=current_user.id)
    resp = SubscriptionResponse.model_validate(updated)
    rec_tot = get_subscription_recurring_total(updated)
    resp.recurring_total = rec_tot
    resp.total_amount = rec_tot
    resp.next_billing_date = compute_subscription_next_billing(updated, db)
    return resp
