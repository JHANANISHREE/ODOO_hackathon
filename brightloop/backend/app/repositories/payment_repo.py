from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from app.models.payment import Payment

class PaymentRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, payment_id: int) -> Optional[Payment]:
        return self.db.get(Payment, payment_id)

    def create(self, payment: Payment) -> Payment:
        self.db.add(payment)
        self.db.commit()
        self.db.refresh(payment)
        return payment

    def list_by_invoice(self, invoice_id: int) -> List[Payment]:
        stmt = select(Payment).where(Payment.invoice_id == invoice_id).order_by(Payment.id.desc())
        return list(self.db.execute(stmt).scalars().all())

    def list_payments(
        self,
        page: int = 1,
        size: int = 20
    ) -> Tuple[List[Payment], int]:
        stmt = select(Payment)
        count_stmt = select(func.count(Payment.id))

        total = self.db.execute(count_stmt).scalar() or 0
        offset = (page - 1) * size
        stmt = stmt.order_by(Payment.id.desc()).offset(offset).limit(size)
        items = list(self.db.execute(stmt).scalars().all())

        return items, total
