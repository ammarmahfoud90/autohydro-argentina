from fastapi import APIRouter, HTTPException
from app.models.schemas import CalculationRequest, CalculationResponse
from app.services.calculation import run_calculation
from app.services.idf_service import get_localities, get_locality
from app.data.cn_argentina import CN_ARGENTINA, SOIL_GROUP_DESCRIPTIONS

router = APIRouter()


@router.get("/localities")
def list_localities() -> list:
    """Return all available IDF localities with source info and limitations."""
    return get_localities()


@router.get("/localities/{locality_id}")
def get_locality_detail(locality_id: str) -> dict:
    """Return full locality data including IDF table, formula parameters, and source."""
    try:
        return get_locality(locality_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


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
