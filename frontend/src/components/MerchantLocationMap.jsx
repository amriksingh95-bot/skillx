import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const DEFAULT_CENTER = { lat: 30.9010, lng: 75.8573 }; // Ludhiana, Punjab
const DEFAULT_ZOOM = 13;

const pinIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="44" viewBox="0 0 32 44">
  <defs>
    <filter id="shadow" x="-20%" y="-10%" width="140%" height="130%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.25"/>
    </filter>
  </defs>
  <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 28 16 28s16-16 16-28C32 7.163 24.837 0 16 0z" fill="#E53935" filter="url(#shadow)"/>
  <circle cx="16" cy="15" r="7" fill="white"/>
</svg>`;

function createPinIcon(size = [32, 44]) {
  return L.divIcon({
    html: pinIconSvg,
    className: '',
    iconSize: size,
    iconAnchor: [size[0] / 2, size[1]],
    popupAnchor: [0, -size[1] + 6],
  });
}

const PIN_ICON = createPinIcon();

function MarkerComponent({ position, onDragEnd, onClick }) {
  useMapEvents({
    click(e) {
      if (onClick) onClick(e.latlng);
    },
  });

  return (
    <Marker
      position={position}
      draggable={true}
      eventHandlers={{
        dragend: (e) => {
          onDragEnd(e.target.getLatLng());
        },
      }}
      icon={PIN_ICON}
    />
  );
}

export default function MerchantLocationMap({
  latitude,
  longitude,
  onLocationChange,
  height = 300,
  readOnly = false,
}) {
  const [mapCenter, setMapCenter] = useState(() => {
    if (latitude && longitude) {
      return { lat: parseFloat(latitude), lng: parseFloat(longitude) };
    }
    return DEFAULT_CENTER;
  });
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);
  const mapRef = useRef(null);

  const handleDragEnd = (latLng) => {
    const newCenter = { lat: latLng.lat, lng: latLng.lng };
    setMapCenter(newCenter);
    if (onLocationChange) {
      onLocationChange(newCenter.lat, newCenter.lng);
    }
  };

  const handleMapClick = (latLng) => {
    const newCenter = { lat: latLng.lat, lng: latLng.lng };
    setMapCenter(newCenter);
    if (onLocationChange) {
      onLocationChange(newCenter.lat, newCenter.lng);
    }
  };

  useEffect(() => {
    if (latitude && longitude) {
      const newCenter = { lat: parseFloat(latitude), lng: parseFloat(longitude) };
      setMapCenter(newCenter);
      if (mapRef.current) {
        mapRef.current.setView([newCenter.lat, newCenter.lng], mapZoom);
      }
    }
  }, [latitude, longitude, mapZoom]);

  return (
    <div className="relative w-full rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden" style={{ height }}>
      <MapContainer
        ref={mapRef}
        center={[mapCenter.lat, mapCenter.lng]}
        zoom={mapZoom}
        scrollWheelZoom={!readOnly}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {!readOnly && (
          <MarkerComponent
            position={[mapCenter.lat, mapCenter.lng]}
            onDragEnd={handleDragEnd}
            onClick={handleMapClick}
          />
        )}
        {readOnly && latitude && longitude && (
          <Marker
            position={[parseFloat(latitude), parseFloat(longitude)]}
            icon={PIN_ICON}
          />
        )}
      </MapContainer>
      {!readOnly && (
        <div className="absolute bottom-2 left-2 right-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-slate-600 dark:text-slate-400 text-center pointer-events-none z-[1000]">
          Drag the marker or click on the map to set location
        </div>
      )}
    </div>
  );
}
