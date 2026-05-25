// src/pages/Courier/components/LeafletDeliveryMap.jsx
import React from 'react';

export default function LeafletDeliveryMap({ mapContainerRef }) {
  return (
    <div 
      ref={mapContainerRef} 
      className="leaflet-map-wrapper"
      id="courier-map-container"
    />
  );
}
