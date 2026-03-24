import { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw'; // provides L.GeometryUtil.geodesicArea

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

type DrawMode = 'idle' | 'drawing' | 'done';

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

// ── BasinMap ───────────────────────────────────────────────────────────────

interface Props {
  onUseData: (data: BasinData) => void;
}

export function BasinMap({ onUseData }: Props) {
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

  return (
    <div className="space-y-3">
      {/* Polygon toolbar */}
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
          <DrawController
            mode={drawMode}
            vertices={vertices}
            onAddVertex={handleAddVertex}
            onClose={handleClose}
            onVertexDrag={handleVertexDrag}
          />
        </MapContainer>
      </div>

      {/* Result / instruction panel */}
      <div className="rounded-lg border p-3 bg-blue-50 border-blue-200">
        {polyArea !== null && polyArea > 0 ? (
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
        ) : (
          <p className="text-sm text-blue-700">
            {drawMode === 'idle' && 'Hace clic en "Iniciar dibujo" para delinear la cuenca y calcular el area.'}
            {drawMode === 'drawing' && vertices.length === 0 && 'Hace clic en el mapa para agregar el primer vertice.'}
            {drawMode === 'drawing' && vertices.length > 0 && vertices.length < 3 &&
              `Agrega ${3 - vertices.length} vertice${3 - vertices.length > 1 ? 's' : ''} mas para poder finalizar.`}
            {drawMode === 'drawing' && vertices.length >= 3 &&
              'Doble clic, clic en el primer vertice (rojo) o "Finalizar" para cerrar el poligono.'}
          </p>
        )}
      </div>

      {/* Coming soon notice */}
      <p className="text-xs text-gray-400 text-center">
        Delimitacion automatica con DEM: Proximamente
      </p>
    </div>
  );
}
