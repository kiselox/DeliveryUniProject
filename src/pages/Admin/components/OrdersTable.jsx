// src/pages/Admin/components/OrdersTable.jsx
import React, { useState } from 'react';

export default function OrdersTable({
  orders,
  visibleCount,
  setVisibleCount,
  setEditingOrder,
  setNewCoefficient,
  setSelectedOrderDetails
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const getStatusBadge = (status) => {
    switch (status) {
      case "Ready for Pickup":
        return (
          <span style={{
            backgroundColor: 'rgba(255, 193, 7, 0.15)',
            color: '#ffc107',
            border: '1px solid rgba(255, 193, 7, 0.3)',
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: 'bold',
            whiteSpace: 'nowrap'
          }}>
            🟡 Ожидает
          </span>
        );
      case "Accepted":
        return (
          <span style={{
            backgroundColor: 'rgba(170, 59, 255, 0.15)',
            color: '#c480ff',
            border: '1px solid rgba(170, 59, 255, 0.3)',
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: 'bold',
            whiteSpace: 'nowrap'
          }}>
            🟣 Принят курьером
          </span>
        );
      case "Picked Up":
      case "Delivering":
        return (
          <span style={{
            backgroundColor: 'rgba(0, 210, 106, 0.15)',
            color: '#00d26a',
            border: '1px solid rgba(0, 210, 106, 0.3)',
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: 'bold',
            whiteSpace: 'nowrap'
          }}>
            🔵 В пути к клиенту
          </span>
        );
      case "Delivered":
        return (
          <span style={{
            backgroundColor: 'rgba(74, 144, 226, 0.15)',
            color: '#4a90e2',
            border: '1px solid rgba(74, 144, 226, 0.3)',
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: 'bold',
            whiteSpace: 'nowrap'
          }}>
            🟢 Доставлен
          </span>
        );
      case "Cancelled":
        return (
          <span style={{
            backgroundColor: 'rgba(255, 77, 77, 0.15)',
            color: '#ff4d4d',
            border: '1px solid rgba(255, 77, 77, 0.3)',
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: 'bold',
            whiteSpace: 'nowrap'
          }}>
            ❌ Отменен
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  const handleOpenSurgeModal = (e, order) => {
    e.stopPropagation();
    setEditingOrder(order);
    setNewCoefficient(order.coefficient?.toString() || '1.0');
  };

  const handleOpenDetailsModal = (e, order) => {
    e.stopPropagation();
    setSelectedOrderDetails(order);
  };

  // Safe time formatting for ISO / Local Date
  const formatTime = (timeString) => {
    if (!timeString) return '—';
    if (!timeString.includes('T')) return timeString; // standard fallback
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return timeString;
    }
  };

  // Dynamic anomaly calculation based on vehicle type and distance
  const getDelayInfo = (order) => {
    if (order.status === "Delivered" || order.status === "Cancelled") return null;

    const now = new Date();
    const createdTime = new Date(order.createdAt);
    if (isNaN(createdTime.getTime())) return null;

    if (order.status === "Ready for Pickup") {
      const elapsedMinutes = Math.floor((now - createdTime) / 60000);
      if (elapsedMinutes > 5) {
        return {
          type: 'pickup',
          minutes: elapsedMinutes,
          label: `⚠️ Задержка: +${elapsedMinutes} мин`
        };
      }
    } else if (order.status === "Accepted" || order.status === "Picked Up") {
      const startTime = order.acceptedAt ? new Date(order.acceptedAt) : createdTime;
      if (isNaN(startTime.getTime())) return null;

      const elapsedMinutes = Math.floor((now - startTime) / 60000);
      
      // Speed (km/h) based on assigned courier vehicle type: Velo = 15, Scooter = 20, Car = 30
      let speed = 18; // default
      if (order.courierId === 'cour1') speed = 15;
      else if (order.courierId === 'cour2') speed = 20;
      else if (order.courierId === 'cour3') speed = 30;

      const distance = parseFloat(order.distance) || 0.0;
      const expectedMinutes = Math.round((distance / speed) * 60 + 5); // distance + 5m buffer

      if (elapsedMinutes > expectedMinutes) {
        const delay = elapsedMinutes - expectedMinutes;
        return {
          type: 'delivery',
          minutes: delay,
          label: `🚨 Опоздание: +${delay} мин`
        };
      }
    }
    return null;
  };

  // Filter orders by search query
  const filteredOrders = orders.filter(order => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      order.id.toLowerCase().includes(q) ||
      order.vendorName.toLowerCase().includes(q) ||
      (order.phone || '').toLowerCase().includes(q) ||
      (order.items || '').toLowerCase().includes(q) ||
      (order.courierId || '').toLowerCase().includes(q)
    );
  });

  const pageOrders = filteredOrders.slice(0, visibleCount);

  return (
    <div className="support-glass-card">
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '15px'
      }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>
          📦 Живой монитор всех заказов Poznań
        </h2>
        
        <input 
          type="text"
          placeholder="🔍 Поиск по ID, ресторану, телефону или еде..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            padding: '8px 16px',
            backgroundColor: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '10px',
            color: '#fff',
            fontSize: '14px',
            width: '350px'
          }}
        />
      </div>
      
      {filteredOrders.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '15px' }}>
          {searchQuery ? 'Заказы по вашему поисковому запросу не найдены.' : 'Активных заказов в системе нет. Ждем отправлений...'}
        </div>
      ) : (
        <>
          <div className="support-orders-table-wrapper">
            <table className="support-table-container">
              <thead>
                <tr>
                  <th>Время</th>
                  <th>ID Заказа</th>
                  <th>🏪 Ресторан</th>
                  <th>🛒 Блюда</th>
                  <th>👤 Телефон</th>
                  <th>🛵 Курьер</th>
                  <th>Статус</th>
                  <th>Плата (Доставка)</th>
                  <th style={{ textAlign: 'right' }}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {pageOrders.map(order => {
                  const hasCourier = !!order.courierId;
                  const delayInfo = getDelayInfo(order);
                  
                  return (
                    <tr 
                      key={order.id} 
                      className="support-table-row"
                      style={{
                        backgroundColor: order.status === 'Cancelled' ? 'rgba(255,255,255,0.01)' : 'transparent',
                        opacity: order.status === 'Cancelled' ? 0.5 : 1
                      }}
                      onClick={() => setSelectedOrderDetails(order)}
                    >
                      {/* Time Column with Pulsing Delay Badge */}
                      <td style={{ color: '#c480ff', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          <span>🕒 {formatTime(order.createdAt)}</span>
                          {delayInfo && (
                            <span 
                              className="delay-warning-badge"
                              style={{
                                fontSize: '10px',
                                fontWeight: 'bold',
                                color: delayInfo.type === 'pickup' ? '#ffc107' : '#ff4d4d',
                                backgroundColor: delayInfo.type === 'pickup' ? 'rgba(255,193,7,0.12)' : 'rgba(255,77,77,0.12)',
                                border: delayInfo.type === 'pickup' ? '1px solid rgba(255,193,7,0.3)' : '1px solid rgba(255,77,77,0.3)',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                width: 'fit-content',
                                animation: 'pulse 1.5s infinite'
                              }}
                            >
                              {delayInfo.label}
                            </span>
                          )}
                        </div>
                      </td>
                      
                      <td style={{ fontFamily: 'monospace', fontSize: '13px', color: '#ff7beb' }}>
                        #{order.id.slice(-6).toUpperCase()}
                      </td>
                      <td style={{ fontWeight: 'bold' }}>{order.vendorName}</td>
                      <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {order.items}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {order.phone || '—'}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {order.courierId ? (
                          <span style={{ color: '#00d26a', fontWeight: 'bold' }}>🟢 {order.courierId}</span>
                        ) : (
                          <span style={{ color: 'rgba(255,255,255,0.3)' }}>
                            {order.status === 'Cancelled' ? '—' : '— Не назначен'}
                          </span>
                        )}
                      </td>
                      <td>{getStatusBadge(order.status)}</td>
                      
                      {/* Delivery Payout Column */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {order.status !== 'Cancelled' && (
                            <span style={{ 
                              fontSize: '11px', 
                              fontWeight: 'bold', 
                              color: order.coefficient > 1.0 ? '#ff3b30' : '#ffc107',
                              backgroundColor: order.coefficient > 1.0 ? 'rgba(255,59,48,0.15)' : 'rgba(255,193,7,0.1)',
                              border: order.coefficient > 1.0 ? '1px solid rgba(255,59,48,0.3)' : '1px solid rgba(255,193,7,0.2)',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              width: 'fit-content'
                            }}>
                              ⚡ x{order.coefficient ? parseFloat(order.coefficient).toFixed(1) : '1.0'}
                            </span>
                          )}
                          
                          {/* Hide absolute payouts when courier is unassigned */}
                          {hasCourier && order.status !== 'Cancelled' ? (
                            <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#00d26a' }}>
                              {order.fee} PLN
                              <span style={{ display: 'block', fontSize: '10px', color: 'rgba(255,255,255,0.5)', fontWeight: 'normal' }}>
                                Итого: {order.totalPrice} PLN
                              </span>
                            </div>
                          ) : (
                            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>
                              {order.status === 'Cancelled' ? 'Отменен' : 'Скрыто до назначения'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Action buttons */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          {order.status !== 'Cancelled' && order.status !== 'Delivered' && (
                            <button
                              onClick={(e) => handleOpenSurgeModal(e, order)}
                              style={{
                                padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,59,48,0.3)',
                                backgroundColor: 'rgba(255,59,48,0.1)', color: '#ff4d4d', fontWeight: 'bold',
                                cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap'
                              }}
                            >
                              ⚡ Спрос
                            </button>
                          )}
                          
                          <button
                            onClick={(e) => handleOpenDetailsModal(e, order)}
                            style={{
                              padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)',
                              backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff', fontWeight: 'bold',
                              cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap'
                            }}
                          >
                            👁️ Детали
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Lazy Load Paginated trigger */}
          {filteredOrders.length > visibleCount && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
              <button
                onClick={() => setVisibleCount(prev => prev + 10)}
                style={{
                  padding: '12px 24px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)',
                  backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff', fontWeight: 'bold',
                  cursor: 'pointer', fontSize: '14px', transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                onMouseOut={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.05)'}
              >
                Показать еще 10 заказов
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
