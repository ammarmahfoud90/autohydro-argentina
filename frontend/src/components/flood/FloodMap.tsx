import { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ── Flood depth colour palette ────────────────────────────────────────────────
export const FLOOD_COLORS = [
  { max: 0.3,         color: '#87CEEB', label: '0–0.3 m' },
  { max: 1.0,         color: '#4169E1', label: '0.3–1.0 m' },
  { max: 2.0,         color: '#00008B', label: '1.0–2.0 m' },
  { max: Infinity,    color: '#4B0082', label: '> 2.0 m' },
];

function depthColor(depth: number): string {
  return FLOOD_COLORS.find(z => depth <= z.max)?.color ?? '#4B0082';
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface FloodLayerProps {
  polygon: object | null;  // GeoJSON Feature
  maxDepth: number;
}

function FloodLayer({ polygon, maxDepth }: FloodLayerProps) {
  const map = useMap();
  const layerRef = useRef<L.GeoJSON | null>(null);

  useEffect(() => {
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }
    if (!polygon) return;

    const color = depthColor(maxDepth);
    const layer = L.geoJSON(polygon as GeoJSON.Feature, {
      style: {
        color,
        fillColor: color,
        fillOpacity: 0.45,
        weight: 2,
        opacity: 0.9,
      },
    });
    layer.addTo(map);
    layerRef.current = layer;

    // Fit map to flood extent
    const bounds = layer.getBounds();
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40] });

    return () => {
      map.removeLayer(layer);
    };
  }, [map, polygon, maxDepth]);

  return null;
}

interface CenterPickerProps {
  picking: boolean;
  center: [number, number] | null;
  onPick: (ll: [number, number]) => void;
}

function CenterPicker({ picking, center, onPick }: CenterPickerProps) {
  const map = useMap();
  const markerRef = useRef<L.CircleMarker | null>(null);

  const pickingRef = useRef(picking);
  pickingRef.current = picking;
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  useEffect(() => {
    const container = map.getContainer();
    container.style.cursor = picking ? 'crosshair' : '';
  }, [picking, map]);

  useMapEvents({
    click(e) {
      if (!pickingRef.current) return;
      onPickRef.current([e.latlng.lat, e.latlng.lng]);
    },
  });

  useEffect(() => {
    if (markerRef.current) {
      map.removeLayer(markerRef.current);
      markerRef.current = null;
    }
    if (!center) return;
    const m = L.circleMarker(center, {
      radius: 7,
      color: '#dc2626',
      fillColor: '#ef4444',
      fillOpacity: 1,
      weight: 2,
    }).addTo(map);
    m.bindTooltip('Centro del tramo', { permanent: false });
    markerRef.current = m;
    return () => { map.removeLayer(m); };
  }, [map, center]);

  return null;
}

// ── Depth Legend ─────────────────────────────────────────────────────────────

function DepthLegend() {
  return (
    <div className="absolute bottom-6 left-3 z-[900] bg-white/95 border border-gray-300 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-bold text-gray-700 mb-1.5">Profundidad de inundación</p>
      {FLOOD_COLORS.map(z => (
        <div key={z.label} className="flex items-center gap-2 mb-1">
          <span
            className="inline-block w-4 h-3 rounded-sm border border-black/10"
            style={{ background: z.color }}
          />
          <span className="text-gray-600">{z.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Public component ──────────────────────────────────────────────────────────

interface FloodMapProps {
  floodPolygon: object | null;
  maxDepth: number;
  center: [number, number] | null;
  picking: boolean;
  onPickCenter: (ll: [number, number]) => void;
}

export function FloodMap({
  floodPolygon,
  maxDepth,
  center,
  picking,
  onPickCenter,
}: FloodMapProps) {
  const [, forceUpdate] = useState(0);
  const handlePick = useCallback((ll: [number, number]) => {
    onPickCenter(ll);
    forceUpdate(n => n + 1);
  }, [onPickCenter]);

  return (
    <div className="relative" style={{ height: '400px' }}>
      <MapContainer
        center={center ?? [-34.6, -65.0]}
        zoom={center ? 13 : 5}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
        className="rounded-lg overflow-hidden border border-gray-300"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FloodLayer polygon={floodPolygon} maxDepth={maxDepth} />
        <CenterPicker picking={picking} center={center} onPick={handlePick} />
      </MapContainer>

      {/* Legend — always shown */}
      <DepthLegend />

      {/* Pick hint */}
      {picking && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow pointer-events-none">
          Hacé clic en el mapa para marcar el centro del tramo
        </div>
      )}
    </div>
  );
}
