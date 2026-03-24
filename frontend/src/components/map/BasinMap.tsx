import { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw'; // provides L.GeometryUtil.geodesicArea
import { delineateWatershed, type WatershedResult } from '../../services/api';

// Fix Leaflet default marker icons for Vite bundler
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ── Shared types ───────────────────────────────────────────────────────────

export interface BasinData {
  area_km2: number;
  slope?: number;
  length_km?: number;
}

type MapInputMode = 'polygon' | 'auto';
type DrawMode = 'idle' | 'drawing' | 'done';
type AutoMode = 'waiting' | 'loading' | 'done' | 'error';

function geodesicAreaKm2(latlngs: L.LatLng[]): number {
  return L.GeometryUtil.geodesicArea(latlngs) / 1_000_000;
}

// ── Polygon DrawController ─────────────────────────────────────────────────

interface DrawControllerProps {
  mode: DrawMode;
  vertices: L.LatLng[];
  onAddVertex: (ll: L.LatLng) => void;
  onClose: () => void;
  onVertexDrag: (index: number, ll: L.LatLng) => void;
}

function DrawController({ mode, vertices, onAddVertex, onClose, onVertexDrag }: DrawControllerProps) {
  const map = useMap();
  const layerGroup = useRef(new L.LayerGroup());
  const guideLineRef = useRef<L.Polyline | null>(null);

  const modeRef = useRef(mode);
  const vertsRef = useRef(vertices);
  const onAddRef = useRef(onAddVertex);
  const onCloseRef = useRef(onClose);
  const onDragRef = useRef(onVertexDrag);
  modeRef.current = mode;
  vertsRef.current = vertices;
  onAddRef.current = onAddVertex;
  onCloseRef.current = onClose;
  onDragRef.current = onVertexDrag;

  useEffect(() => {
    const lg = layerGroup.current;
    map.addLayer(lg);
    return () => { map.removeLayer(lg); };
  }, [map]);

  useEffect(() => {
    const container = map.getContainer();
    if (mode === 'drawing') {
      map.doubleClickZoom.disable();
      container.style.cursor = 'crosshair';
    } else {
      map.doubleClickZoom.enable();
      container.style.cursor = '';
    }
  }, [mode, map]);

  const lastClickRef = useRef(0);

  useMapEvents({
    click(e) {
      if (modeRef.current !== 'drawing') return;
      const now = Date.now();
      if (now - lastClickRef.current < 300) { lastClickRef.current = 0; return; }
      lastClickRef.current = now;
      const verts = vertsRef.current;
      if (verts.length >= 3) {
        const p1 = map.latLngToContainerPoint(verts[0]);
        const p2 = map.latLngToContainerPoint(e.latlng);
        if (p1.distanceTo(p2) < 15) { onCloseRef.current(); return; }
      }
      onAddRef.current(e.latlng);
    },
    dblclick() {
      if (modeRef.current !== 'drawing') return;
      lastClickRef.current = 0;
      if (vertsRef.current.length >= 3) onCloseRef.current();
    },
    mousemove(e) {
      if (modeRef.current !== 'drawing' || vertsRef.current.length === 0) return;
      if (guideLineRef.current) {
        const last = vertsRef.current[vertsRef.current.length - 1];
        guideLineRef.current.setLatLngs([last, e.latlng]);
      }
    },
  });

  useEffect(() => {
    const lg = layerGroup.current;
    lg.clearLayers();
    guideLineRef.current = null;

    if (mode === 'drawing') {
      if (vertices.length >= 2)
        lg.addLayer(L.polyline(vertices, { color: '#1d4ed8', weight: 2.5, interactive: false }));

      if (vertices.length >= 1) {
        const last = vertices[vertices.length - 1];
        const guide = L.polyline([last, last], {
          color: '#1d4ed8', weight: 1.5, dashArray: '6 5', opacity: 0.75, interactive: false,
        });
        lg.addLayer(guide);
        guideLineRef.current = guide;
      }

      vertices.forEach((v, i) => {
        const isFirst = i === 0;
        lg.addLayer(L.circleMarker(v, {
          radius: isFirst ? 8 : 5,
          color: isFirst ? '#dc2626' : '#1d4ed8',
          fillColor: isFirst ? '#ef4444' : '#3b82f6',
          fillOpacity: 1, weight: 2, interactive: false,
        }));
      });
    } else if (mode === 'done') {
      lg.addLayer(L.polygon(vertices, {
        color: '#1d4ed8', fillColor: '#3b82f6', fillOpacity: 0.3, weight: 2.5, interactive: false,
      }));
      vertices.forEach((v, i) => {
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:12px;height:12px;background:#1d4ed8;border:2px solid white;border-radius:50%;cursor:move;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
          iconSize: [12, 12], iconAnchor: [6, 6],
        });
        const m = L.marker(v, { icon, draggable: true });
        m.on('drag', () => onDragRef.current(i, m.getLatLng()));
        lg.addLayer(m);
      });
    }
  }, [mode, vertices]);

  return null;
}

