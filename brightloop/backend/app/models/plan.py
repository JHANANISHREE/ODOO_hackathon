from datetime import datetime, date, timezone
from decimal import Decimal
from enum import Enum
from sqlalchemy import String, Numeric, Integer, Boolean, Date, DateTime, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class BillingPeriod(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    YEARLY = "yearly"

class Plan(Base):
    __tablename__ = "plans"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False, unique=True, index=True)
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    billing_period: Mapped[BillingPeriod] = mapped_column(SQLEnum(BillingPeriod), default=BillingPeriod.MONTHLY, nullable=False)
    minimum_quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    available_from: Mapped[date] = mapped_column(Date, nullable=True)
    available_to: Mapped[date] = mapped_column(Date, nullable=True)
    auto_close: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    closable: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    pausable: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    renewable: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    subscriptions = relationship("Subscription", back_populates="plan")
    templates = relationship("QuotationTemplate", back_populates="plan")
