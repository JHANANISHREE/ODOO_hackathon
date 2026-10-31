import pytest

def test_invoice_generation_and_automated_billing(client, admin_headers):
    subs_res = client.get("/api/subscriptions", headers=admin_headers)
    assert subs_res.status_code == 200
    items = subs_res.json().get("items", [])
    active_sub = next((s for s in items if str(s["status"]).lower() == "active"), None)
    if not active_sub and items:
        active_sub = items[0]
    assert active_sub is not None

    inv_res = client.post(f"/api/invoices/generate/{active_sub['id']}", headers=admin_headers)
    assert inv_res.status_code in (200, 201)
    inv = inv_res.json()
    assert float(inv["total_amount"]) > 0

    run_res = client.post("/api/billing/run", headers=admin_headers)
    assert run_res.status_code == 200
    summary = run_res.json()
    assert "created" in summary
    assert "skipped" in summary

def test_partial_payment_and_overpayment_rejection(client, admin_headers):
    subs_res = client.get("/api/subscriptions", headers=admin_headers)
    items = subs_res.json().get("items", [])
    active_sub = next((s for s in items if str(s["status"]).lower() == "active"), None)
    if not active_sub and items:
        active_sub = items[0]
    assert active_sub is not None

    inv_res = client.post(f"/api/invoices/generate/{active_sub['id']}", headers=admin_headers)
    inv = inv_res.json()
    inv_id = inv["id"]
    bal = float(inv["outstanding_balance"])

    if bal <= 0:
        return

    part_amt = round(bal / 2, 2)
    if part_amt <= 0:
        part_amt = 1.0

    pay_res = client.post("/api/payments", json={
        "invoice_id": inv_id,
        "amount": part_amt,
        "payment_method": "card",
        "transaction_reference": "TX_TEST_PART"
    }, headers=admin_headers)
    assert pay_res.status_code == 201

    updated = client.get(f"/api/invoices/{inv_id}", headers=admin_headers).json()
    assert float(updated["amount_paid"]) >= part_amt
    assert float(updated["outstanding_balance"]) < bal

    excess = float(updated["outstanding_balance"]) + 5000.0
    bad_pay = client.post("/api/payments", json={
        "invoice_id": inv_id,
        "amount": excess,
        "payment_method": "card"
    }, headers=admin_headers)
    assert bad_pay.status_code == 400
