// src/pages/Customer/CustomerMenu.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import L from 'leaflet';
import vendorsServices from '../../services/vendors-services';
import customerServices from '../../services/customer-services';
import Header from '../../components/Header';
import MenuItemCard from '../../components/MenuItemCard';
import CartDrawer from './components/CartDrawer';
import { useOrders } from '../../hooks/useOrders';
import SupportChatWidget from '../../components/SupportChatWidget';
import './Customer.css';

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

  // Custom hook for orders
  const { orders = [], createOrder, isCreating } = useOrders();

  // Find any active order for the client to chat about
  const activeOrder = orders.find(o => 
    o.customerId === customerId && 
    o.status !== "Delivered" && 
    o.status !== "Cancelled"
  );

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

  const handleCheckout = async () => {
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

    try {
      await createOrder(orderData);
      alert('Заказ успешно оформлен и передан курьеру!');
      setCart({});
      setIsCartOpen(false);
      navigate(`/customer/${customerId}`);
    } catch (err) {
      alert('Ошибка при создании заказа: ' + err.message);
    }
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
        disabled={totalItems === 0 || isCreating}
      >
        🛒
        {totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
      </button>

      {/* Refactored Cart Drawer Modal */}
      <CartDrawer 
        isCartOpen={isCartOpen}
        setIsCartOpen={setIsCartOpen}
        cartItemsData={cartItemsData}
        cart={cart}
        handleAddToCart={handleAddToCart}
        handleRemoveFromCart={handleRemoveFromCart}
        totalFoodPrice={totalFoodPrice}
        deliveryAddress={deliveryAddress}
        setDeliveryAddress={setDeliveryAddress}
        deliveryLat={deliveryLat}
        setDeliveryLat={setDeliveryLat}
        deliveryLng={deliveryLng}
        setDeliveryLng={setDeliveryLng}
        mapContainerRef={mapContainerRef}
        handleGetCurrentPosition={handleGetCurrentPosition}
        handlePresetClick={handlePresetClick}
        house={house}
        setHouse={setHouse}
        apartment={apartment}
        setApartment={setApartment}
        floor={floor}
        setFloor={setFloor}
        phone={phone}
        setPhone={setPhone}
        notes={notes}
        setNotes={setNotes}
        handleCheckout={handleCheckout}
        isPending={isCreating}
      />

      <SupportChatWidget 
        userType="customer"
        userId={customerId}
        userName={customer?.name || "Клиент"}
        activeOrderId={activeOrder?.id}
        activeOrderVendor={activeOrder?.vendorName}
      />
    </div>
  );
}
