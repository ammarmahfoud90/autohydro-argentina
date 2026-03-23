# AutoHydro Argentina — Claude Code Build Prompt

## Meta Instructions

You are building **AutoHydro Argentina**, a professional-grade hydrological analysis web application designed specifically for Argentine civil engineers. This is not a tutorial project — it must reflect real engineering practice as used in Argentina.

**Creator & Branding:** Ing. Ammar Mahfoud  
**Target Users:** Civil engineers, hydraulic engineers, and hydrologists working in Argentina  
**Languages:** Spanish (primary), English (secondary)  
**Stack:** React (TypeScript) + FastAPI (Python) + Anthropic Claude API  
**Deployment:** Vercel (frontend) + Railway (backend)

---

## 1. Project Context & Vision

### 1.1 The Problem

Argentine engineers performing hydrological assessments face fragmented workflows:

- **IDF data** is scattered across old PDFs, SMN publications, and inherited spreadsheets
- **Method selection** depends on what was taught decades ago, not basin characteristics
- **Tiempo de concentración (Tc)** formulas vary by project with no systematic comparison
- **CN estimation** uses generic international tables, not Argentine land use
- **Report generation** requires hours of copy-paste into Word documents
- **No single tool** integrates calculation → interpretation → defensible report

### 1.2 The Solution

AutoHydro Argentina provides:

1. **Regionalized IDF database** for major Argentine cities using published coefficients
2. **Multiple hydrological methods** with side-by-side comparison (Racional, Racional Modificado, SCS-CN)
3. **Tc calculator** with 4+ formulas and guidance on applicability
4. **Argentine-specific CN tables** reflecting local land use categories
5. **AI-powered interpretation** using Claude API for professional explanations
6. **Memoria de Cálculo Hidrológico** — auto-generated PDF in proper Argentine technical format
7. **Risk classification** with practical, actionable thresholds

---

## 2. Technical Architecture

### 2.1 Directory Structure

```
autohydro-argentina/
├── frontend/                    # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/              # Reusable UI components
│   │   │   ├── forms/           # Input forms
│   │   │   ├── results/         # Results display
│   │   │   └── layout/          # Header, Footer, Navigation
│   │   ├── pages/
│   │   │   ├── Home.tsx
│   │   │   ├── Calculator.tsx
│   │   │   ├── Results.tsx
│   │   │   └── About.tsx
│   │   ├── hooks/
│   │   ├── services/            # API calls
│   │   ├── utils/
│   │   ├── types/
│   │   ├── i18n/                # Internationalization
│   │   │   ├── es.json
│   │   │   └── en.json
│   │   ├── constants/
│   │   │   ├── idf-data.ts      # IDF coefficients by city
│   │   │   ├── cn-tables.ts     # Argentine CN values
│   │   │   └── tc-formulas.ts   # Tc formula definitions
│   │   └── App.tsx
│   ├── public/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── tsconfig.json
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   │   ├── hydrology.py
│   │   │   │   ├── report.py
│   │   │   │   └── ai.py
│   │   │   └── dependencies.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── security.py      # Future auth preparation
│   │   │   └── constants.py
│   │   ├── models/
│   │   │   ├── schemas.py       # Pydantic models
│   │   │   └── enums.py
│   │   ├── services/
│   │   │   ├── calculation.py   # Hydrological calculations
│   │   │   ├── idf_service.py   # IDF data handling
│   │   │   ├── cn_service.py    # CN estimation
│   │   │   ├── tc_service.py    # Tc calculations
│   │   │   ├── ai_service.py    # Claude API integration
│   │   │   └── report_service.py # PDF generation
│   │   ├── data/
│   │   │   ├── idf_argentina.py
│   │   │   └── cn_argentina.py
│   │   └── utils/
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
├── docs/
│   ├── API.md
│   └── METHODOLOGY.md
├── .env.example
├── docker-compose.yml
└── README.md
```

### 2.2 Technology Choices

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Frontend | React 18 + TypeScript | Type safety, maintainability |
| Styling | Tailwind CSS | Rapid professional UI |
| State | React Query + Zustand | Server state + local state |
| i18n | react-i18next | Bilingual support |
| Backend | FastAPI | Async, auto-docs, type hints |
| AI | Anthropic Claude API | Superior reasoning for technical content |
| PDF | ReportLab | Professional PDF generation |
| Deployment | Vercel + Railway | Generous free tiers, simple CI/CD |

---

## 3. Hydrological Engineering Specifications

### 3.1 IDF Data — Argentine Regionalization

Use the **Caamaño Nelli regionalization** and published SMN/INA coefficients. The IDF intensity formula follows the general form:

```
i = (a × T^b) / (t + c)^d
```

Where:
- `i` = rainfall intensity (mm/hr)
- `T` = return period (years)
- `t` = duration (minutes)
- `a, b, c, d` = regional coefficients

**Include these cities with their coefficients:**

