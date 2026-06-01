import { useState, useEffect } from 'react';
import api from '../../../services/api';

export default function OrderDetailsModal({
  selectedOrderDetails,
  setSelectedOrderDetails,
  safeSettings,
  getStatusBadge,
  updateOrder,
  refetchOrders,
  setActiveTab,
  setSelectedChatId,
  setSidebarSubTab
}) {
  const [cancelling, setCancelling] = useState(false);
  const [customerProfile, setCustomerProfile] = useState(null);
  const [courierProfile, setCourierProfile] = useState(null);

  const order = selectedOrderDetails;

  const handleWriteToPartner = (roleType) => {
    if (!order) return;
    const isDeliveredOrCancelled = order.status === 'Delivered' || order.status === 'Cancelled';
    let chatId = '';
    let subTab = 'orders';

    if (roleType === 'customer') {
      if (isDeliveredOrCancelled) {
        chatId = `general-${order.customerId}`;
        subTab = 'general';
      } else {
        chatId = `order-${order.id}`;
        subTab = 'orders';
      }
    } else if (roleType === 'courier') {
      if (!order.courierId) return;
      if (isDeliveredOrCancelled) {
        chatId = `general-${order.courierId}`;
        subTab = 'general';
      } else {
        chatId = `order-${order.id}-courier`;
        subTab = 'orders';
      }
    }

    if (chatId) {
      if (setSelectedChatId) setSelectedChatId(chatId);
      if (setSidebarSubTab) setSidebarSubTab(subTab);
      if (setActiveTab) setActiveTab('support');
      setSelectedOrderDetails(null);
    }
  };

  useEffect(() => {
    if (order?.customerId) {
      api.get(`/customers/${order.customerId}`)
        .then(res => setCustomerProfile(res.data))
        .catch(err => console.error('Error fetching customer details:', err));
    } else {
      setTimeout(() => {
        setCustomerProfile(null);
      }, 0);
    }

    if (order?.courierId) {
      api.get(`/couriers/${order.courierId}`)
        .then(res => setCourierProfile(res.data))
        .catch(err => console.error('Error fetching courier details:', err));
    } else {
      setTimeout(() => {
        setCourierProfile(null);
      }, 0);
    }
  }, [order?.customerId, order?.courierId]);

  if (!selectedOrderDetails) return null;

  const coefficientVal = parseFloat(order?.coefficient || 1.0);
  
  const pricePerKm = safeSettings?.pricePerKm !== undefined ? safeSettings.pricePerKm : 4.0;
  const scooterPricePerKm = safeSettings?.scooterPricePerKm !== undefined ? safeSettings.scooterPricePerKm : 5.5;
  const carPricePerKm = safeSettings?.carPricePerKm !== undefined ? safeSettings.carPricePerKm : 7.0;
  const surcharge = safeSettings?.globalSurcharge !== undefined ? safeSettings.globalSurcharge : 0.0;
  const distance = parseFloat(order?.distance) || 0.0;

  const veloPayout = Math.max(5.0, Math.round((distance * pricePerKm + surcharge) * coefficientVal));
  const scooterPayout = Math.max(5.0, Math.round((distance * scooterPricePerKm + surcharge) * coefficientVal));
  const carPayout = Math.max(5.0, Math.round((distance * carPricePerKm + surcharge) * coefficientVal));

  const formatFullDateTime = (isoString) => {
    if (!isoString) return '—';
    const strVal = String(isoString);
    if (!strVal.includes('T')) return `Today, ${strVal}`;
    try {
      const date = new Date(strVal);
      if (isNaN(date.getTime())) return strVal;
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `${day}.${month}.${year} at ${time}`;
    } catch {
      return strVal;
    }
  };

  const handleCancel = async () => {
    if (!window.confirm("🚨 WARNING: Are you sure you want to completely CANCEL this order in the system? \nThe courier will be automatically removed from the order.")) return;
    try {
      setCancelling(true);
      await updateOrder({
        orderId: order.id,
        updates: { status: 'Cancelled' }
      });
      alert("❌ Order successfully cancelled!");
      setSelectedOrderDetails(null);
      if (refetchOrders) refetchOrders();
    } catch (err) {
      alert("Failed to cancel order: " + err.message);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="admin-modal-overlay">
      <div className="admin-modal-content admin-modal-large">
        {}
        <button
          onClick={() => setSelectedOrderDetails(null)}
          className="btn-admin-close admin-modal-close-pos"
        >
          ×
        </button>

        {}
        <div className="admin-modal-header">
          <span className="admin-modal-pretitle">
            COMPLETE ORDER DETAILS
          </span>
          <h3 className="admin-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            #{order?.id ? order.id.toUpperCase() : '—'}
          </h3>
          <div className="admin-modal-subtitle-row">
            {getStatusBadge ? getStatusBadge(order?.status) : <span>{order?.status}</span>}
            <span className="admin-modal-subtitle-item">
              Distance: 📏 {order?.distance} km
            </span>
          </div>
        </div>

        {}
        <div className="admin-modal-grid-2col">
          
          {}
          <div className="admin-modal-card flex-column-gap-sm">
            <h4 className="admin-modal-card-title">
              🏬 Restaurant & Dishes
            </h4>
            <div className="admin-modal-card-highlight">
              {order?.vendorName}
            </div>
            <div className="admin-modal-body-text" style={{ opacity: 0.8, whiteSpace: 'pre-line', backgroundColor: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px' }}>
              {order?.items}
            </div>
            
            <div className="admin-modal-timeline">
              <div>📅 <strong>Created:</strong> {formatFullDateTime(order?.createdAt)}</div>
              {order?.acceptedAt && (
                <div className="text-purple">🟣 <strong>Accepted by courier:</strong> {formatFullDateTime(order.acceptedAt)}</div>
              )}
              {order?.pickedUpAt && (
                <div className="text-green">🍲 <strong>Picked up at restaurant:</strong> {formatFullDateTime(order.pickedUpAt)}</div>
              )}
            </div>
          </div>

          {}
          <div className="admin-modal-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 className="admin-modal-card-title">
              📍 Address & Recipient
            </h4>
            
            <div className="admin-modal-body-text">
              <div>👤 <strong>Name:</strong> {customerProfile ? `${customerProfile.name || ''} ${customerProfile.lastName || ''}`.trim() || '—' : order?.customerId || '—'}</div>
              {customerProfile?.email && <div className="mt-xs">✉️ <strong>Email:</strong> {customerProfile.email}</div>}
              <div className="mt-xs">📞 <strong>Phone:</strong> {customerProfile?.phone || order?.phone || '—'}</div>
              
              <button
                onClick={() => handleWriteToPartner('customer')}
                className="admin-modal-btn-partner"
              >
                💬 Message client {order?.status === 'Delivered' ? '(general chat)' : '(for this order)'}
              </button>
 
              <div className="admin-modal-card-total-row">
                📍 Address: {order?.deliveryAddress}
              </div>
            </div>

            {}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
              fontSize: '12px',
              backgroundColor: 'rgba(0,0,0,0.15)',
              padding: '10px',
              borderRadius: '8px'
            }}>
              <div>🏠 <strong>House:</strong> {order?.house || '—'}</div>
              <div>🚪 <strong>Apt:</strong> {order?.apartment || '—'}</div>
              <div>🏢 <strong>Floor:</strong> {order?.floor || '—'}</div>
            </div>

            {order?.notes && (
              <div style={{
                padding: '8px 10px',
                backgroundColor: 'rgba(255, 193, 7, 0.08)',
                border: '1px solid rgba(255, 193, 7, 0.2)',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#ffc107',
                fontStyle: 'italic'
              }}>
                <strong>Note:</strong> "{order.notes}"
              </div>
            )}

            {order?.courierId && (
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
                <div>🛵 <strong>Assigned courier:</strong></div>
                <div className="admin-modal-card-name">
                  {courierProfile ? `${courierProfile.name || ''} ${courierProfile.lastName || ''}`.trim() || '—' : order.courierId || '—'}
                </div>
                <div className="admin-modal-card-subtext">
                  Vehicle: {courierProfile?.vehicle === 'Car' ? '🚗 Car' : courierProfile?.vehicle === 'Scooter' ? '🛵 Scooter' : '🚲 Bicycle'}
                </div>
                {courierProfile?.phone && <div className="admin-modal-card-subtext">📞 Tel: {courierProfile.phone}</div>}
                {courierProfile?.email && <div className="admin-modal-card-subtext">✉️ Email: {courierProfile.email}</div>}

                <button
                  onClick={() => handleWriteToPartner('courier')}
                  className="admin-modal-btn-courier"
                >
                  💬 Message courier {order?.status === 'Delivered' ? '(general chat)' : '(for this order)'}
                </button>
              </div>
            )}
          </div>
        </div>

        {}
        <div className="admin-modal-wide-card">
          <div className="admin-modal-wide-card-header">
            <div>
              <span className="admin-modal-wide-card-pretitle">
                ORDER FINANCIAL STATUS
              </span>
              <div className="admin-modal-wide-card-title">
                Surge demand coefficient: <span className="text-red">⚡ x{coefficientVal.toFixed(1)}</span>
              </div>
            </div>
            <div className="text-right">
              {order?.courierId && order?.status !== 'Cancelled' ? (
                <>
                  <div className="admin-modal-wide-card-total">
                    {order?.fee} PLN (delivery)
                  </div>
                  <div className="admin-modal-wide-card-subtotal">
                    Total: {order?.totalPrice} PLN
                  </div>
                </>
              ) : (
                <div className="admin-modal-warning-text">
                  {order?.status === 'Cancelled' ? '❌ Order cancelled (payment blocked)' : '⚠️ Financial details hidden until courier is assigned'}
                </div>
              )}
            </div>
          </div>

          {order?.status !== 'Cancelled' && (
            <>
              <div className="admin-modal-wide-card-subtitle">
                💸 Estimated courier payout (with surge):
              </div>
              
              <div className="admin-modal-wide-grid">
                {}
                <div className="admin-modal-wide-grid-item">
                  <span className="admin-modal-wide-grid-item-label">BICYCLE</span>
                  <strong className="admin-modal-wide-grid-item-value">{veloPayout} PLN</strong>
                </div>

                {}
                <div className="admin-modal-wide-grid-item">
                  <span className="admin-modal-wide-grid-item-label">SCOOTER</span>
                  <strong className="admin-modal-wide-grid-item-value">{scooterPayout} PLN</strong>
                </div>

                {}
                <div className="admin-modal-wide-grid-item">
                  <span className="admin-modal-wide-grid-item-label">CAR</span>
                  <strong className="admin-modal-wide-grid-item-value">{carPayout} PLN</strong>
                </div>
              </div>
            </>
          )}
        </div>

        {}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            {order?.status !== 'Cancelled' && order?.status !== 'Delivered' && (
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
                {cancelling ? 'Cancelling...' : '❌ Cancel Order'}
              </button>
            )}
          </div>
          
          <button
            onClick={() => setSelectedOrderDetails(null)}
            className="btn-admin-save"
            style={{ padding: '12px 30px' }}
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}
