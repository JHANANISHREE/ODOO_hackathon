from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import String, Numeric, Integer, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class QuotationTemplate(Base):
    __tablename__ = "quotation_templates"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False, unique=True, index=True)
    validity_days: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    plan_id: Mapped[int] = mapped_column(Integer, ForeignKey("plans.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    plan = relationship("Plan", back_populates="templates")
    lines = relationship("TemplateLine", back_populates="template", cascade="all, delete-orphan")

class TemplateLine(Base):
    __tablename__ = "template_lines"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    template_id: Mapped[int] = mapped_column(Integer, ForeignKey("quotation_templates.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id: Mapped[int] = mapped_column(Integer, ForeignKey("products.id", ondelete="RESTRICT"), nullable=False)
    variant_id: Mapped[int] = mapped_column(Integer, ForeignKey("product_variants.id", ondelete="SET NULL"), nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    template = relationship("QuotationTemplate", back_populates="lines")
    product = relationship("Product")
    variant = relationship("ProductVariant")