```typescript
// frontend/src/constants/idf-data.ts

export interface IDFCoefficients {
  city: string;
  province: string;
  a: number;
  b: number;
  c: number;
  d: number;
  source: string;
  validRange: { tMin: number; tMax: number; TMin: number; TMax: number };
}

export const IDF_ARGENTINA: IDFCoefficients[] = [
  {
    city: "Buenos Aires (Aeroparque)",
    province: "CABA",
    a: 1656.36,
    b: 0.197,
    c: 13.0,
    d: 0.846,
    source: "Caamaño Nelli et al. (1999) / INA",
    validRange: { tMin: 5, tMax: 120, TMin: 2, TMax: 100 }
  },
  {
    city: "Buenos Aires (Ezeiza)",
    province: "Buenos Aires",
    a: 1490.0,
    b: 0.178,
    c: 12.0,
    d: 0.820,
    source: "Caamaño Nelli et al. (1999)",
    validRange: { tMin: 5, tMax: 120, TMin: 2, TMax: 100 }
  },
  {
    city: "Córdoba (Observatorio)",
    province: "Córdoba",
    a: 2850.0,
    b: 0.220,
    c: 15.0,
    d: 0.900,
    source: "Rühle (1966) / Actualización INA",
    validRange: { tMin: 5, tMax: 120, TMin: 2, TMax: 100 }
  },
  {
    city: "Rosario",
    province: "Santa Fe",
    a: 1800.0,
    b: 0.185,
    c: 12.0,
    d: 0.850,
    source: "INA - Centro Regional Litoral",
    validRange: { tMin: 5, tMax: 120, TMin: 2, TMax: 100 }
  },
  {
    city: "Mendoza (Aeropuerto)",
    province: "Mendoza",
    a: 720.0,
    b: 0.250,
    c: 10.0,
    d: 0.750,
    source: "INA - Centro Regional Andino",
    validRange: { tMin: 5, tMax: 120, TMin: 2, TMax: 50 }
  },
  {
    city: "Salta",
    province: "Salta",
    a: 2200.0,
    b: 0.210,
    c: 14.0,
    d: 0.880,
    source: "SMN / Estudios regionales NOA",
    validRange: { tMin: 5, tMax: 120, TMin: 2, TMax: 100 }
  },
  {
    city: "Resistencia",
    province: "Chaco",
    a: 2400.0,
    b: 0.195,
    c: 12.0,
    d: 0.860,
    source: "INA - Centro Regional NEA",
    validRange: { tMin: 5, tMax: 120, TMin: 2, TMax: 100 }
  },
  {
    city: "Santa Fe",
    province: "Santa Fe",
    a: 1950.0,
    b: 0.190,
    c: 12.0,
    d: 0.855,
    source: "INA - Centro Regional Litoral",
    validRange: { tMin: 5, tMax: 120, TMin: 2, TMax: 100 }
  },
  {
    city: "Neuquén",
    province: "Neuquén",
    a: 580.0,
    b: 0.240,
    c: 10.0,
    d: 0.720,
    source: "INA - Centro Regional Comahue",
    validRange: { tMin: 5, tMax: 120, TMin: 2, TMax: 50 }
  },
  {
    city: "Bahía Blanca",
    province: "Buenos Aires",
    a: 1100.0,
    b: 0.200,
    c: 11.0,
    d: 0.800,
    source: "Caamaño Nelli et al. (1999)",
    validRange: { tMin: 5, tMax: 120, TMin: 2, TMax: 100 }
  },
  {
    city: "Tucumán",
    province: "Tucumán",
    a: 2600.0,
    b: 0.205,
    c: 14.0,
    d: 0.875,
    source: "SMN / Estudios regionales NOA",
    validRange: { tMin: 5, tMax: 120, TMin: 2, TMax: 100 }
  },
  {
    city: "Posadas",
    province: "Misiones",
    a: 2800.0,
    b: 0.188,
    c: 13.0,
    d: 0.870,
    source: "INA - Centro Regional NEA",
    validRange: { tMin: 5, tMax: 120, TMin: 2, TMax: 100 }
  },
  {
    city: "Comodoro Rivadavia",
    province: "Chubut",
    a: 380.0,
    b: 0.260,
    c: 8.0,
    d: 0.680,
    source: "INA - Centro Regional Patagonia",
    validRange: { tMin: 5, tMax: 120, TMin: 2, TMax: 50 }
  },
  {
    city: "La Plata",
    province: "Buenos Aires",
    a: 1580.0,
    b: 0.192,
    c: 12.5,
    d: 0.840,
    source: "UNLP - Departamento de Hidráulica",
    validRange: { tMin: 5, tMax: 120, TMin: 2, TMax: 100 }
  },
  {
    city: "Mar del Plata",
    province: "Buenos Aires",
    a: 1320.0,
    b: 0.188,
    c: 11.5,
    d: 0.825,
    source: "Caamaño Nelli et al. (1999)",
    validRange: { tMin: 5, tMax: 120, TMin: 2, TMax: 100 }
  }
];
```

**IMPORTANT:** When implementing, include a disclaimer that these coefficients are for preliminary engineering estimates. For final designs, engineers should verify against the most recent local studies.

### 3.2 Hydrological Methods

#### 3.2.1 Método Racional (Rational Method)

```
Q = C × i × A / 3.6
```

Where:
- `Q` = peak discharge (m³/s)
- `C` = runoff coefficient (dimensionless, 0 < C ≤ 1)
- `i` = rainfall intensity (mm/hr)
- `A` = catchment area (km²)
- `3.6` = unit conversion factor

**Applicability:** Basins < 2-5 km², preferably urban/suburban

#### 3.2.2 Método Racional Modificado (Modified Rational Method)

For larger basins (5-50 km²), apply an areal reduction factor:

```
Q = C × i × A × K / 3.6
```

Where `K` is the areal reduction factor:

```
K = 1 - log₁₀(A) / 15    (for A in km²)
```

Or use the formula by Témez:
```
K = 1 - (A^0.1 - 1) / 7    (for A in km²)
```

#### 3.2.3 SCS-CN Method (Soil Conservation Service - Curve Number)

**Runoff depth:**
```
If P > Ia:
    Q = (P - Ia)² / (P - Ia + S)
Else:
    Q = 0
```

Where:
- `P` = precipitation depth (mm)
- `S` = potential maximum retention (mm)
- `Ia` = initial abstraction (mm) = 0.2 × S (standard) or 0.05 × S (Argentine practice for Pampa Húmeda)

**S calculation:**
```
S = 25400 / CN - 254    (metric units)
```

**Peak discharge (using SCS triangular hydrograph):**
```
Qp = 0.208 × A × Q / Tp
```

Where:
- `Qp` = peak discharge (m³/s)
- `A` = area (km²)
- `Q` = runoff depth (mm)
- `Tp` = time to peak (hr) = 0.6 × Tc

### 3.3 Tiempo de Concentración (Tc) Formulas

Implement all of the following with clear applicability guidance:

