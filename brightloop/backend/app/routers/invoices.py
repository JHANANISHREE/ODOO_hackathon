from typing import Optional
from datetime import date
from decimal import Decimal
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.deps import get_current_active_user, require_role
from app.core.exceptions import NotFoundException, ForbiddenException, BadRequestException
from app.models.user import User, UserRole
from app.models.invoice import InvoiceStatus
from app.repositories.invoice_repo import InvoiceRepository
from app.services.billing_service import BillingService
from app.schemas.invoice import (
    InvoiceResponse,
    InvoiceListResponse,
    InvoiceTransitionRequest
)

router = APIRouter(prefix="/invoices", tags=["Invoices"])

def enrich_invoice_response(inv) -> InvoiceResponse:
    res = InvoiceResponse.model_validate(inv)
    res.outstanding_balance = (inv.total_amount - inv.amount_paid) if inv.total_amount > inv.amount_paid else Decimal("0.00")
    res.is_overdue = bool(inv.due_date < date.today() and inv.amount_paid < inv.total_amount and inv.status != InvoiceStatus.CANCELLED)
    return res

@router.get("", response_model=InvoiceListResponse)
@router.get("/", response_model=InvoiceListResponse, include_in_schema=False)
def list_invoices(
    customer_id: Optional[int] = None,
    status: Optional[InvoiceStatus] = None,
    is_overdue: Optional[bool] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role == UserRole.CUSTOMER:
        customer_id = current_user.id

    repo = InvoiceRepository(db)
    items, total = repo.list_invoices(
        customer_id=customer_id,
        status=status,
        is_overdue=is_overdue,
        search=search,
        page=page,
        size=size
    )
    pages = (total + size - 1) // size if total > 0 else 1

    return InvoiceListResponse(
        items=[enrich_invoice_response(inv) for inv in items],
        total=total,
        page=page,
        size=size,
        pages=pages
    )

@router.post("/generate/{subscription_id}", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
def generate_invoice_for_sub(
    subscription_id: int,
    current_user: User = require_role(UserRole.ADMIN, UserRole.STAFF),
    db: Session = Depends(get_db)
):
    service = BillingService(db)
    invoice = service.generate_subscription_invoice(subscription_id)
    return enrich_invoice_response(invoice)

@router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(
    invoice_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    repo = InvoiceRepository(db)
    inv = repo.get_by_id(invoice_id)
    if not inv:
        raise NotFoundException(f"Invoice {invoice_id} not found")

    if current_user.role == UserRole.CUSTOMER and inv.customer_id != current_user.id:
        raise ForbiddenException("Access forbidden to this invoice")

    return enrich_invoice_response(inv)

@router.post("/{invoice_id}/transition", response_model=InvoiceResponse)
def transition_invoice(
    invoice_id: int,
    req: InvoiceTransitionRequest,
    current_user: User = require_role(UserRole.ADMIN, UserRole.STAFF),
    db: Session = Depends(get_db)
):
    repo = InvoiceRepository(db)
    inv = repo.get_by_id(invoice_id)
    if not inv:
        raise NotFoundException(f"Invoice {invoice_id} not found")

    action = req.action.lower()
    if action == "confirmed":
        if inv.status != InvoiceStatus.DRAFT:
            raise BadRequestException("Only Draft invoices can be confirmed")
        inv.status = InvoiceStatus.CONFIRMED
    elif action == "cancelled":
        if inv.status == InvoiceStatus.PAID:
            raise BadRequestException("Cannot cancel an already paid invoice")
        inv.status = InvoiceStatus.CANCELLED
    else:
        raise BadRequestException(f"Invalid transition action: {req.action}")

    updated = repo.update(inv)
    return enrich_invoice_response(updated)

@router.post("/{invoice_id}/send")
def send_invoice_notification(
    invoice_id: int,
    current_user: User = require_role(UserRole.ADMIN, UserRole.STAFF),
    db: Session = Depends(get_db)
):
    repo = InvoiceRepository(db)
    inv = repo.get_by_id(invoice_id)
    if not inv:
        raise NotFoundException(f"Invoice {invoice_id} not found")

    recipient = inv.customer.email if inv.customer else "customer@brightloop.com"
    print(f"[MAILER LOG] Invoice {inv.invoice_number} dispatched to {recipient} with total {inv.total_amount}")
    return {"success": True, "message": f"Invoice {inv.invoice_number} sent to {recipient}"}
