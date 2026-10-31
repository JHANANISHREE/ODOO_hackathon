import pytest
from datetime import date, timedelta
from decimal import Decimal
from app.models.subscription import Subscription, SubscriptionStatus
from app.models.invoice import Invoice, InvoiceStatus
from app.models.plan import Plan, BillingPeriod

def test_lifetime_invoiced_and_outstanding_balance_consistency(client, admin_headers, customer_headers):
    # Customer portal overview test
    res = client.get("/api/portal/overview", headers=customer_headers)
    assert res.status_code == 200
    data = res.json()
    assert "lifetime_invoiced" in data
    assert "outstanding_balance" in data
    assert data["outstanding_balance"] <= data["lifetime_invoiced"] + 0.001

    # Admin dashboard summary test
    dash_res = client.get("/api/dashboard/summary", headers=admin_headers)
    assert dash_res.status_code == 200
    dash_data = dash_res.json()
    assert dash_data["outstanding_balance"] <= dash_data["lifetime_invoiced"] + 0.001

def test_recurring_total_and_next_billing_calculation(client, admin_headers, customer_headers):
    subs_res = client.get("/api/portal/subscriptions", headers=customer_headers)
    assert subs_res.status_code == 200
    subs = subs_res.json()
    for s in subs:
        if s["status"] == "active":
            assert s["next_billing_date"] is not None
            assert float(s["recurring_total"]) > 0
        else:
            assert s["next_billing_date"] is None

def test_subscription_state_transitions(client, admin_headers):
    plans_res = client.get("/api/plans", headers=admin_headers)
    plan_data = plans_res.json()
    plans = plan_data.get("items", plan_data) if isinstance(plan_data, dict) else plan_data
    plan_id = plans[0]["id"]

    cust_res = client.get("/api/users?role=CUSTOMER", headers=admin_headers)
    cust_data = cust_res.json()
    customers = cust_data.get("items", cust_data) if isinstance(cust_data, dict) else cust_data
    cust_id = customers[0]["id"]

    prod_res = client.get("/api/products", headers=admin_headers)
    prod_data = prod_res.json()
    products = prod_data.get("items", prod_data) if isinstance(prod_data, dict) else prod_data
    prod_id = products[0]["id"]

    # Create draft subscription
    create_res = client.post("/api/subscriptions", json={
        "customer_id": cust_id,
        "plan_id": plan_id,
        "lines": [{
            "product_id": prod_id,
            "quantity": 1,
            "unit_price": 100.0
        }]
    }, headers=admin_headers)
    assert create_res.status_code == 201
    sub_id = create_res.json()["id"]
    assert create_res.json()["status"] == "draft"

    # Illegal transition: Draft -> Active must fail with 400 or 409
    bad_res = client.post(f"/api/subscriptions/{sub_id}/transition", json={
        "action": "active"
    }, headers=admin_headers)
    assert bad_res.status_code in (400, 409)

    # Legal transition: Draft -> Quotation
    res_quot = client.post(f"/api/subscriptions/{sub_id}/transition", json={
        "action": "quotation"
    }, headers=admin_headers)
    assert res_quot.status_code == 200
    assert res_quot.json()["status"] == "quotation"

    # Legal transition: Quotation -> Confirmed
    res_conf = client.post(f"/api/subscriptions/{sub_id}/transition", json={
        "action": "confirmed"
    }, headers=admin_headers)
    assert res_conf.status_code == 200
    assert res_conf.json()["status"] == "confirmed"

    # Legal transition: Confirmed -> Active
    res_act = client.post(f"/api/subscriptions/{sub_id}/transition", json={
        "action": "active"
    }, headers=admin_headers)
    assert res_act.status_code == 200
    assert res_act.json()["status"] == "active"

    # Legal transition: Active -> Closed
    res_cls = client.post(f"/api/subscriptions/{sub_id}/transition", json={
        "action": "closed"
    }, headers=admin_headers)
    assert res_cls.status_code == 200
    assert res_cls.json()["status"] == "closed"

def test_discount_eligibility_and_staff_permissions(client, admin_headers, staff_headers):
    # Staff cannot create discounts (403 Forbidden)
    staff_create = client.post("/api/discounts", json={
        "code": "STAFFFAIL",
        "discount_type": "percentage",
        "value": 10.0,
        "usage_limit": 5
    }, headers=staff_headers)
    assert staff_create.status_code == 403

    # Staff cannot create staff/users (403 Forbidden)
    staff_user_create = client.post("/api/users", json={
        "email": "staff_fail@brightloop.com",
        "password": "Password@123!",
        "name": "Staff Fail",
        "role": "staff"
    }, headers=staff_headers)
    assert staff_user_create.status_code == 403

    # Admin can create discounts
    import uuid
    disc_code = f"DISC_{uuid.uuid4().hex[:6].upper()}"
    admin_create = client.post("/api/discounts", json={
        "code": disc_code,
        "discount_type": "percentage",
        "value": 15.0,
        "usage_limit": 10,
        "valid_from": str(date.today()),
        "valid_until": str(date.today() + timedelta(days=30))
    }, headers=admin_headers)
    assert admin_create.status_code == 201

    # Check listing
    list_res = client.get("/api/discounts", headers=admin_headers)
    assert list_res.status_code == 200
    codes = [d["code"] for d in list_res.json()["items"]]
    assert disc_code in codes

def test_idempotent_billing_run(client, admin_headers):
    # Running automated billing twice in succession must not create duplicate invoices for the same period
    run1 = client.post("/api/billing/run", headers=admin_headers)
    assert run1.status_code == 200

    run2 = client.post("/api/billing/run", headers=admin_headers)
    assert run2.status_code == 200
    summary2 = run2.json()

    # Second run should create 0 new invoices because they are already invoiced for current period
    assert summary2["created"] == 0
