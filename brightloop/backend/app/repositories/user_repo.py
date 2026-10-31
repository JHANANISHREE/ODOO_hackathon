from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import select, func, or_
from app.models.user import User, UserRole

class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, user_id: int) -> Optional[User]:
        return self.db.get(User, user_id)

    def get_by_email(self, email: str) -> Optional[User]:
        stmt = select(User).where(func.lower(User.email) == email.lower().strip())
        return self.db.execute(stmt).scalar_one_or_none()

    def get_by_reset_token_hash(self, token_hash: str) -> Optional[User]:
        stmt = select(User).where(User.reset_token_hash == token_hash)
        return self.db.execute(stmt).scalar_one_or_none()

    def create(self, user: User) -> User:
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def update(self, user: User) -> User:
        self.db.commit()
        self.db.refresh(user)
        return user

    def delete(self, user: User) -> None:
        self.db.delete(user)
        self.db.commit()

    def list_users(
        self,
        role: Optional[UserRole] = None,
        search: Optional[str] = None,
        page: int = 1,
        size: int = 20
    ) -> Tuple[List[User], int]:
        stmt = select(User)
        count_stmt = select(func.count(User.id))

        if role:
            stmt = stmt.where(User.role == role)
            count_stmt = count_stmt.where(User.role == role)

        if search:
            pattern = f"%{search.strip().lower()}%"
            filter_cond = or_(
                func.lower(User.name).like(pattern),
                func.lower(User.email).like(pattern),
                func.lower(User.phone).like(pattern)
            )
            stmt = stmt.where(filter_cond)
            count_stmt = count_stmt.where(filter_cond)

        total = self.db.execute(count_stmt).scalar() or 0
        offset = (page - 1) * size
        stmt = stmt.order_by(User.id.desc()).offset(offset).limit(size)
        items = list(self.db.execute(stmt).scalars().all())

        return items, total