```python
# backend/app/services/tc_service.py

from enum import Enum
from typing import Dict, Tuple
import math

class TcFormula(str, Enum):
    KIRPICH = "kirpich"
    CALIFORNIA = "california"
    TEMEZ = "temez"
    GIANDOTTI = "giandotti"
    VENTURA_HERAS = "ventura_heras"
    PASSINI = "passini"

def calculate_tc_kirpich(L: float, S: float) -> float:
    """
    Kirpich (1940)
    
    Tc = 0.0195 × L^0.77 × S^(-0.385)
    
    Args:
        L: Longitud del cauce principal (m)
        S: Pendiente media del cauce (m/m)
    
    Returns:
        Tc en minutos
    
    Applicability:
        - Cuencas rurales pequeñas
        - Áreas < 0.5 km²
        - Pendientes 3% - 10%
    """
    return 0.0195 * (L ** 0.77) * (S ** -0.385)

def calculate_tc_california(L: float, H: float) -> float:
    """
    California Culverts Practice (1942)
    
    Tc = 57 × (L³ / H)^0.385
    
    Args:
        L: Longitud del cauce (km)
        H: Desnivel total (m)
    
    Returns:
        Tc en minutos
    
    Applicability:
        - Cuencas montañosas
        - Cuencas pequeñas a medianas
    """
    return 57 * ((L ** 3) / H) ** 0.385

def calculate_tc_temez(L: float, S: float) -> float:
    """
    Témez (1978) - Muy usado en Argentina y España
    
    Tc = 0.3 × (L / S^0.25)^0.76
    
    Args:
        L: Longitud del cauce principal (km)
        S: Pendiente media del cauce (m/m)
    
    Returns:
        Tc en horas
    
    Applicability:
        - Cuencas naturales
        - Amplio rango de tamaños
        - Recomendado para Argentina
    """
    return 0.3 * ((L / (S ** 0.25)) ** 0.76)

def calculate_tc_giandotti(A: float, L: float, Hm: float) -> float:
    """
    Giandotti (1934)
    
    Tc = (4 × √A + 1.5 × L) / (0.8 × √Hm)
    
    Args:
        A: Área de la cuenca (km²)
        L: Longitud del cauce principal (km)
        Hm: Altura media de la cuenca sobre el punto de cierre (m)
    
    Returns:
        Tc en horas
    
    Applicability:
        - Cuencas grandes (> 10 km²)
        - Terreno montañoso
    """
    return (4 * math.sqrt(A) + 1.5 * L) / (0.8 * math.sqrt(Hm))

def calculate_tc_ventura_heras(A: float, S: float) -> float:
    """
    Ventura-Heras
    
    Tc = 0.3 × (A / S)^0.5
    
    Args:
        A: Área de la cuenca (km²)
        S: Pendiente media de la cuenca (m/m)
    
    Returns:
        Tc en horas
    
    Applicability:
        - Cuencas pequeñas a medianas
        - Uso común en España y Argentina
    """
    return 0.3 * math.sqrt(A / S)

def calculate_tc_passini(A: float, L: float, S: float) -> float:
    """
    Passini
    
    Tc = 0.108 × (A × L)^(1/3) / S^0.5
    
    Args:
        A: Área de la cuenca (km²)
        L: Longitud del cauce (km)
        S: Pendiente media (m/m)
    
    Returns:
        Tc en horas
    
    Applicability:
        - Cuencas rurales
        - Pendientes moderadas
    """
    return 0.108 * ((A * L) ** (1/3)) / math.sqrt(S)

TC_RECOMMENDATIONS: Dict[str, Dict] = {
    "urban_small": {
        "description": "Cuencas urbanas pequeñas (< 2 km²)",
        "recommended": [TcFormula.KIRPICH],
        "alternative": [TcFormula.CALIFORNIA],
        "notes": "Considerar reducción por impermeabilización"
    },
    "rural_small": {
        "description": "Cuencas rurales pequeñas (< 5 km²)",
        "recommended": [TcFormula.KIRPICH, TcFormula.TEMEZ],
        "alternative": [TcFormula.CALIFORNIA],
        "notes": "Témez preferido en práctica argentina"
    },
    "rural_medium": {
        "description": "Cuencas rurales medianas (5-50 km²)",
        "recommended": [TcFormula.TEMEZ, TcFormula.GIANDOTTI],
        "alternative": [TcFormula.VENTURA_HERAS, TcFormula.PASSINI],
        "notes": "Comparar múltiples métodos"
    },
    "mountainous": {
        "description": "Cuencas montañosas (cualquier tamaño)",
        "recommended": [TcFormula.GIANDOTTI, TcFormula.CALIFORNIA],
        "alternative": [TcFormula.TEMEZ],
        "notes": "Verificar con datos locales si disponibles"
    },
    "pampa_humeda": {
        "description": "Pampa Húmeda (pendientes muy bajas)",
        "recommended": [TcFormula.VENTURA_HERAS, TcFormula.TEMEZ],
        "alternative": [TcFormula.PASSINI],
        "notes": "Pendientes < 1% requieren análisis especial"
    }
}
```

### 3.4 Argentine CN Tables

