import pytest
from app.core.security import verify_password, get_password_hash
from app.schemas.user import validate_password_strength

def test_password_hashing():
    pwd = "SecretPass@123"
    hashed = get_password_hash(pwd)
    assert hashed != pwd
    assert verify_password(pwd, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False

def test_password_complexity_validator():
    with pytest.raises(ValueError):
        validate_password_strength("short1!")

    with pytest.raises(ValueError):
        validate_password_strength("nouppercase123!")

    with pytest.raises(ValueError):
        validate_password_strength("NOSPECIAL123")

    valid = validate_password_strength("ValidStrong@2026")
    assert valid == "ValidStrong@2026"

def test_auth_login_invalid_password(client):
    res = client.post("/api/auth/login", json={"email": "admin@brightloop.com", "password": "WrongPassword999!"})
    assert res.status_code == 401

def test_auth_me_endpoint(client, admin_headers):
    res = client.get("/api/auth/me", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == "ADMIN"
    assert data["email"] == "admin@brightloop.com"

def test_customer_forbidden_from_admin_endpoints(client, customer_headers):
    res = client.get("/api/dashboard/summary", headers=customer_headers)
    assert res.status_code == 403
