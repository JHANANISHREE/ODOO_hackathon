from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from app.models.tax import Tax

class TaxRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, tax_id: int) -> Optional[Tax]:
        return self.db.get(Tax, tax_id)

    def get_by_name(self, name: str) -> Optional[Tax]:
        stmt = select(Tax).where(func.lower(Tax.name) == name.strip().lower())
        return self.db.execute(stmt).scalar_one_or_none()

    def create(self, tax: Tax) -> Tax:
        self.db.add(tax)
        self.db.commit()
        self.db.refresh(tax)
        return tax

    def update(self, tax: Tax) -> Tax:
        self.db.commit()
        self.db.refresh(tax)
        return tax

    def delete(self, tax: Tax) -> None:
        self.db.delete(tax)
        self.db.commit()

    def list_taxes(
        self,
        active_only: bool = False,
        search: Optional[str] = None,
        page: int = 1,
        size: int = 50
    ) -> Tuple[List[Tax], int]:
        stmt = select(Tax)
        count_stmt = select(func.count(Tax.id))

        if active_only:
            stmt = stmt.where(Tax.is_active == True)
            count_stmt = count_stmt.where(Tax.is_active == True)

        if search:
            pattern = f"%{search.strip().lower()}%"
            stmt = stmt.where(func.lower(Tax.name).like(pattern))
            count_stmt = count_stmt.where(func.lower(Tax.name).like(pattern))

        total = self.db.execute(count_stmt).scalar() or 0
        offset = (page - 1) * size
        stmt = stmt.order_by(Tax.id.desc()).offset(offset).limit(size)
        items = list(self.db.execute(stmt).scalars().all())

        return items, total
