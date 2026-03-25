from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routes import hydrology, ai, report, watershed, landuse, hydraulics

app = FastAPI(
    title="AutoHydro Argentina API",
    description="API for hydrological calculations — AutoHydro Argentina",
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(hydrology.router, prefix="/api", tags=["hydrology"])
app.include_router(ai.router, prefix="/api", tags=["ai"])
app.include_router(report.router, prefix="/api", tags=["report"])
app.include_router(watershed.router, prefix="/api", tags=["watershed"])
app.include_router(landuse.router, prefix="/api", tags=["landuse"])
app.include_router(hydraulics.router, prefix="/api", tags=["hydraulics"])


@app.get("/health")
def health_check() -> dict:
    return {"status": "ok", "service": "AutoHydro Argentina API"}
