import pytest

def test_subscription_state_machine_happy_path(client, admin_headers):
    plans_res = client.get("/api/plans", headers=admin_headers)
    assert plans_res.status_code == 200
    plan_data = plans_res.json()
    plans = plan_data.get("items", plan_data) if isinstance(plan_data, dict) else plan_data
    plan_id = plans[0]["id"]

    users_res = client.get("/api/users?role=CUSTOMER", headers=admin_headers)
    assert users_res.status_code == 200
    cust_data = users_res.json()
    customers = cust_data.get("items", cust_data) if isinstance(cust_data, dict) else cust_data
    cust_id = customers[0]["id"]

    prods_res = client.get("/api/products", headers=admin_headers)
    assert prods_res.status_code == 200
    prod_data = prods_res.json()
    products = prod_data.get("items", prod_data) if isinstance(prod_data, dict) else prod_data
    prod_id = products[0]["id"]

    sub_res = client.post("/api/subscriptions", json={
        "customer_id": cust_id,
        "plan_id": plan_id,
        "payment_terms": "30 Days Net",
        "lines": [{
            "product_id": prod_id,
            "quantity": 1,
            "unit_price": 49.00
        }]
    }, headers=admin_headers)
    assert sub_res.status_code == 201
    sub = sub_res.json()
    sub_id = sub["id"]
    assert str(sub["status"]).lower() == "draft"

    t1 = client.post(f"/api/subscriptions/{sub_id}/transition", json={"action": "QUOTATION"}, headers=admin_headers)
    assert t1.status_code == 200
    assert str(t1.json()["status"]).lower() == "quotation"

    t2 = client.post(f"/api/subscriptions/{sub_id}/transition", json={"action": "CONFIRMED"}, headers=admin_headers)
    assert t2.status_code == 200
    assert str(t2.json()["status"]).lower() == "confirmed"

    t3 = client.post(f"/api/subscriptions/{sub_id}/transition", json={"action": "ACTIVE"}, headers=admin_headers)
    assert t3.status_code == 200
    assert str(t3.json()["status"]).lower() == "active"

    t4 = client.post(f"/api/subscriptions/{sub_id}/transition", json={"action": "CLOSED"}, headers=admin_headers)
    assert t4.status_code == 200
    assert str(t4.json()["status"]).lower() == "closed"

    illegal = client.post(f"/api/subscriptions/{sub_id}/transition", json={"action": "DRAFT"}, headers=admin_headers)
    assert illegal.status_code in (400, 409)

def test_illegal_state_jump_rejected(client, admin_headers):
    plans_res = client.get("/api/plans", headers=admin_headers)
    plan_data = plans_res.json()
    plans = plan_data.get("items", plan_data) if isinstance(plan_data, dict) else plan_data
    plan_id = plans[0]["id"]

    users_res = client.get("/api/users?role=CUSTOMER", headers=admin_headers)
    cust_data = users_res.json()
    customers = cust_data.get("items", cust_data) if isinstance(cust_data, dict) else cust_data
    cust_id = customers[0]["id"]

    sub_res = client.post("/api/subscriptions", json={
        "customer_id": cust_id,
        "plan_id": plan_id,
        "lines": []
    }, headers=admin_headers)
    assert sub_res.status_code == 201
    sub_id = sub_res.json()["id"]

    res = client.post(f"/api/subscriptions/{sub_id}/transition", json={"action": "ACTIVE"}, headers=admin_headers)
    assert res.status_code in (400, 409)
