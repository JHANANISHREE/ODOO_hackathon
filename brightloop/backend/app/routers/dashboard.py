import time
from typing import Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.deps import require_role
from app.models.user import User, UserRole
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

_cache_data: Dict[str, Any] = {}
_cache_timestamp: float = 0.0
CACHE_TTL_SECONDS = 10.0

@router.get("/summary")
def get_dashboard_summary(
    current_user: User = require_role(UserRole.ADMIN, UserRole.STAFF),
    db: Session = Depends(get_db)
):
    global _cache_data, _cache_timestamp
    now = time.time()
    if _cache_data and (now - _cache_timestamp < CACHE_TTL_SECONDS):
        return _cache_data

    service = DashboardService(db)
    summary = service.get_summary()
    _cache_data = summary
    _cache_timestamp = now
    return summary
