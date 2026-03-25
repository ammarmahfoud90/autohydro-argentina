from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.services.manning_service import (
    calculate_manning,
    MANNING_N_REFERENCE,
    VELOCITY_LIMITS,
)
from app.services.culvert_service import calculate_culvert, get_reference_data

router = APIRouter()


class ManningRequest(BaseModel):
    channel_type: str          # rectangular | trapezoidal | circular | triangular
    manning_n: float
    slope: float               # m/m
    design_flow: Optional[float] = None   # m³/s
    lining_type: Optional[str] = None    # key in VELOCITY_LIMITS

    # Rectangular
    width: Optional[float] = None
    depth: Optional[float] = None

    # Trapezoidal
    bottom_width: Optional[float] = None
    side_slope: Optional[float] = None   # z in z:1

    # Circular
    diameter: Optional[float] = None
    # depth is shared

    # Triangular uses side_slope + depth


@router.post("/hydraulics/manning")
def manning(req: ManningRequest) -> dict:
    """Calculate hydraulic parameters using Manning's equation."""
    try:
        result = calculate_manning(req.model_dump(exclude_none=False))
        return result
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Error en cálculo de Manning: {str(exc)}",
        ) from exc


@router.get("/hydraulics/manning/reference")
def manning_reference() -> dict:
    """Return Manning's n reference values and velocity limits."""
    return {
        "manning_n": MANNING_N_REFERENCE,
        "velocity_limits": VELOCITY_LIMITS,
    }


# ── Culvert endpoints ─────────────────────────────────────────────────────────

class CulvertRequest(BaseModel):
    design_flow_m3s: float
    culvert_type: str               # circular | box
    material: str = "hormigon"      # hormigon | pead | chapa_corrugada
    length_m: float
    slope: float                    # m/m
    inlet_type: str = "sin_alas"    # key in INLET_KE
    headwater_max_m: float
    tailwater_m: float = 0.0


@router.post("/hydraulics/culvert")
def culvert(req: CulvertRequest) -> dict:
    """Size a culvert using inlet/outlet control analysis."""
    try:
        result = calculate_culvert(req.model_dump())
        return result
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Error en dimensionamiento de alcantarilla: {str(exc)}",
        ) from exc


@router.get("/hydraulics/culvert/reference")
def culvert_reference() -> dict:
    """Return standard sizes, materials, and inlet type reference data."""
    return get_reference_data()
