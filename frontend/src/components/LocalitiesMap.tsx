import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import { DEFAULT_FORM } from '../types';
import 'leaflet/dist/leaflet.css';
import type { LatLngBoundsExpression } from 'leaflet';

interface LocalityPoint {
  id: string;
  name: string;
  province: string;
  lat: number;
  lng: number;
  tr_max: number;
  series: string;
  series_length_years: number | null; // null = multiple stations
}

const LOCALITY_POINTS: LocalityPoint[] = [
  // Chaco
  { id: 'amgr', name: 'Área Metropolitana Gran Resistencia', province: 'Chaco',
    lat: -27.4515, lng: -58.9867, tr_max: 50, series: '60 años', series_length_years: 60 },
  { id: 'pr_saenz_pena', name: 'Presidencia Roque Sáenz Peña', province: 'Chaco',
    lat: -26.7883, lng: -60.4399, tr_max: 25, series: '31 años', series_length_years: 31 },
  // Formosa
  { id: 'el_colorado', name: 'El Colorado', province: 'Formosa',
    lat: -26.3167, lng: -59.3667, tr_max: 25, series: '7 años', series_length_years: 7 },
  // Mendoza
  { id: 'mendoza_pedemonte', name: 'Pedemonte del Gran Mendoza', province: 'Mendoza',
    lat: -32.8908, lng: -68.8272, tr_max: 25, series: '13 años', series_length_years: 13 },
  // Neuquén
  { id: 'neuquen_aluvional', name: 'Zona Aluvional de Neuquén', province: 'Neuquén',
    lat: -38.9516, lng: -68.0591, tr_max: 100, series: 'Múltiples estaciones', series_length_years: null },
  // Entre Ríos
  { id: 'entre_rios_concordia', name: 'Concordia', province: 'Entre Ríos',
    lat: -31.3932, lng: -58.0201, tr_max: 50, series: '43 años', series_length_years: 43 },
  { id: 'entre_rios_concepcion_uruguay', name: 'Concepción del Uruguay', province: 'Entre Ríos',
    lat: -32.4825, lng: -58.2373, tr_max: 50, series: '25 años', series_length_years: 25 },
  { id: 'entre_rios_parana', name: 'Paraná', province: 'Entre Ríos',
    lat: -31.7333, lng: -60.5333, tr_max: 50, series: '42 años', series_length_years: 42 },
  // Santa Fe
  { id: 'santa_fe_cim_fich', name: 'Santa Fe (CIM-FICH)', province: 'Santa Fe',
    lat: -31.6333, lng: -60.7000, tr_max: 25, series: '31 años', series_length_years: 31 },
  // Buenos Aires
  { id: 'buenos_aires_azul', name: 'Azul y aledaños', province: 'Buenos Aires',
    lat: -36.7833, lng: -59.8500, tr_max: 50, series: '8 años', series_length_years: 8 },
  { id: 'buenos_aires_balcarce', name: 'Balcarce', province: 'Buenos Aires',
    lat: -37.8500, lng: -58.2500, tr_max: 100, series: '23 años', series_length_years: 23 },
  // Córdoba
  { id: 'cordoba_observatorio', name: 'Córdoba — Observatorio', province: 'Córdoba',
    lat: -31.4201, lng: -64.1888, tr_max: 50, series: '82 años', series_length_years: 82 },
  { id: 'cordoba_la_suela', name: 'La Suela (Sierras)', province: 'Córdoba',
    lat: -31.6422, lng: -64.5903, tr_max: 50, series: '49 años', series_length_years: 49 },
  { id: 'cordoba_pampa_olaen', name: 'Pampa de Olaen', province: 'Córdoba',
    lat: -31.1908, lng: -64.6072, tr_max: 50, series: '27 años', series_length_years: 27 },
  { id: 'cordoba_altas_cumbres', name: 'Altas Cumbres (La Posta)', province: 'Córdoba',
    lat: -31.6064, lng: -64.8839, tr_max: 50, series: '28 años', series_length_years: 28 },
  // Salta
  { id: 'salta_capital', name: 'Salta Capital', province: 'Salta',
    lat: -24.7859, lng: -65.4117, tr_max: 25, series: '23 años', series_length_years: 23 },
  // Tucumán
  { id: 'tucuman_estaciones', name: 'Tucumán — Red provincial', province: 'Tucumán',
    lat: -26.8083, lng: -65.2176, tr_max: 25, series: '15 años', series_length_years: 15 },
  // Catamarca
  { id: 'catamarca_el_rodeo', name: 'El Rodeo — Catamarca', province: 'Catamarca',
    lat: -28.2167, lng: -65.8833, tr_max: 200, series: '37 años', series_length_years: 37 },
];

