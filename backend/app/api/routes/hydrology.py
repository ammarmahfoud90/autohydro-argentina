from fastapi import APIRouter, HTTPException
from app.models.schemas import CalculationRequest, CalculationResponse
from app.services.calculation import run_calculation
from app.data.idf_argentina import IDF_ARGENTINA
from app.data.cn_argentina import CN_ARGENTINA, SOIL_GROUP_DESCRIPTIONS

router = APIRouter()


@router.get("/cities")
def get_cities() -> list:
    """Return available cities with IDF data."""
    return [
        {
            "city": c["city"],
            "province": c["province"],
            "source": c["source"],
            "validRange": c["validRange"],
        }
        for c in IDF_ARGENTINA
    ]


@router.get("/cn-categories")
def get_cn_categories() -> dict:
    """Return available CN land use categories and soil group descriptions."""
    categories = [
        {
            "id": key,
            "description": value["description"],
            "conditionBased": value.get("condition_based", False),
        }
        for key, value in CN_ARGENTINA.items()
    ]
    return {
        "categories": categories,
        "soilGroups": SOIL_GROUP_DESCRIPTIONS,
    }


@router.post("/calculate", response_model=CalculationResponse)
def calculate(req: CalculationRequest) -> dict:
    """Run full hydrological calculation."""
    try:
        return run_calculation(req.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
