from fastapi import APIRouter, HTTPException
from app.services.pmd_idf_service import estimate_idf_from_pmd, PMD_CAPITALES

router = APIRouter()


@router.get("/pmd/cities")
def get_available_cities():
    """Lista de ciudades disponibles con datos PMD."""
    return {
        "cities": sorted(list(PMD_CAPITALES.keys())),
        "count": len(PMD_CAPITALES),
        "source": "Atlas PMD/PMP INA-CIRSA + UNC (2020)",
    }


@router.get("/pmd/estimate/{city}")
def estimate_idf(city: str):
    """Estima curvas IDF para una ciudad usando PMD + Modelo DIT."""
    try:
        return estimate_idf_from_pmd(city)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
