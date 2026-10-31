from datetime import datetime, date, timezone
from decimal import Decimal
from enum import Enum
from sqlalchemy import String, Numeric, Integer, Boolean, Date, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class DiscountType(str, Enum):
    PERCENTAGE = "percentage"
    FIXED = "fixed"

class Discount(Base):
    __tablename__ = "discounts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    discount_type: Mapped[DiscountType] = mapped_column(SQLEnum(DiscountType), default=DiscountType.PERCENTAGE, nullable=False)
    value: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    minimum_purchase_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=True)
    minimum_quantity: Mapped[int] = mapped_column(Integer, nullable=True)
    start_date: Mapped[date] = mapped_column(Date, nullable=True)
    end_date: Mapped[date] = mapped_column(Date, nullable=True)
    usage_limit: Mapped[int] = mapped_column(Integer, nullable=True)
    used_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    applies_to_product_id: Mapped[int] = mapped_column(Integer, ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    product = relationship("Product")