```python
# backend/app/data/cn_argentina.py

from typing import Dict, List
from enum import Enum

class SoilGroup(str, Enum):
    A = "A"  # Alta infiltración (arenas profundas)
    B = "B"  # Infiltración moderada (limos)
    C = "C"  # Infiltración lenta (arcillas)
    D = "D"  # Muy baja infiltración (arcillas pesadas, napa alta)

class HydrologicCondition(str, Enum):
    POOR = "poor"       # < 50% cobertura
    FAIR = "fair"       # 50-75% cobertura  
    GOOD = "good"       # > 75% cobertura

# CN values for Argentine land use categories
CN_ARGENTINA: Dict[str, Dict[str, Dict[str, int]]] = {
    # === ZONAS URBANAS ===
    "zona_comercial_industrial": {
        "description": "Zonas comerciales e industriales",
        "A": {"N/A": 89}, "B": {"N/A": 92}, "C": {"N/A": 94}, "D": {"N/A": 95}
    },
    "residencial_alta_densidad": {
        "description": "Residencial alta densidad (lote < 500 m²)",
        "A": {"N/A": 77}, "B": {"N/A": 85}, "C": {"N/A": 90}, "D": {"N/A": 92}
    },
    "residencial_media_densidad": {
        "description": "Residencial media densidad (lote 500-1000 m²)",
        "A": {"N/A": 61}, "B": {"N/A": 75}, "C": {"N/A": 83}, "D": {"N/A": 87}
    },
    "residencial_baja_densidad": {
        "description": "Residencial baja densidad (lote > 1000 m²)",
        "A": {"N/A": 54}, "B": {"N/A": 70}, "C": {"N/A": 80}, "D": {"N/A": 85}
    },
    "urbanizacion_informal": {
        "description": "Urbanización informal / asentamientos",
        "A": {"N/A": 72}, "B": {"N/A": 82}, "C": {"N/A": 88}, "D": {"N/A": 91}
    },
    "espacios_verdes_urbanos": {
        "description": "Plazas, parques urbanos",
        "condition_based": True,
        "A": {"poor": 68, "fair": 49, "good": 39},
        "B": {"poor": 79, "fair": 69, "good": 61},
        "C": {"poor": 86, "fair": 79, "good": 74},
        "D": {"poor": 89, "fair": 84, "good": 80}
    },
    "calles_pavimentadas": {
        "description": "Calles y veredas pavimentadas",
        "A": {"N/A": 98}, "B": {"N/A": 98}, "C": {"N/A": 98}, "D": {"N/A": 98}
    },
    "calles_ripio": {
        "description": "Calles de ripio o tierra compactada",
        "A": {"N/A": 76}, "B": {"N/A": 85}, "C": {"N/A": 89}, "D": {"N/A": 91}
    },
    
    # === AGRICULTURA - REGIÓN PAMPEANA ===
    "soja_siembra_directa": {
        "description": "Soja en siembra directa (práctica predominante)",
        "condition_based": True,
        "A": {"poor": 72, "fair": 67, "good": 62},
        "B": {"poor": 81, "fair": 78, "good": 74},
        "C": {"poor": 88, "fair": 85, "good": 82},
        "D": {"poor": 91, "fair": 89, "good": 86}
    },
    "soja_labranza_convencional": {
        "description": "Soja con labranza convencional",
        "condition_based": True,
        "A": {"poor": 77, "fair": 72, "good": 67},
        "B": {"poor": 85, "fair": 81, "good": 78},
        "C": {"poor": 91, "fair": 88, "good": 85},
        "D": {"poor": 94, "fair": 91, "good": 89}
    },
    "maiz_siembra_directa": {
        "description": "Maíz en siembra directa",
        "condition_based": True,
        "A": {"poor": 70, "fair": 65, "good": 60},
        "B": {"poor": 79, "fair": 75, "good": 71},
        "C": {"poor": 86, "fair": 82, "good": 78},
        "D": {"poor": 89, "fair": 86, "good": 83}
    },
    "trigo": {
        "description": "Trigo / Cereales de invierno",
        "condition_based": True,
        "A": {"poor": 65, "fair": 60, "good": 55},
        "B": {"poor": 76, "fair": 72, "good": 68},
        "C": {"poor": 84, "fair": 80, "good": 76},
        "D": {"poor": 88, "fair": 85, "good": 82}
    },
    "girasol": {
        "description": "Girasol",
        "condition_based": True,
        "A": {"poor": 74, "fair": 69, "good": 64},
        "B": {"poor": 82, "fair": 78, "good": 74},
        "C": {"poor": 88, "fair": 85, "good": 82},
        "D": {"poor": 91, "fair": 88, "good": 86}
    },
    
    # === PASTURAS Y GANADERÍA ===
    "pastizal_natural": {
        "description": "Pastizal natural pampeano",
        "condition_based": True,
        "A": {"poor": 68, "fair": 49, "good": 39},
        "B": {"poor": 79, "fair": 69, "good": 61},
        "C": {"poor": 86, "fair": 79, "good": 74},
        "D": {"poor": 89, "fair": 84, "good": 80}
    },
    "pastizal_degradado": {
        "description": "Pastizal degradado / sobrepastoreo",
        "A": {"N/A": 75}, "B": {"N/A": 83}, "C": {"N/A": 89}, "D": {"N/A": 92}
    },
    "pastura_implantada": {
        "description": "Pastura implantada (alfalfa, festuca, etc.)",
        "condition_based": True,
        "A": {"poor": 66, "fair": 55, "good": 45},
        "B": {"poor": 77, "fair": 70, "good": 63},
        "C": {"poor": 85, "fair": 80, "good": 75},
        "D": {"poor": 88, "fair": 84, "good": 80}
    },
    "feedlot": {
        "description": "Feedlot / Corrales de engorde",
        "A": {"N/A": 88}, "B": {"N/A": 92}, "C": {"N/A": 94}, "D": {"N/A": 95}
    },
    
    # === MONTES Y FORESTACIÓN ===
    "monte_nativo_denso": {
        "description": "Monte nativo denso (Chaco, Yungas)",
        "condition_based": True,
        "A": {"poor": 45, "fair": 36, "good": 30},
        "B": {"poor": 66, "fair": 60, "good": 55},
        "C": {"poor": 77, "fair": 73, "good": 70},
        "D": {"poor": 83, "fair": 79, "good": 77}
    },
    "monte_nativo_ralo": {
        "description": "Monte nativo ralo / arbustal",
        "condition_based": True,
        "A": {"poor": 57, "fair": 48, "good": 41},
        "B": {"poor": 73, "fair": 67, "good": 62},
        "C": {"poor": 82, "fair": 78, "good": 74},
        "D": {"poor": 86, "fair": 83, "good": 80}
    },
    "forestacion_pinos": {
        "description": "Forestación de pinos (NEA, Patagonia)",
        "condition_based": True,
        "A": {"poor": 45, "fair": 36, "good": 30},
        "B": {"poor": 66, "fair": 60, "good": 55},
        "C": {"poor": 77, "fair": 73, "good": 70},
        "D": {"poor": 83, "fair": 79, "good": 77}
    },
    "forestacion_eucaliptus": {
        "description": "Forestación de eucaliptus",
        "condition_based": True,
        "A": {"poor": 48, "fair": 40, "good": 34},
        "B": {"poor": 68, "fair": 62, "good": 57},
        "C": {"poor": 78, "fair": 74, "good": 71},
        "D": {"poor": 84, "fair": 80, "good": 78}
    },
    "desmonte_reciente": {
        "description": "Desmonte reciente / suelo expuesto",
        "A": {"N/A": 77}, "B": {"N/A": 86}, "C": {"N/A": 91}, "D": {"N/A": 94}
    },
    
    # === ZONAS ESPECIALES ===
    "humedal_bañado": {
        "description": "Humedales / Bañados",
        "A": {"N/A": 85}, "B": {"N/A": 90}, "C": {"N/A": 93}, "D": {"N/A": 95}
    },
    "salinas_salitrales": {
        "description": "Salinas y salitrales",
        "A": {"N/A": 92}, "B": {"N/A": 94}, "C": {"N/A": 96}, "D": {"N/A": 97}
    },
    "medanos_dunas": {
        "description": "Médanos / Dunas (sin vegetación)",
        "A": {"N/A": 63}, "B": {"N/A": 77}, "C": {"N/A": 85}, "D": {"N/A": 88}
    },
    "roca_expuesta": {
        "description": "Roca expuesta / afloramientos",
        "A": {"N/A": 96}, "B": {"N/A": 96}, "C": {"N/A": 96}, "D": {"N/A": 96}
    },
    
    # === INFRAESTRUCTURA ===
    "parque_solar": {
        "description": "Parque solar fotovoltaico",
        "A": {"N/A": 70}, "B": {"N/A": 80}, "C": {"N/A": 86}, "D": {"N/A": 89}
    },
    "parque_eolico": {
        "description": "Parque eólico (área de servidumbre)",
        "condition_based": True,
        "notes": "Usar CN del uso del suelo subyacente",
        "A": {"poor": 68, "fair": 49, "good": 39},
        "B": {"poor": 79, "fair": 69, "good": 61},
        "C": {"poor": 86, "fair": 79, "good": 74},
        "D": {"poor": 89, "fair": 84, "good": 80}
    },
    "cantera_mineria": {
        "description": "Cantera / Minería a cielo abierto",
        "A": {"N/A": 91}, "B": {"N/A": 93}, "C": {"N/A": 95}, "D": {"N/A": 96}
    }
}

# Soil group descriptions for user guidance
SOIL_GROUP_DESCRIPTIONS = {
    "A": {
        "name": "Grupo A - Alta infiltración",
        "description": "Arenas profundas, loess profundo, limos agregados",
        "typical_locations": "Médanos fijados, suelos arenosos de Entre Ríos",
        "infiltration_rate": "> 7.6 mm/hr"
    },
    "B": {
        "name": "Grupo B - Infiltración moderada",
        "description": "Limos, suelos franco-arenosos, loess poco profundo",
        "typical_locations": "Pampa Ondulada, gran parte de la región pampeana",
        "infiltration_rate": "3.8 - 7.6 mm/hr"
    },
    "C": {
        "name": "Grupo C - Infiltración lenta",
        "description": "Arcillas, suelos con horizonte impermeable",
        "typical_locations": "Bajos submeridionales, depresión del Salado",
        "infiltration_rate": "1.3 - 3.8 mm/hr"
    },
    "D": {
        "name": "Grupo D - Infiltración muy lenta",
        "description": "Arcillas pesadas, suelos con napa freática alta, suelos salino-sódicos",
        "typical_locations": "Zonas deprimidas, áreas con napa < 1m",
        "infiltration_rate": "< 1.3 mm/hr"
    }
}
```

### 3.5 Risk Classification

