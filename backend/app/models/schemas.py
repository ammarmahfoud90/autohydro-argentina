"""
Pydantic v2 schemas for AutoHydro Argentina API request/response models.
"""

from typing import Optional
from pydantic import BaseModel, Field, field_validator, model_validator


# ── Enums ────────────────────────────────────────────────────────────────────

VALID_METHODS = {"rational", "modified_rational", "scs_cn"}
VALID_SOIL_GROUPS = {"A", "B", "C", "D"}
VALID_CONDITIONS = {"poor", "fair", "good"}
VALID_INFRASTRUCTURE = {
    "alcantarilla_menor",
    "alcantarilla_mayor",
    "puente_menor",
    "puente_mayor",
    "canal_urbano",
    "canal_rural",
    "defensa_costera",
}
VALID_TC_FORMULAS = {
    "kirpich", "california", "temez", "giandotti", "ventura_heras", "passini"
}


# ── Sub-models ────────────────────────────────────────────────────────────────

class LandUseCategory(BaseModel):
    land_use: str = Field(..., description="Key from CN_ARGENTINA")
    area_percent: float = Field(..., ge=0.1, le=100, description="Percentage of basin area")
    condition: str = Field("fair", description="poor | fair | good")

    @field_validator("condition")
    @classmethod
    def validate_condition(cls, v: str) -> str:
        if v not in VALID_CONDITIONS:
            raise ValueError(f"condition must be one of {VALID_CONDITIONS}")
        return v


# ── Request schemas ───────────────────────────────────────────────────────────

