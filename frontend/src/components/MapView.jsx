import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const ICON_CONFIG = {
  current: ["#0f172a", "C"],
  pickup: ["#16a34a", "P"],
  dropoff: ["#dc2626", "D"],
  fuel: ["#d97706", "F"],
  rest: ["#7c3aed", "R"],
  break: ["#2563eb", "B"],
};

const ICONS = Object.fromEntries(
  Object.entries(ICON_CONFIG).map(([key, [color, label]]) => [
    key,
    L.divIcon({
      className: "",
      html: `<div class="leaflet-stop-marker" style="background:${color}">${label}</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      popupAnchor: [0, -16],
    }),
  ]),
);

function shortName(location) {
  return location?.display_name?.split(",").slice(0, 2).join(", ") || "Unknown";
}

function minuteLabel(absMin) {
  const day = Math.floor(absMin / 1440) + 1;
  const minute = absMin % 1440;
  const hour = Math.floor(minute / 60);
  const mins = minute % 60;
  const suffix = hour >= 12 ? "PM" : "AM";
  return `Day ${day}, ${hour % 12 || 12}:${String(mins).padStart(2, "0")} ${suffix}`;
}

function routePosition(routeLatLngs, fraction) {
  if (!routeLatLngs.length) return null;
  const index = Math.min(routeLatLngs.length - 1, Math.max(0, Math.floor(fraction * (routeLatLngs.length - 1))));
  return routeLatLngs[index];
}

function FitBounds({ positions }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length > 1) {
      map.fitBounds(positions, { padding: [42, 42], maxZoom: 9 });
    }
  }, [map, positions]);

  return null;
}

export default function MapView({ data }) {
  const routeLatLngs = useMemo(
    () => (data?.geometry || []).map(([lon, lat]) => [lat, lon]),
    [data?.geometry],
  );

  if (!data) {
    return (
      <div className="empty-map">
        <p className="eyebrow">Route Map</p>
        <h2>Interactive route preview</h2>
        <p>Submit a trip to draw the route with current, pickup, dropoff, fuel, break, and rest markers.</p>
        <div className="empty-feature-grid">
          <span>OSRM route polyline</span>
          <span>OpenStreetMap tiles</span>
          <span>HOS stop markers</span>
        </div>
      </div>
    );
  }

  const keyMarkers = [
    {
      type: "current",
      label: "Current location",
      position: [data.locations.current.lat, data.locations.current.lon],
      description: shortName(data.locations.current),
    },
    {
      type: "pickup",
      label: "Pickup",
      position: [data.locations.pickup.lat, data.locations.pickup.lon],
      description: `${shortName(data.locations.pickup)} - 1 hour on duty`,
    },
    {
      type: "dropoff",
      label: "Dropoff",
      position: [data.locations.dropoff.lat, data.locations.dropoff.lon],
      description: `${shortName(data.locations.dropoff)} - 1 hour on duty`,
    },
  ];

  const stopMarkers = (data.schedule?.stops || [])
    .filter((stop) => ["fuel", "rest", "break"].includes(stop.type))
    .map((stop, index, stops) => ({
      ...stop,
      position: routePosition(routeLatLngs, (index + 1) / (stops.length + 1)),
    }))
    .filter((stop) => stop.position);

  const allPositions = [...routeLatLngs, ...keyMarkers.map((marker) => marker.position), ...stopMarkers.map((marker) => marker.position)];

  return (
    <div className="map-view">
      <div className="map-header">
        <div>
          <p className="eyebrow">Route Map</p>
          <h2>{shortName(data.locations.current)} to {shortName(data.locations.dropoff)}</h2>
        </div>
        <div className="map-legend">
          <LegendDot type="current" label="Current" />
          <LegendDot type="pickup" label="Pickup" />
          <LegendDot type="dropoff" label="Dropoff" />
          <LegendDot type="fuel" label="Fuel" />
          <LegendDot type="break" label="Break" />
          <LegendDot type="rest" label="Rest" />
        </div>
      </div>

      <div className="leaflet-map-shell">
        <MapContainer center={[39.5, -98.35]} zoom={5} className="leaflet-map">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds positions={allPositions} />

          {routeLatLngs.length > 1 && (
            <Polyline positions={routeLatLngs} pathOptions={{ color: "#1d4ed8", weight: 5, opacity: 0.85 }} />
          )}

          {keyMarkers.map((marker) => (
            <Marker key={marker.type} position={marker.position} icon={ICONS[marker.type]}>
              <Popup>
                <strong>{marker.label}</strong>
                <br />
                {marker.description}
              </Popup>
            </Marker>
          ))}

          {stopMarkers.map((stop, index) => (
            <Marker key={`${stop.type}-${stop.minute}-${index}`} position={stop.position} icon={ICONS[stop.type]}>
              <Popup>
                <strong>{stop.label || stop.type}</strong>
                <br />
                {minuteLabel(stop.minute)}
                <br />
                Duration: {stop.duration_h} hr
                {stop.reason && (
                  <>
                    <br />
                    <span>{stop.reason}</span>
                  </>
                )}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}

function LegendDot({ type, label }) {
  return (
    <span>
      <i className={`legend-dot ${type}`} />
      {label}
    </span>
  );
}
