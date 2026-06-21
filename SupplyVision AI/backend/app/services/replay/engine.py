class HistoricalReplayEngine:
    @staticmethod
    def get_scenarios() -> list:
        return [
            {
                "id": "chennai_floods",
                "name": "Chennai Floods (2015)",
                "description": "Extreme monsoon rainfall causing urban flooding, shutting down Chennai Port and local textile/yarn manufacturing clusters for 8 days.",
                "total_impacted_days": 8,
                "base_revenue_at_risk_inr": 28000000,
                "mitigated_savings_inr": 18500000,
                "roi_multiple": 2.4
            },
            {
                "id": "gujarat_cyclone",
                "name": "Gujarat Cyclone (2019)",
                "description": "Very severe cyclonic storm Vayu warning along the Kathiawar coast, disrupting port operations at Kandla/Mundra and logistics corridors.",
                "total_impacted_days": 5,
                "base_revenue_at_risk_inr": 18500000,
                "mitigated_savings_inr": 14200000,
                "roi_multiple": 3.1
            },
            {
                "id": "port_congestion",
                "name": "JNPT Port Congestion (2021)",
                "description": "Global container imbalance and labor negotiations causing average vessel dwell times to spike from 24h to 7 days, stalling export orders.",
                "total_impacted_days": 14,
                "base_revenue_at_risk_inr": 42000000,
                "mitigated_savings_inr": 26000000,
                "roi_multiple": 1.9
            }
        ]

    @classmethod
    def get_scenario_timeline(cls, scenario_id: str) -> dict:
        scenarios = {
            "chennai_floods": {
                "id": "chennai_floods",
                "name": "Chennai Floods (2015)",
                "metrics": {
                    "revenue_exposure_inr": 28000000,
                    "recovery_cost_inr": 7700000,
                    "expected_savings_inr": 18500000,
                    "roi_multiple": 2.4,
                    "affected_nodes": ["chennai_port", "supplier_1"]
                },
                "timeline": [
                    {
                        "day": 1,
                        "title": "Severe Weather Warning Issued",
                        "description": "IMD issues red alert for coastal Tamil Nadu indicating heavy to extremely heavy rainfall over next 72 hours.",
                        "status": "warning",
                        "exposure_inr": 0,
                        "impacted_nodes": []
                    },
                    {
                        "day": 2,
                        "title": "Urban Flooding & Logistics Disruption",
                        "description": "Water logging blocks local arterial highways. Container trucks stranded on Outer Ring Road.",
                        "status": "active",
                        "exposure_inr": 5000000,
                        "impacted_nodes": ["route_1"]
                    },
                    {
                        "day": 3,
                        "title": "Chennai Port Operations Suspended",
                        "description": "Chennai Port Trust halts vessel loading/unloading. Dwell times spike to infinity.",
                        "status": "active",
                        "exposure_inr": 12000000,
                        "impacted_nodes": ["chennai_port", "route_1"]
                    },
                    {
                        "day": 4,
                        "title": "Yarn Spinning Mills Closed",
                        "description": "Power outages and employee transit blocks force Chennai-Tirupur spinners (Supplier 1) to suspend mill operations.",
                        "status": "critical",
                        "exposure_inr": 28000000,
                        "impacted_nodes": ["chennai_port", "supplier_1", "route_1"]
                    },
                    {
                        "day": 5,
                        "title": "Contingency Routing Activated",
                        "description": "Decision intelligence engine triggers alternate sourcing. Shift yarn orders to Coimbatore Mills (Supplier B). Reroute logistics via road.",
                        "status": "recovery_initiated",
                        "exposure_inr": 28000000,
                        "impacted_nodes": ["chennai_port", "supplier_1", "route_1"]
                    },
                    {
                        "day": 6,
                        "title": "Coimbatore Shipments Arrive",
                        "description": "First batches of combed yarn arrive at warehouses. Production lines resume at 80% capacity.",
                        "status": "recovery_in_progress",
                        "exposure_inr": 15000000,
                        "impacted_nodes": ["chennai_port"]
                    },
                    {
                        "day": 8,
                        "title": "Resilience Restored & Lessons Logged",
                        "description": "Port water recedes, operations resume. Chennai mills reopen. Total protected revenue: ₹1.85 Cr.",
                        "status": "resolved",
                        "exposure_inr": 0,
                        "impacted_nodes": []
                    }
                ]
            },
            "gujarat_cyclone": {
                "id": "gujarat_cyclone",
                "name": "Gujarat Cyclone (2019)",
                "metrics": {
                    "revenue_exposure_inr": 18500000,
                    "recovery_cost_inr": 4500000,
                    "expected_savings_inr": 14200000,
                    "roi_multiple": 3.1,
                    "affected_nodes": ["mundra_port", "supplier_2"]
                },
                "timeline": [
                    {
                        "day": 1,
                        "title": "Tropical Cyclone Alert",
                        "description": "GDACS flags Orange Alert. Cyclone Vayu approaches Saurashtra coast. Wind speeds forecasted at 130 kmph.",
                        "status": "warning",
                        "exposure_inr": 0,
                        "impacted_nodes": []
                    },
                    {
                        "day": 2,
                        "title": "Mundra Port Evacuation",
                        "description": "Port authority orders vessels to leave berths. Container gates closed. Operations halted.",
                        "status": "active",
                        "exposure_inr": 8000000,
                        "impacted_nodes": ["mundra_port"]
                    },
                    {
                        "day": 3,
                        "title": "Logistics Corridor Standstill",
                        "description": "Rail freight corridors connecting Gujarat ports to North India inland depots (ICDs) suspended.",
                        "status": "critical",
                        "exposure_inr": 18500000,
                        "impacted_nodes": ["mundra_port", "route_2"]
                    },
                    {
                        "day": 4,
                        "title": "Safety Buffer Drawdown",
                        "description": "Inland assembly hubs draw from pre-positioned safety buffer stocks, avoiding line stoppage.",
                        "status": "recovery_initiated",
                        "exposure_inr": 10000000,
                        "impacted_nodes": ["mundra_port"]
                    },
                    {
                        "day": 5,
                        "title": "Ports Reopened",
                        "description": "Vayu cyclonic system moves away from coast. Damage assessment completed. Vessel gates reopen. Protected revenue: ₹1.42 Cr.",
                        "status": "resolved",
                        "exposure_inr": 0,
                        "impacted_nodes": []
                    }
                ]
            },
            "port_congestion": {
                "id": "port_congestion",
                "name": "JNPT Port Congestion (2021)",
                "metrics": {
                    "revenue_exposure_inr": 42000000,
                    "recovery_cost_inr": 13600000,
                    "expected_savings_inr": 26000000,
                    "roi_multiple": 1.9,
                    "affected_nodes": ["jnpt", "route_3"]
                },
                "timeline": [
                    {
                        "day": 1,
                        "title": "Container Shortage Backlog",
                        "description": "Equipment imbalance at European lanes causes shipping lines to bypass JNPT container depots.",
                        "status": "warning",
                        "exposure_inr": 2000000,
                        "impacted_nodes": []
                    },
                    {
                        "day": 3,
                        "title": "Yard Congestion Alert",
                        "description": "Yard utilization at JNPT terminal spikes past 90%. Average gate-in waiting times exceed 18 hours.",
                        "status": "active",
                        "exposure_inr": 15000000,
                        "impacted_nodes": ["jnpt"]
                    },
                    {
                        "day": 5,
                        "title": "Contract Delays Flagged",
                        "description": "Delayed export shipments trigger late delivery penalties. High-value electronics components stuck in transit.",
                        "status": "critical",
                        "exposure_inr": 42000000,
                        "impacted_nodes": ["jnpt", "route_3"]
                    },
                    {
                        "day": 7,
                        "title": "Express Air Freight Conversion",
                        "description": "Convert critical high-priority POs to express air cargo via Mumbai Airport. Ocean shipments deferred.",
                        "status": "recovery_initiated",
                        "exposure_inr": 42000000,
                        "impacted_nodes": ["jnpt", "route_3"]
                    },
                    {
                        "day": 10,
                        "title": "Air Cargo Delivered",
                        "description": "Critical electronics assemblies clear customs at Mumbai cargo hub and reach factories. Saved SLA penalty.",
                        "status": "recovery_in_progress",
                        "exposure_inr": 18000000,
                        "impacted_nodes": ["jnpt"]
                    },
                    {
                        "day": 14,
                        "title": "Congestion Moderates",
                        "description": "Port backlog clears. Ocean lines stabilize. Total protected value: ₹2.60 Cr.",
                        "status": "resolved",
                        "exposure_inr": 0,
                        "impacted_nodes": []
                    }
                ]
            }
        }
        
        return scenarios.get(scenario_id, {})
