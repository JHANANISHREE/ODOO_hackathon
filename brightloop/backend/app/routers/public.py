from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.models.subscription import Subscription, SubscriptionStatus
from app.models.plan import Plan, BillingPeriod
from app.models.invoice import Invoice, InvoiceStatus
from app.models.payment import Payment
from app.routers.portal import get_subscription_recurring_total

router = APIRouter(prefix="/public", tags=["Public"])

@router.get("/health")
def health_check() -> Dict[str, str]:
    return {"status": "healthy", "service": "Brightloop Subscription Engine"}

@router.get("/plans")
def get_public_plans(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    plans = db.query(Plan).filter(Plan.is_active == True).all()
    if not plans:
        return [
            {
                "id": 1,
                "name": "Starter Loop",
                "code": "PLAN-STARTER",
                "price_monthly": 49.00,
                "price_yearly": 490.00,
                "billing_period": "monthly",
                "description": "Essential recurring billing and invoice generation for early-stage SaaS and startups.",
                "features": [
                    "Up to 250 active subscriptions",
                    "Automated recurring invoicing",
                    "Quotation templates",
                    "Standard tax & discount engine",
                    "Customer self-service portal"
                ],
                "popular": False,
                "badge": "Entry"
            },
            {
                "id": 2,
                "name": "Growth Pro",
                "code": "PLAN-GROWTH",
                "price_monthly": 149.00,
                "price_yearly": 1490.00,
                "billing_period": "monthly",
                "description": "Powerhouse subscription lifecycle management with multi-variant billing and scheduler.",
                "features": [
                    "Up to 2,500 active subscriptions",
                    "Idempotent automated billing run",
                    "Partial payments & UPI/Cards/Bank",
                    "Advanced role-based access (Admin/Staff)",
                    "Full audit trail & state machine",
                    "Email notifications & PDF invoices"
                ],
                "popular": True,
                "badge": "Most Popular"
            },
            {
                "id": 3,
                "name": "Enterprise Infinite",
                "code": "PLAN-ENTERPRISE",
                "price_monthly": 399.00,
                "price_yearly": 3990.00,
                "billing_period": "monthly",
                "description": "High-volume subscription architecture engineered for speed, custom lines and scale.",
                "features": [
                    "Unlimited subscriptions & invoices",
                    "Sub-second reporting dashboard",
                    "Custom variant matrices & add-ons",
                    "Dedicated scheduler & batch billing",
                    "Full REST API integration",
                    "Priority 24/7 engineering SLA"
                ],
                "popular": False,
                "badge": "Enterprise"
            }
        ]

    results = []
    for p in plans:
        monthly_price = float(p.price)
        yearly_price = round(monthly_price * 10, 2)
        results.append({
            "id": p.id,
            "name": p.name,
            "code": f"PLAN-{p.id:03d}",
            "price_monthly": monthly_price,
            "price_yearly": yearly_price,
            "billing_period": p.billing_period.value if p.billing_period else "monthly",
            "description": f"Engineered for high velocity with {p.billing_period.value if p.billing_period else 'monthly'} renewal.",
            "features": [
                f"Minimum {p.minimum_quantity} seats commitment",
                "Automated recurring invoicing engine",
                "Dynamic variant attributes support",
                "Customer portal self-service",
                "Instant tax & discount computation"
            ],
            "popular": p.id == 2 or "growth" in p.name.lower(),
            "badge": "Popular" if ("growth" in p.name.lower() or p.id == 2) else "Standard"
        })
    return results

@router.get("/stats")
def get_public_stats(db: Session = Depends(get_db)) -> Dict[str, Any]:
    active_count = db.query(func.count(Subscription.id)).filter(
        Subscription.status == SubscriptionStatus.ACTIVE
    ).scalar() or 0

    active_subs = db.query(Subscription).filter(
        Subscription.status == SubscriptionStatus.ACTIVE
    ).all()

    mrr = sum(float(get_subscription_recurring_total(s)) for s in active_subs)

    recent_subs = db.query(Subscription).order_by(
        Subscription.id.desc()
    ).limit(5).all()

    recent_list = []
    for s in recent_subs:
        rec_tot = float(get_subscription_recurring_total(s))
        cust_name = s.customer.name if s.customer else "Acme Corporation"
        plan_name = s.plan.name if s.plan else "Custom Enterprise"
        recent_list.append({
            "number": s.subscription_number,
            "customer": cust_name,
            "plan": plan_name,
            "status": s.status.value,
            "amount": rec_tot
        })

    return {
        "active_subscriptions": active_count,
        "mrr": round(mrr, 2),
        "invoicing_rate": "100%",
        "uptime": "99.99%",
        "processing_time": "< 0.05s",
        "recent_subscriptions": recent_list
    }
