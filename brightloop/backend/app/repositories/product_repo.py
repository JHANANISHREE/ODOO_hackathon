from typing import Optional, List, Tuple
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import select, func, or_
from app.models.product import Product, ProductType
from app.models.variant import ProductVariant

class ProductRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, product_id: int) -> Optional[Product]:
        stmt = select(Product).options(selectinload(Product.variants)).where(Product.id == product_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def get_variant_by_id(self, variant_id: int) -> Optional[ProductVariant]:
        return self.db.get(ProductVariant, variant_id)

    def create(self, product: Product) -> Product:
        self.db.add(product)
        self.db.commit()
        self.db.refresh(product)
        return self.get_by_id(product.id)

    def update(self, product: Product) -> Product:
        self.db.commit()
        self.db.refresh(product)
        return self.get_by_id(product.id)

    def delete(self, product: Product) -> None:
        self.db.delete(product)
        self.db.commit()

    def add_variant(self, variant: ProductVariant) -> ProductVariant:
        self.db.add(variant)
        self.db.commit()
        self.db.refresh(variant)
        return variant

    def delete_variant(self, variant: ProductVariant) -> None:
        self.db.delete(variant)
        self.db.commit()

    def list_products(
        self,
        product_type: Optional[ProductType] = None,
        active_only: bool = False,
        search: Optional[str] = None,
        page: int = 1,
        size: int = 20
    ) -> Tuple[List[Product], int]:
        stmt = select(Product).options(selectinload(Product.variants))
        count_stmt = select(func.count(Product.id))

        if active_only:
            stmt = stmt.where(Product.is_active == True)
            count_stmt = count_stmt.where(Product.is_active == True)

        if product_type:
            stmt = stmt.where(Product.type == product_type)
            count_stmt = count_stmt.where(Product.type == product_type)

        if search:
            pattern = f"%{search.strip().lower()}%"
            stmt = stmt.where(func.lower(Product.name).like(pattern))
            count_stmt = count_stmt.where(func.lower(Product.name).like(pattern))

        total = self.db.execute(count_stmt).scalar() or 0
        offset = (page - 1) * size
        stmt = stmt.order_by(Product.id.desc()).offset(offset).limit(size)
        items = list(self.db.execute(stmt).scalars().all())

        return items, total
