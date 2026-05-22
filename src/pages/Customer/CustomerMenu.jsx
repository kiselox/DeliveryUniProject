import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import vendorsServices from '../../services/vendors-services';
import customerServices from '../../services/customer-services';
import orderServices from '../../services/orders-services';
import Header from '../../components/Header';
import MenuItemCard from '../../components/MenuItemCard';

const PRESET_COORDINATES = {
  'Półwiejska': { lat: 52.4023, lng: 16.9261 },
  'Garbary': { lat: 52.4045, lng: 16.9372 },
  'Jeżyce': { lat: 52.4115, lng: 16.9068 },
  'Malta': { lat: 52.4018, lng: 16.9205 },
  'Dormitory CDV': { lat: 52.4140, lng: 16.9295 }
};

export default function CustomerMenu() {
  const { id: customerId, vendorId } = useParams();
  const navigate = useNavigate();
  
  const [cart, setCart] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // Checkout address & pinning states
  const [deliveryAddress, setDeliveryAddress] = useState('Dormitory CDV, Poznan');
  const [deliveryLat, setDeliveryLat] = useState(52.4140);
  const [deliveryLng, setDeliveryLng] = useState(16.9295);
  const [house, setHouse] = useState('');
  const [apartment, setApartment] = useState('');
  const [floor, setFloor] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  // Map refs
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  const { data: customer } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => customerServices.getCustomerById(customerId),
    onSuccess: (data) => {
      if (data?.address) {
        setDeliveryAddress(data.address);
      }
      if (data?.lat && data?.lng) {
        setDeliveryLat(data.lat);
        setDeliveryLng(data.lng);
      }
    }
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

  // Search logic
  const filteredMenu = vendor?.menu.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleCheckout = () => {
    if (totalItems === 0) return;
    if (!phone.trim()) {
      alert('Пожалуйста, введите номер телефона получателя для связи с курьером!');
      return;
    }
    
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
      distance: 0, // Calculated automatically by the backend using PostGIS / Haversine!
      fee: totalFee,
      totalPrice: orderTotal + totalFee,
      courierId: null,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      deliveryAddress: deliveryAddress,
      deliveryLat: deliveryLat,
      deliveryLng: deliveryLng,
      house: house,
      apartment: apartment,
      floor: floor,
      phone: phone,
      notes: notes
    };
    mutation.mutate(orderData);
  };

  const handlePresetClick = (preset) => {
    setDeliveryAddress(preset);
    const coords = PRESET_COORDINATES[preset];
    if (coords) {
      setDeliveryLat(coords.lat);
      setDeliveryLng(coords.lng);
      if (mapRef.current) {
        mapRef.current.setView([coords.lat, coords.lng], 14);
      }
      if (markerRef.current) {
        markerRef.current.setLatLng([coords.lat, coords.lng]);
      }
    }
  };

  const handleGetCurrentPosition = () => {
    if (!navigator.geolocation) {
      alert("Геолокация не поддерживается вашим браузером.");
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        setDeliveryLat(lat);
        setDeliveryLng(lng);
        
        // Find closest preset
        let closestPreset = 'Dormitory CDV';
        let minDist = Infinity;
        
        for (const [name, coords] of Object.entries(PRESET_COORDINATES)) {
          const d = Math.pow(lat - coords.lat, 2) + Math.pow(lng - coords.lng, 2);
          if (d < minDist) {
            minDist = d;
            closestPreset = name;
          }
        }
        
        setDeliveryAddress(`${closestPreset} (Моя геопозиция)`);
        
        // Update Leaflet map and marker
        if (mapRef.current) {
          mapRef.current.setView([lat, lng], 15);
        }
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        }
      },
      (error) => {
        alert("Не удалось определить вашу геопозицию: " + error.message);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Leaflet Micro-map initialization when checkout modal opens
  useEffect(() => {
    if (!isCartOpen) {
      // Clean up map when modal is closed
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
      return;
    }

    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      const L = window.L;
      if (!L) return;

      if (!mapRef.current) {
        const map = L.map(mapContainerRef.current).setView([deliveryLat, deliveryLng], 14);
        
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; OpenStreetMap &copy; CARTO',
          subdomains: 'abcd',
          maxZoom: 20
        }).addTo(map);

        const customPinIcon = L.divIcon({
          html: `<div style="background-color: #ff3b30; width: 34px; height: 34px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 18px; line-height: 1;">📍</div>`,
          className: 'custom-pin-icon',
          iconSize: [34, 34],
          iconAnchor: [17, 34]
        });

        const marker = L.marker([deliveryLat, deliveryLng], { 
          icon: customPinIcon,
          draggable: true 
        }).addTo(map);

        marker.on('dragend', () => {
          const latLng = marker.getLatLng();
          setDeliveryLat(latLng.lat);
          setDeliveryLng(latLng.lng);
        });

        map.on('click', (e) => {
          const { lat, lng } = e.latlng;
          marker.setLatLng([lat, lng]);
          setDeliveryLat(lat);
          setDeliveryLng(lng);
        });

        mapRef.current = map;
        markerRef.current = marker;
      } else {
        mapRef.current.invalidateSize();
        mapRef.current.setView([deliveryLat, deliveryLng]);
        if (markerRef.current) {
          markerRef.current.setLatLng([deliveryLat, deliveryLng]);
        }
      }
    }, 150);

    return () => {
      clearTimeout(timer);
    };
  }, [isCartOpen]);

  if (isLoading) return <div className="customer-container">Загрузка меню ресторана...</div>;
  if (isError || !vendor) return <div className="customer-container">Ошибка загрузки ресторана!</div>;

  // Cart modal calculation data
  const cartItemsData = vendor.menu.filter(item => cart[item.id] > 0);
  const totalFoodPrice = cartItemsData.reduce((sum, item) => sum + (item.price * cart[item.id]), 0);

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

      {/* Floating Cart Button */}
      <button 
        className="floating-cart-btn" 
        onClick={() => setIsCartOpen(true)}
        disabled={totalItems === 0 || mutation.isPending}
      >
        🛒
        {totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
      </button>

      {/* Cart Modal Overlay */}
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
                  <div style={{ color: '#888', fontSize: '14px' }}>Доставка рассчитывается при отправке (4 PLN/км)</div>
                  <div style={{ marginTop: '10px', fontSize: '24px', color: 'var(--green)' }}>
                    Итого (без доставки): {totalFoodPrice} PLN
                  </div>
                </div>

                {/* Geolocation Section */}
                <div style={{
                  marginBottom: '20px',
                  borderTop: '1px solid #eee',
                  paddingTop: '15px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  textAlign: 'left'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontWeight: 'bold', fontSize: '15px', color: '#111' }}>📍 Адрес доставки в Познани:</label>
                    <span style={{ fontSize: '11px', color: '#888', fontStyle: 'italic' }}>
                      ({deliveryLat.toFixed(4)}, {deliveryLng.toFixed(4)})
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input 
                      type="text"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Улица, например: Półwiejska, Garbary, Jeżyce..."
                      style={{
                        padding: '12px 14px',
                        borderRadius: '12px',
                        border: '1px solid #ccc',
                        fontSize: '15px',
                        flex: 1,
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleGetCurrentPosition}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, rgba(170, 59, 255, 0.2), rgba(170, 59, 255, 0.05))',
                        border: '1px solid rgba(170, 59, 255, 0.4)',
                        color: '#aa3bff',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        fontSize: '13px',
                        transition: 'all 0.2s',
                        boxShadow: '0 4px 15px rgba(170, 59, 255, 0.1)',
                        whiteSpace: 'nowrap'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(170, 59, 255, 0.35), rgba(170, 59, 255, 0.15))';
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(170, 59, 255, 0.2)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(170, 59, 255, 0.2), rgba(170, 59, 255, 0.05))';
                        e.currentTarget.style.boxShadow = '0 4px 15px rgba(170, 59, 255, 0.1)';
                      }}
                    >
                      📍 Моя геопозиция
                    </button>
                  </div>

                  {/* Preset buttons */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {['Półwiejska', 'Garbary', 'Jeżyce', 'Malta', 'Dormitory CDV'].map(preset => (
                      <button
                        key={preset}
                        onClick={() => handlePresetClick(preset)}
                        type="button"
                        style={{
                          padding: '5px 12px',
                          borderRadius: '16px',
                          border: '1px solid #e0e0e0',
                          backgroundColor: '#f5f5f5',
                          fontSize: '11px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          color: '#666',
                          transition: 'all 0.15s'
                        }}
                        onMouseOver={(e) => { e.target.style.backgroundColor = '#eae5fc'; e.target.style.color = '#aa3bff'; e.target.style.borderColor = '#aa3bff'; }}
                        onMouseOut={(e) => { e.target.style.backgroundColor = '#f5f5f5'; e.target.style.color = '#666'; e.target.style.borderColor = '#e0e0e0'; }}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  {/* Micro map container */}
                  <div style={{ position: 'relative', margin: '15px 0' }}>
                    <div 
                      ref={mapContainerRef} 
                      id="checkout-map" 
                      style={{
                        height: '180px',
                        width: '100%',
                        borderRadius: '10px',
                        border: '1px solid #ddd',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                        zIndex: 10
                      }}
                    />
                    <div style={{
                      position: 'absolute',
                      bottom: '5px',
                      right: '5px',
                      backgroundColor: 'rgba(255, 255, 255, 0.85)',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      color: '#444',
                      zIndex: 100,
                      fontWeight: 'bold',
                      pointerEvents: 'none'
                    }}>
                      Перетащите маркер 📍 или кликните карту
                    </div>
                  </div>

                  {/* Detailed Address Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: '#555', marginBottom: '4px', fontWeight: 'bold' }}>Дом/Корпус</label>
                      <input 
                        type="text"
                        value={house}
                        onChange={(e) => setHouse(e.target.value)}
                        placeholder="дом 12"
                        style={{
                          padding: '10px',
                          borderRadius: '8px',
                          border: '1px solid #ccc',
                          fontSize: '14px',
                          width: '100%',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: '#555', marginBottom: '4px', fontWeight: 'bold' }}>Квартира</label>
                      <input 
                        type="text"
                        value={apartment}
                        onChange={(e) => setApartment(e.target.value)}
                        placeholder="кв 45"
                        style={{
                          padding: '10px',
                          borderRadius: '8px',
                          border: '1px solid #ccc',
                          fontSize: '14px',
                          width: '100%',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: '#555', marginBottom: '4px', fontWeight: 'bold' }}>Этаж</label>
                      <input 
                        type="text"
                        value={floor}
                        onChange={(e) => setFloor(e.target.value)}
                        placeholder="3 этаж"
                        style={{
                          padding: '10px',
                          borderRadius: '8px',
                          border: '1px solid #ccc',
                          fontSize: '14px',
                          width: '100%',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  {/* Phone & Notes */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: '#555', marginBottom: '4px', fontWeight: 'bold' }}>📞 Телефон получателя *</label>
                      <input 
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+48 123 456 789"
                        required
                        style={{
                          padding: '10px',
                          borderRadius: '8px',
                          border: '1px solid #ccc',
                          fontSize: '14px',
                          width: '100%',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: '#555', marginBottom: '4px', fontWeight: 'bold' }}>📝 Заметка курьеру</label>
                      <textarea 
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Например: Оставить у двери, домофон не работает..."
                        style={{
                          padding: '10px',
                          borderRadius: '8px',
                          border: '1px solid #ccc',
                          fontSize: '13px',
                          width: '100%',
                          height: '60px',
                          outline: 'none',
                          resize: 'vertical',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
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
