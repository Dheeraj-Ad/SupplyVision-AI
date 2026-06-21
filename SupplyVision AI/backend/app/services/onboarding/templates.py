class OnboardingTemplates:
    @staticmethod
    def get_template_data(industry: str) -> dict:
        templates = {
            "textile": {
                "suppliers": [
                    {
                        "name": "Coimbatore Cotton Yarn Mills",
                        "city": "Coimbatore",
                        "state": "Tamil Nadu",
                        "location_lat": 11.0168,
                        "location_lng": 76.9558,
                        "category": "yarn",
                        "lead_time_days": 4,
                        "is_single_source": False,
                        "tier": 1,
                        "revenue_exposure_inr": 800000,
                        "capacity_units": 5000,
                        "reliability_score": 96
                    },
                    {
                        "name": "Tirupur Dyeing & Weaving Co",
                        "city": "Tirupur",
                        "state": "Tamil Nadu",
                        "location_lat": 11.1085,
                        "location_lng": 77.3411,
                        "category": "processing",
                        "lead_time_days": 6,
                        "is_single_source": True,
                        "tier": 1,
                        "revenue_exposure_inr": 1800000,
                        "capacity_units": 3000,
                        "reliability_score": 92
                    }
                ],
                "ports": [
                    {
                        "id": "chennai_port",
                        "name": "Chennai Port Trust",
                        "city": "Chennai",
                        "state": "Tamil Nadu",
                        "location_lat": 13.0827,
                        "location_lng": 80.2707,
                        "category": "maritime"
                    }
                ],
                "warehouses": [
                    {
                        "id": "warehouse_tirupur",
                        "name": "Tirupur Logistics Depot",
                        "city": "Tirupur",
                        "state": "Tamil Nadu",
                        "location_lat": 11.1085,
                        "location_lng": 77.3411,
                        "current_stock_units": 1500,
                        "daily_burn_rate": 200,
                        "capacity_units": 8000
                    }
                ],
                "routes": [
                    {"mode": "road", "origin_id": "Coimbatore Cotton Yarn Mills", "destination_id": "warehouse_tirupur", "avg_transit_days": 1, "cost_per_unit": 10},
                    {"mode": "road", "origin_id": "Tirupur Dyeing & Weaving Co", "destination_id": "warehouse_tirupur", "avg_transit_days": 1, "cost_per_unit": 8},
                    {"mode": "sea", "origin_id": "warehouse_tirupur", "destination_id": "chennai_port", "avg_transit_days": 2, "cost_per_unit": 35}
                ]
            },
            "pharma": {
                "suppliers": [
                    {
                        "name": "Hyderabad API Laboratories",
                        "city": "Hyderabad",
                        "state": "Telangana",
                        "location_lat": 17.3850,
                        "location_lng": 78.4867,
                        "category": "api_chemical",
                        "lead_time_days": 10,
                        "is_single_source": True,
                        "tier": 1,
                        "revenue_exposure_inr": 3500000,
                        "capacity_units": 1200,
                        "reliability_score": 94
                    },
                    {
                        "name": "Baddi Packaging Solutions",
                        "city": "Baddi",
                        "state": "Himachal Pradesh",
                        "location_lat": 30.9329,
                        "location_lng": 76.7900,
                        "category": "packaging",
                        "lead_time_days": 5,
                        "is_single_source": False,
                        "tier": 2,
                        "revenue_exposure_inr": 450000,
                        "capacity_units": 10000,
                        "reliability_score": 98
                    }
                ],
                "ports": [
                    {
                        "id": "jnpt",
                        "name": "JNPT Port Mumbai",
                        "city": "Mumbai",
                        "state": "Maharashtra",
                        "location_lat": 18.9500,
                        "location_lng": 72.9500,
                        "category": "maritime"
                    }
                ],
                "warehouses": [
                    {
                        "id": "warehouse_baddi",
                        "name": "Baddi Formulation Warehouse",
                        "city": "Baddi",
                        "state": "Himachal Pradesh",
                        "location_lat": 30.9329,
                        "location_lng": 76.7900,
                        "current_stock_units": 800,
                        "daily_burn_rate": 80,
                        "capacity_units": 4000
                    }
                ],
                "routes": [
                    {"mode": "road", "origin_id": "Hyderabad API Laboratories", "destination_id": "warehouse_baddi", "avg_transit_days": 3, "cost_per_unit": 65},
                    {"mode": "road", "origin_id": "Baddi Packaging Solutions", "destination_id": "warehouse_baddi", "avg_transit_days": 1, "cost_per_unit": 5},
                    {"mode": "rail", "origin_id": "warehouse_baddi", "destination_id": "jnpt", "avg_transit_days": 4, "cost_per_unit": 120}
                ]
            },
            "auto": {
                "suppliers": [
                    {
                        "name": "Pune Precision Pressings",
                        "city": "Pune",
                        "state": "Maharashtra",
                        "location_lat": 18.5204,
                        "location_lng": 73.8567,
                        "category": "stampings",
                        "lead_time_days": 3,
                        "is_single_source": False,
                        "tier": 2,
                        "revenue_exposure_inr": 1200000,
                        "capacity_units": 4000,
                        "reliability_score": 97
                    },
                    {
                        "name": "Chennai Castings & Forgings",
                        "city": "Chennai",
                        "state": "Tamil Nadu",
                        "location_lat": 13.0827,
                        "location_lng": 80.2707,
                        "category": "castings",
                        "lead_time_days": 7,
                        "is_single_source": True,
                        "tier": 1,
                        "revenue_exposure_inr": 2800000,
                        "capacity_units": 1500,
                        "reliability_score": 91
                    }
                ],
                "ports": [
                    {
                        "id": "jnpt",
                        "name": "JNPT Port Mumbai",
                        "city": "Mumbai",
                        "state": "Maharashtra",
                        "location_lat": 18.9500,
                        "location_lng": 72.9500,
                        "category": "maritime"
                    }
                ],
                "warehouses": [
                    {
                        "id": "warehouse_gurugram",
                        "name": "Gurugram Assembly Depot",
                        "city": "Gurugram",
                        "state": "Haryana",
                        "location_lat": 28.4595,
                        "location_lng": 77.0266,
                        "current_stock_units": 300,
                        "daily_burn_rate": 50,
                        "capacity_units": 1200
                    }
                ],
                "routes": [
                    {"mode": "road", "origin_id": "Pune Precision Pressings", "destination_id": "warehouse_gurugram", "avg_transit_days": 2, "cost_per_unit": 40},
                    {"mode": "rail", "origin_id": "Chennai Castings & Forgings", "destination_id": "warehouse_gurugram", "avg_transit_days": 3, "cost_per_unit": 90},
                    {"mode": "road", "origin_id": "warehouse_gurugram", "destination_id": "jnpt", "avg_transit_days": 2, "cost_per_unit": 70}
                ]
            },
            "electronics": {
                "suppliers": [
                    {
                        "name": "Shenzhen PCB Fab",
                        "city": "Shenzhen",
                        "state": "Guangdong",
                        "location_lat": 22.5431,
                        "location_lng": 114.0579,
                        "category": "pcb",
                        "lead_time_days": 12,
                        "is_single_source": True,
                        "tier": 1,
                        "revenue_exposure_inr": 4800000,
                        "capacity_units": 10000,
                        "reliability_score": 93
                    },
                    {
                        "name": "Noida Assembling Components",
                        "city": "Noida",
                        "state": "Uttar Pradesh",
                        "location_lat": 28.5355,
                        "location_lng": 77.3910,
                        "category": "passives",
                        "lead_time_days": 4,
                        "is_single_source": False,
                        "tier": 2,
                        "revenue_exposure_inr": 950000,
                        "capacity_units": 20000,
                        "reliability_score": 97
                    }
                ],
                "ports": [
                    {
                        "id": "jnpt",
                        "name": "JNPT Port Mumbai",
                        "city": "Mumbai",
                        "state": "Maharashtra",
                        "location_lat": 18.9500,
                        "location_lng": 72.9500,
                        "category": "maritime"
                    }
                ],
                "warehouses": [
                    {
                        "id": "warehouse_noida",
                        "name": "Noida Electronics Depot",
                        "city": "Noida",
                        "state": "Uttar Pradesh",
                        "location_lat": 28.5355,
                        "location_lng": 77.3910,
                        "current_stock_units": 4500,
                        "daily_burn_rate": 600,
                        "capacity_units": 25000
                    }
                ],
                "routes": [
                    {"mode": "sea", "origin_id": "Shenzhen PCB Fab", "destination_id": "jnpt", "avg_transit_days": 14, "cost_per_unit": 180},
                    {"mode": "road", "origin_id": "jnpt", "destination_id": "warehouse_noida", "avg_transit_days": 2, "cost_per_unit": 60},
                    {"mode": "road", "origin_id": "Noida Assembling Components", "destination_id": "warehouse_noida", "avg_transit_days": 1, "cost_per_unit": 10}
                ]
            }
        }
        return templates.get(industry, {})
