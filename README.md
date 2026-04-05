# AutoHydro Argentina

[![CI](https://github.com/ammarmahfoud90/autohydro-argentina/actions/workflows/ci.yml/badge.svg)](https://github.com/ammarmahfoud90/autohydro-argentina/actions/workflows/ci.yml)

Herramienta de cálculo hidrológico e hidráulico con datos IDF verificados para Argentina.

## Stack

- **Backend:** FastAPI + Python 3.11 — 18 localidades con datos IDF de fuentes oficiales
- **Frontend:** React + TypeScript + Vite + Tailwind CSS

## Calculadoras

- Hidrología: Método Racional, Racional Modificado, SCS-CN — con 6 fórmulas de Tc
- Hidráulica: Manning (secciones rectangulares, trapezoidales, circulares, triangulares)
- Alcantarillas: Dimensionamiento según FHWA HDS-5 (control de entrada y salida)
- Hietogramas: Bloques Alternos, SCS Tipo II, Chicago, Uniforme

## Tests

```bash
cd backend && python -m pytest tests/ -v
```

265 tests — regresión numérica, modelos IDF, servicios de cálculo.

## Desarrollo local

```bash
# Backend
cd backend && pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend
cd frontend && npm install && npm run dev
```

## Fuentes IDF

APA Resolución 1334/21 (Chaco/Formosa) · UTN-ER / Dir. Hidráulica (Entre Ríos) ·
UNL-CURIHAM (Santa Fe) · IHLLA-CONICET + INTA (Buenos Aires) · INA-CIRSA (Córdoba/Salta) ·
INA-CRA (Mendoza/Catamarca) · SsRH (Neuquén) · UNT-FACET (Tucumán)

## Licencia

MIT © 2025 Ing. Ammar Mahfoud
