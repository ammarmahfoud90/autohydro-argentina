# Correcciones y validación científica — 11 de octubre de 2026

Esta revisión corrige errores de implementación y documenta la procedencia de
los resultados. Las pruebas verifican casos numéricos de referencia, conservación
de masa y trazabilidad entre cálculo y exportación. **No constituyen una
calibración con lluvias, caudales ni obras observadas en Argentina.**

Base revisada: `0b80435aac5a3c2db7e7c5f1e3987e6a9f08885d`.
Identificador de los cálculos corregidos: `scientific-fixes-2026-10-11`.

## Cambios numéricos

| Módulo | Corrección y criterio de comprobación |
| --- | --- |
| Log-Pearson III | Cuantil de Pearson III estandarizado en logaritmos decimales: `Q = 10**(media_log10 + desviacion_log10 * K)`, con probabilidad de excedencia `1/T`. Se verifica también contra casos analíticos de asimetría ±2. |
| Alcantarillas | Ecuaciones de control de entrada HDS-5, apéndice A, con factor SI `1.811`; profundidad crítica circular; perímetro completo en conductos cajón y profundidad efectiva de salida. Se vinculan los coeficientes con la geometría de la entrada. |
| PMD → IDF | Normalización para que la profundidad calculada a 1440 minutos coincida con la PMD correspondiente al mismo período de retorno. Se evita contar dos veces el factor de frecuencia. |
| GIS | Longitud acumulada de los enlaces D8 en metros; distancias geodésicas para coordenadas geográficas y unidades del CRS para la función de coordenadas proyectadas. El recorrido comprueba límites y evita el fallo nativo con una salida en el borde del raster. |
| SCS tipo II | Tabla acumulada horaria de 24 horas del NRCS; interpolación lineal. La selección de estación se conserva. |
| Chicago y otros hietogramas | Integración del reparto cuando el pico cae entre pasos; conservación de la profundidad total, sin acortar silenciosamente la duración. |
| Hidrograma SCS | Ordenadas NRCS y normalización del área para conservar `lluvia efectiva (mm) × área (km²) × 1000` en m³. El coeficiente de pico resulta aproximadamente 0.208 en SI. |
| Muskingum | Rechazo de pasos que producen coeficientes negativos y de grillas temporales no uniformes. El balance incluye el cambio de almacenamiento; una cola truncada no exige volúmenes de entrada y salida idénticos. |
| Salta | Corrección de las celdas publicadas para T=5 años y duraciones 120, 180 y 360 minutos. La ecuación DIT ajustada no se fuerza a reproducir el redondeo de la tabla. |

## Casos de referencia reproducibles

| Caso | Entradas | Resultado esperado | Tolerancia de la prueba |
| --- | --- | --- | --- |
| Log-Pearson III | Media log10=2; desviación=0.2; asimetría=0.1; T=100 años | 301.9404363169 m³/s | Relativa 1e-10 |
| Log-Pearson III, asimetría negativa | Mismas entradas, asimetría=-0.1 | 282.1729825990 m³/s | Relativa 1e-10 |
| Profundidad crítica circular | D=1 m; Q=0.5 m³/s | 0.3988412681459 m | Absoluta 1e-5 m |
| Control de entrada, hormigón | D=1 m; Q=0.5 m³/s; pendiente=0.005; borde recto con muro de cabecera | HW=0.558570530414334 m | Absoluta 1e-5 m |
| Control de salida, cajón | Ancho=2 m; alto=1 m; Q=2 m³/s; n=0.013; L=10 m; pendiente=0.005; TW=0 | Balance de energía independiente con A=2 m² y perímetro=6 m | Absoluta 1e-8 m |
| Anclaje PMD | Buenos Aires; T=2, 5, 10, 25, 50 y 100 años; duración=1440 min | `24 × intensidad = PMD(T)` | 0.120001 mm, por redondeo a 0.01 mm/h |
| SCS tipo II | Horas 6, 11, 12, 13 y 18 de una tormenta de 24 h | Fracciones 0.080, 0.235, 0.663, 0.772 y 0.921 | Absoluta 1e-12 |
| Tabla INA Salta | T=5 años; duraciones 120, 180 y 360 min | 31.7, 23.6 y 13.7 mm/h | Coincidencia exacta con las celdas publicadas |
| Conservación SCS | A=1 km²; CN=75 y 100; integración trapezoidal del hidrograma | `volumen = lluvia efectiva × A × 1000` | Relativa 5e-4 o absoluta 0.1 m³ |
| Conservación de hietogramas | Duración=90 min; paso=15 min; pico relativo 0.43 y 0.67; cuatro métodos | Suma de bloques igual a intensidad IDF × duración | Absoluta 0.001 mm |
| Balance Muskingum | K=2 h; X=0.2; pasos 0.8, 1 y 3.2 h | `Vin - Vout = Sfinal - Sinicial` | Absoluta 1e-8 m³ |
| GIS | DEM sintético geográfico y enlaces proyectados con salida en el borde | Longitud calculada en unidades métricas y salida sin fallo de índices | Tolerancias explícitas en `test_watershed_metrics.py` |

Los valores de Log-Pearson fijados usan la definición de `scipy.stats.pearson3`;
los casos especiales ±2 aportan una comparación analítica independiente. Los
casos HDS-5 comprueban las ecuaciones y sus unidades, no una modelación hidráulica
completa de cada obra.

## Pantalla, informes e integración

- La respuesta conserva las entradas completas, la duración solicitada y la
  utilizada, la fórmula Tc adoptada, el modelo IDF, su fuente y una huella SHA-256
  de los datos usados.
