// src/pages/Admin/components/OrderDetailsModal.jsx
import React, { useState, useEffect } from 'react';
import api from '../../../services/api';

export default function OrderDetailsModal({
  selectedOrderDetails,
  setSelectedOrderDetails,
  safeSettings,
  getStatusBadge,
  updateOrder,
  refetchOrders
}) {
  const [cancelling, setCancelling] = useState(false);

  if (!selectedOrderDetails) return null;

  const order = selectedOrderDetails;
  
  const [customerProfile, setCustomerProfile] = useState(null);
  const [courierProfile, setCourierProfile] = useState(null);

  useEffect(() => {
    if (order?.customerId) {
      api.get(`/customers/${order.customerId}`)
        .then(res => setCustomerProfile(res.data))
        .catch(err => console.error('Error fetching customer details:', err));
    } else {
      setCustomerProfile(null);
    }

    if (order?.courierId) {
      api.get(`/couriers/${order.courierId}`)
        .then(res => setCourierProfile(res.data))
        .catch(err => console.error('Error fetching courier details:', err));
    } else {
      setCourierProfile(null);
    }
  }, [order?.customerId, order?.courierId]);

  const coefficientVal = parseFloat(order.coefficient || 1.0);
  
  const pricePerKm = safeSettings.pricePerKm !== undefined ? safeSettings.pricePerKm : 4.0;
  const scooterPricePerKm = safeSettings.scooterPricePerKm !== undefined ? safeSettings.scooterPricePerKm : 5.5;
  const carPricePerKm = safeSettings.carPricePerKm !== undefined ? safeSettings.carPricePerKm : 7.0;
  const surcharge = safeSettings.globalSurcharge !== undefined ? safeSettings.globalSurcharge : 0.0;
  const distance = parseFloat(order.distance) || 0.0;

  const veloPayout = Math.max(5.0, Math.round((distance * pricePerKm + surcharge) * coefficientVal));
  const scooterPayout = Math.max(5.0, Math.round((distance * scooterPricePerKm + surcharge) * coefficientVal));
  const carPayout = Math.max(5.0, Math.round((distance * carPricePerKm + surcharge) * coefficientVal));

  // Date and Time formatter
  const formatFullDateTime = (isoString) => {
    if (!isoString) return '—';
    if (!isoString.includes('T')) return `Сегодня, ${isoString}`;
    try {
      const date = new Date(isoString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `${day}.${month}.${year} в ${time}`;
    } catch {
      return isoString;
    }
  };

  const handleCancel = async () => {
    if (!window.confirm("🚨 ВНИМАНИЕ: Вы действительно хотите полностью ОТМЕНИТЬ этот заказ в системе? \nКурьер будет автоматически снят с заказа.")) return;
    try {
      setCancelling(true);
      await updateOrder({
        orderId: order.id,
        updates: { status: 'Cancelled' }
      });
      alert("❌ Заказ успешно отменен!");
      setSelectedOrderDetails(null);
      if (refetchOrders) refetchOrders();
    } catch (err) {
      alert("Не удалось отменить заказ: " + err.message);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="admin-modal-overlay">
      <div className="admin-modal-content" style={{ maxWidth: '750px', position: 'relative' }}>
        {/* CLOSE BUTTON AT TOP RIGHT */}
        <button
          onClick={() => setSelectedOrderDetails(null)}
          className="btn-admin-close"
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px'
          }}
        >
          ×
        </button>

        {/* HEADER */}
        <div style={{ marginBottom: '25px', textAlign: 'left' }}>
          <span style={{
            fontSize: '11px',
            textTransform: 'uppercase',
            fontWeight: 'bold',
            color: '#ff7beb',
            letterSpacing: '1px',
            display: 'block',
            marginBottom: '4px'
          }}>
            ПОЛНАЯ ИНФОРМАЦИЯ О ЗАКАЗЕ
          </span>
          <h3 style={{
            fontSize: '24px',
            fontWeight: '800',
            margin: 0,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            #{order.id.toUpperCase()}
          </h3>
          <div style={{ marginTop: '10px', display: 'flex', gap: '15px', alignItems: 'center' }}>
            {getStatusBadge(order.status)}
            <span style={{ fontSize: '13px', opacity: 0.6 }}>
              Дистанция: 📏 {order.distance} км
            </span>
          </div>
        </div>

        {/* TWO-COLUMN GRID */}
        <div className="checkout-grid-3col" style={{ gridTemplateColumns: '1fr 1fr', gap: '25px', marginBottom: '25px', textAlign: 'left' }}>
          
          {/* COLUMN 1: VENDOR & BASKET */}
          <div style={{
            backgroundColor: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.05)',
            padding: '20px',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <h4 style={{ margin: '0 0 5px 0', fontSize: '15px', color: '#c480ff', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '6px' }}>
              🏬 Заведение & Блюда
            </h4>
            <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
              {order.vendorName}
            </div>
            <div style={{
              fontSize: '14px',
              opacity: 0.8,
              lineHeight: '1.5',
              whiteSpace: 'pre-line',
              backgroundColor: 'rgba(0,0,0,0.2)',
              padding: '10px',
              borderRadius: '8px'
            }}>
              {order.items}
            </div>
            
            <div style={{ fontSize: '13px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div>📅 <strong>Создан:</strong> {formatFullDateTime(order.createdAt)}</div>
              {order.acceptedAt && (
                <div style={{ color: '#c480ff' }}>🟣 <strong>Принят курьером:</strong> {formatFullDateTime(order.acceptedAt)}</div>
              )}
              {order.pickedUpAt && (
                <div style={{ color: '#00d26a' }}>🍲 <strong>Забран в ресторане:</strong> {formatFullDateTime(order.pickedUpAt)}</div>
              )}
            </div>
          </div>

          {/* COLUMN 2: CLIENT INFO */}
          <div style={{
            backgroundColor: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.05)',
            padding: '20px',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <h4 style={{ margin: '0 0 5px 0', fontSize: '15px', color: '#c480ff', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '6px' }}>
              📍 Адрес & Получатель
            </h4>
            
            <div style={{ fontSize: '14px', lineHeight: '1.4' }}>
              <div>👤 <strong>Имя:</strong> {customerProfile ? `${customerProfile.name} ${customerProfile.lastName}` : order.customerId}</div>
              {customerProfile?.email && <div style={{ marginTop: '3px' }}>✉️ <strong>Email:</strong> {customerProfile.email}</div>}
              <div style={{ marginTop: '3px' }}>📞 <strong>Телефон:</strong> {customerProfile?.phone || order.phone || '—'}</div>
              <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed rgba(255,255,255,0.06)', fontWeight: 'bold' }}>
                📍 Адрес: {order.deliveryAddress}
              </div>
            </div>

            {/* Address parameters grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
              fontSize: '12px',
              backgroundColor: 'rgba(0,0,0,0.15)',
              padding: '10px',
              borderRadius: '8px'
            }}>
              <div>🏠 <strong>Дом:</strong> {order.house || '—'}</div>
              <div>🚪 <strong>Кв.:</strong> {order.apartment || '—'}</div>
              <div>🏢 <strong>Этаж:</strong> {order.floor || '—'}</div>
            </div>

            {order.notes && (
              <div style={{
                padding: '8px 10px',
                backgroundColor: 'rgba(255, 193, 7, 0.08)',
                border: '1px solid rgba(255, 193, 7, 0.2)',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#ffc107',
                fontStyle: 'italic'
              }}>
                <strong>Примечание:</strong> "{order.notes}"
              </div>
            )}

            {order.courierId && (
              <div style={{
                marginTop: '5px',
                backgroundColor: 'rgba(0, 210, 106, 0.06)',
                border: '1px solid rgba(0, 210, 106, 0.15)',
                padding: '12px',
                borderRadius: '12px',
                fontSize: '13px',
                color: '#00d26a',
                lineHeight: '1.4'
              }}>
                <div>🛵 <strong>Назначенный курьер:</strong></div>
                <div style={{ fontWeight: 'bold', fontSize: '14px', marginTop: '3px', color: '#fff' }}>
                  {courierProfile ? `${courierProfile.name} ${courierProfile.lastName}` : order.courierId}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '2px' }}>
                  Транспорт: {courierProfile?.vehicle === 'Car' ? '🚗 Автомобиль' : courierProfile?.vehicle === 'Scooter' ? '🛴 Самокат' : '🚲 Велосипед'}
                </div>
                {courierProfile?.phone && <div style={{ fontSize: '12px', opacity: 0.8 }}>📞 Тел: {courierProfile.phone}</div>}
                {courierProfile?.email && <div style={{ fontSize: '12px', opacity: 0.8 }}>✉️ Email: {courierProfile.email}</div>}
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM SECTION: PRICE & DYNAMIC PAYOUT COMPARISONS */}
        <div style={{
          background: 'rgba(170, 59, 255, 0.05)',
          border: '1px solid rgba(170, 59, 255, 0.15)',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '25px',
          textAlign: 'left'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px', marginBottom: '15px' }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#c480ff', letterSpacing: '0.5px' }}>
                ФИНАНСОВЫЙ СТАТУС ЗАКАЗА
              </span>
              <div style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '2px' }}>
                Коэффициент спроса: <span style={{ color: '#ff4757' }}>⚡ x{coefficientVal.toFixed(1)}</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              {order.courierId && order.status !== 'Cancelled' ? (
                <>
                  <div style={{ fontSize: '20px', fontWeight: '900', color: '#00d26a' }}>
                    {order.fee} PLN (доставка)
                  </div>
                  <div style={{ fontSize: '12px', opacity: 0.6 }}>
                    Итого: {order.totalPrice} PLN
                  </div>
                </>
              ) : (
                <div style={{ fontSize: '13px', opacity: 0.7, color: '#ffc107', fontStyle: 'italic', fontWeight: '500' }}>
                  {order.status === 'Cancelled' ? '❌ Заказ отменен (оплата заблокирована)' : '⚠️ Финансовые детали скрыты до назначения курьера'}
                </div>
              )}
            </div>
          </div>

          {order.status !== 'Cancelled' && (
            <>
              <div style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', color: '#c480ff', marginBottom: '10px', letterSpacing: '0.5px' }}>
                💸 Прогноз выплат курьерам (с коэф. спроса):
              </div>
              
              <div className="checkout-grid-3col" style={{ gap: '15px', textAlign: 'center' }}>
                {/* VELO */}
                <div style={{
                  backgroundColor: 'rgba(0,0,0,0.2)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  padding: '12px',
                  borderRadius: '10px'
                }}>
                  <span style={{ fontSize: '12px', opacity: 0.6, fontWeight: 'bold', color: '#ff7beb', display: 'block', marginBottom: '4px' }}>ВЕЛОСИПЕД</span>
                  <strong style={{ fontSize: '18px', color: '#fff' }}>{veloPayout} PLN</strong>
                </div>

                {/* SCOOTER */}
                <div style={{
                  backgroundColor: 'rgba(0,0,0,0.2)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  padding: '12px',
                  borderRadius: '10px'
                }}>
                  <span style={{ fontSize: '12px', opacity: 0.6, fontWeight: 'bold', color: '#ff7beb', display: 'block', marginBottom: '4px' }}>САМОКАТ</span>
                  <strong style={{ fontSize: '18px', color: '#fff' }}>{scooterPayout} PLN</strong>
                </div>

                {/* CAR */}
                <div style={{
                  backgroundColor: 'rgba(0,0,0,0.2)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  padding: '12px',
                  borderRadius: '10px'
                }}>
                  <span style={{ fontSize: '12px', opacity: 0.6, fontWeight: 'bold', color: '#ff7beb', display: 'block', marginBottom: '4px' }}>АВТОМОБИЛЬ</span>
                  <strong style={{ fontSize: '18px', color: '#fff' }}>{carPayout} PLN</strong>
                </div>
              </div>
            </>
          )}
        </div>

        {/* FOOTER ACTIONS */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            {order.status !== 'Cancelled' && order.status !== 'Delivered' && (
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="btn-admin-save"
                style={{
                  background: 'linear-gradient(135deg, #ff4d4d 0%, #cc0000 100%)',
                  boxShadow: '0 4px 15px rgba(204, 0, 0, 0.3)',
                  padding: '12px 24px'
                }}
              >
                {cancelling ? 'Отмена...' : '❌ Отменить заказ'}
              </button>
            )}
          </div>
          
          <button
            onClick={() => setSelectedOrderDetails(null)}
            className="btn-admin-save"
            style={{ padding: '12px 30px' }}
          >
            Закрыть детали
          </button>
        </div>
      </div>
    </div>
  );
}
