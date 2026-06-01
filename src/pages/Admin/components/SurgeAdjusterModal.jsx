
export default function SurgeAdjusterModal({
  editingOrder,
  setEditingOrder,
  newCoefficient,
  setNewCoefficient,
  handleUpdateOrderCoefficient,
  safeSettings
}) {
  if (!editingOrder) return null;

  const pricePerKm = safeSettings.pricePerKm !== undefined ? safeSettings.pricePerKm : 4.0;
  const scooterPricePerKm = safeSettings.scooterPricePerKm !== undefined ? safeSettings.scooterPricePerKm : 5.5;
  const carPricePerKm = safeSettings.carPricePerKm !== undefined ? safeSettings.carPricePerKm : 7.0;
  const surcharge = safeSettings.globalSurcharge !== undefined ? safeSettings.globalSurcharge : 0.0;
  const distance = parseFloat(editingOrder.distance) || 0.0;
  const coeff = parseFloat(newCoefficient) || 1.0;

  const veloPayout = Math.max(5.0, Math.round((distance * pricePerKm + surcharge) * coeff));
  const scooterPayout = Math.max(5.0, Math.round((distance * scooterPricePerKm + surcharge) * coeff));
  const carPayout = Math.max(5.0, Math.round((distance * carPricePerKm + surcharge) * coeff));

  return (
    <div className="admin-modal-overlay">
      <div className="admin-modal-content" style={{ maxWidth: '480px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginTop: 0, marginBottom: '15px', color: '#ff4757', display: 'flex', alignItems: 'center', gap: '8px' }}>
          ⚡ Surge Pricing Configuration
        </h3>
        
        <div style={{
          backgroundColor: 'rgba(255,255,255,0.03)',
          padding: '15px',
          borderRadius: '12px',
          marginBottom: '20px',
          fontSize: '14px',
          lineHeight: '1.4'
        }}>
          <div><strong>Restaurant:</strong> {editingOrder.vendorName}</div>
          <div style={{ marginTop: '5px' }}><strong>Customer Address:</strong> {editingOrder.deliveryAddress}</div>
          <div style={{ marginTop: '5px' }}><strong>Distance:</strong> {editingOrder.distance} km</div>
        </div>

        <form onSubmit={handleUpdateOrderCoefficient}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{ fontSize: '13px', opacity: 0.7, fontWeight: 'bold' }}>
              SURGE COEFFICIENT:
            </label>
            <span style={{ fontSize: '20px', fontWeight: '900', color: '#ff4757' }}>
              x{coeff.toFixed(1)}
            </span>
          </div>

          {}
          <input 
            type="range"
            min="1.0"
            max="5.0"
            step="0.1"
            value={newCoefficient}
            onChange={(e) => setNewCoefficient(e.target.value)}
            style={{
              width: '100%',
              marginBottom: '15px',
              accentColor: '#ff4757',
              cursor: 'pointer'
            }}
          />

          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            {}
            {['1.0', '1.5', '2.0', '3.0'].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setNewCoefficient(preset)}
                style={{
                  flex: 1,
                  backgroundColor: coeff.toFixed(1) === parseFloat(preset).toFixed(1) ? 'rgba(255, 71, 87, 0.2)' : 'rgba(255,255,255,0.06)',
                  color: coeff.toFixed(1) === parseFloat(preset).toFixed(1) ? '#ff4757' : '#fff',
                  border: coeff.toFixed(1) === parseFloat(preset).toFixed(1) ? '1px solid rgba(255, 71, 87, 0.4)' : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  padding: '8px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {preset}x
              </button>
            ))}
          </div>

          {}
          <div style={{
            background: 'rgba(170, 59, 255, 0.05)',
            border: '1px solid rgba(170, 59, 255, 0.15)',
            borderRadius: '16px',
            padding: '15px',
            marginBottom: '25px'
          }}>
            <div style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#c480ff', marginBottom: '10px', letterSpacing: '0.5px' }}>
              💰 Estimated Courier Payout:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '6px' }}>
                <span>🚲 Bicycle (Base)</span>
                <strong style={{ color: '#fff' }}>{veloPayout} PLN</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '6px' }}>
                <span>🛵 Scooter (+rate)</span>
                <strong style={{ color: '#fff' }}>{scooterPayout} PLN</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>🚗 Car (+rate)</span>
                <strong style={{ color: '#fff' }}>{carPayout} PLN</strong>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '15px' }}>
            <button
              type="button"
              onClick={() => setEditingOrder(null)}
              style={{
                flex: 1,
                padding: '14px',
                backgroundColor: 'rgba(255,255,255,0.06)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-admin-save"
              style={{ flex: 1, padding: '14px', borderRadius: '12px' }}
            >
              Apply
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
