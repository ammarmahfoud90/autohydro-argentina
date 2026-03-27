from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from app.services.hyetograph_service import generate_hyetograph

router = APIRouter()

VALID_METHODS = {"alternating_blocks", "scs_type_ii", "chicago", "uniform"}


class HyetographRequest(BaseModel):
    locality_id: str
    return_period: int = Field(..., ge=2, le=1000)
    duration_min: int = Field(..., ge=15, le=1440)
    time_step_min: int = Field(10, ge=1, le=60)
    method: str = Field("alternating_blocks")
    r: float = Field(0.4, ge=0.1, le=0.9, description="Peak position for Chicago method")


@router.post("/hydrology/hyetograph")
def create_hyetograph(req: HyetographRequest) -> dict:
    """Generate a design storm hyetograph."""
    if req.method not in VALID_METHODS:
        raise HTTPException(
            status_code=422,
            detail=f"Método '{req.method}' no válido. Use: {sorted(VALID_METHODS)}",
        )
    # Ensure duration is divisible by time step
    n = req.duration_min // req.time_step_min
    if n < 4:
        raise HTTPException(
            status_code=422,
            detail="La duración debe ser al menos 4 × el intervalo de tiempo.",
        )
    try:
        return generate_hyetograph(
            locality_id=req.locality_id,
            return_period=req.return_period,
            duration_min=(n * req.time_step_min),  # snap to multiple
            time_step_min=req.time_step_min,
            method=req.method,
            r=req.r,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
