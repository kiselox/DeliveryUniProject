// src/pages/Courier/components/EarningsDashboard.jsx
import { useState } from 'react';

export default function EarningsDashboard({ completedOrders = [], calculatePayout }) {
  const [isEarningsOpen, setIsEarningsOpen] = useState(false);

  const totalEarnings = completedOrders.reduce((sum, o) => sum + calculatePayout(o), 0);
  const totalDistance = completedOrders.reduce((sum, o) => sum + (parseFloat(o.distance) || 0), 0);

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #eee',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
      textAlign: 'left',
      transition: 'all 0.3s ease'
    }}>
      {/* Header toggle row */}
      <div 
        onClick={() => setIsEarningsOpen(!isEarningsOpen)}
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          cursor: 'pointer',
          userSelect: 'none'
        }}
      >
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', color: '#333' }}>
          📊 Мой доход за сегодня
        </h3>
        <span style={{ fontSize: '14px', color: '#aa3bff', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
          {isEarningsOpen ? 'Свернуть ▲' : 'Подробнее ▼'}
        </span>
      </div>

      {/* Quick stats grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '10px',
        marginTop: '15px',
        borderTop: '1px solid #eee',
        paddingTop: '15px'
      }}>
        {/* Earnings column */}
        <div style={{ background: 'rgba(0,210,106,0.05)', border: '1px solid rgba(0,210,106,0.12)', padding: '10px', borderRadius: '12px', textAlign: 'center' }}>
          <span style={{ fontSize: '11px', color: '#555', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>Заработано</span>
          <strong style={{ fontSize: '18px', color: '#00aa54' }}>{totalEarnings} PLN</strong>
        </div>
        {/* Deliveries count */}
        <div style={{ background: 'rgba(74,144,226,0.05)', border: '1px solid rgba(74,144,226,0.12)', padding: '10px', borderRadius: '12px', textAlign: 'center' }}>
          <span style={{ fontSize: '11px', color: '#555', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>Доставки</span>
          <strong style={{ fontSize: '18px', color: '#2575fc' }}>{completedOrders.length} шт</strong>
        </div>
        {/* Distance count */}
        <div style={{ background: 'rgba(170,59,255,0.05)', border: '1px solid rgba(170,59,255,0.12)', padding: '10px', borderRadius: '12px', textAlign: 'center' }}>
          <span style={{ fontSize: '11px', color: '#555', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>Пробег</span>
          <strong style={{ fontSize: '18px', color: '#8c31d8' }}>{totalDistance.toFixed(1)} км</strong>
        </div>
      </div>

      {/* Detailed deliveries list (expandable) */}
      {isEarningsOpen && (
        <div style={{
          marginTop: '15px',
          borderTop: '1px solid #eee',
          paddingTop: '15px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          maxHeight: '220px',
          overflowY: 'auto',
          paddingRight: '4px'
        }}>
          {completedOrders.length === 0 ? (
            <div style={{ padding: '20px 0', textAlign: 'center', color: '#777', fontSize: '13px' }}>
              У вас пока нет выполненных заказов за сегодня. 🛵
            </div>
          ) : (
            completedOrders.map(order => {
              const payout = calculatePayout(order);
              return (
                <div 
                  key={order.id}
                  style={{
                    background: '#f9f9f9',
                    border: '1px solid #eee',
                    borderRadius: '12px',
                    padding: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f1f1f1'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f9f9f9'}
                >
                  <div>
                    <strong style={{ fontSize: '13px', color: '#333', display: 'block' }}>
                      🏪 {order.vendorName}
                    </strong>
                    <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: '#666', marginTop: '2px' }}>
                      <span>🍕 #{order.id.slice(-4).toUpperCase()}</span>
                      <span>⏱️ {order.createdAt}</span>
                      <span>🛣️ {order.distance} км</span>
                    </div>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#00aa54' }}>
                    +{payout} PLN
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
