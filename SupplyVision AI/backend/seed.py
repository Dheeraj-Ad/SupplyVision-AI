import logging
from app.core.database import init_db, SessionLocal, Organisation, User
from app.core.security import get_password_hash
from app.services.graph import graph_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seed")

def seed_database():
    logger.info("Initializing tables...")
    init_db()
    
    db = SessionLocal()
    try:
        # 1. Seed Organisations
        org_id = "7c9e6679-7425-40de-944b-e07fc1f90ae7"
        tamil_org = db.query(Organisation).filter(Organisation.id == org_id).first()
        if not tamil_org:
            tamil_org = Organisation(
                id=org_id,
                name="Tamil Knitwear Exports",
                gstin="33ABCDE1234F2Z0",
                plan="starter",
                max_suppliers=25,
                whatsapp_numbers=["+919876543210", "+919876543211"],
                is_active=True
            )
            db.add(tamil_org)
            logger.info("Seeding Tamil Knitwear Exports organisation...")
            
        pune_org_id = "d2a3c77d-78cf-49b0-9b0d-b4cb6bf7135e"
        pune_org = db.query(Organisation).filter(Organisation.id == pune_org_id).first()
        if not pune_org:
            pune_org = Organisation(
                id=pune_org_id,
                name="Pune Precision Parts",
                gstin="27XYZAB5678C1Z2",
                plan="growth",
                max_suppliers=75,
                whatsapp_numbers=["+919988776655"],
                is_active=True
            )
            db.add(pune_org)
            logger.info("Seeding Pune Precision Parts organisation...")

        # 2. Seed Users
        # Password for all users will be: password
        password_hash = get_password_hash("password")
        
        users_to_seed = [
            {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "org_id": None,
                "email": "admin@supplyvision.ai",
                "role": "super_admin",
                "full_name": "Super Admin Root",
                "phone_in": "+919999999999",
                "preferred_lang": "en"
            },
            {
                "id": "1a3b5c7d-9e0f-4a3b-8c7d-9e0f4a3b8c7d",
                "org_id": org_id,
                "email": "ramesh@tamilknitwear.com",
                "role": "sme_owner",
                "full_name": "Ramesh MillOwner",
                "phone_in": "+919876543210",
                "preferred_lang": "hi"
            },
            {
                "id": "2b4c6d8e-0f1a-4b3c-9d8e-0f1a2b3c4d5e",
                "org_id": org_id,
                "email": "priya@tamilknitwear.com",
                "role": "sc_manager",
                "full_name": "Priya Procurement",
                "phone_in": "+919876543211",
                "preferred_lang": "en"
            },
            {
                "id": "3c5d7e9f-1a2b-4c3d-0e1f-2a3b4c5d6e7f",
                "org_id": org_id,
                "email": "suresh@tamilknitwear.com",
                "role": "warehouse_staff",
                "full_name": "Suresh Storekeeper",
                "phone_in": "+919876543212",
                "preferred_lang": "hi"
            },
            {
                "id": "4d6e8f0a-2b3c-4d5e-1f2a-3b4c5d6e7f8a",
                "org_id": org_id,
                "email": "anjali@ca-associates.in",
                "role": "auditor",
                "full_name": "CA Anjali Auditor",
                "phone_in": "+919876543213",
                "preferred_lang": "en"
            }
        ]

        for user_data in users_to_seed:
            existing_user = db.query(User).filter(User.email == user_data["email"]).first()
            if not existing_user:
                new_user = User(
                    id=user_data["id"],
                    org_id=user_data["org_id"],
                    email=user_data["email"],
                    phone_in=user_data["phone_in"],
                    role=user_data["role"],
                    full_name=user_data["full_name"],
                    password_hash=password_hash,
                    preferred_lang=user_data["preferred_lang"],
                    is_active=True
                )
                db.add(new_user)
                logger.info(f"Seeding user: {user_data['email']} ({user_data['role']})")
                
        db.commit()
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error seeding database: {e}")
    finally:
        db.close()

    # 3. Seed Graph Twin details (using graph_service methods)
    logger.info("Seeding digital twin graph nodes and edges...")
    
    # Tamil Knitwear org_id
    org_id = "7c9e6679-7425-40de-944b-e07fc1f90ae7"

    # Add Suppliers
    suppliers = [
        {
            "id": "supplier_1",
            "data": {
                "name": "Supplier S1 (Erode Yarn Mill)",
                "city": "Erode",
                "state": "Tamil Nadu",
                "location_lat": 11.3410,
                "location_lng": 77.7170,
                "category": "yarn",
                "lead_time_days": 4,
                "is_single_source": True, # single source is high dependency risk
                "tier": 1, # critical
                "revenue_exposure_inr": 1500000,
                "capacity_units": 5000,
                "reliability_score": 92
            }
        },
        {
            "id": "supplier_2",
            "data": {
                "name": "Supplier B (Coimbatore Dyeing)",
                "city": "Coimbatore",
                "state": "Tamil Nadu",
                "location_lat": 11.0168,
                "location_lng": 76.9558,
                "category": "dyeing",
                "lead_time_days": 3,
                "is_single_source": False,
                "tier": 2, # important
                "revenue_exposure_inr": 500000,
                "capacity_units": 3000,
                "reliability_score": 96
            }
        },
        {
            "id": "supplier_3",
            "data": {
                "name": "Supplier S3 (Chennai Cotton Traders)",
                "city": "Chennai",
                "state": "Tamil Nadu",
                "location_lat": 13.0827,
                "location_lng": 80.2707,
                "category": "fabric",
                "lead_time_days": 6,
                "is_single_source": False,
                "tier": 3, # standard
                "revenue_exposure_inr": 1600000,
                "capacity_units": 6000,
                "reliability_score": 89
            }
        }
    ]

    for s in suppliers:
        graph_service.add_supplier(org_id, s["id"], s["data"])

    # Setup alternate link: Supplier S1 has alternate Supplier B
    graph_service.link_alternate_supplier(org_id, "supplier_1", "supplier_2")

    # Add Ports
    graph_service.add_port("MAA", "Chennai Port", "Chennai", "India")
    graph_service.add_port("TUT", "Tuticorin Port", "Tuticorin", "India")

    # Add Warehouses
    graph_service.add_warehouse(
        org_id=org_id,
        warehouse_id="warehouse_1",
        name="Warehouse A (Tirupur Godown)",
        city="Tirupur",
        capacity_units=10000,
        current_stock_units=2400, # enough safety stock (16 days at 150/day)
        daily_burn_rate=150
    )

    # Add Customers
    graph_service.add_customer(
        org_id=org_id,
        customer_id="customer_1",
        name="Global Apparel Brands",
        city="Mumbai",
        contract_penalty_per_day_inr=50000
    )

    # Link Warehouse -> Customer
    graph_service.link_warehouse_to_customer(org_id, "warehouse_1", "customer_1")

    # Add Routes
    # Route 1: Supplier S1 -> Warehouse A
    graph_service.add_route(
        org_id=org_id,
        route_id="route_1",
        mode="road",
        origin_id="supplier_1",
        destination_id="warehouse_1",
        avg_transit_days=2,
        cost_per_unit=12
    )

    # Route 2: Supplier S2 -> Warehouse A
    graph_service.add_route(
        org_id=org_id,
        route_id="route_2",
        mode="road",
        origin_id="supplier_2",
        destination_id="warehouse_1",
        avg_transit_days=1,
        cost_per_unit=10
    )

    # Route 3: Supplier S3 -> MAA Port -> Warehouse A
    # Register MAA -> Warehouse A Route
    graph_service.add_route(
        org_id=org_id,
        route_id="route_3",
        mode="sea",
        origin_id="supplier_3",
        destination_id="warehouse_1",
        avg_transit_days=5,
        cost_per_unit=25
    )

    # Add Orders
    orders = [
        {
            "id": "order_101",
            "supplier_id": "supplier_1",
            "value_inr": 1500000, # 15 Lakhs
            "units": 4000,
            "required_by_date": "2026-06-25",
            "status": "active"
        },
        {
            "id": "order_102",
            "supplier_id": "supplier_3",
            "value_inr": 1600000, # 16 Lakhs
            "units": 5000,
            "required_by_date": "2026-06-28",
            "status": "active"
        },
        {
            "id": "order_103",
            "supplier_id": "supplier_2",
            "value_inr": 500000, # 5 Lakhs
            "units": 1000,
            "required_by_date": "2026-07-02",
            "status": "active"
        }
    ]

    for o in orders:
        graph_service.add_order(
            org_id=org_id,
            order_id=o["id"],
            supplier_id=o["supplier_id"],
            value_inr=o["value_inr"],
            units=o["units"],
            required_by_date=o["required_by_date"],
            status=o["status"]
        )

    logger.info("Graph twins seeded successfully.")

if __name__ == "__main__":
    seed_database()
