import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';

// Fix Leaflet default marker icons for Vite bundler
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ── DrawControl ───────────────────────────────────────────────────────────────
// Must be rendered inside MapContainer to access the map context via useMap().

interface DrawControlProps {
  onAreaCalculated: (km2: number) => void;
}

function DrawControl({ onAreaCalculated }: DrawControlProps) {
  const map = useMap();
  const drawnItems = useRef<L.FeatureGroup>(new L.FeatureGroup());
  // Use a ref so the event handlers always call the latest callback
  // without needing to re-register them on every render.
  const onAreaRef = useRef(onAreaCalculated);
  onAreaRef.current = onAreaCalculated;

  useEffect(() => {
    const items = drawnItems.current;
    map.addLayer(items);

    // ── Spanish labels ──────────────────────────────────────────────────────
    L.drawLocal.draw.toolbar.buttons.polygon = 'Dibujar polígono';
    L.drawLocal.draw.toolbar.actions.text = 'Cancelar';
    L.drawLocal.draw.toolbar.actions.title = 'Cancelar dibujo';
    L.drawLocal.draw.toolbar.finish.text = 'Finalizar';
    L.drawLocal.draw.toolbar.finish.title = 'Finalizar dibujo';
    L.drawLocal.draw.toolbar.undo.text = 'Borrar último punto';
    L.drawLocal.draw.toolbar.undo.title = 'Borrar el último punto dibujado';
    L.drawLocal.draw.handlers.polygon.tooltip.start =
      'Clic para comenzar a dibujar la cuenca.';
    L.drawLocal.draw.handlers.polygon.tooltip.cont =
      'Clic para continuar dibujando.';
    L.drawLocal.draw.handlers.polygon.tooltip.end =
      'Clic en el primer punto para cerrar el polígono.';
    L.drawLocal.edit.toolbar.actions.save.text = 'Guardar';
    L.drawLocal.edit.toolbar.actions.save.title = 'Guardar cambios';
    L.drawLocal.edit.toolbar.actions.cancel.text = 'Cancelar';
    L.drawLocal.edit.toolbar.actions.cancel.title = 'Cancelar edición';
    L.drawLocal.edit.toolbar.actions.clearAll.text = 'Eliminar todo';
    L.drawLocal.edit.toolbar.actions.clearAll.title = 'Eliminar todo';
    L.drawLocal.edit.toolbar.buttons.edit = 'Editar capas';
    L.drawLocal.edit.toolbar.buttons.editDisabled = 'Sin capas para editar';
    L.drawLocal.edit.toolbar.buttons.remove = 'Eliminar';
    L.drawLocal.edit.toolbar.buttons.removeDisabled = 'Sin capas para eliminar';

    // ── Draw control ────────────────────────────────────────────────────────
    const drawControl = new L.Control.Draw({
      position: 'topright',
      draw: {
        polygon: {
          shapeOptions: {
            color: '#2563eb',
            fillColor: '#3b82f6',
            fillOpacity: 0.3,
            weight: 2,
          },
          showArea: true,
          allowIntersection: false,
        },
        polyline: false,
        rectangle: false,
        circle: false,
        circlemarker: false,
        marker: false,
      },
      edit: {
        featureGroup: items,
        remove: true,
      },
    });

    map.addControl(drawControl);

    // ── Event handlers ──────────────────────────────────────────────────────

    function computeArea(polygon: L.Polygon): number {
      const latLngs = polygon.getLatLngs()[0] as L.LatLng[];
      const areaM2 = L.GeometryUtil.geodesicArea(latLngs);
      return areaM2 / 1_000_000; // m² → km²
    }

    function onCreated(e: L.DrawEvents.Created) {
      items.clearLayers();
      items.addLayer(e.layer);
      if (e.layer instanceof L.Polygon) {
        onAreaRef.current(computeArea(e.layer));
      }
    }

    function onEdited(e: L.DrawEvents.Edited) {
      e.layers.eachLayer((layer) => {
        if (layer instanceof L.Polygon) {
          onAreaRef.current(computeArea(layer));
        }
      });
    }

    function onDeleted() {
      onAreaRef.current(0);
    }

    map.on(L.Draw.Event.CREATED, onCreated as L.LeafletEventHandlerFn);
    map.on(L.Draw.Event.EDITED, onEdited as L.LeafletEventHandlerFn);
    map.on(L.Draw.Event.DELETED, onDeleted);

    return () => {
      map.removeControl(drawControl);
      map.removeLayer(items);
      map.off(L.Draw.Event.CREATED, onCreated as L.LeafletEventHandlerFn);
      map.off(L.Draw.Event.EDITED, onEdited as L.LeafletEventHandlerFn);
      map.off(L.Draw.Event.DELETED, onDeleted);
    };
  }, [map]);

  return null;
}

// ── BasinMap ──────────────────────────────────────────────────────────────────

interface Props {
  onUseArea: (areaKm2: number) => void;
}

export function BasinMap({ onUseArea }: Props) {
  const [calculatedArea, setCalculatedArea] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      <div
        style={{ height: '400px' }}
        className="rounded-lg overflow-hidden border border-gray-300 shadow-sm"
      >
        <MapContainer
          center={[-34.6, -58.4]}
          zoom={5}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <DrawControl onAreaCalculated={setCalculatedArea} />
        </MapContainer>
      </div>

      <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
        {calculatedArea !== null && calculatedArea > 0 ? (
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-blue-800 font-medium">
              Área calculada:{' '}
              <strong>{calculatedArea.toFixed(4)} km²</strong>
            </p>
            <button
              type="button"
              onClick={() => onUseArea(calculatedArea)}
              className="px-4 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              Usar esta área
            </button>
          </div>
        ) : (
          <p className="text-sm text-blue-700">
            Usá el botón{' '}
            <strong>"Dibujar polígono"</strong> (arriba a la derecha del mapa)
            para delinear la cuenca y calcular el área automáticamente.
          </p>
        )}
      </div>
    </div>
  );
}