```python
# backend/app/services/calculation.py

from enum import Enum
from typing import Dict, Tuple

class RiskLevel(str, Enum):
    MUY_BAJO = "muy_bajo"
    BAJO = "bajo"
    MODERADO = "moderado"
    ALTO = "alto"
    MUY_ALTO = "muy_alto"

class InfrastructureType(str, Enum):
    ALCANTARILLA_MENOR = "alcantarilla_menor"      # < 1 m diámetro
    ALCANTARILLA_MAYOR = "alcantarilla_mayor"      # 1-3 m
    PUENTE_MENOR = "puente_menor"                   # 3-10 m luz
    PUENTE_MAYOR = "puente_mayor"                   # > 10 m luz
    CANAL_URBANO = "canal_urbano"
    CANAL_RURAL = "canal_rural"
    DEFENSA_COSTERA = "defensa_costera"

def classify_risk(
    Q: float,  # m³/s
    area_km2: float,
    infrastructure: InfrastructureType,
    return_period: int
) -> Tuple[RiskLevel, Dict[str, str]]:
    """
    Classify flood risk based on calculated discharge and context.
    
    Returns risk level and practical recommendations.
    """
    
    # Specific discharge (caudal específico)
    q_specific = Q / area_km2  # m³/s/km²
    
    # Thresholds based on Argentine practice
    thresholds = {
        InfrastructureType.ALCANTARILLA_MENOR: {
            "muy_bajo": 0.5, "bajo": 1.5, "moderado": 3.0, "alto": 5.0
        },
        InfrastructureType.ALCANTARILLA_MAYOR: {
            "muy_bajo": 2.0, "bajo": 5.0, "moderado": 10.0, "alto": 20.0
        },
        InfrastructureType.PUENTE_MENOR: {
            "muy_bajo": 5.0, "bajo": 15.0, "moderado": 30.0, "alto": 50.0
        },
        InfrastructureType.PUENTE_MAYOR: {
            "muy_bajo": 20.0, "bajo": 50.0, "moderado": 100.0, "alto": 200.0
        },
        InfrastructureType.CANAL_URBANO: {
            "muy_bajo": 1.0, "bajo": 3.0, "moderado": 8.0, "alto": 15.0
        },
        InfrastructureType.CANAL_RURAL: {
            "muy_bajo": 3.0, "bajo": 10.0, "moderado": 25.0, "alto": 50.0
        },
    }
    
    t = thresholds.get(infrastructure, thresholds[InfrastructureType.CANAL_RURAL])
    
    if Q < t["muy_bajo"]:
        level = RiskLevel.MUY_BAJO
    elif Q < t["bajo"]:
        level = RiskLevel.BAJO
    elif Q < t["moderado"]:
        level = RiskLevel.MODERADO
    elif Q < t["alto"]:
        level = RiskLevel.ALTO
    else:
        level = RiskLevel.MUY_ALTO
    
    recommendations = get_recommendations(level, Q, infrastructure, return_period)
    
    return level, recommendations

def get_recommendations(
    level: RiskLevel,
    Q: float,
    infrastructure: InfrastructureType,
    return_period: int
) -> Dict[str, str]:
    """Generate practical recommendations based on risk level."""
    
    recs = {
        RiskLevel.MUY_BAJO: {
            "general": "Condiciones favorables para la infraestructura propuesta.",
            "action": "Proceder con diseño estándar.",
            "verification": "Verificación básica de capacidad hidráulica."
        },
        RiskLevel.BAJO: {
            "general": "Caudal manejable con diseño convencional.",
            "action": "Dimensionar según normativa estándar.",
            "verification": "Verificar velocidades máximas y erosión."
        },
        RiskLevel.MODERADO: {
            "general": "Requiere atención en el diseño hidráulico.",
            "action": "Considerar obras de protección adicionales.",
            "verification": "Análisis de socavación y estabilidad de márgenes."
        },
        RiskLevel.ALTO: {
            "general": "Condiciones exigentes que requieren diseño detallado.",
            "action": "Estudio hidráulico completo recomendado (HEC-RAS o similar).",
            "verification": "Modelación hidráulica, análisis de alternativas."
        },
        RiskLevel.MUY_ALTO: {
            "general": "Condiciones críticas. Riesgo significativo.",
            "action": "Estudio integral obligatorio. Considerar alternativas de emplazamiento.",
            "verification": "Modelación 2D, análisis de riesgo, plan de contingencia."
        }
    }
    
    base_rec = recs[level]
    
    # Add return period context
    if return_period < 10:
        base_rec["period_note"] = f"Período de retorno de {return_period} años es bajo para obras permanentes. Considerar T ≥ 25 años."
    elif return_period >= 100:
        base_rec["period_note"] = f"Período de retorno de {return_period} años apropiado para infraestructura crítica."
    
    return base_rec
```

---

## 4. AI Integration (Claude API)

### 4.1 Claude API Service

