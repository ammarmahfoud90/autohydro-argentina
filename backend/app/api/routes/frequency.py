from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from app.services.frequency_analysis_service import run_frequency_analysis

router = APIRouter()


class FrequencyAnalysisRequest(BaseModel):
    flows: List[float]
    years: Optional[List[int]] = None
    station_name: Optional[str] = None
    return_periods: List[float] = [2, 5, 10, 25, 50, 100, 200]


class FrequencyAnalysisResponse(BaseModel):
    statistics: dict
    distributions: dict
    plotting_positions: list
    return_periods: list


@router.post("/frequency/analyze", response_model=FrequencyAnalysisResponse)
def analyze_frequency(request: FrequencyAnalysisRequest):
    try:
        result = run_frequency_analysis(
            data=request.flows,
            return_periods=request.return_periods
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en el análisis: {str(e)}")
