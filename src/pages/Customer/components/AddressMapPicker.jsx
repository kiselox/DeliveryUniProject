
export default function AddressMapPicker({
  deliveryAddress,
  setDeliveryAddress,
  deliveryLat,
  deliveryLng,
  mapContainerRef,
  handleGetCurrentPosition
}) {
  return (
    <div className="location-wrapper">
      <div className="location-header">
        <label htmlFor="delivery-address-input" className="location-title">📍 Delivery Address in Poznań:</label>
        <span className="location-coordinates">
          ({deliveryLat.toFixed(4)}, {deliveryLng.toFixed(4)})
        </span>
      </div>
      
      <div className="address-input-wrapper" style={{ marginBottom: '15px' }}>
        <input 
          id="delivery-address-input"
          type="text"
          value={deliveryAddress}
          onChange={(e) => setDeliveryAddress(e.target.value)}
          placeholder="Street, e.g., Półwiejska, Garbary, Jeżyce..."
          className="address-text-input"
          autoComplete="street-address"
          style={{ flexGrow: 1 }}
        />
      </div>

      {}
      <button
        type="button"
        onClick={handleGetCurrentPosition}
        style={{
          width: '100%',
          padding: '12px',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          background: 'linear-gradient(135deg, rgba(170, 59, 255, 0.2) 0%, rgba(123, 31, 162, 0.2) 100%)',
          color: '#c480ff',
          fontWeight: 'bold',
          fontSize: '13px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          marginBottom: '12px',
          transition: 'all 0.2s'
        }}
        onMouseOver={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, rgba(170, 59, 255, 0.3) 0%, rgba(123, 31, 162, 0.3) 100%)'}
        onMouseOut={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, rgba(170, 59, 255, 0.2) 0%, rgba(123, 31, 162, 0.2) 100%)'}
      >
        📡 Use My Current Geolocation
      </button>

      {}
      <div className="map-picker-container" style={{ marginTop: '15px' }}>
        <div 
          ref={mapContainerRef} 
          id="checkout-map" 
          className="micro-leaflet-map"
        />
        <div className="map-hint-badge">
          Drag marker 📍 or click on the map
        </div>
      </div>
    </div>
  );
}