const ARGENTINA_BOUNDS: LatLngBoundsExpression = [[-55, -74], [-21, -53]];

// Color by series length
function pinColor(years: number | null): string {
  if (years === null || years > 30) return '#22c55e'; // green — long / multiple stations
  if (years >= 15) return '#eab308';                  // yellow — medium
  return '#f97316';                                    // orange — short
}

// Popup with navigate button — react-leaflet v5 uses portals so Router context is available
function LocalityPopupContent({ locality }: { locality: LocalityPoint }) {
  const navigate = useNavigate();
  return (
    <div style={{ minWidth: 170, fontFamily: 'inherit' }}>
      <p style={{ fontWeight: 700, fontSize: 13, margin: '0 0 2px', color: '#111827' }}>
        {locality.name}
      </p>
      <p style={{ fontSize: 11, color: '#6b7280', margin: '0 0 8px' }}>{locality.province}</p>
      <div style={{ fontSize: 11, color: '#374151', lineHeight: 1.6, marginBottom: 10 }}>
        <div>TR máx. confiable: <strong>{locality.tr_max} años</strong></div>
        <div>Serie: {locality.series}</div>
      </div>
      <button
        onClick={() =>
          navigate('/calculator', {
            state: {
              caseStudyData: { ...DEFAULT_FORM, locality_id: locality.id },
              caseStudyName: locality.name,
            },
          })
        }
        style={{
          display: 'block',
          width: '100%',
          background: '#2563eb',
          color: 'white',
          border: 'none',
          borderRadius: 6,
          padding: '6px 10px',
          fontSize: 11,
          fontWeight: 600,
          cursor: 'pointer',
          textAlign: 'center',
        }}
      >
        Calcular para esta localidad →
      </button>
    </div>
  );
}

export function LocalitiesMap() {
  return (
    <div className="relative rounded-xl overflow-hidden border border-gray-800" style={{ height: 480 }}>
      <MapContainer
        bounds={ARGENTINA_BOUNDS}
        style={{ height: '100%', width: '100%', background: '#1a1a2e' }}
        zoomControl
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
          subdomains="abcd"
          maxZoom={19}
        />

        {LOCALITY_POINTS.map((loc) => {
          const color = pinColor(loc.series_length_years);
          return (
            <CircleMarker
              key={loc.id}
              center={[loc.lat, loc.lng]}
              radius={8}
              pathOptions={{
                color: '#fff',
                weight: 1.5,
                fillColor: color,
                fillOpacity: 0.85,
              }}
            >
              <Tooltip direction="top" offset={[0, -8]}>
                <span style={{ fontWeight: 600, fontSize: 12 }}>{loc.name}</span>
                <br />
                <span style={{ fontSize: 11, color: '#6b7280' }}>{loc.province}</span>
              </Tooltip>
              <Popup>
                <LocalityPopupContent locality={loc} />
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Legend */}
      <div
        className="absolute bottom-4 right-4 z-[1000] bg-gray-900/90 backdrop-blur-sm rounded-lg px-3 py-2.5 border border-white/10"
        style={{ pointerEvents: 'none' }}
      >
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
          Serie de datos
        </p>
        {[
          { color: '#22c55e', label: '> 30 años' },
          { color: '#eab308', label: '15 – 30 años' },
          { color: '#f97316', label: '< 15 años' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5 mb-1">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full border border-white/30 shrink-0"
              style={{ background: color }}
            />
            <span className="text-[11px] text-gray-300">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
