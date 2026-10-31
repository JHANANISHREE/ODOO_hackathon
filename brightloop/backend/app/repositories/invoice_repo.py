from typing import Optional, List, Tuple
from datetime import date
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import select, func, and_, or_
from app.models.invoice import Invoice, InvoiceLine, InvoiceStatus
from app.models.user import User

class InvoiceRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, invoice_id: int) -> Optional[Invoice]:
        stmt = (
            select(Invoice)
            .options(
                selectinload(Invoice.customer),
                selectinload(Invoice.discount),
                selectinload(Invoice.lines).selectinload(InvoiceLine.product),
                selectinload(Invoice.lines).selectinload(InvoiceLine.variant),
                selectinload(Invoice.payments)
            )
            .where(Invoice.id == invoice_id)
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def get_by_subscription_period(self, subscription_id: int, start: date, end: date) -> Optional[Invoice]:
        stmt = select(Invoice).where(
            and_(
                Invoice.subscription_id == subscription_id,
                Invoice.period_start == start,
                Invoice.period_end == end
            )
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def get_next_invoice_number(self) -> str:
        count = self.db.execute(select(func.count(Invoice.id))).scalar() or 0
        return f"INV-{count + 1:04d}"

    def create(self, invoice: Invoice) -> Invoice:
        self.db.add(invoice)
        self.db.commit()
        self.db.refresh(invoice)
        return self.get_by_id(invoice.id)

    def update(self, invoice: Invoice) -> Invoice:
        self.db.commit()
        self.db.refresh(invoice)
        return self.get_by_id(invoice.id)

    def get_by_customer(self, customer_id: int) -> List[Invoice]:
        items, _ = self.list_invoices(customer_id=customer_id, size=100)
        return items

    def list_invoices(
        self,
        customer_id: Optional[int] = None,
        status: Optional[InvoiceStatus] = None,
        is_overdue: Optional[bool] = None,
        search: Optional[str] = None,
        page: int = 1,
        size: int = 20
    ) -> Tuple[List[Invoice], int]:
        stmt = (
            select(Invoice)
            .options(
                selectinload(Invoice.customer),
                selectinload(Invoice.discount),
                selectinload(Invoice.lines).selectinload(InvoiceLine.product),
                selectinload(Invoice.lines).selectinload(InvoiceLine.variant),
                selectinload(Invoice.payments)
            )
        )
        count_stmt = select(func.count(Invoice.id))

        if customer_id:
            stmt = stmt.where(Invoice.customer_id == customer_id)
            count_stmt = count_stmt.where(Invoice.customer_id == customer_id)

        if status:
            stmt = stmt.where(Invoice.status == status)
            count_stmt = count_stmt.where(Invoice.status == status)

        if is_overdue is True:
            overdue_cond = and_(
                Invoice.due_date < date.today(),
                Invoice.amount_paid < Invoice.total_amount,
                Invoice.status != InvoiceStatus.CANCELLED
            )
            stmt = stmt.where(overdue_cond)
            count_stmt = count_stmt.where(overdue_cond)

        if search:
            pattern = f"%{search.strip().lower()}%"
            filter_cond = or_(
                func.lower(Invoice.invoice_number).like(pattern),
                Invoice.customer_id.in_(
                    select(User.id).where(func.lower(User.name).like(pattern))
                )
            )
            stmt = stmt.where(filter_cond)
            count_stmt = count_stmt.where(filter_cond)

        total = self.db.execute(count_stmt).scalar() or 0
        offset = (page - 1) * size
        stmt = stmt.order_by(Invoice.id.desc()).offset(offset).limit(size)
        items = list(self.db.execute(stmt).scalars().all())

        return items, total
