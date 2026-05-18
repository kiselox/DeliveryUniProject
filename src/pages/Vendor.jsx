import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function Vendor() {
  const queryClient = useQueryClient();

  // 1. Скачиваем заказы из json-server через useQuery
  const { data: orders = [], isLoading, isError } = useQuery({
    queryKey: ['orders'],
    queryFn: () => fetch('http://localhost:3001/orders').then(res => res.json())
  });

  // 2. Логика для кнопки [READY FOR PICKUP]
  const mutation = useMutation({
    mutationFn: (orderId) => {
      return fetch(`http://localhost:3001/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Ready for Pickup' })
      }).then(res => res.json());
    },
    // Как только статус на сервере изменился, обновляем экран
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
  });

  if (isLoading) return <div className="loading">Загрузка заказов для кухни...</div>;
  if (isError) return <div className="error">Ошибка сервера! Проверь, запущен ли json-server.</div>;

  return (
    <div className="vendor-container">
      <h1>Панель Ресторана (Вендор)</h1>
      <div className="orders-grid">
        {orders.map(order => (
          <div key={order.id} className="order-card">
            <h3>Заказ #{order.id}</h3>
            <p>Что приготовить: <strong>{order.items}</strong></p>
            <p>Текущий статус: <span className="status-badge">{order.status}</span></p>
            
            {/* Кнопка показывается только если заказ еще готовится */}
            {order.status === 'Preparing' && (
              <button 
                className="btn-ready"
                onClick={() => mutation.mutate(order.id)}
                disabled={mutation.isPending}
              >
                {mutation.isPending ? 'Обновление...' : '[READY FOR PICKUP]'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}