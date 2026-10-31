from datetime import datetime, date, timezone
from decimal import Decimal
from enum import Enum
from sqlalchemy import String, Numeric, Integer, Boolean, Date, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class SubscriptionStatus(str, Enum):
    DRAFT = "draft"
    QUOTATION = "quotation"
    CONFIRMED = "confirmed"
    ACTIVE = "active"
    CLOSED = "closed"

class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    subscription_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    customer_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    plan_id: Mapped[int] = mapped_column(Integer, ForeignKey("plans.id", ondelete="RESTRICT"), nullable=False, index=True)
    status: Mapped[SubscriptionStatus] = mapped_column(
        SQLEnum(SubscriptionStatus),
        default=SubscriptionStatus.DRAFT,
        nullable=False,
        index=True
    )
    is_paused: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    expiry_date: Mapped[date] = mapped_column(Date, nullable=True)
    payment_terms: Mapped[str] = mapped_column(String(100), default="Immediate Payment", nullable=False)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    customer = relationship("User", back_populates="subscriptions")
    plan = relationship("Plan", back_populates="subscriptions")
    lines = relationship("SubscriptionLine", back_populates="subscription", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="subscription", cascade="all, delete-orphan")
    audit_logs = relationship("SubscriptionAuditLog", back_populates="subscription", cascade="all, delete-orphan")

class SubscriptionLine(Base):
    __tablename__ = "subscription_lines"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    subscription_id: Mapped[int] = mapped_column(Integer, ForeignKey("subscriptions.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id: Mapped[int] = mapped_column(Integer, ForeignKey("products.id", ondelete="RESTRICT"), nullable=False)
    variant_id: Mapped[int] = mapped_column(Integer, ForeignKey("product_variants.id", ondelete="SET NULL"), nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    tax_id: Mapped[int] = mapped_column(Integer, ForeignKey("taxes.id", ondelete="SET NULL"), nullable=True)
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    line_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    subscription = relationship("Subscription", back_populates="lines")
    product = relationship("Product")
    variant = relationship("ProductVariant")
    tax = relationship("Tax")
