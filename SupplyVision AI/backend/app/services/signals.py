import logging
from typing import Dict, List, Any, Tuple
from datetime import datetime
from app.services.graph import graph_service

logger = logging.getLogger("signals_service")

class SignalsService:
    def __init__(self):
        pass

    def calculate_weather_risk(self, node_id: str, weather_signals: List[Dict[str, Any]]) -> float:
        """
        Formula:
          proximity_factor = max(0, 1 - (distance_km / 500))  // Decays over 500km
          urgency_factor = max(0, 1 - (eta_hours / 72))       // Decays over 72 hours
          severity_factor = (intensity / 5)                    // Normalised 0–1
          weather_risk = (proximity_factor * urgency_factor * severity_factor) * 100
        """
        if not weather_signals:
            return 0.0
        
        max_risk = 0.0
        for signal in weather_signals:
            distance_km = float(signal.get("distance_km", 200.0))
            eta_hours = float(signal.get("eta_hours", 24.0))
            intensity = float(signal.get("intensity", 3.0)) # scale 1-5
            
            proximity_factor = max(0.0, 1.0 - (distance_km / 500.0))
            urgency_factor = max(0.0, 1.0 - (eta_hours / 72.0))
            severity_factor = intensity / 5.0
            
            risk = (proximity_factor * urgency_factor * severity_factor) * 100.0
            
            # Scale up for intense cyclones/disasters
            if intensity >= 4:
                risk *= 1.5
                
            risk = min(100.0, max(0.0, risk))
            if risk > max_risk:
                max_risk = risk
                
        return max_risk

    def calculate_port_risk(self, node_id: str, port_signals: List[Dict[str, Any]]) -> float:
        """
        Formula:
          congestion_component = (port_congestion_pct / 100) * 100
          strike_multiplier = 2.0 if strike_active else 1.0
          delay_component = min(100, recent_delays * 5)
          port_risk = (congestion_component * 0.6 + delay_component * 0.4) * strike_multiplier
        """
        if not port_signals:
            return 0.0
            
        max_risk = 0.0
        for signal in port_signals:
            congestion_pct = float(signal.get("congestion_pct", 10.0))
            strike_active = bool(signal.get("strike_active", False))
            recent_delays = float(signal.get("recent_delays", 0.0))
            
            congestion_component = congestion_pct
            strike_multiplier = 2.0 if strike_active else 1.0
            delay_component = min(100.0, recent_delays * 5.0)
            
            risk = (congestion_component * 0.6 + delay_component * 0.4) * strike_multiplier
            risk = min(100.0, max(0.0, risk))
            if risk > max_risk:
                max_risk = risk
                
        return max_risk

    def calculate_dependency_risk(self, node_props: Dict[str, Any], news_signals: List[Dict[str, Any]]) -> float:
        """
        Formula:
          single_source_multiplier = 2.0 if is_single_source else 1.0
          signal_score = min(100, num_signals * 15)
          tier_factor = {1: 1.5, 2: 1.0, 3: 0.5}[tier]
          dependency_risk = (signal_score * tier_factor) * single_source_multiplier
        """
        is_single_source = bool(node_props.get("is_single_source", False))
        tier = int(node_props.get("tier", 2))
        
        num_signals = len(news_signals)
        single_source_multiplier = 2.0 if is_single_source else 1.0
        signal_score = min(100.0, num_signals * 15.0)
        
        # fallback mapping for safety
        tier_factors = {1: 1.5, 2: 1.0, 3: 0.5}
        tier_factor = tier_factors.get(tier, 1.0)
        
        risk = (signal_score * tier_factor) * single_source_multiplier
        return min(100.0, max(0.0, risk))

    def calculate_inventory_risk(self, node_props: Dict[str, Any]) -> float:
        """
        Formula:
          days_to_zero = current_stock / daily_burn_rate
          days_threshold = 8
          inventory_risk = max(0, (days_threshold - days_to_zero) / days_threshold * 100)
        """
        lbl = node_props.get("label")
        if lbl == "Port" or lbl == "Customer":
            return 0.0
        if lbl != "Warehouse":
            # For supplier nodes: estimate inventory risk from lead time + single-source status
            lead_days = float(node_props.get("lead_time_days", 7.0))
            if lead_days <= 3:
                base = 5.0
            elif lead_days <= 7:
                base = 15.0
            elif lead_days <= 14:
                base = 28.0
            else:
                base = 42.0
            if node_props.get("is_single_source"):
                base = min(100.0, base * 1.5)
            return base
            
        current_stock = float(node_props.get("current_stock_units", 100.0))
        daily_burn_rate = float(node_props.get("daily_burn_rate", 10.0))
        
        if daily_burn_rate <= 0:
            return 0.0
            
        days_to_zero = current_stock / daily_burn_rate
        days_threshold = 8.0
        
        if days_to_zero >= days_threshold:
            return 0.0
            
        risk = ((days_threshold - days_to_zero) / days_threshold) * 100.0
        return min(100.0, max(0.0, risk))

    def compute_composite_risk(self, node_props: Dict[str, Any], signals: List[Dict[str, Any]]) -> Tuple[int, Dict[str, Any]]:
        """
        Computes composite risk score 0-100:
          final_score = weather_risk*0.40 + port_risk*0.20 + dependency_risk*0.25 + inventory_risk*0.15
        """
        node_id = node_props.get("node_id") or node_props.get("code")
        
        # Segment signals by type
        weather_sigs = [s for s in signals if s.get("type") == "weather"]
        port_sigs = [s for s in signals if s.get("type") == "port"]
        news_sigs = [s for s in signals if s.get("type") == "news"]
        
        weather_risk = self.calculate_weather_risk(node_id, weather_sigs)
        port_risk = self.calculate_port_risk(node_id, port_sigs)
        dependency_risk = self.calculate_dependency_risk(node_props, news_sigs)
        inventory_risk = self.calculate_inventory_risk(node_props)
        
        # Weighted combination
        final_score = (
            weather_risk * 0.40 +
            port_risk * 0.20 +
            dependency_risk * 0.25 +
            inventory_risk * 0.15
        )
        
        clamped_score = min(100, max(0, int(round(final_score))))
        
        breakdown = {
            "weather_risk": int(round(weather_risk)),
            "port_risk": int(round(port_risk)),
            "dependency_risk": int(round(dependency_risk)),
            "inventory_risk": int(round(inventory_risk)),
            "weights": [0.40, 0.20, 0.25, 0.15]
        }
        
        return clamped_score, breakdown

signals_service = SignalsService()
