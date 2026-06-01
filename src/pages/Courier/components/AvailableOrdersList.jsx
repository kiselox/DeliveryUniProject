
export default function AvailableOrdersList({
  activeOrder,
  availableOrders,
  previewOrder,
  setPreviewOrder,
  handlePreviewOrder,
  calculatePayout,
  distanceInfo,
  handleAcceptOrder
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {}
      {previewOrder && !activeOrder ? (
        <div style={{
          background: '#fff',
          borderRadius: '16px',
          padding: '24px',
          border: '2px solid #ffc107',
          boxShadow: '0 6px 20px rgba(0,0,0,0.06)',
          position: 'relative',
          textAlign: 'left'
        }}>
          <button 
            onClick={() => setPreviewOrder(null)}
            style={{
              position: 'absolute',
              top: '15px',
              right: '15px',
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#aaa'
            }}
          >
            ×
          </button>

          <span style={{
            fontSize: '11px',
            fontWeight: 'bold',
            color: '#ffc107',
            textTransform: 'uppercase',
            backgroundColor: '#fff9e6',
            padding: '4px 10px',
            borderRadius: '10px',
            display: 'inline-block',
            marginBottom: '15px'
          }}>
            🔍 Order Preview
          </span>

          <h2 style={{ margin: '0 0 10px 0', fontSize: '22px', color: '#333' }}>
            {previewOrder.vendorName}
          </h2>


          {}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '15px',
            marginBottom: '20px',
            borderTop: '1px solid #eee',
            paddingTop: '15px'
          }}>
            <div>
              <span style={{ fontSize: '12px', color: '#888' }}>1. To Restaurant (pickup):</span>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#ffc107', marginTop: '4px' }}>
                {distanceInfo.distanceMeters > 0 ? `${distanceInfo.distanceMeters} m` : 'Calculating...'}
              </div>
              <span style={{ fontSize: '11px', color: '#999' }}>({distanceInfo.distanceKm} km)</span>
            </div>
            
            <div>
              <span style={{ fontSize: '12px', color: '#888' }}>2. Delivery to Customer:</span>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#00d26a', marginTop: '4px' }}>
                {previewOrder.distance} km
              </div>
              <span style={{ fontSize: '11px', color: '#999' }}>(to: {previewOrder.deliveryAddress || "Poznan CDV"})</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
            <span style={{ fontWeight: 'bold', color: '#333' }}>Courier payout:</span>
            <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#00d26a' }}>{calculatePayout(previewOrder)} PLN</span>
          </div>

          <button 
            onClick={() => handleAcceptOrder(previewOrder.id)}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: '#aa3bff',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(170, 59, 255, 0.3)'
            }}
          >
            🤝 Accept and Begin Delivery
          </button>
        </div>
      ) : null}

      {}
      <div style={{
        background: '#fff',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid #eee',
        boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
        textAlign: 'left'
      }}>
        <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', fontWeight: 'bold' }}>
          🛒 Available Orders ({availableOrders.length})
        </h3>

        {activeOrder ? (
          <div style={{
            padding: '15px',
            backgroundColor: '#fff9e6',
            border: '1px dashed #ffc107',
            borderRadius: '12px',
            color: '#856404',
            fontSize: '13px',
            lineHeight: '1.4'
          }}>
            Complete your current delivery for <b>{activeOrder.vendorName}</b> to accept new orders!
          </div>
        ) : availableOrders.length === 0 ? (
          <div style={{
            padding: '30px',
            backgroundColor: '#f9f9f9',
            borderRadius: '12px',
            textAlign: 'center',
            color: '#999',
            fontSize: '14px'
          }}>
            No new orders yet. Waiting for customers...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {availableOrders.map(order => {
              const isPreviewed = previewOrder?.id === order.id;
              return (
                <div 
                  key={order.id} 
                  onClick={() => handlePreviewOrder(order)}
                  style={{
                    border: isPreviewed ? '2px solid #ffc107' : '1px solid #eee',
                    padding: '16px',
                    borderRadius: '12px',
                    backgroundColor: isPreviewed ? '#fffdf6' : '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: isPreviewed ? '0 4px 12px rgba(0,0,0,0.05)' : 'none'
                  }}
                  onMouseOver={(e) => { if (!isPreviewed) e.currentTarget.style.borderColor = '#ccc'; }}
                  onMouseOut={(e) => { if (!isPreviewed) e.currentTarget.style.borderColor = '#eee'; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <strong style={{ fontSize: '15px' }}>🏪 {order.vendorName}</strong>
                    <span style={{
                      backgroundColor: '#e6faf0',
                      color: '#00d26a',
                      padding: '3px 8px',
                      borderRadius: '10px',
                      fontSize: '11px',
                      fontWeight: 'bold'
                    }}>
                      +{calculatePayout(order)} PLN
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666' }}>
                    <span>📍 {order.deliveryAddress || "Poznan"}</span>
                    <span>🛣️ {order.distance} km</span>
                  </div>
                  {order.coefficient && parseFloat(order.coefficient) > 1.0 && (
                    <div style={{ marginTop: '5px', textAlign: 'left' }}>
                      <span style={{
                        backgroundColor: '#ffe5e5',
                        color: '#ff3b30',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 'bold'
                      }}>
                        ⚡ Surge: {order.coefficient}x
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
