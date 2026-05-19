import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import vendorsServices from '../../services/vendors-services';
import customerServices from '../../services/customer-services';
import orderServices from '../../services/orders-services';
import Header from '../../components/Header';
import MenuItemCard from '../../components/MenuItemCard';

export default function CustomerMenu() {
  const { id: customerId, vendorId } = useParams();
  const navigate = useNavigate();
  
  const [cart, setCart] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);

  const { data: customer } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => customerServices.getCustomerById(customerId)
  });

  const { data: vendor, isLoading, isError } = useQuery({
    queryKey: ['vendor', vendorId],
    queryFn: () => vendorsServices.getVendorById(vendorId)
  });

  const mutation = useMutation({
    mutationFn: (newOrder) => orderServices.createOrder(newOrder),
    onSuccess: () => {
      alert('Заказ успешно оформлен и передан курьеру!');
      setCart({});
      setIsCartOpen(false);
      navigate(`/customer/${customerId}`);
    }
  });

  const handleAddToCart = (menuItem) => {
    setCart(prev => ({
      ...prev,
      [menuItem.id]: (prev[menuItem.id] || 0) + 1
    }));
  };

  const handleRemoveFromCart = (menuItem) => {
    setCart(prev => {
      const newCart = { ...prev };
      if (newCart[menuItem.id] > 1) {
        newCart[menuItem.id] -= 1;
      } else {
        delete newCart[menuItem.id];
      }
      return newCart;
    });
  };

  const totalItems = Object.values(cart).reduce((sum, q) => sum + q, 0);

  // Логика поиска
  const filteredMenu = vendor?.menu.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleCheckout = () => {
    if (totalItems === 0) return;
    
    const cartItems = vendor.menu.filter(item => cart[item.id]);
    const itemsString = cartItems.map(item => `${cart[item.id]}x ${item.name}`).join(', ');
    const totalFee = cartItems.reduce((sum, item) => sum + Math.round(item.price * 0.2) * cart[item.id], 0);
    const orderTotal = cartItems.reduce((sum, item) => sum + (item.price * cart[item.id]), 0);
    
    const orderData = {
      customerId: customerId,
      vendorId: vendor.id,
      vendorName: vendor.name,
      items: itemsString,
      status: "Ready for Pickup",
      distance: (Math.random() * 5 + 1).toFixed(1),
      fee: totalFee,
      totalPrice: orderTotal + totalFee,
      courierId: null,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    mutation.mutate(orderData);
  };

  if (isLoading) return <div className="customer-container">Загрузка меню ресторана...</div>;
  if (isError || !vendor) return <div className="customer-container">Ошибка загрузки ресторана!</div>;

  // Данные для модалки корзины
  const cartItemsData = vendor.menu.filter(item => cart[item.id] > 0);
  const totalFoodPrice = cartItemsData.reduce((sum, item) => sum + (item.price * cart[item.id]), 0);
  const totalDeliveryFee = cartItemsData.reduce((sum, item) => sum + Math.round(item.price * 0.2) * cart[item.id], 0);

  return (
    <div className="customer-container">
      <Header address={customer?.address} />

      <button className="btn-back" onClick={() => navigate(-1)}>
        ← Назад к ресторанам
      </button>

      <div className="vendor-hero">
        <img 
          src={vendor.heroImage || `https://placehold.co/1200x300/111/555?text=${vendor.name}`} 
          alt="Hero" 
          className="vendor-hero-img" 
        />
        <div className="vendor-logo-wrapper">
          <img src={vendor.imageUrl} alt={vendor.name} className="vendor-logo" />
        </div>
        <h2 className="vendor-hero-title">{vendor.name}</h2>
        
        <div className="vendor-search-bar">
          <input 
            type="text" 
            placeholder="Search menu..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <span>🔍</span>
        </div>
      </div>

      <div className="menu-section">
        <h3 className="section-title">Popular Items</h3>
        
        {filteredMenu.length === 0 ? (
          <p>Ничего не найдено по вашему запросу "{searchTerm}"</p>
        ) : (
          <div className="menu-grid">
            {filteredMenu.map(item => (
              <MenuItemCard 
                key={item.id} 
                item={item} 
                quantity={cart[item.id] || 0}
                onAdd={() => handleAddToCart(item)} 
                onRemove={() => handleRemoveFromCart(item)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Плавающая кнопка корзины */}
      <button 
        className="floating-cart-btn" 
        onClick={() => setIsCartOpen(true)}
        disabled={totalItems === 0 || mutation.isPending}
      >
        🛒
        {totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
      </button>

      {/* Модальное окно Корзины */}
      {isCartOpen && (
        <div className="modal-overlay" onClick={() => setIsCartOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Ваша Корзина</h2>
              <button className="btn-close" onClick={() => setIsCartOpen(false)}>×</button>
            </div>
            
            {cartItemsData.length === 0 ? (
              <p>Ваша корзина пуста.</p>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {cartItemsData.map(item => (
                    <MenuItemCard 
                      key={`cart-${item.id}`} 
                      item={item} 
                      quantity={cart[item.id]}
                      onAdd={() => handleAddToCart(item)} 
                      onRemove={() => handleRemoveFromCart(item)}
                    />
                  ))}
                </div>
                
                <div className="modal-total">
                  <div>Стоимость блюд: {totalFoodPrice} PLN</div>
                  <div style={{ color: '#888', fontSize: '16px' }}>Доставка: {totalDeliveryFee} PLN</div>
                  <div style={{ marginTop: '10px', fontSize: '24px', color: 'var(--green)' }}>
                    Итого: {totalFoodPrice + totalDeliveryFee} PLN
                  </div>
                </div>

                <button 
                  className="btn-confirm-order" 
                  onClick={handleCheckout}
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? 'Оформляем заказ...' : 'Подтвердить заказ'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
