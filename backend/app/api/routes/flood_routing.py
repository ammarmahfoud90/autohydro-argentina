from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from app.services.flood_routing_service import (
    route_muskingum,
    compute_muskingum_cunge_parameters,
    validate_muskingum_stability,
)

router = APIRouter()


class MuskingumRequest(BaseModel):
    inflow: List[float]
    times: List[float]
    K: float
    X: float
    Q_initial: float = 0.0


class MuskingumCungeParamsRequest(BaseModel):
    Q_ref: float
    B: float
    S: float
    n: float
    dx: float


@router.post("/routing/muskingum")
def muskingum_routing(request: MuskingumRequest):
    try:
        return route_muskingum(
            inflow=request.inflow,
            times=request.times,
            K=request.K,
            X=request.X,
            Q_initial=request.Q_initial,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en el tránsito: {str(e)}")


@router.post("/routing/muskingum-cunge-params")
def muskingum_cunge_params(request: MuskingumCungeParamsRequest):
    try:
        return compute_muskingum_cunge_parameters(
            Q_ref=request.Q_ref,
            B=request.B,
            S=request.S,
            n=request.n,
            dx=request.dx,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))
