from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import String, Numeric, Integer, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class ProductVariant(Base):
    __tablename__ = "product_variants"
    __table_args__ = (
        UniqueConstraint("product_id", "attribute_name", "attribute_value", name="uq_product_variant_attr"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    attribute_name: Mapped[str] = mapped_column(String(100), nullable=False)
    attribute_value: Mapped[str] = mapped_column(String(100), nullable=False)
    extra_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    product = relationship("Product", back_populates="variants")
