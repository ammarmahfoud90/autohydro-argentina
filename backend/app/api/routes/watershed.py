from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.watershed import delineate_watershed

router = APIRouter()


class DelineateRequest(BaseModel):
    latitude: float = Field(..., ge=-60, le=60, description="Latitud del punto de cierre")
    longitude: float = Field(..., ge=-180, le=180, description="Longitud del punto de cierre")


class DelineateResponse(BaseModel):
    geojson: dict
    area_km2: float
    slope: float
    length_km: float


@router.post("/watershed/delineate", response_model=DelineateResponse)
def delineate(req: DelineateRequest) -> dict:
    """
    Delineate the watershed draining to the given pour point (punto de cierre).

    Downloads SRTM 90 m DEM from OpenTopography and uses pysheds to compute
    flow direction, flow accumulation and catchment boundary.

    Requires OPENTOPOGRAPHY_API_KEY in the backend .env file.
    Free key at: https://portal.opentopography.org/myopentopo
    """
    try:
        return delineate_watershed(req.latitude, req.longitude)
    except ValueError as exc:
        code = str(exc)
        if code == "too_large":
            raise HTTPException(
                status_code=422,
                detail=(
                    "La cuenca es muy grande (> 500 km²). "
                    "Probá con un punto más aguas abajo."
                ),
            ) from exc
        if code == "no_watershed":
            raise HTTPException(
                status_code=422,
                detail=(
                    "No se pudo delimitar la cuenca. "
                    "Verificá que el punto esté sobre un cauce o intenta otro sector."
                ),
            ) from exc
        raise HTTPException(status_code=422, detail=code) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=500, detail=f"Error interno al delimitar la cuenca: {exc}"
        ) from exc
