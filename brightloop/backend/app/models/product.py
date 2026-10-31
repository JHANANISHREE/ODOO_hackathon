from datetime import datetime, timezone
from decimal import Decimal
from enum import Enum
from sqlalchemy import String, Numeric, Boolean, Text, DateTime, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class ProductType(str, Enum):
    SERVICE = "service"
    SOFTWARE = "software"
    ADDON = "addon"
    PHYSICAL = "physical"

class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    type: Mapped[ProductType] = mapped_column(SQLEnum(ProductType), default=ProductType.SOFTWARE, nullable=False)
    sales_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    cost_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    notes: Mapped[str] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    variants = relationship("ProductVariant", back_populates="product", cascade="all, delete-orphan")
