"""
Flood simulation routes — AutoHydro Argentina.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from app.services.flood_service import simulate_flood

router = APIRouter()


class ChannelGeometry(BaseModel):
    type: str = "rectangular"       # rectangular | trapezoidal | natural
    width: float = Field(..., gt=0, description="Channel width (m)")
    depth: float = Field(..., gt=0, description="Bankfull depth (m)")
    slope: float = Field(..., gt=0, description="Channel slope (m/m)")
    manning_n: float = Field(..., gt=0, description="Manning's roughness coefficient")


class FloodSimulationRequest(BaseModel):
    design_flow_m3s: float = Field(..., gt=0, description="Design peak flow (m³/s)")
    channel_geometry: ChannelGeometry
    floodplain_width_m: float = Field(..., gt=0, description="Max floodplain width each side (m)")
    simulation_length_m: float = Field(..., gt=0, description="Reach length (m)")
    center_coordinates: list[float] = Field(
        ..., min_length=2, max_length=2,
        description="[lat, lng] of channel center point",
    )


@router.post("/flood/simulate")
def flood_simulate(req: FloodSimulationRequest) -> dict:
    """
    Simplified 1D steady-state flood simulation.

    Uses Manning's equation to compute normal depth for the design flow.
    If normal depth exceeds bankfull, estimates flood extent on floodplain.
    Returns flooded area (ha), depth statistics, risk level, and GeoJSON polygon.
    """
    try:
        lat = req.center_coordinates[0]
        lng = req.center_coordinates[1]
        result = simulate_flood(
            design_flow_m3s=req.design_flow_m3s,
            channel_type=req.channel_geometry.type,
            channel_width=req.channel_geometry.width,
            channel_depth=req.channel_geometry.depth,
            slope=req.channel_geometry.slope,
            manning_n=req.channel_geometry.manning_n,
            floodplain_width_m=req.floodplain_width_m,
            simulation_length_m=req.simulation_length_m,
            center_lat=lat,
            center_lng=lng,
        )
        return result
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Error en simulación de inundación: {str(exc)}",
        ) from exc