```python
# backend/app/services/ai_service.py

import anthropic
from typing import Dict, Any
from app.core.config import settings

client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

SYSTEM_PROMPT_ES = """Eres un ingeniero civil especializado en hidrología e hidráulica, con amplia experiencia en proyectos en Argentina.

Tu rol es interpretar resultados de cálculos hidrológicos y proporcionar explicaciones técnicas claras y profesionales.

Directrices:
- Usa terminología técnica apropiada en español rioplatense
- Sé preciso y conciso
- Relaciona los resultados con la práctica argentina
- Menciona normativas o referencias locales cuando sea pertinente
- Evita lenguaje vago; usa valores numéricos específicos
- Estructura tus respuestas de forma clara
- Cuando haya incertidumbre, indícala explícitamente
- No inventes datos; basa tus interpretaciones en los valores proporcionados"""

SYSTEM_PROMPT_EN = """You are a civil engineer specialized in hydrology and hydraulics, with extensive experience in projects in Argentina.

Your role is to interpret hydrological calculation results and provide clear, professional technical explanations.

Guidelines:
- Use appropriate technical terminology
- Be precise and concise
- Relate results to Argentine practice where relevant
- Reference local standards when pertinent
- Avoid vague language; use specific numerical values
- Structure your responses clearly
- When uncertain, indicate it explicitly
- Do not fabricate data; base interpretations on provided values"""

def generate_interpretation(
    calculation_data: Dict[str, Any],
    language: str = "es"
) -> str:
    """
    Generate AI interpretation of hydrological calculation results.
    """
    
    system_prompt = SYSTEM_PROMPT_ES if language == "es" else SYSTEM_PROMPT_EN
    
    user_prompt = build_interpretation_prompt(calculation_data, language)
    
    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1500,
        system=system_prompt,
        messages=[
            {"role": "user", "content": user_prompt}
        ]
    )
    
    return message.content[0].text

def build_interpretation_prompt(data: Dict[str, Any], language: str) -> str:
    """Build the user prompt for interpretation."""
    
    if language == "es":
        return f"""Analiza los siguientes resultados de un estudio hidrológico:

**Datos de la Cuenca:**
- Ubicación: {data.get('location', 'No especificada')}
- Área: {data['area_km2']:.2f} km²
- Longitud del cauce: {data.get('length_km', 'N/A')} km
- Pendiente media: {data.get('slope', 'N/A')}

**Parámetros de Diseño:**
- Período de retorno: {data['return_period']} años
- Duración de tormenta: {data['duration_min']} minutos
- Intensidad de lluvia: {data['intensity_mm_hr']:.1f} mm/hr

**Resultados:**
- Método utilizado: {data['method']}
- Coeficiente de escorrentía (C): {data.get('runoff_coeff', 'N/A')}
- Número de Curva (CN): {data.get('cn', 'N/A')}
- Tiempo de concentración: {data['tc_hours']:.2f} horas ({data['tc_hours']*60:.0f} minutos)
- Caudal pico calculado: {data['peak_flow_m3s']:.2f} m³/s
- Caudal específico: {data['peak_flow_m3s']/data['area_km2']:.2f} m³/s/km²
- Nivel de riesgo: {data['risk_level']}

**Tipo de infraestructura:** {data.get('infrastructure_type', 'No especificada')}

Proporciona:
1. **Interpretación del resultado**: ¿Qué significa este caudal en términos prácticos?
2. **Evaluación del riesgo**: Justifica la clasificación de riesgo
3. **Consideraciones de diseño**: Aspectos a tener en cuenta para el dimensionamiento
4. **Recomendaciones**: Acciones específicas sugeridas
5. **Limitaciones del análisis**: Advertencias sobre la aplicabilidad del método"""
    
    else:
        return f"""Analyze the following results from a hydrological study:

**Watershed Data:**
- Location: {data.get('location', 'Not specified')}
- Area: {data['area_km2']:.2f} km²
- Main channel length: {data.get('length_km', 'N/A')} km
- Average slope: {data.get('slope', 'N/A')}

**Design Parameters:**
- Return period: {data['return_period']} years
- Storm duration: {data['duration_min']} minutes
- Rainfall intensity: {data['intensity_mm_hr']:.1f} mm/hr

**Results:**
- Method used: {data['method']}
- Runoff coefficient (C): {data.get('runoff_coeff', 'N/A')}
- Curve Number (CN): {data.get('cn', 'N/A')}
- Time of concentration: {data['tc_hours']:.2f} hours ({data['tc_hours']*60:.0f} minutes)
- Peak discharge: {data['peak_flow_m3s']:.2f} m³/s
- Specific discharge: {data['peak_flow_m3s']/data['area_km2']:.2f} m³/s/km²
- Risk level: {data['risk_level']}

**Infrastructure type:** {data.get('infrastructure_type', 'Not specified')}

Provide:
1. **Result interpretation**: What does this discharge mean in practical terms?
2. **Risk assessment**: Justify the risk classification
3. **Design considerations**: Aspects to consider for dimensioning
4. **Recommendations**: Specific suggested actions
5. **Analysis limitations**: Warnings about method applicability"""

def generate_report_sections(
    calculation_data: Dict[str, Any],
    language: str = "es"
) -> Dict[str, str]:
    """
    Generate structured sections for the technical report.
    """
    
    system_prompt = SYSTEM_PROMPT_ES if language == "es" else SYSTEM_PROMPT_EN
    
    sections_prompt = build_report_sections_prompt(calculation_data, language)
    
    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=3000,
        system=system_prompt,
        messages=[
            {"role": "user", "content": sections_prompt}
        ]
    )
    
    # Parse sections from response
    return parse_report_sections(message.content[0].text)
```

---

## 5. Report Generation (Memoria de Cálculo)

### 5.1 PDF Structure

The "Memoria de Cálculo Hidrológico" must follow Argentine professional standards:

```
1. CARÁTULA
   - Título del proyecto
   - Ubicación
   - Comitente (si corresponde)
   - Profesional responsable
   - Fecha
   - Logo/membrete (opcional)

2. ÍNDICE

3. OBJETO DEL ESTUDIO
   - Descripción del proyecto
   - Alcance del estudio hidrológico

4. ANTECEDENTES
   - Información de base utilizada
   - Cartografía y fuentes de datos
   - Normativa aplicable

5. DESCRIPCIÓN DE LA CUENCA
   - Ubicación geográfica
   - Características morfométricas
   - Uso del suelo
   - Tipo de suelo

6. ANÁLISIS PLUVIOMÉTRICO
   - Estación de referencia
   - Curvas IDF utilizadas
   - Período de retorno de diseño
   - Justificación

7. METODOLOGÍA DE CÁLCULO
   - Método(s) seleccionado(s)
   - Justificación de la selección
   - Fórmulas aplicadas
   - Parámetros utilizados

8. CÁLCULOS Y RESULTADOS
   - Tiempo de concentración
   - Caudal de diseño
   - Comparación de métodos (si aplica)
   - Tabla resumen

9. ANÁLISIS DE RESULTADOS
   - Interpretación
   - Clasificación de riesgo
   - Sensibilidad del análisis

10. CONCLUSIONES Y RECOMENDACIONES
    - Caudal de diseño adoptado
    - Recomendaciones para el diseño hidráulico
    - Estudios adicionales sugeridos

11. ANEXOS
    - Planilla de cálculo detallada
    - Curvas IDF
    - Cartografía de la cuenca

PIE DE PÁGINA:
- "Generado con AutoHydro Argentina — Desarrollado por Ing. Ammar Mahfoud"
- Número de página
```

### 5.2 ReportLab Implementation

