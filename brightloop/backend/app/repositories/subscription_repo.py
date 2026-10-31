from typing import Optional, List, Tuple
from datetime import date
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import select, func, or_
from app.models.subscription import Subscription, SubscriptionLine, SubscriptionStatus
from app.models.audit import SubscriptionAuditLog
from app.models.user import User

class SubscriptionRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, subscription_id: int) -> Optional[Subscription]:
        stmt = (
            select(Subscription)
            .options(
                selectinload(Subscription.customer),
                selectinload(Subscription.plan),
                selectinload(Subscription.lines).selectinload(SubscriptionLine.product),
                selectinload(Subscription.lines).selectinload(SubscriptionLine.variant),
                selectinload(Subscription.lines).selectinload(SubscriptionLine.tax),
                selectinload(Subscription.audit_logs).selectinload(SubscriptionAuditLog.user)
            )
            .where(Subscription.id == subscription_id)
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def get_by_number(self, sub_number: str) -> Optional[Subscription]:
        stmt = (
            select(Subscription)
            .options(
                selectinload(Subscription.customer),
                selectinload(Subscription.plan),
                selectinload(Subscription.lines),
                selectinload(Subscription.audit_logs)
            )
            .where(Subscription.subscription_number == sub_number)
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def create(self, subscription: Subscription) -> Subscription:
        self.db.add(subscription)
        self.db.commit()
        self.db.refresh(subscription)
        return self.get_by_id(subscription.id)

    def update(self, subscription: Subscription) -> Subscription:
        self.db.commit()
        self.db.refresh(subscription)
        return self.get_by_id(subscription.id)

    def add_audit_log(self, log: SubscriptionAuditLog) -> SubscriptionAuditLog:
        self.db.add(log)
        self.db.commit()
        self.db.refresh(log)
        return log

    def get_next_subscription_number(self) -> str:
        count = self.db.execute(select(func.count(Subscription.id))).scalar() or 0
        return f"SUB-{count + 1:04d}"

    def list_subscriptions(
        self,
        customer_id: Optional[int] = None,
        status: Optional[SubscriptionStatus] = None,
        search: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        page: int = 1,
        size: int = 20
    ) -> Tuple[List[Subscription], int]:
        stmt = (
            select(Subscription)
            .options(
                selectinload(Subscription.customer),
                selectinload(Subscription.plan),
                selectinload(Subscription.lines).selectinload(SubscriptionLine.product),
                selectinload(Subscription.lines).selectinload(SubscriptionLine.variant),
                selectinload(Subscription.lines).selectinload(SubscriptionLine.tax),
                selectinload(Subscription.audit_logs)
            )
        )
        count_stmt = select(func.count(Subscription.id))

        if customer_id:
            stmt = stmt.where(Subscription.customer_id == customer_id)
            count_stmt = count_stmt.where(Subscription.customer_id == customer_id)

        if status:
            stmt = stmt.where(Subscription.status == status)
            count_stmt = count_stmt.where(Subscription.status == status)

        if start_date:
            stmt = stmt.where(Subscription.start_date >= start_date)
            count_stmt = count_stmt.where(Subscription.start_date >= start_date)

        if end_date:
            stmt = stmt.where(Subscription.start_date <= end_date)
            count_stmt = count_stmt.where(Subscription.start_date <= end_date)

        if search:
            pattern = f"%{search.strip().lower()}%"
            filter_cond = or_(
                func.lower(Subscription.subscription_number).like(pattern),
                Subscription.customer_id.in_(
                    select(User.id).where(func.lower(User.name).like(pattern))
                )
            )
            stmt = stmt.where(filter_cond)
            count_stmt = count_stmt.where(filter_cond)

        total = self.db.execute(count_stmt).scalar() or 0
        offset = (page - 1) * size
        stmt = stmt.order_by(Subscription.id.desc()).offset(offset).limit(size)
        items = list(self.db.execute(stmt).scalars().all())

        return items, total
