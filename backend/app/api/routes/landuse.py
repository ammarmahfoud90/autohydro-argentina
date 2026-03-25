from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, field_validator
from app.services.landuse_service import classify_land_use

router = APIRouter()


class LandUseClassifyRequest(BaseModel):
    description: str
    soil_group: str

    @field_validator("soil_group")
    @classmethod
    def validate_soil_group(cls, v: str) -> str:
        if v not in {"A", "B", "C", "D"}:
            raise ValueError("soil_group must be A, B, C or D")
        return v

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 5:
            raise ValueError("description is too short")
        if len(v) > 2000:
            raise ValueError("description is too long (max 2000 characters)")
        return v


@router.post("/landuse/classify")
def classify(req: LandUseClassifyRequest) -> dict:
    """
    Parse a free-text basin land use description and return CN classification.

    Returns land_uses list with cn_key, description_es, area_percent,
    condition, cn_value, plus weighted_cn, confidence, and notes.
    """
    try:
        result = classify_land_use(req.description, req.soil_group)
        return result
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Error al clasificar uso del suelo: {str(exc)}",
        ) from exc