- PDF, Word y Excel recalculan desde esas entradas antes de exportar e incluyen
  un anexo de trazabilidad. Los registros antiguos sin entradas completas quedan
  identificados como no reproducibles; se exige recalcular antes de diseñar.
- Los nombres de descarga usan un encabezado ASCII y un nombre UTF-8 codificado,
  compatible con proyectos que contienen tildes.
- Cambiar un paso del proyecto invalida los resultados de los pasos posteriores.
  El informe consolidado rechaza un caudal anterior que ya no coincide con el
  cálculo reproducido.
- El caudal aislado no determina el riesgo. La etiqueta pasa a **no evaluado**:
  faltan capacidad de la obra, exposición y consecuencias.
- Se muestra la fórmula Tc realmente adoptada y se conservan las advertencias de
  extrapolación, hipótesis y aplicabilidad. Las estaciones requeridas pueden
  seleccionarse en calculadora, hietograma y proyecto.

## Límites que siguen vigentes

1. La estimación PMD disponible es aproximada y no tiene procedencia verificada
   por ciudad. Equiparar la PMD diaria con una profundidad móvil de 24 horas es
   una hipótesis explícita pendiente de validación local.
2. El hidrograma SCS implementado representa un único pulso de lluvia efectiva;
   no realiza la convolución del hietograma completo. La distribución SCS tipo II
   es estadounidense y de 24 horas; su uso local y su reescalado requieren
   justificación. Usar abstracción inicial 0.05S requiere calibración consistente
   con los CN elegidos.
3. Alcantarillas es un predimensionamiento HDS-5. La transición entre entrada no
   sumergida y sumergida se aproxima por interpolación. Para cargas bajas de
   salida debe comprobarse el perfil de flujo parcialmente lleno. Geometrías sin
   coeficientes verificables no se ofrecen; las analogías de material y las
   geometrías asumidas se declaran.
4. La pendiente media de terreno obtenida del DEM no sustituye una pendiente de
   cauce levantada. La descarga actual de DEM usa coordenadas geográficas SRTM;
   las pruebas de enlaces proyectados verifican la función métrica, no un flujo
   completo de importación de cualquier CRS.
5. El ajuste Log-Pearson III no implementa todos los procedimientos del Bulletin
   17C, como información histórica, datos censurados o ponderación regional de
   asimetría. No debe presentarse como cumplimiento completo de esa norma.
6. Compilación, pruebas automatizadas y revisión visual de exportaciones no
   sustituyen una prueba con el usuario ni la validación con observaciones locales.
   La optimización del tamaño del bundle, la auditoría completa de accesibilidad
   y la calibración de modelos quedan como trabajos posteriores.

## Cómo reproducir la verificación

Resultado local del 11 de octubre de 2026: **405 pruebas de backend y 108 de
frontend aprobadas**; lint y compilación de producción aprobados, con Python
3.12 y Node.js 24. La CI usa Python 3.11 y Node.js 24. Persisten un aviso de
deprecación de `pysheds` y avisos de tamaño del bundle y antigüedad de Browserslist;
no se presentan como errores de cálculo corregidos.

```bash
cd backend
python -m pip install -r requirements-ci.txt
NUMBA_NUM_THREADS=2 OMP_NUM_THREADS=2 python -m pytest tests/ -q
```

```bash
cd frontend
npm ci
npm run test:run -- --maxWorkers=2 --no-file-parallelism
npm run lint
npm run build
```

Archivos de regresión: `test_scientific_audit_regressions.py`,
`test_watershed_metrics.py`, `test_traceable_exports.py` y
`frontend/src/hooks/__tests__/useProyecto.test.ts`. La CI ejecuta las suites,
TypeScript, lint y compilación. Los límites de hilos evitan agotar los recursos
nativos de Numba en entornos con muchos núcleos.

La primera ejecución de CI detectó que `pysheds` 0.5 usa `np.in1d`, ausente en
NumPy 2.4.6. Producción y CI limitan NumPy a versiones anteriores a 2.4; la suite
local fue ejecutada con 2.3.5. Se conserva esta restricción hasta actualizar y
validar el motor GIS con una versión compatible.

## Fuentes primarias

- [FHWA, HDS-5, tercera edición (2012)](https://www.fhwa.dot.gov/engineering/hydraulics/pubs/12026/hif12026.pdf): apéndice A, tabla A.1, factor de unidades SI; sección 3.1.3 para los límites del control de salida; tabla C.2 para pérdidas de entrada.
- [SciPy: distribución Pearson III](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.pearson3.html): parametrización estandarizada y cuantil.
- [NRCS, NEH 630, capítulo 4, Storm Rainfall Depth and Distribution](https://directives.nrcs.usda.gov/sites/default/files2/1720460743/Chapter%204%20-%20Storm%20Rainfall%20Depth%20and%20Distribution.pdf): figura 4-36, tabla horaria de distribución tipo II.
- [INA-CIRSA: ficha IDF Salta](https://www.ina.gov.ar/cirsa/pdf/idF-Salta.pdf): tabla publicada de intensidades.
- [TxDOT Hydraulic Design Manual: NRCS Dimensionless Unit Hydrograph](https://www.txdot.gov/manuals/des/hyd/chapter-4--hydrology/section-13--hydrograph-method/nrcs-dimensionless-unit-hydrograph.html): tabla 4-29, ordenadas del hidrograma.
- [USACE HEC-HMS: SCS Unit Hydrograph Model](https://www.hec.usace.army.mil/confluence/hmsdocs/hmstrm/transform/scs-unit-hydrograph-model): hipótesis de transformación y calibración del factor de pico.