```python
# backend/app/services/report_service.py

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm, mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, Image, KeepTogether
)
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from io import BytesIO
from datetime import datetime
from typing import Dict, Any, Optional

class MemoriaCalculoGenerator:
    """Generate professional hydrological calculation reports."""
    
    def __init__(
        self,
        project_name: str,
        location: str,
        engineer_name: str = "Ing. Ammar Mahfoud",
        client: Optional[str] = None,
        logo_path: Optional[str] = None,
        language: str = "es"
    ):
        self.project_name = project_name
        self.location = location
        self.engineer_name = engineer_name
        self.client = client
        self.logo_path = logo_path
        self.language = language
        self.styles = self._create_styles()
        
    def _create_styles(self) -> Dict[str, ParagraphStyle]:
        """Create custom paragraph styles."""
        base = getSampleStyleSheet()
        
        return {
            'title': ParagraphStyle(
                'CustomTitle',
                parent=base['Title'],
                fontSize=18,
                spaceAfter=30,
                alignment=TA_CENTER,
                fontName='Helvetica-Bold'
            ),
            'heading1': ParagraphStyle(
                'CustomH1',
                parent=base['Heading1'],
                fontSize=14,
                spaceBefore=20,
                spaceAfter=10,
                fontName='Helvetica-Bold',
                textColor=colors.HexColor('#1a365d')
            ),
            'heading2': ParagraphStyle(
                'CustomH2',
                parent=base['Heading2'],
                fontSize=12,
                spaceBefore=15,
                spaceAfter=8,
                fontName='Helvetica-Bold'
            ),
            'body': ParagraphStyle(
                'CustomBody',
                parent=base['Normal'],
                fontSize=10,
                alignment=TA_JUSTIFY,
                spaceAfter=8,
                leading=14
            ),
            'footer': ParagraphStyle(
                'Footer',
                parent=base['Normal'],
                fontSize=8,
                textColor=colors.gray,
                alignment=TA_CENTER
            ),
            'table_header': ParagraphStyle(
                'TableHeader',
                parent=base['Normal'],
                fontSize=9,
                fontName='Helvetica-Bold',
                alignment=TA_CENTER
            ),
            'table_cell': ParagraphStyle(
                'TableCell',
                parent=base['Normal'],
                fontSize=9,
                alignment=TA_CENTER
            )
        }
    
    def generate(
        self,
        calculation_data: Dict[str, Any],
        ai_interpretation: str,
        ai_recommendations: str
    ) -> BytesIO:
        """Generate the complete PDF report."""
        
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=2.5*cm,
            rightMargin=2.5*cm,
            topMargin=2.5*cm,
            bottomMargin=2.5*cm
        )
        
        story = []
        
        # Cover page
        story.extend(self._build_cover_page())
        story.append(PageBreak())
        
        # Table of contents placeholder
        story.extend(self._build_toc())
        story.append(PageBreak())
        
        # Main content
        story.extend(self._build_section_objetivo())
        story.extend(self._build_section_cuenca(calculation_data))
        story.extend(self._build_section_pluviometria(calculation_data))
        story.extend(self._build_section_metodologia(calculation_data))
        story.extend(self._build_section_calculos(calculation_data))
        story.extend(self._build_section_resultados(calculation_data, ai_interpretation))
        story.extend(self._build_section_conclusiones(ai_recommendations))
        
        # Build PDF with custom page template
        doc.build(
            story,
            onFirstPage=self._add_page_number,
            onLaterPages=self._add_page_number
        )
        
        buffer.seek(0)
        return buffer
    
    def _add_page_number(self, canvas: canvas.Canvas, doc):
        """Add page number and footer to each page."""
        canvas.saveState()
        
        # Footer line
        canvas.setStrokeColor(colors.HexColor('#1a365d'))
        canvas.setLineWidth(0.5)
        canvas.line(2.5*cm, 1.5*cm, A4[0] - 2.5*cm, 1.5*cm)
        
        # Footer text
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(colors.gray)
        
        footer_text = "Generado con AutoHydro Argentina — Desarrollado por Ing. Ammar Mahfoud"
        canvas.drawCentredString(A4[0]/2, 1*cm, footer_text)
        
        # Page number
        page_num = canvas.getPageNumber()
        canvas.drawRightString(A4[0] - 2.5*cm, 1*cm, f"Página {page_num}")
        
        canvas.restoreState()
    
    def _build_cover_page(self) -> list:
        """Build the cover page elements."""
        elements = []
        
        elements.append(Spacer(1, 4*cm))
        
        # Logo if provided
        if self.logo_path:
            try:
                logo = Image(self.logo_path, width=5*cm, height=2*cm)
                elements.append(logo)
                elements.append(Spacer(1, 1*cm))
            except:
                pass
        
        # Title
        elements.append(Paragraph(
            "MEMORIA DE CÁLCULO HIDROLÓGICO",
            self.styles['title']
        ))
        
        elements.append(Spacer(1, 2*cm))
        
        # Project name
        elements.append(Paragraph(
            f"<b>Proyecto:</b> {self.project_name}",
            ParagraphStyle('ProjectName', fontSize=14, alignment=TA_CENTER)
        ))
        
        elements.append(Spacer(1, 0.5*cm))
        
        # Location
        elements.append(Paragraph(
            f"<b>Ubicación:</b> {self.location}",
            ParagraphStyle('Location', fontSize=12, alignment=TA_CENTER)
        ))
        
        elements.append(Spacer(1, 3*cm))
        
        # Info table
        info_data = [
            ["Profesional Responsable:", self.engineer_name],
            ["Fecha:", datetime.now().strftime("%d/%m/%Y")],
        ]
        
        if self.client:
            info_data.insert(0, ["Comitente:", self.client])
        
        info_table = Table(info_data, colWidths=[6*cm, 8*cm])
        info_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ]))
        
        elements.append(info_table)
        
        return elements
    
    # ... Additional section builders would continue here
    # Each section follows the structure defined in 5.1
```

---

## 6. Frontend Implementation

### 6.1 Main Calculator Form

```tsx
// frontend/src/pages/Calculator.tsx

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { calculateHydrology } from '../services/api';
import { CitySelector } from '../components/forms/CitySelector';
import { MethodSelector } from '../components/forms/MethodSelector';
import { BasinInputs } from '../components/forms/BasinInputs';
import { CNSelector } from '../components/forms/CNSelector';
import { TcCalculator } from '../components/forms/TcCalculator';
import { ResultsPanel } from '../components/results/ResultsPanel';
import { ReportOptions } from '../components/forms/ReportOptions';

export const Calculator: React.FC = () => {
  const { t } = useTranslation();
  
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<HydrologyInput>({
    city: '',
    returnPeriod: 25,
    duration: 60,
    area: 0,
    length: 0,
    slope: 0,
    method: 'rational',
    landUseCategories: [],
    soilGroup: 'B',
    tcFormulas: ['temez'],
  });
  
  const mutation = useMutation({
    mutationFn: calculateHydrology,
    onSuccess: (data) => {
      setResults(data);
      setStep(4);
    },
  });
  
  const [results, setResults] = useState<HydrologyResult | null>(null);
  
  const handleSubmit = () => {
    mutation.mutate(formData);
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Progress indicator */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {[
              { num: 1, label: t('steps.location') },
              { num: 2, label: t('steps.basin') },
              { num: 3, label: t('steps.parameters') },
              { num: 4, label: t('steps.results') },
            ].map((s) => (
              <div
                key={s.num}
                className={`flex items-center ${
                  step >= s.num ? 'text-blue-600' : 'text-gray-400'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    step >= s.num ? 'bg-blue-600 text-white' : 'bg-gray-200'
                  }`}
                >
                  {s.num}
                </div>
                <span className="ml-2 hidden sm:inline">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Form content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {step === 1 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-6">
              {t('calculator.selectLocation')}
            </h2>
            <CitySelector
              value={formData.city}
              onChange={(city) => setFormData({ ...formData, city })}
            />
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t('calculator.returnPeriod')}
                </label>
                <select
                  value={formData.returnPeriod}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      returnPeriod: Number(e.target.value),
                    })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                >
                  {[2, 5, 10, 25, 50, 100].map((T) => (
                    <option key={T} value={T}>
                      {T} {t('years')}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t('calculator.stormDuration')}
                </label>
                <select
                  value={formData.duration}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      duration: Number(e.target.value),
                    })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                >
                  {[15, 30, 45, 60, 90, 120].map((d) => (
                    <option key={d} value={d}>
                      {d} min
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-8 flex justify-end">
              <button
                onClick={() => setStep(2)}
                disabled={!formData.city}
                className="px-6 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50"
              >
                {t('continue')}
              </button>
            </div>
          </div>
        )}
        
        {step === 2 && (
          <BasinInputs
            formData={formData}
            setFormData={setFormData}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}
        
        {step === 3 && (
          <div className="space-y-6">
            <MethodSelector
              value={formData.method}
              onChange={(method) => setFormData({ ...formData, method })}
            />
            
            {formData.method === 'scs_cn' && (
              <CNSelector
                categories={formData.landUseCategories}
                soilGroup={formData.soilGroup}
                onChange={(categories, soilGroup) =>
                  setFormData({ ...formData, landUseCategories: categories, soilGroup })
                }
              />
            )}
            
            <TcCalculator
              formulas={formData.tcFormulas}
              basinData={{
                area: formData.area,
                length: formData.length,
                slope: formData.slope,
              }}
              onChange={(formulas) => setFormData({ ...formData, tcFormulas: formulas })}
            />
            
            <div className="flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-2 border border-gray-300 rounded-md"
              >
                {t('back')}
              </button>
              <button
                onClick={handleSubmit}
                disabled={mutation.isPending}
                className="px-6 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50"
              >
                {mutation.isPending ? t('calculating') : t('calculate')}
              </button>
            </div>
          </div>
        )}
        
        {step === 4 && results && (
          <ResultsPanel
            results={results}
            onBack={() => setStep(3)}
            onNewCalculation={() => {
              setStep(1);
              setResults(null);
            }}
          />
        )}
      </div>
    </div>
  );
};
```