class CalculationRequest(BaseModel):
    # Location
    city: str = Field(..., description="City name as in IDF_ARGENTINA")
    location_description: Optional[str] = Field(None, max_length=200)

    # Design parameters
    return_period: int = Field(..., ge=2, le=1000, description="Return period in years")
    duration_min: int = Field(
        ..., ge=5, le=120, description="Storm duration in minutes"
    )

    # Basin characteristics
    area_km2: float = Field(..., gt=0, description="Basin area in km²")
    length_km: float = Field(..., gt=0, description="Main channel length in km")
    slope: float = Field(..., gt=0, le=1.0, description="Average channel slope (m/m)")
    elevation_diff_m: Optional[float] = Field(
        None, gt=0, description="Total elevation difference in m (California formula)"
    )
    avg_elevation_m: Optional[float] = Field(
        None, gt=0, description="Average elevation above outlet in m (Giandotti formula)"
    )

    # Method selection
    method: str = Field(..., description="rational | modified_rational | scs_cn")

    # Rational / Modified Rational parameters
    runoff_coeff: Optional[float] = Field(
        None, ge=0.01, le=1.0, description="Runoff coefficient C (rational methods)"
    )

    # SCS-CN parameters
    land_use_categories: Optional[list[LandUseCategory]] = Field(
        None, description="Land use breakdown for CN calculation"
    )
    soil_group: Optional[str] = Field(
        None, description="Hydrological soil group: A | B | C | D"
    )
    use_pampa_lambda: bool = Field(
        False,
        description="Use λ=0.05 (Pampa Húmeda) instead of standard λ=0.2 for initial abstraction",
    )

    # Infrastructure
    infrastructure_type: str = Field(
        "canal_rural", description="Infrastructure type for risk classification"
    )

    # Tc formulas
    tc_formulas: list[str] = Field(
        default_factory=lambda: ["temez"],
        description="List of Tc formula keys to use",
    )

    # Scenario comparison override
    cn_override: Optional[float] = Field(
        None, ge=1.0, le=100.0, description="Direct CN override (skips composite CN from land use)"
    )

    # Report options
    language: str = Field("es", description="es | en")

    @field_validator("method")
    @classmethod
    def validate_method(cls, v: str) -> str:
        if v not in VALID_METHODS:
            raise ValueError(f"method must be one of {VALID_METHODS}")
        return v

    @field_validator("soil_group")
    @classmethod
    def validate_soil_group(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_SOIL_GROUPS:
            raise ValueError(f"soil_group must be one of {VALID_SOIL_GROUPS}")
        return v

    @field_validator("infrastructure_type")
    @classmethod
    def validate_infrastructure(cls, v: str) -> str:
        if v not in VALID_INFRASTRUCTURE:
            raise ValueError(f"infrastructure_type must be one of {VALID_INFRASTRUCTURE}")
        return v

    @field_validator("tc_formulas")
    @classmethod
    def validate_tc_formulas(cls, v: list[str]) -> list[str]:
        invalid = set(v) - VALID_TC_FORMULAS
        if invalid:
            raise ValueError(f"Invalid tc_formulas: {invalid}")
        if not v:
            raise ValueError("At least one Tc formula must be selected")
        return v

    @model_validator(mode="after")
    def validate_method_params(self) -> "CalculationRequest":
        if self.method in ("rational", "modified_rational"):
            if self.runoff_coeff is None:
                raise ValueError(
                    "runoff_coeff is required for rational and modified_rational methods"
                )
        if self.method == "scs_cn" and self.cn_override is None:
            if not self.land_use_categories:
                raise ValueError(
                    "land_use_categories is required for scs_cn method (unless cn_override is provided)"
                )
            if self.soil_group is None:
                raise ValueError("soil_group is required for scs_cn method (unless cn_override is provided)")
        return self


# ── Response schemas ──────────────────────────────────────────────────────────

class TcFormulaResult(BaseModel):
    formula: str
    formulaName: str
    tcHours: float
    tcMinutes: float
    applicability: str
    notes: str


class MethodResult(BaseModel):
    method: str
    methodName: str
    peakFlow: float        # m³/s
    tc: float              # hours (adopted Tc used by this method)
    intensity: float       # mm/hr
    notes: str


class RiskRecommendations(BaseModel):
    general: str
    action: str
    verification: str
    period_note: Optional[str] = None


class CNSensitivityPoint(BaseModel):
    label: str            # "CN-5" | "CN" | "CN+5"
    cn: float             # actual CN value used (after clamping to [30, 98])
    peak_flow_m3s: float
    variation_pct: float  # 0.0 for base case, negative/positive for others


class CalculationResponse(BaseModel):
    # Input echo
    city: str
    province: str
    return_period: int
    duration_min: int
    area_km2: float
    method: str
    location_description: Optional[str] = None

    # IDF result
    intensity_mm_hr: float
    idf_source: str
    idf_verified: bool

    # Tc results
    tc_results: list[TcFormulaResult]
    tc_adopted_hours: float
    tc_adopted_minutes: float

    # Method-specific parameters
    runoff_coeff: Optional[float] = None
    cn: Optional[float] = None
    s_mm: Optional[float] = None        # SCS potential max retention (mm)
    ia_mm: Optional[float] = None       # SCS initial abstraction (mm)
    runoff_depth_mm: Optional[float] = None  # SCS direct runoff (mm)
    areal_reduction_k: Optional[float] = None  # Modified Rational K factor

    # Peak flow
    peak_flow_m3s: float
    specific_flow_m3s_km2: float

    # All method comparison
    method_comparison: list[MethodResult]

    # Risk
    risk_level: str
    risk_recommendations: RiskRecommendations

    # Infrastructure
    infrastructure_type: str

    # CN sensitivity analysis (SCS-CN method only)
    cn_sensitivity: Optional[list[CNSensitivityPoint]] = None

    # SCS Unit Hydrograph (SCS-CN method only)
    hydrograph_times: Optional[list[float]] = None    # hours from start
    hydrograph_flows: Optional[list[float]] = None    # m³/s
    runoff_volume_m3: Optional[float] = None
    time_to_peak_hr: Optional[float] = None
    base_time_hr: Optional[float] = None
