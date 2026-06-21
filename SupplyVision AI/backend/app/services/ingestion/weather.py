import urllib.request
import xml.etree.ElementTree as ET
import json
import logging
from datetime import datetime, timezone
from app.core.config import settings
from app.core.database import SignalEvent

logger = logging.getLogger("weather_ingestion")

def fetch_openweather_data(city: str = "Chennai") -> dict:
    """Fetch current weather for a city from OpenWeatherMap."""
    key = settings.OPENWEATHER_API_KEY
    if not key:
        logger.info("OpenWeatherMap API key not found. Using high-fidelity mock weather data.")
        return {
            "source": "OpenWeather",
            "location": city,
            "temp": 31.5,
            "weather": "Heavy Rain & Thunderstorms",
            "severity": 3,
            "confidence": 95,
            "raw": {"mock": True, "weather": [{"main": "Thunderstorm", "description": "heavy thunderstorm"}]}
        }
        
    url = f"https://api.openweathermap.org/data/2.5/weather?q={city},IN&appid={key}&units=metric"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "SupplyVisionAI/1.0"})
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode())
            weather_main = data.get("weather", [{}])[0].get("main", "")
            weather_desc = data.get("weather", [{}])[0].get("description", "")
            
            # Map weather type to severity
            severity = 1
            if weather_main.lower() in ["thunderstorm", "tornado", "squall"]:
                severity = 4
            elif weather_main.lower() in ["rain", "drizzle", "snow"] and "heavy" in weather_desc.lower():
                severity = 3
            elif weather_main.lower() in ["rain", "dust", "ash"]:
                severity = 2
                
            return {
                "source": "OpenWeather",
                "location": city,
                "temp": data.get("main", {}).get("temp"),
                "weather": f"{weather_main} ({weather_desc})",
                "severity": severity,
                "confidence": 100,
                "raw": data
            }
    except Exception as e:
        logger.error(f"Error fetching from OpenWeatherMap: {e}")
        return {
            "source": "OpenWeather",
            "location": city,
            "error": str(e),
            "severity": 1,
            "confidence": 50,
            "raw": {}
        }

def fetch_imd_alerts() -> list:
    """Fetch and parse IMD (Indian Meteorological Dept) XML RSS alerts."""
    url = "https://mausam.imd.gov.in/imd_latest/contents/all_india_forcast_rss.xml"
    alerts = []
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "SupplyVisionAI/1.0"})
        with urllib.request.urlopen(req, timeout=5) as response:
            xml_data = response.read()
            root = ET.fromstring(xml_data)
            
            # Parse items
            for item in root.findall(".//item"):
                title = item.find("title").text or ""
                description = item.find("description").text or ""
                
                # Check for severe weather keywords in India regions
                keywords = ["cyclone", "heavy rain", "depressions", "landslide", "flood", "thunderstorm", "heatwave"]
                found_kw = [kw for kw in keywords if kw in title.lower() or kw in description.lower()]
                
                if found_kw:
                    severity = 3
                    if "cyclone" in found_kw or "landslide" in found_kw:
                        severity = 4
                    if "severe" in title.lower() or "extremely" in title.lower():
                        severity = 5
                        
                    alerts.append({
                        "source": "IMD RSS",
                        "location": "India Regional",
                        "event": title,
                        "description": description[:300],
                        "severity": severity,
                        "confidence": 90,
                        "raw": {"title": title, "description": description}
                    })
    except Exception as e:
        logger.warning(f"Could not fetch IMD RSS alerts (using high-fidelity mock fallback): {e}")
        # Add a mock IMD alert to simulate Chennai/Tirupur cyclone warnings for testing
        alerts.append({
            "source": "IMD RSS",
            "location": "Chennai Port / Tamil Nadu Coastal",
            "event": "IMD Alert: Deep Depression over Bay of Bengal intensifies into Cyclone Storm",
            "description": "Squally weather with wind speed reaching 55-65 kmph gusting to 75 kmph is likely along coastal Tamil Nadu. Fishermen are advised not to venture into deep sea.",
            "severity": 4,
            "confidence": 95,
            "raw": {"mock": True}
        })
    return alerts

def fetch_gdacs_alerts() -> list:
    """Fetch international natural hazard alerts from GDACS RSS feed."""
    url = "https://www.gdacs.org/xml/rss.xml"
    alerts = []
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "SupplyVisionAI/1.0"})
        with urllib.request.urlopen(req, timeout=5) as response:
            xml_data = response.read()
            root = ET.fromstring(xml_data)
            
            for item in root.findall(".//item"):
                title = item.find("title").text or ""
                description = item.find("description").text or ""
                
                # We specifically watch for alerts in India or surrounding subcontinents
                if "india" in title.lower() or "india" in description.lower() or "bay of bengal" in title.lower():
                    severity = 3
                    if "red alert" in title.lower() or "severity: orange" in description.lower():
                        severity = 4
                    elif "red" in title.lower():
                        severity = 5
                        
                    alerts.append({
                        "source": "GDACS RSS",
                        "location": "India / Bay of Bengal",
                        "event": title,
                        "description": description[:300],
                        "severity": severity,
                        "confidence": 90,
                        "raw": {"title": title, "description": description}
                    })
    except Exception as e:
        logger.warning(f"Could not fetch GDACS alerts (using mock fallback): {e}")
        alerts.append({
            "source": "GDACS RSS",
            "location": "Gujarat Coastal / Arabian Sea",
            "event": "GDACS Red Alert: Tropical Cyclone in Arabian Sea",
            "description": "Tropical storm with wind speed up to 120 kmph moving towards Gujarat coastal regions.",
            "severity": 4,
            "confidence": 90,
            "raw": {"mock": True}
        })
    return alerts

def ingest_all_weather(db) -> list:
    """Fetch OpenWeather, IMD, and GDACS alerts, insert into SignalEvent and return them."""
    signals = []
    
    # 1. Fetch OpenWeather for key cities
    cities = ["Chennai", "Mumbai", "Delhi", "Hyderabad"]
    for city in cities:
        ow_data = fetch_openweather_data(city)
        if ow_data.get("severity", 1) > 2:
            event = SignalEvent(
                source=ow_data["source"],
                severity=ow_data["severity"],
                confidence=ow_data["confidence"],
                location=ow_data["location"],
                affected_nodes=[city.lower()],
                raw_data=ow_data["raw"]
            )
            db.add(event)
            signals.append(ow_data)
            
    # 2. Fetch IMD alerts
    imd_alerts = fetch_imd_alerts()
    for alert in imd_alerts:
        event = SignalEvent(
            source=alert["source"],
            severity=alert["severity"],
            confidence=alert["confidence"],
            location=alert["location"],
            affected_nodes=["chennai", "tirupur", "mumbai"], # Map to relevant Indian clusters
            raw_data=alert["raw"]
        )
        db.add(event)
        signals.append(alert)
        
    # 3. Fetch GDACS alerts
    gdacs_alerts = fetch_gdacs_alerts()
    for alert in gdacs_alerts:
        event = SignalEvent(
            source=alert["source"],
            severity=alert["severity"],
            confidence=alert["confidence"],
            location=alert["location"],
            affected_nodes=["gujarat", "mumbai", "chennai"],
            raw_data=alert["raw"]
        )
        db.add(event)
        signals.append(alert)
        
    db.commit()
    return signals
