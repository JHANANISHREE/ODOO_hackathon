from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.deps import require_role, get_current_active_user
from app.core.exceptions import NotFoundException, BadRequestException
from app.models.user import User, UserRole
from app.models.plan import Plan, BillingPeriod
from app.repositories.plan_repo import PlanRepository
from app.schemas.plan import (
    PlanCreate,
    PlanUpdate,
    PlanResponse,
    PlanListResponse
)

router = APIRouter(prefix="/plans", tags=["Plans"])

@router.get("", response_model=PlanListResponse)
def list_plans(
    period: Optional[BillingPeriod] = None,
    active_only: bool = False,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    repo = PlanRepository(db)
    items, total = repo.list_plans(
        period=period,
        active_only=active_only,
        search=search,
        page=page,
        size=size
    )
    pages = (total + size - 1) // size if total > 0 else 1
    return PlanListResponse(
        items=[PlanResponse.model_validate(p) for p in items],
        total=total,
        page=page,
        size=size,
        pages=pages
    )

@router.post("", response_model=PlanResponse, status_code=status.HTTP_201_CREATED)
def create_plan(
    plan_in: PlanCreate,
    current_user: User = require_role(UserRole.ADMIN),
    db: Session = Depends(get_db)
):
    repo = PlanRepository(db)
    existing = repo.get_by_name(plan_in.name)
    if existing:
        raise BadRequestException(f"Plan with name '{plan_in.name}' already exists")

    plan = Plan(
        name=plan_in.name.strip(),
        price=plan_in.price,
        billing_period=plan_in.billing_period,
        minimum_quantity=plan_in.minimum_quantity,
        available_from=plan_in.available_from,
        available_to=plan_in.available_to,
        auto_close=plan_in.auto_close,
        closable=plan_in.closable,
        pausable=plan_in.pausable,
        renewable=plan_in.renewable,
        is_active=plan_in.is_active
    )
    created = repo.create(plan)
    return PlanResponse.model_validate(created)

@router.get("/{plan_id}", response_model=PlanResponse)
def get_plan(
    plan_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    repo = PlanRepository(db)
    plan = repo.get_by_id(plan_id)
    if not plan:
        raise NotFoundException(f"Plan {plan_id} not found")
    return PlanResponse.model_validate(plan)

@router.put("/{plan_id}", response_model=PlanResponse)
def update_plan(
    plan_id: int,
    plan_in: PlanUpdate,
    current_user: User = require_role(UserRole.ADMIN),
    db: Session = Depends(get_db)
):
    repo = PlanRepository(db)
    plan = repo.get_by_id(plan_id)
    if not plan:
        raise NotFoundException(f"Plan {plan_id} not found")

    if plan_in.name is not None:
        plan.name = plan_in.name.strip()
    if plan_in.price is not None:
        plan.price = plan_in.price
    if plan_in.billing_period is not None:
        plan.billing_period = plan_in.billing_period
    if plan_in.minimum_quantity is not None:
        plan.minimum_quantity = plan_in.minimum_quantity
    if plan_in.available_from is not None:
        plan.available_from = plan_in.available_from
    if plan_in.available_to is not None:
        plan.available_to = plan_in.available_to
    if plan_in.auto_close is not None:
        plan.auto_close = plan_in.auto_close
    if plan_in.closable is not None:
        plan.closable = plan_in.closable
    if plan_in.pausable is not None:
        plan.pausable = plan_in.pausable
    if plan_in.renewable is not None:
        plan.renewable = plan_in.renewable
    if plan_in.is_active is not None:
        plan.is_active = plan_in.is_active

    updated = repo.update(plan)
    return PlanResponse.model_validate(updated)

@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_plan(
    plan_id: int,
    current_user: User = require_role(UserRole.ADMIN),
    db: Session = Depends(get_db)
):
    repo = PlanRepository(db)
    plan = repo.get_by_id(plan_id)
    if not plan:
        raise NotFoundException(f"Plan {plan_id} not found")
    repo.delete(plan)
