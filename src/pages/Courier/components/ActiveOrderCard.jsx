// src/pages/Courier/components/ActiveOrderCard.jsx

export default function ActiveOrderCard({
  activeOrder,
  calculatePayout,
  distanceInfo,
  getGoogleMapsDirectionsUrl,
  handleConfirmPickUp,
  handleDeliverOrder
}) {
  if (!activeOrder) return null;

  const isAccepted = activeOrder.status === "Accepted";

  return (
    <div style={{
      background: activeOrder.status === "Picked Up" 
        ? 'linear-gradient(135deg, #00b35a 0%, #007e3e 100%)' // Green for Customer Route
        : 'linear-gradient(135deg, #aa3bff 0%, #7b1fa2 100%)', // Purple for Restaurant Route
      color: '#fff',
      borderRadius: '20px',
      padding: '24px',
      boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
      position: 'relative',
      textAlign: 'left'
    }}>
      
      <span style={{
        fontSize: '11px',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        backgroundColor: 'rgba(255,255,255,0.2)',
        padding: '4px 10px',
        borderRadius: '10px',
        display: 'inline-block',
        marginBottom: '15px'
      }}>
        {isAccepted ? "Шаг 2: Едем за заказом в ресторан 🍳" : "Шаг 3: Доставка клиенту домой 🏠"}
      </span>

      <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '800' }}>
        {isAccepted 
          ? `Ресторан: ${activeOrder.vendorName}`
          : `Доставка: ${activeOrder.deliveryAddress}`
        }
      </h2>

      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        padding: '12px',
        borderRadius: '8px',
        marginBottom: '15px',
        fontSize: '14px'
      }}>
        <b>Заказ:</b> {activeOrder.items}
      </div>

      {/* Recipient / Delivery Details Card */}
      {isAccepted ? (
        <div style={{
          backgroundColor: 'rgba(0, 0, 0, 0.15)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '15px',
          fontSize: '13px',
          textAlign: 'center',
          color: '#ffc107',
          fontWeight: 'bold',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px'
        }}>
          <span style={{ fontSize: '20px' }}>🔒</span>
          <span>Детали доставки скрыты</span>
          <span style={{ fontSize: '11px', fontWeight: 'normal', opacity: 0.8 }}>
            Контакты и точный адрес получателя станут доступны после того, как вы подтвердите получение заказа в ресторане.
          </span>
        </div>
      ) : (
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.15)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '15px',
          fontSize: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', opacity: 0.9, letterSpacing: '0.5px' }}>
            📋 Карточка Доставки
          </div>

          {/* Grid for House, Apartment, Floor */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.15)', padding: '8px 10px', borderRadius: '8px' }}>
              <span style={{ fontSize: '10px', opacity: 0.7, display: 'block' }}>Дом</span>
              <strong style={{ fontSize: '15px' }}>{activeOrder.house || '—'}</strong>
            </div>
            <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.15)', padding: '8px 10px', borderRadius: '8px' }}>
              <span style={{ fontSize: '10px', opacity: 0.7, display: 'block' }}>Квартира</span>
              <strong style={{ fontSize: '15px' }}>{activeOrder.apartment || '—'}</strong>
            </div>
            <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.15)', padding: '8px 10px', borderRadius: '8px' }}>
              <span style={{ fontSize: '10px', opacity: 0.7, display: 'block' }}>Этаж</span>
              <strong style={{ fontSize: '15px' }}>{activeOrder.floor || '—'}</strong>
            </div>
          </div>

          {/* Recipient Phone */}
          {activeOrder.phone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(0, 0, 0, 0.15)', padding: '10px 12px', borderRadius: '8px' }}>
              <span>📞</span>
              <div style={{ flexGrow: 1 }}>
                <span style={{ fontSize: '10px', opacity: 0.7, display: 'block' }}>Телефон получателя</span>
                <a href={`tel:${activeOrder.phone}`} style={{ color: '#fff', fontWeight: 'bold', fontSize: '15px', textDecoration: 'underline' }}>
                  {activeOrder.phone}
                </a>
              </div>
            </div>
          )}

          {/* Courier Notes */}
          {activeOrder.notes && (
            <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.15)', padding: '10px 12px', borderRadius: '8px', borderLeft: '3px solid #ffc107' }}>
              <span style={{ fontSize: '10px', opacity: 0.8, fontWeight: 'bold', color: '#ffc107', display: 'block', marginBottom: '3px' }}>📝 Заметка курьеру:</span>
              <span style={{ fontSize: '13px', fontStyle: 'italic', lineHeight: '1.4' }}>"{activeOrder.notes}"</span>
            </div>
          )}
        </div>
      )}

      {/* Google Maps Directions Navigator Button */}
      <a 
        href={getGoogleMapsDirectionsUrl()} 
        target="_blank" 
        rel="noopener noreferrer"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          width: '100%',
          padding: '12px',
          backgroundColor: '#ffc107',
          color: '#333',
          border: 'none',
          borderRadius: '12px',
          fontSize: '15px',
          fontWeight: 'bold',
          textDecoration: 'none',
          boxShadow: '0 4px 12px rgba(255, 193, 7, 0.3)',
          transition: 'all 0.2s',
          marginBottom: '20px',
          boxSizing: 'border-box',
          textAlign: 'center'
        }}
        onMouseOver={(e) => e.target.style.backgroundColor = '#ffe066'}
        onMouseOut={(e) => e.target.style.backgroundColor = '#ffc107'}
      >
        🗺️ Открыть навигатор (Google Maps)
      </a>

      {/* LIVE DISTANCE READOUT */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '15px',
        marginBottom: '20px',
        borderTop: '1px solid rgba(255,255,255,0.2)',
        paddingTop: '15px'
      }}>
        <div>
          <div style={{ fontSize: '11px', opacity: 0.8 }}>
            {isAccepted ? "Путь до ресторана:" : "Путь до клиента:"}
          </div>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
            {distanceInfo.distanceMeters > 0 
              ? `${distanceInfo.distanceMeters} м` 
              : 'Расчет...'}
          </div>
          <span style={{ fontSize: '11px', opacity: 0.7 }}>
            ({distanceInfo.distanceKm} км)
          </span>
        </div>
        <div>
          <div style={{ fontSize: '11px', opacity: 0.8 }}>Статус:</div>
          <div style={{ fontSize: '15px', fontWeight: 'bold', marginTop: '4px' }}>
            {isAccepted ? '🛒 Еду забирать' : '🛵 Везет курьер'}
          </div>
        </div>
      </div>

      {/* STEP 2: ACCEPTED / RESTAURANT PICKUP */}
      {isAccepted && (
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.15)',
          padding: '18px',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{ fontSize: '15px', textAlign: 'center', fontWeight: 'bold' }}>
            🔑 Код для ресторана: <span style={{ fontSize: '24px', letterSpacing: '2px', color: '#ffc107', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>#{activeOrder.id.slice(-4).toUpperCase()}</span>
          </div>
          <div style={{ fontSize: '13px', opacity: 0.9, textAlign: 'center', lineHeight: '1.4' }}>
            Назовите этот код сотрудникам ресторана для выдачи заказа.
          </div>
          <button
            onClick={handleConfirmPickUp}
            style={{
              padding: '14px',
              backgroundColor: '#ffc107',
              color: '#333',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 'bold',
              fontSize: '16px',
              cursor: 'pointer',
              boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
              transition: 'all 0.2s',
              marginTop: '5px'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#ffe066'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#ffc107'}
          >
            🍲 Подтвердить получение в ресторане
          </button>
        </div>
      )}

      {/* STEP 3: PICKED UP / CLIENT DELIVERY */}
      {!isAccepted && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', fontWeight: 'bold' }}>
            <span>Оплата курьеру:</span>
            <span style={{ fontSize: '24px', color: '#fff' }}>{calculatePayout(activeOrder)} PLN</span>
          </div>
          <button 
            onClick={handleDeliverOrder}
            style={{
              width: '100%',
              padding: '15px',
              backgroundColor: '#fff',
              color: '#007e3e',
              border: 'none',
              borderRadius: '12px',
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
            }}
          >
            📦 Подтвердить доставку клиенту
          </button>
        </div>
      )}
    </div>
  );
}
