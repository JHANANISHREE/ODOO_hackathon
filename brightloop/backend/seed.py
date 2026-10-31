import sys
from datetime import datetime, date, timedelta, timezone
from decimal import Decimal
from sqlalchemy import func

from app.db.session import SessionLocal
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.product import Product, ProductType
from app.models.variant import ProductVariant
from app.models.plan import Plan, BillingPeriod
from app.models.template import QuotationTemplate, TemplateLine
from app.models.tax import Tax, TaxType
from app.models.discount import Discount, DiscountType
from app.models.subscription import Subscription, SubscriptionLine, SubscriptionStatus
from app.models.audit import SubscriptionAuditLog
from app.models.invoice import Invoice, InvoiceLine, InvoiceStatus
from app.models.payment import Payment, PaymentMethod

def seed():
    db = SessionLocal()
    try:
        admin_email = "admin@brightloop.com"
        admin = db.query(User).filter(User.email == admin_email).first()
        if not admin:
            admin = User(
                email=admin_email,
                hashed_password=get_password_hash("Admin@123!"),
                name="Naresh Administrator",
                phone="+1 555-0100",
                role=UserRole.ADMIN,
                is_active=True
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)

        staff_list = [
            ("staff1@brightloop.com", "Staff@123!", "Elena Rostova", "+1 555-0101"),
            ("staff2@brightloop.com", "Staff@123!", "Marcus Chen", "+1 555-0102")
        ]
        for s_email, s_pwd, s_name, s_phone in staff_list:
            if not db.query(User).filter(User.email == s_email).first():
                db.add(User(
                    email=s_email,
                    hashed_password=get_password_hash(s_pwd),
                    name=s_name,
                    phone=s_phone,
                    role=UserRole.STAFF,
                    is_active=True
                ))
        db.commit()

        customer_data = [
            ("customer1@brightloop.com", "Customer@123!", "Acme Corporation", "+1 555-0201"),
            ("customer2@brightloop.com", "Customer@123!", "Starlight Ventures", "+1 555-0202"),
            ("customer3@brightloop.com", "Customer@123!", "Nexus Logistics", "+1 555-0203"),
            ("customer4@brightloop.com", "Customer@123!", "Hyperion Dynamics", "+1 555-0204"),
            ("customer5@brightloop.com", "Customer@123!", "Apex Health Partners", "+1 555-0205"),
            ("customer6@brightloop.com", "Customer@123!", "Solaria Cloud Labs", "+1 555-0206"),
            ("customer7@brightloop.com", "Customer@123!", "Bluefin Analytics", "+1 555-0207"),
            ("customer8@brightloop.com", "Customer@123!", "Ironclad Cyber Systems", "+1 555-0208"),
            ("customer9@brightloop.com", "Customer@123!", "Vanguard Media Group", "+1 555-0209"),
            ("customer10@brightloop.com", "Customer@123!", "Quantum Robotics", "+1 555-0210"),
            ("customer11@brightloop.com", "Customer@123!", "Aurora BioSciences", "+1 555-0211"),
            ("customer12@brightloop.com", "Customer@123!", "OmniStream Media", "+1 555-0212"),
            ("customer13@brightloop.com", "Customer@123!", "Pinnacle Capital", "+1 555-0213"),
            ("customer14@brightloop.com", "Customer@123!", "Kestrel Avionics", "+1 555-0214"),
            ("customer15@brightloop.com", "Customer@123!", "Crestview Real Estate", "+1 555-0215"),
            ("customer16@brightloop.com", "Customer@123!", "Beacon Educational", "+1 555-0216"),
            ("customer17@brightloop.com", "Customer@123!", "Zephyr CleanTech", "+1 555-0217"),
            ("customer18@brightloop.com", "Customer@123!", "Horizon Retail Inc", "+1 555-0218"),
            ("customer19@brightloop.com", "Customer@123!", "Titan Engineering", "+1 555-0219"),
            ("customer20@brightloop.com", "Customer@123!", "Silverline Software", "+1 555-0220"),
            ("customer21@brightloop.com", "Customer@123!", "Paramount Consulting", "+1 555-0221"),
            ("customer22@brightloop.com", "Customer@123!", "Cobalt Financial", "+1 555-0222"),
            ("customer23@brightloop.com", "Customer@123!", "Redwood Digital", "+1 555-0223"),
            ("customer24@brightloop.com", "Customer@123!", "Summit Telecommunications", "+1 555-0224"),
            ("customer25@brightloop.com", "Customer@123!", "Brightwave Interactive", "+1 555-0225")
        ]
        created_customers = []
        for c_email, c_pwd, c_name, c_phone in customer_data:
            existing = db.query(User).filter(User.email == c_email).first()
            if not existing:
                existing = User(
                    email=c_email,
                    hashed_password=get_password_hash(c_pwd),
                    name=c_name,
                    phone=c_phone,
                    role=UserRole.CUSTOMER,
                    is_active=True
                )
                db.add(existing)
                db.commit()
                db.refresh(existing)
            created_customers.append(existing)

        taxes_data = [
            ("Standard VAT", Decimal("18.00"), TaxType.PERCENTAGE, True),
            ("US Sales Tax", Decimal("8.25"), TaxType.PERCENTAGE, True),
            ("Zero Rated Export", Decimal("0.00"), TaxType.PERCENTAGE, True)
        ]
        created_taxes = []
        for t_name, t_rate, t_type, t_act in taxes_data:
            t = db.query(Tax).filter(Tax.name == t_name).first()
            if not t:
                t = Tax(name=t_name, rate=t_rate, tax_type=t_type, is_active=t_act)
                db.add(t)
                db.commit()
                db.refresh(t)
            created_taxes.append(t)

        discounts_data = [
            ("WELCOME20", DiscountType.PERCENTAGE, Decimal("20.00"), 100, True),
            ("SAVE50", DiscountType.FIXED, Decimal("50.00"), 50, True),
            ("EARLYBIRD", DiscountType.PERCENTAGE, Decimal("15.00"), 200, True),
            ("ENTERPRISEVIP", DiscountType.PERCENTAGE, Decimal("25.00"), 20, True)
        ]
        created_discounts = []
        for d_code, d_type, d_val, d_usage, d_act in discounts_data:
            d = db.query(Discount).filter(Discount.code == d_code).first()
            if not d:
                d = Discount(
                    code=d_code,
                    discount_type=d_type,
                    value=d_val,
                    usage_limit=d_usage,
                    used_count=0,
                    is_active=d_act
                )
                db.add(d)
                db.commit()
                db.refresh(d)
            created_discounts.append(d)

        products_spec = [
            ("Brightloop Cloud ERP", Decimal("1200.00"), True, [
                ("Edition", "Standard", Decimal("0.00")),
                ("Edition", "Enterprise Multi-tenant", Decimal("350.00")),
                ("Brand", "Odoo", Decimal("560.00"))
            ]),
            ("Automated Workflow Engine", Decimal("450.00"), True, [
                ("Throughput", "10,000 steps/mo", Decimal("0.00")),
                ("Throughput", "50,000 steps/mo", Decimal("180.00")),
                ("Throughput", "Unlimited", Decimal("400.00"))
            ]),
            ("AI Predictive Analytics Module", Decimal("600.00"), True, [
                ("Compute", "Standard GPU", Decimal("0.00")),
                ("Compute", "Tensor Cluster", Decimal("320.00"))
            ]),
            ("Customer Portal White-label Addon", Decimal("250.00"), True, [
                ("Domain", "Single Domain", Decimal("0.00")),
                ("Domain", "Multi-brand Vanity", Decimal("150.00"))
            ]),
            ("Dedicated Security & Compliance Shield", Decimal("800.00"), True, [
                ("Compliance", "SOC2 and HIPAA", Decimal("0.00")),
                ("Compliance", "Continuous Pen-testing", Decimal("450.00"))
            ]),
            ("High-Performance Cloud Database", Decimal("300.00"), True, [
                ("Storage", "100GB NVMe", Decimal("0.00")),
                ("Storage", "500GB NVMe", Decimal("220.00")),
                ("Storage", "1TB Ultra Replica", Decimal("500.00"))
            ]),
            ("Priority 24/7 SLA Engineering Support", Decimal("350.00"), True, [
                ("SLA Tier", "4-hour Response", Decimal("0.00")),
                ("SLA Tier", "15-minute Direct Pager", Decimal("300.00"))
            ]),
            ("Global Multi-region CDN Accelerator", Decimal("180.00"), True, [
                ("Scale", "50 Edge POPs", Decimal("0.00")),
                ("Scale", "250 Edge POPs and WAF", Decimal("140.00"))
            ])
        ]

        created_products = []
        for p_name, p_price, p_rec, variants in products_spec:
            prod = db.query(Product).filter(Product.name == p_name).first()
            if not prod:
                prod = Product(
                    name=p_name,
                    type=ProductType.SOFTWARE,
                    sales_price=p_price,
                    cost_price=p_price * Decimal("0.4"),
                    is_active=True
                )
                db.add(prod)
                db.commit()
                db.refresh(prod)

            for v_attr, v_val, v_extra in variants:
                existing_v = db.query(ProductVariant).filter(
                    ProductVariant.product_id == prod.id,
                    ProductVariant.attribute_name == v_attr,
                    ProductVariant.attribute_value == v_val
                ).first()
                if not existing_v:
                    db.add(ProductVariant(
                        product_id=prod.id,
                        attribute_name=v_attr,
                        attribute_value=v_val,
                        extra_price=v_extra
                    ))
            db.commit()
            db.refresh(prod)
            created_products.append(prod)

        plans_spec = [
            ("Daily Edge Compute", Decimal("15.00"), BillingPeriod.DAILY, 1, 0),
            ("Weekly Agile Sprint", Decimal("85.00"), BillingPeriod.WEEKLY, 1, 0),
            ("Starter SaaS Platform", Decimal("49.00"), BillingPeriod.MONTHLY, 1, 14),
            ("Business Growth Suite", Decimal("199.00"), BillingPeriod.MONTHLY, 1, 0),
            ("Enterprise High-Scale", Decimal("799.00"), BillingPeriod.MONTHLY, 2, 0),
            ("Annual Cloud Sovereign", Decimal("7990.00"), BillingPeriod.YEARLY, 1, 30)
        ]

        created_plans = []
        for pl_name, pl_price, pl_interval, pl_minqty, pl_trial in plans_spec:
            pl = db.query(Plan).filter(Plan.name == pl_name).first()
            if not pl:
                pl = Plan(
                    name=pl_name,
                    price=pl_price,
                    billing_period=pl_interval,
                    minimum_quantity=pl_minqty,
                    auto_close=False,
                    closable=True,
                    pausable=True,
                    is_active=True
                )
                db.add(pl)
                db.commit()
                db.refresh(pl)
            created_plans.append(pl)

        templates_spec = [
            ("Standard Enterprise Onboarding", created_plans[3].id, 30, [
                (created_products[0].id, 1, Decimal("1200.00")),
                (created_products[1].id, 1, Decimal("450.00"))
            ]),
            ("Developer QuickLaunch", created_plans[2].id, 14, [
                (created_products[1].id, 1, Decimal("450.00")),
                (created_products[5].id, 1, Decimal("300.00"))
            ]),
            ("Full Mission Critical Stack", created_plans[4].id, 60, [
                (created_products[0].id, 1, Decimal("1200.00")),
                (created_products[2].id, 1, Decimal("600.00")),
                (created_products[4].id, 1, Decimal("800.00")),
                (created_products[6].id, 1, Decimal("350.00"))
            ])
        ]

        for t_name, t_plan, t_val, t_lines in templates_spec:
            tmpl = db.query(QuotationTemplate).filter(QuotationTemplate.name == t_name).first()
            if not tmpl:
                tmpl = QuotationTemplate(
                    name=t_name,
                    plan_id=t_plan,
                    validity_days=t_val
                )
                db.add(tmpl)
                db.commit()
                db.refresh(tmpl)

                for p_id, qty, price in t_lines:
                    db.add(TemplateLine(
                        template_id=tmpl.id,
                        product_id=p_id,
                        quantity=qty,
                        unit_price=price
                    ))
                db.commit()

        existing_subs = db.query(Subscription).count()
        today = date.today()

        if existing_subs < 10:
            sub_configs = [
                (created_customers[0].id, created_plans[3].id, SubscriptionStatus.ACTIVE, False, today - timedelta(days=90), today + timedelta(days=30)),
                (created_customers[1].id, created_plans[4].id, SubscriptionStatus.ACTIVE, False, today - timedelta(days=120), today + timedelta(days=60)),
                (created_customers[2].id, created_plans[2].id, SubscriptionStatus.ACTIVE, False, today - timedelta(days=45), today + timedelta(days=15)),
                (created_customers[3].id, created_plans[5].id, SubscriptionStatus.ACTIVE, False, today - timedelta(days=180), today + timedelta(days=185)),
                (created_customers[4].id, created_plans[3].id, SubscriptionStatus.ACTIVE, True, today - timedelta(days=60), today + timedelta(days=30)),
                (created_customers[5].id, created_plans[0].id, SubscriptionStatus.ACTIVE, False, today - timedelta(days=10), today + timedelta(days=20)),
                (created_customers[6].id, created_plans[1].id, SubscriptionStatus.ACTIVE, False, today - timedelta(days=21), today + timedelta(days=7)),
                (created_customers[7].id, created_plans[3].id, SubscriptionStatus.QUOTATION, False, today - timedelta(days=5), today + timedelta(days=25)),
                (created_customers[8].id, created_plans[2].id, SubscriptionStatus.DRAFT, False, today - timedelta(days=2), today + timedelta(days=28)),
                (created_customers[9].id, created_plans[4].id, SubscriptionStatus.CLOSED, False, today - timedelta(days=200), today - timedelta(days=20)),
                (created_customers[10].id, created_plans[3].id, SubscriptionStatus.CONFIRMED, False, today - timedelta(days=3), today + timedelta(days=27)),
                (created_customers[11].id, created_plans[5].id, SubscriptionStatus.ACTIVE, False, today - timedelta(days=300), today + timedelta(days=65))
            ]

            for c_id, pl_id, st, is_p, s_date, e_date in sub_configs:
                sub_count = db.query(func.count(Subscription.id)).scalar() or 0
                sub_num = f"SUB-{sub_count + 1:04d}"

                sub = Subscription(
                    subscription_number=sub_num,
                    customer_id=c_id,
                    plan_id=pl_id,
                    status=st,
                    is_paused=is_p,
                    start_date=s_date,
                    expiry_date=e_date,
                    payment_terms="Immediate Payment",
                    total_amount=Decimal("0.00")
                )
                db.add(sub)
                db.commit()
                db.refresh(sub)

                odoo_variant = db.query(ProductVariant).filter(ProductVariant.attribute_name == "Brand", ProductVariant.attribute_value == "Odoo").first()
                v_id = odoo_variant.id if odoo_variant else None
                extra = odoo_variant.extra_price if odoo_variant else Decimal("0.00")
                unit_p = created_products[0].sales_price + extra

                tax = created_taxes[0]
                tax_amt = unit_p * (tax.rate / Decimal("100"))
                line_total = unit_p + tax_amt

                line = SubscriptionLine(
                    subscription_id=sub.id,
                    product_id=created_products[0].id,
                    variant_id=v_id,
                    quantity=1,
                    unit_price=unit_p,
                    tax_id=tax.id,
                    tax_amount=tax_amt,
                    line_amount=line_total
                )
                db.add(line)
                sub.total_amount = line_total
                db.commit()

                db.add(SubscriptionAuditLog(
                    subscription_id=sub.id,
                    from_status=SubscriptionStatus.DRAFT.value,
                    to_status=st.value,
                    action_note=f"Provisioned during seed setup as {st.value}",
                    user_id=admin.id
                ))
                db.commit()

                if st in (SubscriptionStatus.ACTIVE, SubscriptionStatus.CLOSED):
                    inv_count = db.query(func.count(Invoice.id)).scalar() or 0
                    inv_num = f"INV-{inv_count + 1:04d}"

                    inv_due = s_date + timedelta(days=30)
                    inv_status = InvoiceStatus.PAID if st == SubscriptionStatus.ACTIVE else InvoiceStatus.CONFIRMED

                    inv = Invoice(
                        invoice_number=inv_num,
                        subscription_id=sub.id,
                        customer_id=c_id,
                        period_start=s_date,
                        period_end=s_date + timedelta(days=30),
                        issue_date=s_date,
                        due_date=inv_due,
                        subtotal=unit_p,
                        tax_amount=tax_amt,
                        discount_amount=Decimal("0.00"),
                        total_amount=line_total,
                        amount_paid=line_total if inv_status == InvoiceStatus.PAID else Decimal("0.00"),
                        status=inv_status
                    )
                    db.add(inv)
                    db.commit()
                    db.refresh(inv)

                    db.add(InvoiceLine(
                        invoice_id=inv.id,
                        product_id=created_products[0].id,
                        variant_id=v_id,
                        quantity=1,
                        unit_price=unit_p,
                        tax_amount=tax_amt,
                        line_total=line_total
                    ))
                    db.commit()

                    if inv_status == InvoiceStatus.PAID:
                        db.add(Payment(
                            invoice_id=inv.id,
                            payment_method=PaymentMethod.CARD,
                            amount=line_total,
                            transaction_reference=f"TX-{inv.id}-{int(datetime.now().timestamp())}",
                            notes="Automated card collection"
                        ))
                        db.commit()

            overdue_sub = db.query(Subscription).filter(Subscription.status == SubscriptionStatus.ACTIVE).first()
            if overdue_sub:
                inv_count = db.query(func.count(Invoice.id)).scalar() or 0
                past_date = today - timedelta(days=45)
                past_due = today - timedelta(days=15)
                overdue_inv = Invoice(
                    invoice_number=f"INV-{inv_count + 1:04d}",
                    subscription_id=overdue_sub.id,
                    customer_id=overdue_sub.customer_id,
                    period_start=past_date,
                    period_end=past_date + timedelta(days=30),
                    issue_date=past_date,
                    due_date=past_due,
                    subtotal=Decimal("799.00"),
                    tax_amount=Decimal("65.92"),
                    discount_amount=Decimal("0.00"),
                    total_amount=Decimal("864.92"),
                    amount_paid=Decimal("0.00"),
                    status=InvoiceStatus.CONFIRMED
                )
                db.add(overdue_inv)
                db.commit()

        print("Brightloop Database Seeding Completed Successfully!")
        print(f"Users: {db.query(User).count()}")
        print(f"Products: {db.query(Product).count()}")
        print(f"Product Variants: {db.query(ProductVariant).count()}")
        print(f"Plans: {db.query(Plan).count()}")
        print(f"Taxes: {db.query(Tax).count()}")
        print(f"Discounts: {db.query(Discount).count()}")
        print(f"Subscriptions: {db.query(Subscription).count()}")
        print(f"Invoices: {db.query(Invoice).count()}")
        print(f"Payments: {db.query(Payment).count()}")
        print("-" * 50)
        print("DEMO CREDENTIALS:")
        print("  Administrator: admin@brightloop.com / Admin@123!")
        print("  Staff Member:  staff1@brightloop.com / Staff@123!")
        print("  Customer:      customer1@brightloop.com / Customer@123!")
        print("-" * 50)

    finally:
        db.close()

if __name__ == "__main__":
    seed()
