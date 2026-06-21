import urllib.request
import xml.etree.ElementTree as ET
import json
import logging
from datetime import datetime, timezone
from app.core.config import settings
from app.core.database import SignalEvent

logger = logging.getLogger("news_ingestion")

def fetch_newsapi_signals(query: str = "supply chain disruption India") -> list:
    """Fetch current news articles related to disruptions via NewsAPI."""
    key = settings.NEWSAPI_KEY
    if not key:
        logger.info("NewsAPI key not found. Using high-fidelity mock news signals.")
        return [
            {
                "source": "NewsAPI",
                "location": "JNPT Port Mumbai",
                "event": "Port Workers Union announces strike at JNPT terminal",
                "description": "Cargo movements at India's largest container port JNPT are expected to hit a bottleneck due to wage negotiation deadlock.",
                "severity": 4,
                "confidence": 95,
                "raw": {"mock": True}
            }
        ]
        
    url = f"https://newsapi.org/v2/everything?q={urllib.parse.quote(query)}&apiKey={key}&sortBy=publishedAt&pageSize=5"
    signals = []
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "SupplyVisionAI/1.0"})
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode())
            articles = data.get("articles", [])
            for art in articles:
                title = art.get("title", "")
                desc = art.get("description", "") or ""
                source_name = art.get("source", {}).get("name", "NewsAPI")
                
                severity = 2
                if any(kwd in title.lower() or kwd in desc.lower() for kwd in ["strike", "lockout", "shut down", "halt", "fire"]):
                    severity = 4
                elif any(kwd in title.lower() or kwd in desc.lower() for kwd in ["shortage", "delay", "congestion", "spike"]):
                    severity = 3
                    
                signals.append({
                    "source": source_name,
                    "location": "India Supply Clusters",
                    "event": title,
                    "description": desc[:300],
                    "severity": severity,
                    "confidence": 90,
                    "raw": art
                })
    except Exception as e:
        logger.error(f"Error fetching from NewsAPI: {e}")
        
    return signals

def fetch_rss_news_signals() -> list:
    """Fetch supply chain related news from general RSS feeds (fallback)."""
    # Using a generic RSS feed template (like Reuters business news RSS)
    url = "https://www.reutersagency.com/feed/?best-sectors=business"
    signals = []
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "SupplyVisionAI/1.0"})
        with urllib.request.urlopen(req, timeout=5) as response:
            xml_data = response.read()
            root = ET.fromstring(xml_data)
            
            for item in root.findall(".//item"):
                title = item.find("title").text or ""
                description = item.find("description").text or ""
                
                # Check for disruption keywords
                keywords = ["strike", "shortage", "tariff", "factory closed", "port congestion", "lockdown"]
                found_kw = [kw for kw in keywords if kw in title.lower() or kw in description.lower()]
                
                if found_kw:
                    severity = 3
                    if "strike" in found_kw or "factory closed" in found_kw:
                        severity = 4
                        
                    signals.append({
                        "source": "Reuters RSS",
                        "location": "Global / India Trade routes",
                        "event": title,
                        "description": description[:300],
                        "severity": severity,
                        "confidence": 85,
                        "raw": {"title": title, "description": description}
                    })
    except Exception as e:
        logger.warning(f"Could not fetch Reuters business RSS: {e}")
        # Return fallback mock news alerts
        signals.append({
            "source": "Trade RSS Feed",
            "location": "Tirupur Textile Hub",
            "event": "Raw cotton shortage threatens garments manufacturing units in Tamil Nadu",
            "description": "Severe cotton crop damage in Central India leads to record cotton price spikes, pushing local SME yarn spinners to curtail capacity.",
            "severity": 3,
            "confidence": 90,
            "raw": {"mock": True}
        })
    return signals

def ingest_all_news(db) -> list:
    """Fetch news updates, save to database and return them."""
    signals = []
    
    # 1. Fetch NewsAPI articles
    news_api_sigs = fetch_newsapi_signals()
    for sig in news_api_sigs:
        event = SignalEvent(
            source=sig["source"],
            severity=sig["severity"],
            confidence=sig["confidence"],
            location=sig["location"],
            affected_nodes=["jnpt", "chennai_port", "supplier_1"],
            raw_data=sig["raw"]
        )
        db.add(event)
        signals.append(sig)
        
    # 2. Fetch RSS updates
    rss_sigs = fetch_rss_news_signals()
    for sig in rss_sigs:
        event = SignalEvent(
            source=sig["source"],
            severity=sig["severity"],
            confidence=sig["confidence"],
            location=sig["location"],
            affected_nodes=["supplier_1", "warehouse_1"],
            raw_data=sig["raw"]
        )
        db.add(event)
        signals.append(sig)
        
    db.commit()
    return signals
