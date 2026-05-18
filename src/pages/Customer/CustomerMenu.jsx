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
  
  // cart: { [itemId]: quantity }
  const [cart, setCart] = useState({});

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

  const handleCheckout = () => {
    if (totalItems === 0) return;
    
    const cartItems = vendor.menu.filter(item => cart[item.id]);
    const itemsString = cartItems.map(item => `${cart[item.id]}x ${item.name}`).join(', ');
    const totalFee = cartItems.reduce((sum, item) => sum + Math.round(item.price * 0.2) * cart[item.id], 0);
    
    const orderData = {
      customerId: customerId,
      vendorId: vendor.id,
      vendorName: vendor.name,
      items: itemsString,
      status: "Ready for Pickup",
      distance: (Math.random() * 5 + 1).toFixed(1),
      fee: totalFee,
      courierId: null,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    mutation.mutate(orderData);
  };

  if (isLoading) return <div className="customer-container">Загрузка меню ресторана...</div>;
  if (isError || !vendor) return <div className="customer-container">Ошибка загрузки ресторана!</div>;

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
          <input type="text" placeholder="Search menu..." />
          <span>🔍</span>
        </div>
      </div>

      <div className="menu-section">
        <h3 className="section-title">Popular Items</h3>
        <div className="menu-grid">
          {vendor.menu.map(item => (
            <MenuItemCard 
              key={item.id} 
              item={item} 
              quantity={cart[item.id] || 0}
              onAdd={() => handleAddToCart(item)} 
              onRemove={() => handleRemoveFromCart(item)}
            />
          ))}
        </div>
      </div>

      {/* Плавающая кнопка корзины (теперь всегда видна, но может быть disabled) */}
      <button 
        className="floating-cart-btn" 
        onClick={handleCheckout}
        disabled={totalItems === 0 || mutation.isPending}
      >
        🛒
        {totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
      </button>
    </div>
  );
}
