import React from 'react';
import { useQuery } from '@tanstack/react-query';
import orderServices from '../services/orders-services';
import { useNavigate } from 'react-router';

export default function Courier() {
  const navigate = useNavigate();
  
  const { data: orders, isLoading, isError } = useQuery({
    queryKey: ['orders'],
    queryFn: () => orderServices.getOrders(),
    // Обновляем данные каждые 3 секунды, чтобы сразу видеть новые заказы
    refetchInterval: 3000
  });

  if (isLoading) return <div style={{ padding: '20px' }}>Загрузка заказов...</div>;
  if (isError) return <div style={{ padding: '20px' }}>Ошибка загрузки заказов</div>;

  // Фильтруем и показываем новые заказы сверху (отсортируем реверсом, чтобы новые были первыми)
  const availableOrders = orders
    .filter(order => order.status === "Ready for Pickup")
    .reverse();

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <button 
        style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', marginBottom: '20px' }} 
        onClick={() => navigate('/')}
      >
        ← На главную
      </button>

      <h1>Эмуляция Курьера 🛵</h1>
      <p style={{ color: '#666', marginBottom: '30px' }}>
        Здесь курьер видит заказы в реальном времени. Страница сама обновляется каждые 3 секунды. Оформите заказ за клиента, и он тут же появится здесь!
      </p>
      
      {availableOrders.length === 0 ? (
        <div style={{ padding: '30px', background: '#f9f9f9', borderRadius: '12px', textAlign: 'center', color: '#888' }}>
          Новых заказов пока нет. Ждем клиентов...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {availableOrders.map(order => (
            <div key={order.id} style={{ 
              border: '1px solid #eee', 
              padding: '20px', 
              borderRadius: '16px',
              background: '#fff',
              boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <strong style={{ fontSize: '20px', color: '#333' }}>{order.vendorName}</strong>
                <span style={{ background: '#00d26a', color: 'white', padding: '6px 16px', borderRadius: '20px', fontSize: '16px', fontWeight: 'bold' }}>
                  Доход: {order.fee} PLN
                </span>
              </div>
              
              <div style={{ background: '#f5f5f5', padding: '12px', borderRadius: '8px', marginBottom: '15px', color: '#444' }}>
                <strong>Состав заказа:</strong> {order.items}
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#888', fontSize: '14px' }}>
                <span>Время заказа: {order.createdAt}</span>
                <span>Ехать: {order.distance} км</span>
              </div>
              
              <button style={{
                marginTop: '20px',
                width: '100%',
                padding: '15px',
                background: '#000',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }} onClick={() => alert('В демо-версии курьер просто видит как поступают заказы!')}>
                Принять заказ
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