// ── Auto-delineation controller ────────────────────────────────────────────

interface AutoControllerProps {
  autoMode: AutoMode;
  pourPoint: L.LatLng | null;
  watershed: WatershedResult | null;
  onPourPoint: (ll: L.LatLng) => void;
}

function AutoController({ autoMode, pourPoint, watershed, onPourPoint }: AutoControllerProps) {
  const map = useMap();
  const lg = useRef(new L.LayerGroup());
  const autoModeRef = useRef(autoMode);
  const onPourRef = useRef(onPourPoint);
  autoModeRef.current = autoMode;
  onPourRef.current = onPourPoint;

  useEffect(() => {
    map.addLayer(lg.current);
    return () => { map.removeLayer(lg.current); };
  }, [map]);

  useEffect(() => {
    const container = map.getContainer();
    if (autoMode === 'waiting') {
      map.doubleClickZoom.disable();
      container.style.cursor = 'crosshair';
    } else {
      map.doubleClickZoom.enable();
      container.style.cursor = '';
    }
  }, [autoMode, map]);

  useMapEvents({
    click(e) {
      if (autoModeRef.current !== 'waiting') return;
      onPourRef.current(e.latlng);
    },
  });

  // Rebuild layers
  useEffect(() => {
    const g = lg.current;
    g.clearLayers();

    // Pour point marker
    if (pourPoint) {
      const icon = L.divIcon({
        className: '',
        html: `<div style="
          width:16px;height:16px;
          background:#7c3aed;
          border:3px solid white;
          border-radius:50%;
          box-shadow:0 2px 6px rgba(0,0,0,.5);
        "></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      g.addLayer(L.marker(pourPoint, { icon, interactive: false }));
    }

    // Watershed polygon (after API returns)
    if (watershed) {
      const coords = (watershed.geojson as any).coordinates;
      const type = (watershed.geojson as any).type;

      function toLatLngs(ring: number[][]): L.LatLng[] {
        return ring.map(([lon, lat]) => L.latLng(lat, lon));
      }

      let poly: L.Polygon | null = null;
      if (type === 'Polygon') {
        poly = L.polygon(coords.map(toLatLngs), {
          color: '#7c3aed', fillColor: '#8b5cf6', fillOpacity: 0.25, weight: 2.5,
        });
      } else if (type === 'MultiPolygon') {
        poly = L.polygon(
          coords.map((p: number[][][]) => p.map(toLatLngs)),
          { color: '#7c3aed', fillColor: '#8b5cf6', fillOpacity: 0.25, weight: 2.5 },
        );
      }

      if (poly) {
        g.addLayer(poly);
        map.fitBounds(poly.getBounds(), { padding: [30, 30] });
      }
    }
  }, [pourPoint, watershed, map]);

  return null;
}

// ── BasinMap ───────────────────────────────────────────────────────────────

interface Props {
  onUseData: (data: BasinData) => void;
}

export function BasinMap({ onUseData }: Props) {
  // Which input tool is active
  const [inputMode, setInputMode] = useState<MapInputMode>('polygon');

  // ── Polygon mode state ────────────────────────────────────────────────────
  const [drawMode, setDrawMode] = useState<DrawMode>('idle');
  const [vertices, setVertices] = useState<L.LatLng[]>([]);
  const [polyArea, setPolyArea] = useState<number | null>(null);

  const handleAddVertex = useCallback((ll: L.LatLng) => setVertices(p => [...p, ll]), []);

  const handleClose = useCallback(() => {
    setVertices(prev => {
      if (prev.length >= 3) setPolyArea(geodesicAreaKm2(prev));
      return prev;
    });
    setDrawMode('done');
  }, []);

  const handleVertexDrag = useCallback((i: number, ll: L.LatLng) => {
    setVertices(prev => {
      const next = [...prev];
      next[i] = ll;
      if (next.length >= 3) setPolyArea(geodesicAreaKm2(next));
      return next;
    });
  }, []);

  const handlePolyClear = useCallback(() => {
    setDrawMode('idle'); setVertices([]); setPolyArea(null);
  }, []);

  const handleFinalize = useCallback(() => {
    if (vertices.length >= 3) handleClose();
  }, [vertices.length, handleClose]);

  // ── Auto-delineation mode state ───────────────────────────────────────────
  const [autoMode, setAutoMode] = useState<AutoMode>('waiting');
  const [pourPoint, setPourPoint] = useState<L.LatLng | null>(null);
  const [watershed, setWatershed] = useState<WatershedResult | null>(null);
  const [autoError, setAutoError] = useState<string | null>(null);

  const handlePourPoint = useCallback(async (ll: L.LatLng) => {
    setPourPoint(ll);
    setAutoMode('loading');
    setWatershed(null);
    setAutoError(null);
    try {
      const result = await delineateWatershed(ll.lat, ll.lng);
      setWatershed(result);
      setAutoMode('done');
    } catch (err) {
      setAutoError(err instanceof Error ? err.message : 'Error desconocido');
      setAutoMode('error');
    }
  }, []);

  const handleAutoClear = useCallback(() => {
    setAutoMode('waiting');
    setPourPoint(null);
    setWatershed(null);
    setAutoError(null);
  }, []);

  // Switch modes resets both
  const switchMode = (m: MapInputMode) => {
    setInputMode(m);
    handlePolyClear();
    handleAutoClear();
  };

  // ── Result panel ──────────────────────────────────────────────────────────

  const resultPanel = (() => {
    if (inputMode === 'polygon') {
      if (polyArea !== null && polyArea > 0) {
        return (
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-blue-800 font-medium">
              Area calculada: <strong>{polyArea.toFixed(4)} km²</strong>
            </p>
            <button
              type="button"
              onClick={() => onUseData({ area_km2: polyArea })}
              className="px-4 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              Usar esta area
            </button>
          </div>
        );
      }
      return (
        <p className="text-sm text-blue-700">
          {drawMode === 'idle' && 'Hace clic en "Iniciar dibujo" para delinear la cuenca y calcular el area.'}
          {drawMode === 'drawing' && vertices.length === 0 && 'Hace clic en el mapa para agregar el primer vertice.'}
          {drawMode === 'drawing' && vertices.length > 0 && vertices.length < 3 &&
            `Agrega ${3 - vertices.length} vertice${3 - vertices.length > 1 ? 's' : ''} mas para poder finalizar.`}
          {drawMode === 'drawing' && vertices.length >= 3 &&
            'Doble clic, clic en el primer vertice (rojo) o "Finalizar" para cerrar el poligono.'}
        </p>
      );
    }

    // Auto mode
    if (autoMode === 'waiting') {
      return (
        <p className="text-sm text-violet-700">
          Hace clic en el punto de cierre de la cuenca (punto mas bajo del cauce principal).
        </p>
      );
    }
    if (autoMode === 'loading') {
      return (
        <div className="flex items-center gap-2 text-sm text-violet-700">
          <svg className="animate-spin w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <span>Delimitando cuenca... Esto puede tardar unos segundos.</span>
        </div>
      );
    }
    if (autoMode === 'error') {
      return (
        <div className="space-y-2">
          <p className="text-sm text-red-700">{autoError}</p>
          <button
            type="button"
            onClick={handleAutoClear}
            className="text-xs text-violet-700 underline"
          >
            Intentar con otro punto
          </button>
        </div>
      );
    }
    if (autoMode === 'done' && watershed) {
      return (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-violet-800">Cuenca delimitada exitosamente</p>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="bg-white rounded-lg border border-violet-200 p-2 text-center">
              <p className="text-xs text-gray-500 mb-0.5">Area</p>
              <p className="font-bold text-violet-800">{watershed.area_km2.toFixed(3)}</p>
              <p className="text-xs text-gray-400">km²</p>
            </div>
            <div className="bg-white rounded-lg border border-violet-200 p-2 text-center">
              <p className="text-xs text-gray-500 mb-0.5">Pendiente</p>
              <p className="font-bold text-violet-800">{watershed.slope.toFixed(4)}</p>
              <p className="text-xs text-gray-400">m/m</p>
            </div>
            <div className="bg-white rounded-lg border border-violet-200 p-2 text-center">
              <p className="text-xs text-gray-500 mb-0.5">Longitud</p>
              <p className="font-bold text-violet-800">{watershed.length_km.toFixed(2)}</p>
              <p className="text-xs text-gray-400">km</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() =>
                onUseData({
                  area_km2: watershed.area_km2,
                  slope: watershed.slope,
                  length_km: watershed.length_km,
                })
              }
              className="px-4 py-1.5 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700 transition-colors"
            >
              Usar estos datos
            </button>
            <button
              type="button"
              onClick={handleAutoClear}
              className="px-4 py-1.5 bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-300 transition-colors"
            >
              Limpiar
            </button>
          </div>
        </div>
      );
    }
    return null;
  })();

  const resultBg =
    inputMode === 'auto'
      ? 'bg-violet-50 border-violet-200'
      : 'bg-blue-50 border-blue-200';

  return (
    <div className="space-y-3">
      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => switchMode('polygon')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            inputMode === 'polygon'
              ? 'bg-blue-600 text-white'
              : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
        >
          Dibujar poligono
        </button>
        <button
          type="button"
          onClick={() => switchMode('auto')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
            inputMode === 'auto'
              ? 'bg-violet-600 text-white'
              : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
            <circle cx="12" cy="9" r="2.5"/>
          </svg>
          Delimitar automaticamente
        </button>
      </div>

      {/* Polygon toolbar (only when in polygon mode) */}
      {inputMode === 'polygon' && (
        <div className="flex items-center justify-between gap-2 flex-wrap min-h-[36px]">
          {drawMode === 'idle' && (
            <button
              type="button"
              onClick={() => setDrawMode('drawing')}
              className="px-4 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              Iniciar dibujo
            </button>
          )}
          {drawMode === 'drawing' && (
            <>
              <span className="text-sm text-gray-600">
                Vertices: <strong>{vertices.length}</strong>
                {vertices.length < 3 && <span className="text-gray-400 font-normal"> (minimo 3)</span>}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleFinalize}
                  disabled={vertices.length < 3}
                  className="px-4 py-1.5 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Finalizar
                </button>
                <button
                  type="button"
                  onClick={handlePolyClear}
                  className="px-4 py-1.5 bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Limpiar
                </button>
              </div>
            </>
          )}
          {drawMode === 'done' && (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-gray-600">
                Poligono cerrado &middot; <strong>{vertices.length} vertices</strong>
              </span>
              <button
                type="button"
                onClick={handlePolyClear}
                className="px-4 py-1.5 bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-300 transition-colors"
              >
                Limpiar
              </button>
            </div>
          )}
        </div>
      )}

      {/* Map */}
      <div style={{ height: '420px' }} className="rounded-lg overflow-hidden border border-gray-300 shadow-sm">
        <MapContainer
          center={[-34.6, -58.4]}
          zoom={5}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom
          doubleClickZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {inputMode === 'polygon' && (
            <DrawController
              mode={drawMode}
              vertices={vertices}
              onAddVertex={handleAddVertex}
              onClose={handleClose}
              onVertexDrag={handleVertexDrag}
            />
          )}
          {inputMode === 'auto' && (
            <AutoController
              autoMode={autoMode}
              pourPoint={pourPoint}
              watershed={watershed}
              onPourPoint={handlePourPoint}
            />
          )}
        </MapContainer>
      </div>

      {/* Result / instruction panel */}
      <div className={`rounded-lg border p-3 ${resultBg}`}>
        {resultPanel}
      </div>
    </div>
  );
}