### 6.2 Results Display with Method Comparison

```tsx
// frontend/src/components/results/MethodComparison.tsx

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface MethodResult {
  method: string;
  methodName: string;
  peakFlow: number;
  tc: number;
  notes: string;
}

interface Props {
  results: MethodResult[];
  selectedMethod: string;
}

export const MethodComparison: React.FC<Props> = ({ results, selectedMethod }) => {
  const { t } = useTranslation();
  
  const chartData = results.map((r) => ({
    name: r.methodName,
    caudal: r.peakFlow,
    isSelected: r.method === selectedMethod,
  }));
  
  const getBarColor = (isSelected: boolean) =>
    isSelected ? '#2563eb' : '#93c5fd';
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-bold mb-4">
        {t('results.methodComparison')}
      </h3>
      
      <div className="h-64 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis
              label={{
                value: 'Q (m³/s)',
                angle: -90,
                position: 'insideLeft',
              }}
            />
            <Tooltip
              formatter={(value: number) => [`${value.toFixed(2)} m³/s`, 'Caudal']}
            />
            <Bar dataKey="caudal">
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getBarColor(entry.isSelected)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {t('method')}
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Q (m³/s)
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Tc (min)
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {t('notes')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {results.map((r) => (
              <tr
                key={r.method}
                className={r.method === selectedMethod ? 'bg-blue-50' : ''}
              >
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center">
                    {r.method === selectedMethod && (
                      <span className="w-2 h-2 bg-blue-600 rounded-full mr-2" />
                    )}
                    {r.methodName}
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  {r.peakFlow.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  {(r.tc * 60).toFixed(0)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {r.notes}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
        <p className="text-sm text-yellow-800">
          <strong>{t('note')}:</strong> {t('results.comparisonDisclaimer')}
        </p>
      </div>
    </div>
  );
};
```

---

## 7. Deployment Configuration

### 7.1 Backend Dockerfile

```dockerfile
# backend/Dockerfile

FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY app/ ./app/

# Create non-root user
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

# Run with uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 7.2 Railway Configuration

```toml
# backend/railway.toml

[build]
builder = "dockerfile"
dockerfilePath = "Dockerfile"

[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 100
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3
```

### 7.3 Vercel Configuration

```json
// frontend/vercel.json

{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" }
      ]
    }
  ]
}
```

### 7.4 Environment Variables

```bash
# .env.example

# Backend
ANTHROPIC_API_KEY=sk-ant-...
CORS_ORIGINS=["http://localhost:5173","https://your-frontend.vercel.app"]
DEBUG=false

# Frontend
VITE_API_URL=http://localhost:8000
VITE_DEFAULT_LANGUAGE=es
```

---

## 8. Acceptance Criteria

### 8.1 Technical Requirements

| Requirement | Acceptance Criteria |
|-------------|---------------------|
| IDF Calculation | Returns intensity within ±0.1% of manual calculation for all 15 cities |
| Rational Method | Q matches manual calculation to 3 decimal places |
| SCS-CN Method | S, Ia, and Q match SCS-TR-55 examples |
| Tc Formulas | All 6 formulas match published values |
| API Response Time | < 2 seconds for calculation, < 10 seconds with AI |
| PDF Generation | Valid PDF, opens correctly, all sections present |
| Mobile Responsive | Usable on 375px width screens |
| Bilingual | All UI text switches correctly, reports generate in selected language |

### 8.2 User Experience

| Requirement | Acceptance Criteria |
|-------------|---------------------|
| First Calculation | User can complete first calculation in < 3 minutes |
| Error Messages | All validation errors display in user's language |
| Loading States | All async operations show loading indicators |
| Results Clarity | Non-engineer can understand risk level and recommendations |

### 8.3 Professional Quality

| Requirement | Acceptance Criteria |
|-------------|---------------------|
| Report Format | Matches "Memoria de Cálculo" standard format |
| Engineering Rigor | Disclaimers present, limitations documented |
| Branding | "Ing. Ammar Mahfoud" appears in footer and about page |
| Source Attribution | All IDF coefficients cite original sources |

---

## 9. Implementation Sequence

Execute in this order:

1. **Project Setup**
   - Initialize React + Vite frontend
   - Initialize FastAPI backend
   - Configure Tailwind CSS
   - Setup i18n with ES/EN translations
   
2. **Data Layer**
   - Implement IDF_ARGENTINA data
   - Implement CN_ARGENTINA tables
   - Implement TC formulas
   
3. **Calculation Engine**
   - Rational Method
   - Modified Rational Method
   - SCS-CN Method
   - Tc calculator (all formulas)
   - Risk classification
   
4. **API Endpoints**
   - POST /api/calculate
   - POST /api/interpret (Claude integration)
   - POST /api/report (PDF generation)
   - GET /api/cities
   - GET /api/cn-categories
   
5. **Frontend Forms**
   - City selector with map preview
   - Basin input form
   - CN category selector with visual guide
   - Tc formula comparison
   
6. **Results Display**
   - Method comparison chart
   - AI interpretation panel
   - Risk classification display
   
7. **Report Generation**
   - ReportLab PDF builder
   - Cover page with optional logo
   - All required sections
   
8. **Polish**
   - Error handling
   - Loading states
   - Mobile optimization
   - About page with Ing. Ammar Mahfoud bio
   
9. **Deployment**
   - Backend to Railway
   - Frontend to Vercel
   - Environment variables
   - Domain configuration (if desired)

---

## 10. Final Notes

### For Claude Code:

- **Do not skip steps.** Implement each section fully before moving on.
- **Test calculations** against manual examples before proceeding.
- **Use TypeScript strictly** — no `any` types.
- **Comment complex formulas** with source references.
- **All text must be translatable** — no hardcoded Spanish/English in components.
- **The PDF must look professional** — this is a portfolio piece.

### Key Differentiators:

This is not a tutorial project. This is a tool that Argentine engineers will actually use. Build it with that respect.

---

**Desarrollado por Ing. Ammar Mahfoud**
**AutoHydro Argentina — Hidrología inteligente para ingenieros argentinos**
