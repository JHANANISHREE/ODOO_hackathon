from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.deps import require_role, get_current_active_user
from app.core.exceptions import NotFoundException, BadRequestException
from app.models.user import User, UserRole
from app.models.template import QuotationTemplate, TemplateLine
from app.repositories.template_repo import TemplateRepository
from app.repositories.plan_repo import PlanRepository
from app.repositories.product_repo import ProductRepository
from app.schemas.template import (
    TemplateCreate,
    TemplateUpdate,
    TemplateResponse,
    TemplateListResponse
)

router = APIRouter(prefix="/templates", tags=["Quotation Templates"])

@router.get("", response_model=TemplateListResponse)
def list_templates(
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    repo = TemplateRepository(db)
    items, total = repo.list_templates(search=search, page=page, size=size)
    pages = (total + size - 1) // size if total > 0 else 1
    return TemplateListResponse(
        items=[TemplateResponse.model_validate(t) for t in items],
        total=total,
        page=page,
        size=size,
        pages=pages
    )

@router.post("", response_model=TemplateResponse, status_code=status.HTTP_201_CREATED)
def create_template(
    temp_in: TemplateCreate,
    current_user: User = require_role(UserRole.ADMIN, UserRole.STAFF),
    db: Session = Depends(get_db)
):
    plan_repo = PlanRepository(db)
    if not plan_repo.get_by_id(temp_in.plan_id):
        raise NotFoundException(f"Plan {temp_in.plan_id} not found")

    prod_repo = ProductRepository(db)
    template = QuotationTemplate(
        name=temp_in.name.strip(),
        validity_days=temp_in.validity_days,
        plan_id=temp_in.plan_id
    )

    for line_in in temp_in.lines:
        if not prod_repo.get_by_id(line_in.product_id):
            raise NotFoundException(f"Product {line_in.product_id} not found")
        template.lines.append(
            TemplateLine(
                product_id=line_in.product_id,
                variant_id=line_in.variant_id,
                quantity=line_in.quantity,
                unit_price=line_in.unit_price
            )
        )

    repo = TemplateRepository(db)
    created = repo.create(template)
    return TemplateResponse.model_validate(created)

@router.get("/{template_id}", response_model=TemplateResponse)
def get_template(
    template_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    repo = TemplateRepository(db)
    template = repo.get_by_id(template_id)
    if not template:
        raise NotFoundException(f"Template {template_id} not found")
    return TemplateResponse.model_validate(template)

@router.put("/{template_id}", response_model=TemplateResponse)
def update_template(
    template_id: int,
    temp_in: TemplateUpdate,
    current_user: User = require_role(UserRole.ADMIN, UserRole.STAFF),
    db: Session = Depends(get_db)
):
    repo = TemplateRepository(db)
    template = repo.get_by_id(template_id)
    if not template:
        raise NotFoundException(f"Template {template_id} not found")

    if temp_in.name is not None:
        template.name = temp_in.name.strip()
    if temp_in.validity_days is not None:
        template.validity_days = temp_in.validity_days
    if temp_in.plan_id is not None:
        plan_repo = PlanRepository(db)
        if not plan_repo.get_by_id(temp_in.plan_id):
            raise NotFoundException(f"Plan {temp_in.plan_id} not found")
        template.plan_id = temp_in.plan_id

    if temp_in.lines is not None:
        template.lines.clear()
        prod_repo = ProductRepository(db)
        for line_in in temp_in.lines:
            if not prod_repo.get_by_id(line_in.product_id):
                raise NotFoundException(f"Product {line_in.product_id} not found")
            template.lines.append(
                TemplateLine(
                    product_id=line_in.product_id,
                    variant_id=line_in.variant_id,
                    quantity=line_in.quantity,
                    unit_price=line_in.unit_price
                )
            )

    updated = repo.update(template)
    return TemplateResponse.model_validate(updated)

@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_template(
    template_id: int,
    current_user: User = require_role(UserRole.ADMIN),
    db: Session = Depends(get_db)
):
    repo = TemplateRepository(db)
    template = repo.get_by_id(template_id)
    if not template:
        raise NotFoundException(f"Template {template_id} not found")
    repo.delete(template)
