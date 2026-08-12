import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';

const DEFAULT_CENTER = { lat: 30.9010, lng: 75.8573 }; // Ludhiana, Punjab
const DEFAULT_ZOOM = 13;

function MarkerComponent({ position, onDragEnd, onClick }) {
  const map = useMapEvents({
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
      icon={{
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      }}
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
    <div className="w-full rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden" style={{ height }}>
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
            icon={{
              iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
              iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
              shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41],
              popupAnchor: [1, -34],
              shadowSize: [41, 41],
            }}
          />
        )}
      </MapContainer>
      {!readOnly && (
        <div className="absolute bottom-2 left-2 right-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-slate-600 dark:text-slate-400 text-center pointer-events-none">
          Drag the marker or click on the map to set location
        </div>
      )}
    </div>
  );
}