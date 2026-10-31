import pytest

def test_taxes_listing_and_rate(client, admin_headers):
    res = client.get("/api/taxes", headers=admin_headers)
    assert res.status_code == 200
    tax_data = res.json()
    taxes = tax_data.get("items", tax_data) if isinstance(tax_data, dict) else tax_data
    assert len(taxes) >= 3
    vat = next((t for t in taxes if "VAT" in t["name"]), None)
    assert vat is not None
    assert float(vat["rate"]) == 18.0

def test_discounts_listing_and_codes(client, admin_headers):
    res = client.get("/api/discounts", headers=admin_headers)
    assert res.status_code == 200
    disc_data = res.json()
    discounts = disc_data.get("items", disc_data) if isinstance(disc_data, dict) else disc_data
    codes = [d["code"] for d in discounts]
    assert "WELCOME20" in codes
    assert "SAVE50" in codes

def test_product_variants_odoo_presence(client, admin_headers):
    res = client.get("/api/products", headers=admin_headers)
    assert res.status_code == 200
    prod_data = res.json()
    products = prod_data.get("items", prod_data) if isinstance(prod_data, dict) else prod_data
    erp = next((p for p in products if "ERP" in p["name"]), None)
    assert erp is not None
    variants = erp.get("variants", [])
    odoo = next((v for v in variants if v.get("attribute_value") == "Odoo" or "Odoo" in v.get("name", "")), None)
    assert odoo is not None
    assert float(odoo["extra_price"]) == 560.00
