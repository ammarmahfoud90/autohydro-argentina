import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.limiter import limiter
from app.api.routes import (
    hydrology, ai, report, watershed, landuse,
    hydraulics, gis, flood, hyetograph, frequency,
    flood_routing, pmd_idf,
)

app = FastAPI(
    title="AutoHydro Argentina API",
    description="API for hydrological calculations — AutoHydro Argentina",
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

# ── Rate limiting ──────────────────────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

app.include_router(hydrology.router, prefix="/api", tags=["hydrology"])
app.include_router(ai.router, prefix="/api", tags=["ai"])
app.include_router(report.router, prefix="/api", tags=["report"])
app.include_router(watershed.router, prefix="/api", tags=["watershed"])
app.include_router(landuse.router, prefix="/api", tags=["landuse"])
app.include_router(hydraulics.router, prefix="/api", tags=["hydraulics"])
app.include_router(gis.router, prefix="/api", tags=["gis"])
app.include_router(flood.router, prefix="/api", tags=["flood"])
app.include_router(hyetograph.router, prefix="/api", tags=["hyetograph"])
app.include_router(frequency.router, prefix="/api", tags=["frequency"])
app.include_router(flood_routing.router, prefix="/api", tags=["flood_routing"])
app.include_router(pmd_idf.router, prefix="/api", tags=["pmd_idf"])


@app.on_event("startup")
def validate_config() -> None:
    """Fail loudly at startup if required environment variables are missing."""
    if not settings.ANTHROPIC_API_KEY:
        raise RuntimeError(
            "ANTHROPIC_API_KEY es requerida. Configurar en el dashboard de Render."
        )
    logging.info("CORS origins: %s", settings.cors_origins_list)


@app.get("/health")
def health_check() -> dict:
    return {"status": "ok", "service": "AutoHydro Argentina API"}


@app.get("/api/health")
def api_health_check() -> dict:
    return {"status": "ok", "service": "AutoHydro Argentina API"}
