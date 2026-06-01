
export default function CourierProfileHeader({
  courier,
  activeOrder,
  isGpsTracking,
  setIsGpsTracking
}) {
  if (!courier) return null;

  return (
    <div className="courier-header-profile">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>👤 Courier Profile: {courier.name}</h2>
        <span style={{
          padding: '4px 10px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 'bold',
          backgroundColor: activeOrder ? '#ff9500' : '#4cd964',
          color: '#fff'
        }}>
          {activeOrder ? 'Busy (On Delivery)' : 'Available (Waiting for Orders)'}
        </span>
      </div>
      
      <div className="profile-grid-info">
        <div>
          <span style={{ color: '#555', fontSize: '13px', fontWeight: '500' }}>Vehicle</span>
          <div style={{ fontWeight: 'bold', fontSize: '16px', marginTop: '4px', color: '#333' }}>
            {courier.vehicle === 'Bicycle' ? '🚲 Bicycle (Standard)' : 
             courier.vehicle === 'Scooter' ? '🛵 Scooter (Fast)' : 
             courier.vehicle === 'Car' ? '🚗 Car (Long distance)' : courier.vehicle}
          </div>
        </div>
        <div>
          <span style={{ color: '#555', fontSize: '13px', fontWeight: '500' }}>Courier Rating</span>
          <div style={{ fontWeight: 'bold', fontSize: '16px', marginTop: '4px', color: '#ffaa00' }}>
            ⭐ 4.9 (Excellent Service)
          </div>
        </div>
        <div>
          <span style={{ color: '#555', fontSize: '13px', fontWeight: '500' }}>Simulation Mode</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            <label className="switch-gps" style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={isGpsTracking}
                onChange={(e) => setIsGpsTracking(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <span style={{ fontSize: '14px', fontWeight: 'bold', color: isGpsTracking ? '#aa3bff' : '#888' }}>
                {isGpsTracking ? '📡 Live GPS (Real)' : '📍 Manual Location (Map Clicks)'}
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
