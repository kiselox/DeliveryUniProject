// src/pages/Courier/components/CourierProfileHeader.jsx
import React from 'react';

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
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>👤 Профиль курьера: {courier.name}</h2>
        <span style={{
          padding: '4px 10px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 'bold',
          backgroundColor: activeOrder ? '#ff9500' : '#4cd964',
          color: '#fff'
        }}>
          {activeOrder ? 'Занят (В поездке)' : 'Свободен (Ждет заказы)'}
        </span>
      </div>
      
      <div className="profile-grid-info">
        <div>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>Транспортное средство</span>
          <div style={{ fontWeight: 'bold', fontSize: '16px', marginTop: '4px' }}>
            {courier.vehicle === 'Bicycle' ? '🚲 Велосипед (Стандарт)' : 
             courier.vehicle === 'Scooter' ? '🛴 Электросамокат (Быстрый)' : 
             courier.vehicle === 'Car' ? '🚗 Автомобиль (Дальний)' : courier.vehicle}
          </div>
        </div>
        <div>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>Рейтинг курьера</span>
          <div style={{ fontWeight: 'bold', fontSize: '16px', marginTop: '4px', color: '#ffcc00' }}>
            ⭐ 4.9 (Отличный сервис)
          </div>
        </div>
        <div>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>Режим симуляции</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            <label className="switch-gps" style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={isGpsTracking}
                onChange={(e) => setIsGpsTracking(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <span style={{ fontSize: '14px', fontWeight: 'bold', color: isGpsTracking ? '#aa3bff' : '#aaa' }}>
                {isGpsTracking ? '📡 Живой GPS (Реальный)' : '📍 Слайдер локации (Ручной)'}
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
