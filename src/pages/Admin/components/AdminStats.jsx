// src/pages/Admin/components/AdminStats.jsx

export default function AdminStats({ orders }) {
  const pendingOrders = orders.filter(o => o.status === "Ready for Pickup").length;
  const activeDeliveries = orders.filter(o => o.status === "Accepted" || o.status === "Picked Up" || o.status === "Delivering").length;
  const completedDeliveries = orders.filter(o => o.status === "Delivered").length;

  return (
    <div className="analytics-grid">
      <div className="analytic-card">
        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', fontWeight: 'bold' }}>🛒 Ожидают курьера</span>
        <div style={{ fontSize: '32px', fontWeight: '800', marginTop: '5px', color: '#ffc107' }}>{pendingOrders}</div>
      </div>
      <div className="analytic-card">
        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', fontWeight: 'bold' }}>🔵 Доставляются сейчас</span>
        <div style={{ fontSize: '32px', fontWeight: '800', marginTop: '5px', color: '#aa3bff' }}>{activeDeliveries}</div>
      </div>
      <div className="analytic-card">
        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', fontWeight: 'bold' }}>🟢 Успешно доставлено</span>
        <div style={{ fontSize: '32px', fontWeight: '800', marginTop: '5px', color: '#00d26a' }}>{completedDeliveries}</div>
      </div>
    </div>
  );
}
