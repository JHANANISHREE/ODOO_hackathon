from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.deps import require_role, get_current_active_user
from app.models.user import User, UserRole
from app.repositories.payment_repo import PaymentRepository
from app.services.payment_service import PaymentService
from app.schemas.payment import (
    PaymentCreate,
    PaymentResponse,
    PaymentListResponse
)

router = APIRouter(prefix="/payments", tags=["Payments"])

def enrich_payment_response(p) -> PaymentResponse:
    res = PaymentResponse.model_validate(p)
    if p.invoice:
        res.invoice_number = p.invoice.invoice_number
        if p.invoice.customer:
            res.customer_name = p.invoice.customer.name
    return res

@router.get("", response_model=PaymentListResponse)
@router.get("/", response_model=PaymentListResponse, include_in_schema=False)
def list_payments(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: User = require_role(UserRole.ADMIN, UserRole.STAFF),
    db: Session = Depends(get_db)
):
    repo = PaymentRepository(db)
    items, total = repo.list_payments(page=page, size=size)
    pages = (total + size - 1) // size if total > 0 else 1

    return PaymentListResponse(
        items=[enrich_payment_response(p) for p in items],
        total=total,
        page=page,
        size=size,
        pages=pages
    )

@router.post("", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def record_payment(
    pay_in: PaymentCreate,
    current_user: User = require_role(UserRole.ADMIN, UserRole.STAFF),
    db: Session = Depends(get_db)
):
    service = PaymentService(db)
    payment, _ = service.record_payment(
        invoice_id=pay_in.invoice_id,
        amount=pay_in.amount,
        method=pay_in.payment_method,
        transaction_reference=pay_in.transaction_reference,
        notes=pay_in.notes
    )
    return enrich_payment_response(payment)
