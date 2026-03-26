"""
GIS routes — shapefile import/export for AutoHydro Argentina.
"""

from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from io import BytesIO
from app.services.shapefile_service import (
    export_polygon_to_shapefile_zip,
    import_shapefile_from_zip,
    import_shapefile_from_shp,
)

router = APIRouter()


@router.post("/gis/export-shapefile")
def export_shapefile(payload: dict) -> StreamingResponse:
    """
    Export a basin polygon to an ESRI Shapefile ZIP.

    Request body:
        polygon: [[lat, lng], ...]  — Leaflet coordinate order
        attributes: optional dict with { project_name, return_period, method,
                    cn, runoff_coeff, peak_flow_m3s, risk_level, ... }
        name: optional filename stem (default "cuenca")

    Returns ZIP file containing .shp, .shx, .dbf, .prj (WGS84)
    """
    polygon = payload.get("polygon")
    if not polygon or len(polygon) < 3:
        raise HTTPException(
            status_code=422,
            detail="polygon debe tener al menos 3 vértices [[lat, lng], ...]",
        )

    attributes = payload.get("attributes", {})
    name = payload.get("name", "cuenca")

    try:
        zip_bytes = export_polygon_to_shapefile_zip(
            polygon=polygon,
            attributes=attributes,
            name=name,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Error al exportar shapefile: {str(exc)}",
        ) from exc

    safe_name = "".join(c if c.isalnum() or c in ("-", "_") else "_" for c in name[:40])
    filename = f"{safe_name}.zip"

    return StreamingResponse(
        BytesIO(zip_bytes),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/gis/import-shapefile")
async def import_shapefile(file: UploadFile = File(...)) -> dict:
    """
    Import a shapefile and extract the polygon geometry.

    Accepts:
      - A .zip file containing .shp, .shx, .dbf (recommended)
      - A raw .shp file (geometry only, no attributes)

    Returns:
      { polygon: [[lat, lng], ...], area_km2: float, attributes: dict }
    """
    if file.filename is None:
        raise HTTPException(status_code=422, detail="No se recibió archivo")

    fname_lower = file.filename.lower()
    content = await file.read()

    if not content:
        raise HTTPException(status_code=422, detail="El archivo está vacío")

    try:
        if fname_lower.endswith(".zip"):
            result = import_shapefile_from_zip(content)
        elif fname_lower.endswith(".shp"):
            result = import_shapefile_from_shp(content)
        else:
            raise HTTPException(
                status_code=422,
                detail="Formato no soportado. Subí un archivo .zip (con todos los componentes) o .shp",
            )
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Error al importar shapefile: {str(exc)}",
        ) from exc

    return result
