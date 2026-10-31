from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.deps import require_role
from app.models.user import User, UserRole
from app.services.billing_service import BillingService
from app.schemas.invoice import BillingRunSummary

router = APIRouter(prefix="/billing", tags=["Billing Engine"])

@router.post("/run", response_model=BillingRunSummary)
def run_automated_billing(
    as_of_date: Optional[date] = None,
    current_user: User = require_role(UserRole.ADMIN),
    db: Session = Depends(get_db)
):
    service = BillingService(db)
    return service.run_automated_billing(as_of_date=as_of_date)
