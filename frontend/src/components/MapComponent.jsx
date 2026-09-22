import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Polyline, Tooltip } from 'react-leaflet';
import L from 'leaflet';

const createIcon = (color, size=16, pulse=false) => {
  return L.divIcon({
    className: 'custom-icon',
    html: `<div style="background-color: ${color}; width: ${size}px; height: ${size}px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 8px ${color}; ${pulse ? 'animation: pulse 1.5s infinite;' : ''}"></div>`,
    iconSize: [size, size],
    iconAnchor: [size/2, size/2]
  });
};

const icons = {
  hospital: createIcon('#a855f7'), 
  hospital_highlight: createIcon('#a855f7', 24, true), 
  ambulance: createIcon('#3b82f6'),
  emergency: createIcon('#ef4444', 18, true),
  selected: createIcon('#eab308'),
  bloodBank: createIcon('#f43f5e'),
  bloodBank_highlight: createIcon('#f43f5e', 24, true)
};

function ClickHandler({ onMapClick }) {
  useMapEvents({ click(e) { onMapClick(e.latlng); } });
  return null;
}

export default function MapComponent({ state, onMapClick, selectedLocation, highlights = { hospitals: [], bloodBanks: [] }, onHospitalClick }) {
  const { hospitals, ambulances, emergencies, missions, bloodBanks } = state;
  const nagpurCenter = [21.1458, 79.0882]; 

  return (
    <>
      <style>{`@keyframes pulse { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.5); opacity: 0.5; } 100% { transform: scale(1); opacity: 1; } }`}</style>
      <MapContainer center={nagpurCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="map-tiles-dark" // custom dark filter could be applied via css
        />
        
        <ClickHandler onMapClick={onMapClick} />

        {/* Hospitals */}
        {hospitals.map(h => {
          const isHighlighted = highlights.hospitals?.includes(h.id);
          return (
            <Marker 
              key={h.id} 
              position={[h.lat, h.lng]} 
              icon={isHighlighted ? icons.hospital_highlight : icons.hospital}
              eventHandlers={{ click: () => onHospitalClick && onHospitalClick(h) }}
            >
              <Tooltip direction="top" offset={[0, -10]} opacity={1}>{h.name}</Tooltip>
            </Marker>
          )
        })}

        {/* Blood Banks */}
        {bloodBanks?.map(b => {
          const isHighlighted = highlights.bloodBanks?.includes(b.id);
          return (
            <Marker key={b.id} position={[b.lat, b.lng]} icon={isHighlighted ? icons.bloodBank_highlight : icons.bloodBank}>
              <Tooltip direction="top" offset={[0,-10]}>{b.name} (Blood Bank)</Tooltip>
            </Marker>
          )
        })}

        {/* Ambulances */}
        {ambulances.map(a => (
          <Marker key={a.id} position={[a.lat, a.lng]} icon={icons.ambulance}>
            <Tooltip direction="right" offset={[10,0]}>{a.name} - {a.status}</Tooltip>
          </Marker>
        ))}

        {/* Emergencies */}
        {emergencies.filter(e => e.status !== 'COMPLETED').map(e => (
          <Marker key={e.id} position={[e.lat, e.lng]} icon={icons.emergency}>
            <Tooltip direction="bottom" offset={[0,10]} permanent>SOS: {e.id}</Tooltip>
          </Marker>
        ))}

        {/* Selected Location */}
        {selectedLocation && (
          <Marker position={[selectedLocation.lat, selectedLocation.lng]} icon={icons.selected}>
            <Popup>New SOS Location</Popup>
          </Marker>
        )}

        {/* Mission Routes */}
        {missions.filter(m => m.status !== 'COMPLETED').map(m => (
          <Polyline key={m.id} positions={m.route} color="#3b82f6" weight={4} opacity={0.8} dashArray="10, 10" />
        ))}
      </MapContainer>
    </>
  );
}
