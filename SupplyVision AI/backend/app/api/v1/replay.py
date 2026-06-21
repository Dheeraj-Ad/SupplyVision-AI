from fastapi import APIRouter, Depends, HTTPException, status
from app.models.rbac import require_role, Role
from app.services.replay.engine import HistoricalReplayEngine

router = APIRouter()

@router.get("/scenarios")
def get_replay_scenarios(
    current_user: dict = Depends(require_role(Role.WAREHOUSE_STAFF))
):
    """Retrieve list of available historical disruption scenarios."""
    return HistoricalReplayEngine.get_scenarios()

@router.get("/scenarios/{scenario_id}")
def get_replay_timeline(
    scenario_id: str,
    current_user: dict = Depends(require_role(Role.WAREHOUSE_STAFF))
):
    """Retrieve complete event timeline and metrics for a specific historical scenario."""
    scenario = HistoricalReplayEngine.get_scenario_timeline(scenario_id)
    if not scenario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Historical scenario '{scenario_id}' not found."
        )
    return scenario
