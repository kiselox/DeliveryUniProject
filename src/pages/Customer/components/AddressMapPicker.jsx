// src/pages/Customer/components/AddressMapPicker.jsx
import React from 'react';

export default function AddressMapPicker({
  deliveryAddress,
  setDeliveryAddress,
  deliveryLat,
  deliveryLng,
  mapContainerRef,
  handleGetCurrentPosition,
  handlePresetClick
}) {
  return (
    <div className="location-wrapper">
      <div className="location-header">
        <label className="location-title">📍 Адрес доставки в Познани:</label>
        <span className="location-coordinates">
          ({deliveryLat.toFixed(4)}, {deliveryLng.toFixed(4)})
        </span>
      </div>
      
      <div className="address-input-wrapper">
        <input 
          type="text"
          value={deliveryAddress}
          onChange={(e) => setDeliveryAddress(e.target.value)}
          placeholder="Улица, например: Półwiejska, Garbary, Jeżyce..."
          className="address-text-input"
        />
        <button
          type="button"
          onClick={handleGetCurrentPosition}
          className="btn-gps-location"
        >
          📍 Моя геопозиция
        </button>
      </div>

      {/* Preset buttons */}
      <div className="presets-container">
        {['Półwiejska', 'Garbary', 'Jeżyce', 'Malta', 'Dormitory CDV'].map(preset => (
          <button
            key={preset}
            onClick={() => handlePresetClick(preset)}
            type="button"
            className="btn-preset"
          >
            {preset}
          </button>
        ))}
      </div>

      {/* Micro map container */}
      <div className="map-picker-container">
        <div 
          ref={mapContainerRef} 
          id="checkout-map" 
          className="micro-leaflet-map"
        />
        <div className="map-hint-badge">
          Перетащите маркер 📍 или кликните карту
        </div>
      </div>
    </div>
  );
}
