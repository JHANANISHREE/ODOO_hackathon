from typing import Optional, List, Tuple
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import select, func
from app.models.template import QuotationTemplate, TemplateLine

class TemplateRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, template_id: int) -> Optional[QuotationTemplate]:
        stmt = (
            select(QuotationTemplate)
            .options(
                selectinload(QuotationTemplate.plan),
                selectinload(QuotationTemplate.lines).selectinload(TemplateLine.product),
                selectinload(QuotationTemplate.lines).selectinload(TemplateLine.variant)
            )
            .where(QuotationTemplate.id == template_id)
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def create(self, template: QuotationTemplate) -> QuotationTemplate:
        self.db.add(template)
        self.db.commit()
        self.db.refresh(template)
        return self.get_by_id(template.id)

    def update(self, template: QuotationTemplate) -> QuotationTemplate:
        self.db.commit()
        self.db.refresh(template)
        return self.get_by_id(template.id)

    def delete(self, template: QuotationTemplate) -> None:
        self.db.delete(template)
        self.db.commit()

    def list_templates(
        self,
        search: Optional[str] = None,
        page: int = 1,
        size: int = 20
    ) -> Tuple[List[QuotationTemplate], int]:
        stmt = (
            select(QuotationTemplate)
            .options(
                selectinload(QuotationTemplate.plan),
                selectinload(QuotationTemplate.lines).selectinload(TemplateLine.product),
                selectinload(QuotationTemplate.lines).selectinload(TemplateLine.variant)
            )
        )
        count_stmt = select(func.count(QuotationTemplate.id))

        if search:
            pattern = f"%{search.strip().lower()}%"
            stmt = stmt.where(func.lower(QuotationTemplate.name).like(pattern))
            count_stmt = count_stmt.where(func.lower(QuotationTemplate.name).like(pattern))

        total = self.db.execute(count_stmt).scalar() or 0
        offset = (page - 1) * size
        stmt = stmt.order_by(QuotationTemplate.id.desc()).offset(offset).limit(size)
        items = list(self.db.execute(stmt).scalars().all())

        return items, total
