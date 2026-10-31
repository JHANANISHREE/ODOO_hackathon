from typing import Optional, List, Tuple
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import select, func
from app.models.discount import Discount

class DiscountRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, discount_id: int) -> Optional[Discount]:
        stmt = select(Discount).options(selectinload(Discount.product)).where(Discount.id == discount_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def get_by_code(self, code: str) -> Optional[Discount]:
        stmt = select(Discount).options(selectinload(Discount.product)).where(func.lower(Discount.code) == code.strip().lower())
        return self.db.execute(stmt).scalar_one_or_none()

    def create(self, discount: Discount) -> Discount:
        self.db.add(discount)
        self.db.commit()
        self.db.refresh(discount)
        return self.get_by_id(discount.id)

    def update(self, discount: Discount) -> Discount:
        self.db.commit()
        self.db.refresh(discount)
        return self.get_by_id(discount.id)

    def delete(self, discount: Discount) -> None:
        self.db.delete(discount)
        self.db.commit()

    def increment_used_count(self, discount_id: int) -> None:
        discount = self.db.get(Discount, discount_id)
        if discount:
            discount.used_count += 1
            self.db.commit()

    def list_discounts(
        self,
        active_only: bool = False,
        search: Optional[str] = None,
        page: int = 1,
        size: int = 50
    ) -> Tuple[List[Discount], int]:
        stmt = select(Discount).options(selectinload(Discount.product))
        count_stmt = select(func.count(Discount.id))

        if active_only:
            stmt = stmt.where(Discount.is_active == True)
            count_stmt = count_stmt.where(Discount.is_active == True)

        if search:
            pattern = f"%{search.strip().lower()}%"
            stmt = stmt.where(func.lower(Discount.code).like(pattern))
            count_stmt = count_stmt.where(func.lower(Discount.code).like(pattern))

        total = self.db.execute(count_stmt).scalar() or 0
        offset = (page - 1) * size
        stmt = stmt.order_by(Discount.id.desc()).offset(offset).limit(size)
        items = list(self.db.execute(stmt).scalars().all())

        return items, total
