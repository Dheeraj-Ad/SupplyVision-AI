import logging
from typing import List, Dict, Any
from datetime import datetime, timedelta, timezone

logger = logging.getLogger("recovery_engine")

class RecoveryEngine:
    def __init__(self):
        pass

    def generate_recovery_plan(self, org_id: str, alert_id: str, node_id: str, node_type: str, exposed_orders: List[Dict[str, Any]], severity: int) -> List[Dict[str, Any]]:
        """
        Generates a list of ranked recovery options based on the exposed orders and disrupted node details.
        Ranks options by: Confidence % * Savings (INR)
        """
        if not exposed_orders:
            return []

        total_value_inr = sum(o.get("value_inr", 0) for o in exposed_orders)
        total_units = sum(o.get("units", 0) for o in exposed_orders)
        
        options = []
        
        # Option 1: Supplier Switch (if node is a Supplier or Route)
        if node_type == "Supplier" or node_type == "Route":
            # Simulation: alternative Coimbatore or Mumbai supplier
            extra_freight_cost = int(total_units * 150) # e.g. 150 INR extra per unit
            avoided_penalties = int(total_value_inr * 0.20) # 20% penalty avoided
            avoided_delay_costs = int(total_value_inr * 0.15) # 15% line stoppage or delay penalties avoided
            
            expected_savings = (avoided_penalties + avoided_delay_costs) - extra_freight_cost
            
            options.append({
                "rank": 1,
                "title": f"Switch to Alternate Supplier B (Coimbatore)",
                "description": f"Shift 40% of weekly order volume to Coimbatore node to bypass disruption in {node_id}.",
                "action_type": "supplier_switch",
                "affected_node": node_id,
                "alternate_supplier": "Supplier B (Coimbatore)",
                "capacity": 2000,
                "lead_time_days": 5,
                "recovery_cost_inr": extra_freight_cost,
                "recovery_cost_breakdown": {
                    "extra_freight_inr": extra_freight_cost,
                    "setup_inr": 0,
                    "other_inr": 0
                },
                "expected_savings_inr": max(0, expected_savings),
                "savings_breakdown": {
                    "avoided_penalty_inr": avoided_penalties,
                    "avoided_delay_cost_inr": avoided_delay_costs
                },
                "confidence_percent": 85 if severity < 4 else 70,
                "confidence_reason": "Supplier B confirmed availability + historical on-time track record.",
                "risk_mitigations": [
                    "Supplier B is located 150km away, outside the immediate cyclone warning zone."
                ],
                "implementation_checklist": [
                    f"1. Contact Supplier B procurement team to confirm volume allocation.",
                    "2. Update active Purchase Order documents in the system.",
                    "3. Book alternate road cargo vehicles via Coimbatore route."
                ]
            })
            
        # Option 2: Pre-position Safety Stock (Buffer Stock Draw)
        buffer_cost_per_unit = 200 # Storage and expedited handling
        expedited_procurement_cost = int(total_units * buffer_cost_per_unit)
        avoided_loss = int(total_value_inr * 0.15) # avoids 15% revenue loss
        
        expected_savings_buffer = avoided_loss - expedited_procurement_cost
        
        options.append({
            "rank": 2,
            "title": "Draw from Safety Buffer Stock at Warehouse A",
            "description": f"Pre-position safety stock units from Warehouse A to meet upcoming production requirements.",
            "action_type": "buffer_stock",
            "affected_node": node_id,
            "target_node": "Warehouse A",
            "alternate_supplier": "Warehouse A Safety Stock",
            "capacity": 5000,
            "lead_time_days": 1,
            "recovery_cost_inr": expedited_procurement_cost,
            "expected_savings_inr": max(0, expected_savings_buffer),
            "confidence_percent": 95,
            "confidence_reason": "Warehouse A has active available buffer stock on hand.",
            "risk_mitigations": [
                "Increases warehouse safety stock depletion rate; must be replenished once disruption subsides."
            ],
            "implementation_checklist": [
                "1. Verify physical stock counts at Warehouse A.",
                "2. Issue stock dispatch request form.",
                "3. Monitor remaining buffer days count."
            ]
        })

        # Option 3: Expedited Air Route
        if node_type == "Route" or node_type == "Port":
            air_premium = int(total_units * 300) # expensive
            avoided_late_penalties = int(total_value_inr * 0.30)
            
            expected_savings_air = avoided_late_penalties - air_premium
            
            options.append({
                "rank": 3,
                "title": "Reroute Shipments via Air Freight (Urgent)",
                "description": "Convert pending sea-cargo routes to express air freight shipments to bypass port congestion.",
                "action_type": "reroute_air",
                "affected_node": node_id,
                "alternate_supplier": "Air Freight Express Cargo",
                "capacity": 1000,
                "lead_time_days": 2,
                "recovery_cost_inr": air_premium,
                "expected_savings_inr": max(0, expected_savings_air),
                "confidence_percent": 80,
                "confidence_reason": "Air cargo carriers have confirmed space availability on current routes.",
                "risk_mitigations": [
                    "Bypasses maritime port delay entirely, but increases transportation costs significantly."
                ],
                "implementation_checklist": [
                    "1. Cancel ocean bill of lading.",
                    "2. Secure booking slots with air freighter partner.",
                    "3. Coordinate custom clearances at airports."
                ]
            })

        # Sort options based on Confidence-Weighted Savings: Confidence % * Savings INR
        ranked_options = []
        for opt in options:
            confidence = opt.get("confidence_percent", 50)
            savings = opt.get("expected_savings_inr", 0)
            opt["score"] = int((confidence / 100.0) * savings)
            ranked_options.append(opt)
            
        ranked_options.sort(key=lambda x: x["score"], reverse=True)
        
        # Correct rank mapping indices
        for idx, opt in enumerate(ranked_options):
            opt["rank"] = idx + 1
            
        return ranked_options

recovery_engine = RecoveryEngine()
