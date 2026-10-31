# Brightloop Software - Subscription Management System

Enterprise-grade subscription management and recurring billing platform engineered for the Odoo Hiring Hackathon.

---

## 1. System Overview

Brightloop Software is a modular SaaS platform providing automated subscription management, recurrence billing, quotation workflows, tax calculation, discount allocation, and multi-tier role-based access control.

### Architecture Highlights
- Frontend: Plain modern HTML5, CSS custom properties design system, and Vanilla JavaScript ES Modules. Zero frontend frameworks used. Chart.js utilized for interactive executive visual analytics.
- Backend: Python 3.11+ with FastAPI, Pydantic v2, SQLAlchemy 2.0 ORM, and Alembic database migrations.
- Database: Local MySQL 8 with strict foreign key constraints, unique indexes, and ACID transaction isolation.
- Architecture Pattern: Strict layered separation of concerns:
  - Repositories: Raw database query execution and SQLAlchemy ORM operations.
  - Services: Isolated business logic, state machines, and financial computation.
  - Routers: FastAPI HTTP routing, input serialization, dependency injection, and RBAC guards.
  - Schemas: Pydantic v2 input validation with strict regex and boundary controls.
- Security: Secure JWT access and refresh token authentication, bcrypt password hashing, live password complexity validation, role-based access control (ADMIN, STAFF, CUSTOMER), and timing-safe operations.
- Code Policy: Zero comment lines across all application code and markup.

---

## 2. Relational Database Design (11 Entities)

The MySQL schema is normalized and enforced with foreign keys, ON DELETE cascading rules, and unique constraints:

1. users: Authentication credentials, roles (ADMIN, STAFF, CUSTOMER), status, reset tokens.
2. products: Base sellable goods and recurring services with sales/cost prices.
3. product_variants: Attribute names (e.g. Brand, Edition) and surcharge values (e.g. Brand=Odoo +$560.00).
4. plans: Billing recurrence rules (daily, weekly, monthly, yearly), base price, minimum quantities, and lifecycle flags.
5. quotation_templates: Pre-configured quotation packages linked to plans and line items.
6. template_lines: Product line items attached to quotation templates.
7. taxes: Tax computation rules (percentage/fixed) and jurisdiction rates.
8. discounts: Coupon codes (percentage/fixed), validity windows, and usage counters.
9. subscriptions: Core subscription contracts with state machine tracking and renewal dates.
10. subscription_lines: Individual subscription line items with product, variant, quantity, and tax.
11. subscription_audit_logs: Immutable ledger recording state transitions with user ID and timestamp.
12. invoices: Financial settlement records with billing periods, due dates, subtotal, tax, discount, total, and balance.
13. invoice_lines: Granular item breakdown attached to generated invoices.
14. payments: Transaction ledger recording collections, payment methods, transaction references, and notes.

---

## 3. Subscription State Machine

Subscriptions follow an enforced lifecycle state machine:

```
[ DRAFT ] --------> [ QUOTATION ] --------> [ CONFIRMED ] --------> [ ACTIVE ] --------> [ CLOSED ]
    ^                     |                       |
    |                     v                       v
    +---------------------+-----------------------+
```

- DRAFT: Initial quotation drafting.
- QUOTATION: Formal quotation sent to customer.
- CONFIRMED: Customer accepted; ready for service provisioning.
- ACTIVE: Provisioned and accumulating recurring billing cycles. Supports pause/resume toggling.
- CLOSED: Terminated or expired contract. Terminal state with no further billing.
- Audit Trail: Every transition writes an immutable audit record to `subscription_audit_logs`.

---

## 4. Setup and Installation

### Prerequisites
- Python 3.11 or higher
- MySQL 8.0 Server running on `localhost:3306`

### 1. Configure MySQL Database
Create the database and service user in MySQL:
```sql
CREATE DATABASE IF NOT EXISTS brightloop_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'brightloop'@'localhost' IDENTIFIED BY 'Naresh@8346';
GRANT ALL PRIVILEGES ON brightloop_db.* TO 'brightloop'@'localhost';
FLUSH PRIVILEGES;
```

### 2. Environment Variables (.env)
Create `brightloop/backend/.env`:
```ini
PROJECT_NAME="Brightloop Software"
API_V1_STR=/api
SECRET_KEY=brightloop-hackathon-super-secret-jwt-key-2026-production
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
DB_HOST=localhost
DB_PORT=3306
DB_USER=brightloop
DB_PASSWORD=Naresh@8346
DB_NAME=brightloop_db
BACKEND_CORS_ORIGINS=["http://localhost:8000","http://127.0.0.1:8000"]
```

### 3. Install Dependencies
```powershell
pip install -r brightloop/backend/requirements.txt
```

### 4. Run Migrations & Seed Data
```powershell
cd brightloop/backend
python -m alembic upgrade head
python seed.py
```

### 5. Launch the Server
```powershell
cd brightloop/backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
Open your browser at:
`http://localhost:8000/`

---

## 5. Demo Credentials

| Role | Email Address | Password | Permissions |
|---|---|---|---|
| Administrator | admin@brightloop.com | Admin@123! | Full access to overview, catalog, plans, billing, and settlements |
| Staff Member | staff1@brightloop.com | Staff@123! | Day-to-day subscription operations and customer management |
| Customer | customer1@brightloop.com | Customer@123! | Self-service portal: subscription controls, invoices, receipts, payment |

---

## 6. Running the Test Suite

Execute the automated test suite with pytest:
```powershell
pytest -v brightloop/backend/tests
```
12 comprehensive test cases covering password security, state transitions, discount calculation, billing idempotency, and partial payments execute with 100% pass rate.
