// src/pages/Admin/components/OrderStatusBadge.jsx

export default function OrderStatusBadge({ status }) {
  switch (status) {
    case "Ready for Pickup":
      return (
        <span style={{
          backgroundColor: 'rgba(255, 193, 7, 0.15)', color: '#ffc107',
          border: '1px solid rgba(255, 193, 7, 0.3)', padding: '6px 12px',
          borderRadius: '20px', fontSize: '13px', fontWeight: 'bold'
        }}>
          🟡 Ожидает
        </span>
      );
    case "Accepted":
      return (
        <span style={{
          backgroundColor: 'rgba(170, 59, 255, 0.15)', color: '#c480ff',
          border: '1px solid rgba(170, 59, 255, 0.3)', padding: '6px 12px',
          borderRadius: '20px', fontSize: '13px', fontWeight: 'bold'
        }}>
          🟣 Принят курьером
        </span>
      );
    case "Picked Up":
    case "Delivering":
      return (
        <span style={{
          backgroundColor: 'rgba(0, 210, 106, 0.15)', color: '#00d26a',
          border: '1px solid rgba(0, 210, 106, 0.3)', padding: '6px 12px',
          borderRadius: '20px', fontSize: '13px', fontWeight: 'bold'
        }}>
          🔵 В пути к клиенту
        </span>
      );
    case "Delivered":
      return (
        <span style={{
          backgroundColor: 'rgba(74, 144, 226, 0.15)', color: '#4a90e2',
          border: '1px solid rgba(74, 144, 226, 0.3)', padding: '6px 12px',
          borderRadius: '20px', fontSize: '13px', fontWeight: 'bold'
        }}>
          🟢 Доставлен
        </span>
      );
    case "Cancelled":
      return (
        <span style={{
          backgroundColor: 'rgba(255, 77, 77, 0.15)', color: '#ff4d4d',
          border: '1px solid rgba(255, 77, 77, 0.3)', padding: '6px 12px',
          borderRadius: '20px', fontSize: '13px', fontWeight: 'bold'
        }}>
          ❌ Отменен
        </span>
      );
    default:
      return <span style={{ color: '#fff', fontSize: '13px' }}>{status}</span>;
  }
}
