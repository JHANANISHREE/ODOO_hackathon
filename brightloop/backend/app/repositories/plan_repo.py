from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from app.models.plan import Plan, BillingPeriod

class PlanRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, plan_id: int) -> Optional[Plan]:
        return self.db.get(Plan, plan_id)

    def get_by_name(self, name: str) -> Optional[Plan]:
        stmt = select(Plan).where(func.lower(Plan.name) == name.strip().lower())
        return self.db.execute(stmt).scalar_one_or_none()

    def create(self, plan: Plan) -> Plan:
        self.db.add(plan)
        self.db.commit()
        self.db.refresh(plan)
        return plan

    def update(self, plan: Plan) -> Plan:
        self.db.commit()
        self.db.refresh(plan)
        return plan

    def delete(self, plan: Plan) -> None:
        self.db.delete(plan)
        self.db.commit()

    def list_plans(
        self,
        period: Optional[BillingPeriod] = None,
        active_only: bool = False,
        search: Optional[str] = None,
        page: int = 1,
        size: int = 20
    ) -> Tuple[List[Plan], int]:
        stmt = select(Plan)
        count_stmt = select(func.count(Plan.id))

        if active_only:
            stmt = stmt.where(Plan.is_active == True)
            count_stmt = count_stmt.where(Plan.is_active == True)

        if period:
            stmt = stmt.where(Plan.billing_period == period)
            count_stmt = count_stmt.where(Plan.billing_period == period)

        if search:
            pattern = f"%{search.strip().lower()}%"
            stmt = stmt.where(func.lower(Plan.name).like(pattern))
            count_stmt = count_stmt.where(func.lower(Plan.name).like(pattern))

        total = self.db.execute(count_stmt).scalar() or 0
        offset = (page - 1) * size
        stmt = stmt.order_by(Plan.id.desc()).offset(offset).limit(size)
        items = list(self.db.execute(stmt).scalars().all())

        return items, total
