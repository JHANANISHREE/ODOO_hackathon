from decimal import Decimal
from typing import Optional, Tuple
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.core.exceptions import BadRequestException, NotFoundException
from app.models.invoice import Invoice, InvoiceStatus
from app.models.payment import Payment, PaymentMethod
from app.repositories.invoice_repo import InvoiceRepository
from app.repositories.payment_repo import PaymentRepository

class PaymentService:
    def __init__(self, db: Session):
        self.db = db
        self.inv_repo = InvoiceRepository(db)
        self.pay_repo = PaymentRepository(db)

    def record_payment(
        self,
        invoice_id: int,
        amount: Decimal,
        method: PaymentMethod,
        transaction_reference: Optional[str] = None,
        notes: Optional[str] = None
    ) -> Tuple[Payment, Invoice]:
        invoice = self.inv_repo.get_by_id(invoice_id)
        if not invoice:
            raise NotFoundException(f"Invoice {invoice_id} not found")

        if invoice.status == InvoiceStatus.DRAFT:
            raise BadRequestException("Cannot accept payments on a Draft invoice. Confirm invoice first.")

        if invoice.status == InvoiceStatus.CANCELLED:
            raise BadRequestException("Cannot accept payments on a Cancelled invoice.")

        if invoice.status == InvoiceStatus.PAID:
            raise BadRequestException("Invoice is already fully paid.")

        outstanding = invoice.total_amount - invoice.amount_paid
        pay_amount = Decimal(str(amount)).quantize(Decimal("0.01"))

        if pay_amount <= Decimal("0.00"):
            raise BadRequestException("Payment amount must be greater than zero")

        if pay_amount > outstanding:
            raise BadRequestException(
                f"Overpayment rejected. Outstanding balance is ${outstanding:.2f}, but received ${pay_amount:.2f}"
            )

        payment = Payment(
            invoice_id=invoice.id,
            payment_method=method,
            amount=pay_amount,
            payment_date=datetime.now(timezone.utc),
            transaction_reference=transaction_reference,
            notes=notes
        )
        created_payment = self.pay_repo.create(payment)

        invoice.amount_paid += pay_amount
        if invoice.amount_paid >= invoice.total_amount:
            invoice.status = InvoiceStatus.PAID

        updated_invoice = self.inv_repo.update(invoice)
        return created_payment, updated_invoice
