from typing import List, Dict, Any
from fastapi import APIRouter

router = APIRouter(prefix="/public", tags=["Public"])

@router.get("/health")
def health_check() -> Dict[str, str]:
    return {"status": "healthy", "service": "Brightloop Subscription Engine"}

@router.get("/plans")
def get_public_plans() -> List[Dict[str, Any]]:
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

@router.get("/stats")
def get_public_stats() -> Dict[str, Any]:
    return {
        "active_subscriptions": "12,480+",
        "invoices_automated": "$8.4M+",
        "uptime": "99.99%",
        "processing_time": "< 0.05s"
    }
