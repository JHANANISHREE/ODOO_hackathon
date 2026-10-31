import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c

@pytest.fixture(scope="session")
def admin_token(client):
    res = client.post("/api/auth/login", json={"email": "admin@brightloop.com", "password": "Admin@123!"})
    if res.status_code != 200:
        res = client.post("/api/auth/login", json={"email": "admin@brightloop.com", "password": "AdminPassword123!"})
    assert res.status_code == 200, f"Failed to login admin: {res.text}"
    return res.json()["access_token"]

@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}

@pytest.fixture(scope="session")
def customer_token(client):
    res = client.post("/api/auth/login", json={"email": "customer1@brightloop.com", "password": "Customer@123!"})
    assert res.status_code == 200, f"Failed to login customer: {res.text}"
    return res.json()["access_token"]

@pytest.fixture(scope="session")
def customer_headers(customer_token):
    return {"Authorization": f"Bearer {customer_token}"}
