from datetime import datetime, timezone
from decimal import Decimal
from enum import Enum
from sqlalchemy import String, Numeric, Boolean, DateTime, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class TaxType(str, Enum):
    PERCENTAGE = "percentage"
    FIXED = "fixed"

class Tax(Base):
    __tablename__ = "taxes"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    tax_type: Mapped[TaxType] = mapped_column(SQLEnum(TaxType), default=TaxType.PERCENTAGE, nullable=False)
    rate: Mapped[Decimal] = mapped_column(Numeric(8, 4), nullable=False)
    applies_to_category: Mapped[str] = mapped_column(String(50), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )
