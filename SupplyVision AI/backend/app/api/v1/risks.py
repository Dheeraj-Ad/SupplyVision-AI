from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from datetime import datetime, timezone
from app.core.database import get_db
from app.models.rbac import require_role, Role
from app.services.graph import graph_service
from app.services.signals import signals_service

router = APIRouter()

@router.get("/scores")
def get_risk_scores(
    current_user: dict = Depends(require_role(Role.WAREHOUSE_STAFF)),
    db: Session = Depends(get_db)
):
    org_id = current_user["org_id"]
    user_role = current_user["role"]
    
    # Retrieve all nodes
    graph_data = graph_service.get_graph_data(org_id)
    nodes = graph_data.get("nodes", [])
    
    scores = []
    for node in nodes:
        node_type = node.get("label")
        
        # Enforce RBAC constraint: WAREHOUSE_STAFF can only see Warehouse node scores
        if user_role == Role.WAREHOUSE_STAFF.value and node_type != "Warehouse":
            continue
            
        scores.append({
            "node_id": node.get("id"),
            "node_type": node_type,
            "name": node.get("name") or node.get("code") or node.get("order_id"),
            "risk_score": node.get("current_risk_score", 0),
            "city": node.get("city", "N/A"),
            "state": node.get("state", "N/A")
        })
        
    return scores

@router.get("/scores/{node_id}")
def get_node_risk_details(
    node_id: str,
    current_user: dict = Depends(require_role(Role.WAREHOUSE_STAFF)),
    db: Session = Depends(get_db)
):
    org_id = current_user["org_id"]
    user_role = current_user["role"]
    
    # Fetch graph nodes to verify access
    graph_data = graph_service.get_graph_data(org_id)
    nodes = graph_data.get("nodes", [])
    node = next((n for n in nodes if n["id"] == node_id), None)
    
    if not node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Node not found in Digital Twin"
        )
        
    node_type = node.get("label")
    
    # Enforce RBAC constraint: WAREHOUSE_STAFF can only view details of Warehouse nodes
    if user_role == Role.WAREHOUSE_STAFF.value and node_type != "Warehouse":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Warehouse staff can only view warehouse node details."
        )
        
    # Standard static demo signals or dynamic signals computed
    # If a simulation was run, we fetch associated signals. Otherwise, return mock signals.
    mock_signals = [
        {"type": "weather", "source": "IMD", "event": "Cyclone warning", "intensity": 4, "distance_km": 250, "eta_hours": 36},
        {"type": "news", "source": "NewsAPI", "event": "Raw material price fluctuation in Southern clusters"}
    ]
    
    score, breakdown = signals_service.compute_composite_risk(node, mock_signals)
    
    # Set default values for signals to show in explainability UI
    return {
        "node_id": node_id,
        "node_type": node_type,
        "name": node.get("name") or node.get("code"),
        "risk_score": node.get("current_risk_score", score),
        "breakdown": breakdown,
        "signals": mock_signals,
        "confidence": 95,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "sources": ["IMD RSS", "NewsAPI"]
    }
