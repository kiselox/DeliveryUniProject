import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router';
import orderServices from '../services/orders-services';
import api from '../services/api';
import L from 'leaflet';

// Poznań coordinates for restaurants (Vendors)
const VENDOR_COORDINATES = {
  v1: { name: 'KFC', lat: 52.4018, lng: 16.9205 },
  v2: { name: "McDonald's", lat: 52.4023, lng: 16.9261 },
  v3: { name: 'Burger King', lat: 52.4029, lng: 16.9125 },
  v4: { name: 'Pasibus', lat: 52.4048, lng: 16.9255 },
  v5: { name: "Misha's Pizza", lat: 52.4115, lng: 16.9068 }
};

export default function Courier() {
  const { id: courierId = 'cour1' } = useParams();
  const navigate = useNavigate();
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const courierMarkerRef = useRef(null);
  const restaurantMarkersRef = useRef([]);
  const customerMarkerRef = useRef(null);
  const pathLineRef = useRef(null);

  // Courier state
  const [courierLoc, setCourierLoc] = useState({ lat: 52.4140, lng: 16.9295 }); // Defaults to CDV Dormitory
  const [isGpsTracking, setIsGpsTracking] = useState(false);
  
  // Real-time distance state computed by backend
  const [distanceInfo, setDistanceInfo] = useState({ distanceMeters: 0, distanceKm: 0, mode: 'Local' });
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);

  // Selected order for PREVIEW (before accepting)
  const [previewOrder, setPreviewOrder] = useState(null);

  // Verification code input
  const [enteredCode, setEnteredCode] = useState('');
  const [codeError, setCodeError] = useState(false);

  // Fetch orders from backend
  const { data: orders = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['orders'],
    queryFn: () => orderServices.getOrders(),
    refetchInterval: 3000
  });

  // Fetch live settings
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await api.get('/settings');
      return res.data;
    }
  });

  // Fetch courier profile
  const { data: courier } = useQuery({
    queryKey: ['courier', courierId],
    queryFn: async () => {
      const res = await api.get(`/couriers/${courierId}`);
      return res.data;
    }
  });

  // Find active order in progress for this courier
  const activeOrder = orders.find(order => 
    (order.status === "Accepted" || order.status === "Picked Up") && 
    order.courierId === courierId
  );

  // Dynamically center coordinates when courier loads
  useEffect(() => {
    if (courier?.lat && courier?.lng) {
      setCourierLoc({ lat: courier.lat, lng: courier.lng });
    }
  }, [courier]);

  const calculatePayout = (order) => {
    if (!order) return 0;
    if (!settings || !courier) {
      return Math.round(order.fee * (order.coefficient || 1.0));
    }
    let kmRate = settings.pricePerKm || 4.0;
    const vehicle = (courier.vehicle || '').toLowerCase();
    if (vehicle === 'scooter') {
      kmRate = settings.scooterPricePerKm || 5.5;
    } else if (vehicle === 'car') {
      kmRate = settings.carPricePerKm || 7.0;
    }
    const distance = parseFloat(order.distance) || 0;
    const surcharge = settings.globalSurcharge || 0;
    const coefficient = order.coefficient ? parseFloat(order.coefficient) : 1.0;
    return Math.max(5.0, Math.round((distance * kmRate + surcharge) * coefficient));
  };
  
  const availableOrders = orders.filter(order => order.status === "Ready for Pickup").reverse();

  // Load Leaflet CSS dynamically
  useEffect(() => {
    const linkId = 'leaflet-css-cdn';
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
  }, []);

  // Update backend with courier location and fetch distance
  const updateLocationOnBackend = async (lat, lng, targetRestaurantId = null, orderToDeliver = null) => {
    setIsUpdatingLocation(true);
    try {
      // If courier has picked up the food, calculate distance to customer delivery coordinates!
      if (orderToDeliver && orderToDeliver.status === "Picked Up") {
        // Calculate distance from courier to customer delivery location
        const custLat = orderToDeliver.deliveryLat || 52.4140;
        const custLng = orderToDeliver.deliveryLng || 16.9295;
        
        // Since backend location API currently computes distance to vendor,
        // we can calculate courier-to-customer distance directly in JS or fallback
        const response = await api.post('/api/couriers/location', {
          courierId,
          lat,
          lng,
          restaurantId: null // We don't measure restaurant distance anymore!
        });

        // Let's compute exact distance in JS using Haversine formula (or Postgres if we write a custom query)
        // Express calculates it or we fallback here
        const distMeters = Math.round(calculateHaversineDistance(lat, lng, custLat, custLng));
        setDistanceInfo({
          distanceMeters: distMeters,
          distanceKm: parseFloat((distMeters / 1000).toFixed(2)),
          mode: 'Auto-Route Spheroid (Customer)'
        });
      } else {
        // En route to Restaurant or Preview Mode: calculate distance to restaurant
        const restId = targetRestaurantId || (activeOrder ? activeOrder.vendorId : null) || (previewOrder ? previewOrder.vendorId : null);
        const response = await api.post('/api/couriers/location', {
          courierId,
          lat,
          lng,
          restaurantId: restId
        });
        if (response.data) {
          setDistanceInfo({
            distanceMeters: response.data.distanceMeters,
            distanceKm: response.data.distanceKm,
            mode: response.data.mode
          });
        }
      }
    } catch (err) {
      console.error('Error updating location on backend:', err);
    } finally {
      setIsUpdatingLocation(false);
    }
  };

  // Helper Haversine for local calculations
  function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // meters
    const p1 = lat1 * Math.PI / 180;
    const p2 = lat2 * Math.PI / 180;
    const dp = (lat2 - lat1) * Math.PI / 180;
    const dl = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(dp / 2) * Math.sin(dp / 2) +
              Math.cos(p1) * Math.cos(p2) *
              Math.sin(dl / 2) * Math.sin(dl / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Trigger coordinate update when courier moves or active/preview order changes
  useEffect(() => {
    updateLocationOnBackend(courierLoc.lat, courierLoc.lng, null, activeOrder);
  }, [courierLoc, activeOrder?.status, activeOrder?.id, previewOrder?.id]);

  // Handle GPS Tracking
  useEffect(() => {
    if (!isGpsTracking) return;

    let watchId;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCourierLoc({ lat: latitude, lng: longitude });
        },
        (error) => {
          console.error("GPS tracking error:", error);
          alert("Не удалось запустить GPS-трекинг: " + error.message);
          setIsGpsTracking(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      alert("Браузер не поддерживает Geolocation API");
      setIsGpsTracking(false);
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [isGpsTracking]);

  // Map Initialization & Updates
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // 1. Initialize Map if not exists
    if (!mapRef.current) {
      const map = L.map(mapContainerRef.current).setView([52.406374, 16.925168], 13); // Center of Poznan
      
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(map);

      // Handle map clicks to simulate courier movement
      map.on('click', (e) => {
        if (isGpsTracking) {
          alert("Отключите GPS-трекинг, чтобы перемещать курьера вручную по карте!");
          return;
        }
        const { lat, lng } = e.latlng;
        setCourierLoc({ lat, lng });
      });

      mapRef.current = map;
    }

    const map = mapRef.current;

    // 2. Auto-centering the map onto courier's location on coordinates update
    if (courierMarkerRef.current) {
      // Pan to courier
      map.panTo([courierLoc.lat, courierLoc.lng]);
    }

    // 3. Render/Update Courier Marker
    if (courierMarkerRef.current) {
      map.removeLayer(courierMarkerRef.current);
      courierMarkerRef.current = null;
    }

    const courierIcon = L.divIcon({
      html: `<div style="background-color: #007bff; width: 34px; height: 34px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 18px;">🛵</div>`,
      className: 'custom-courier-icon',
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });

    courierMarkerRef.current = L.marker([courierLoc.lat, courierLoc.lng], { icon: courierIcon }).addTo(map);
    courierMarkerRef.current.bindPopup("<b>Вы (Курьер)</b><br>Кликните по карте, чтобы переместиться!");

    // Open popup initially if no order is active or being previewed
    if (!activeOrder && !previewOrder) {
      courierMarkerRef.current.openPopup();
    }

    // 4. Render Restaurant Pins: ALWAYS SHOW ALL 5 RESTAURANTS
    // Clear old restaurant markers first
    restaurantMarkersRef.current.forEach(m => map.removeLayer(m));
    restaurantMarkersRef.current = [];

    const activeRestaurantId = activeOrder?.vendorId || previewOrder?.vendorId;

    const activeRestIcon = L.divIcon({
      html: `<div style="background-color: #ffc107; width: 34px; height: 34px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 12px rgba(255,193,7,0.6); display: flex; align-items: center; justify-content: center; font-size: 18px; animation: pulse 1.5s infinite;">🍳</div>`,
      className: 'active-restaurant-icon',
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });

    const standardRestIcon = L.divIcon({
      html: `<div style="background-color: #dc3545; width: 28px; height: 28px; border-radius: 50%; border: 2px solid white; box-shadow: 0 3px 8px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; font-size: 14px; color: white;">🏪</div>`,
      className: 'standard-restaurant-icon',
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });

    // Draw all 5 restaurants
    Object.entries(VENDOR_COORDINATES).forEach(([id, info]) => {
      const isActive = id === activeRestaurantId;
      const marker = L.marker([info.lat, info.lng], {
        icon: isActive ? activeRestIcon : standardRestIcon
      }).addTo(map);

      marker.bindPopup(`<b>Ресторан: ${info.name}</b>${isActive ? '<br><span style="color: #ff9800; font-weight: bold;">Текущая цель!</span>' : ''}`);
      restaurantMarkersRef.current.push(marker);
    });

    // 5. Render Customer Marker (if courier accepted the order or is previewing one)
    if (customerMarkerRef.current) {
      map.removeLayer(customerMarkerRef.current);
      customerMarkerRef.current = null;
    }

    const orderForCustomer = activeOrder || previewOrder;
    if (orderForCustomer) {
      const custLat = orderForCustomer.deliveryLat || 52.4140;
      const custLng = orderForCustomer.deliveryLng || 16.9295;
      const custIcon = L.divIcon({
        html: `<div style="background-color: #00d26a; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,210,106,0.4); display: flex; align-items: center; justify-content: center; font-size: 16px;">🏠</div>`,
        className: 'custom-customer-icon',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });

      customerMarkerRef.current = L.marker([custLat, custLng], { icon: custIcon }).addTo(map);
      customerMarkerRef.current.bindPopup(`<b>Клиент: ${orderForCustomer.deliveryAddress || "Poznan CDV"}</b>`).openPopup();
    }

    // 6. Draw path polyline (dynamically depending on delivery state)
    if (pathLineRef.current) {
      map.removeLayer(pathLineRef.current);
      pathLineRef.current = null;
    }

    let lineCoords = null;
    let pathColor = '#aa3bff'; // Purple

    if (activeOrder) {
      if (activeOrder.status === "Accepted") {
        // En route to Restaurant: draw 3-point path: Courier -> Restaurant -> Customer
        const restCoords = VENDOR_COORDINATES[activeOrder.vendorId];
        const custLat = activeOrder.deliveryLat || 52.4140;
        const custLng = activeOrder.deliveryLng || 16.9295;
        if (restCoords) {
          lineCoords = [
            [courierLoc.lat, courierLoc.lng],
            [restCoords.lat, restCoords.lng],
            [custLat, custLng]
          ];
        }
      } else if (activeOrder.status === "Picked Up") {
        // En route to Customer: draw direct path: Courier -> Customer
        const custLat = activeOrder.deliveryLat || 52.4140;
        const custLng = activeOrder.deliveryLng || 16.9295;
        lineCoords = [
          [courierLoc.lat, courierLoc.lng],
          [custLat, custLng]
        ];
        pathColor = '#00d26a'; // Green path for customer delivery
      }
    } else if (previewOrder) {
      // Preview mode path: 3-point path: Courier -> Restaurant -> Customer
      const restCoords = VENDOR_COORDINATES[previewOrder.vendorId];
      const custLat = previewOrder.deliveryLat || 52.4140;
      const custLng = previewOrder.deliveryLng || 16.9295;
      if (restCoords) {
        lineCoords = [
          [courierLoc.lat, courierLoc.lng],
          [restCoords.lat, restCoords.lng],
          [custLat, custLng]
        ];
        pathColor = '#ffc107'; // Yellow preview path
      }
    }

    if (lineCoords) {
      pathLineRef.current = L.polyline(lineCoords, {
        color: pathColor,
        weight: 5,
        opacity: 0.9,
        dashArray: '8, 8',
        lineCap: 'round'
      }).addTo(map);

      // Fit map view to see both points
      map.fitBounds(L.latLngBounds(lineCoords), { padding: [60, 60] });
    }

  }, [courierLoc, activeOrder, orders, previewOrder]);

  // Clean up Leaflet on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Action: Select Order for Preview
  const handlePreviewOrder = (order) => {
    setPreviewOrder(order);
    setCodeError(false);
    setEnteredCode('');
  };

  // Action: Accept order (Accepted state)
  const handleAcceptOrder = async (orderId) => {
    try {
      await orderServices.updateOrder(orderId, {
        status: "Accepted",
        courierId
      });
      setPreviewOrder(null);
      refetch();
    } catch (err) {
      alert("Не удалось принять заказ: " + err.message);
    }
  };

  // Action: Confirm Pick Up (Picked Up state)
  const handleConfirmPickUp = async () => {
    if (!activeOrder) return;
    try {
      await orderServices.updateOrder(activeOrder.id, {
        status: "Picked Up"
      });
      alert("🍗 Получение в ресторане подтверждено. Едем к клиенту!");
      refetch();
    } catch (err) {
      alert("Не удалось забрать заказ: " + err.message);
    }
  };

  // Action: Deliver order (Delivered state)
  const handleDeliverOrder = async () => {
    if (!activeOrder) return;
    try {
      await orderServices.updateOrder(activeOrder.id, {
        status: "Delivered"
      });
      alert("🎉 Поздравляем! Заказ успешно доставлен клиенту!");
      refetch();
    } catch (err) {
      alert("Не удалось завершить заказ: " + err.message);
    }
  };

  const getGoogleMapsDirectionsUrl = () => {
    if (!activeOrder) return '';
    let destLat = 52.4140;
    let destLng = 16.9295;

    if (activeOrder.status === "Accepted") {
      const restCoords = VENDOR_COORDINATES[activeOrder.vendorId];
      if (restCoords) {
        destLat = restCoords.lat;
        destLng = restCoords.lng;
      }
    } else if (activeOrder.status === "Picked Up") {
      destLat = activeOrder.deliveryLat || 52.4140;
      destLng = activeOrder.deliveryLng || 16.9295;
    }

    return `https://www.google.com/maps/dir/?api=1&origin=${courierLoc.lat},${courierLoc.lng}&destination=${destLat},${destLng}`;
  };

  if (isLoading) return <div style={{ padding: '20px' }}>Загрузка эмулятора курьера...</div>;
  if (isError) return <div style={{ padding: '20px' }}>Ошибка загрузки API</div>;

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '40px 20px',
      fontFamily: 'system-ui, sans-serif'
    }}>
      {/* Return button */}
      <button 
        style={{
          background: 'none',
          border: 'none',
          color: '#aa3bff',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: 'pointer',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '5px'
        }} 
        onClick={() => navigate('/')}
      >
        ← Сменить роль
      </button>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '10px'
      }}>
        <h1 style={{ fontSize: '32px', fontWeight: '800', margin: 0 }}>
          Панель Курьера {courier?.vehicle === 'Scooter' ? '🛴' : courier?.vehicle === 'Car' ? '🚗' : '🚲'}
        </h1>
        <span style={{
          backgroundColor: '#eae5fc',
          color: '#aa3bff',
          padding: '6px 14px',
          borderRadius: '20px',
          fontSize: '14px',
          fontWeight: 'bold'
        }}>
          {courier?.name || `Курьер: ${courierId}`} ({courier?.vehicle || 'Bicycle'})
        </span>
      </div>

      <p style={{ color: '#666', marginBottom: '30px', fontSize: '16px', lineHeight: '1.5' }}>
        Эмулируйте движение курьера по г. Познань. <b>Все рестораны</b> постоянно видны на карте. Кликните по карте для перемещения.
      </p>

      {/* Grid Container */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1.2fr',
        gap: '30px',
        alignItems: 'start'
      }}>
        
        {/* LEFT COLUMN: CONTROL AND ORDER STATES */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* GPS Location Tracker Card */}
          <div style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid #eee',
            boxShadow: '0 4px 20px rgba(0,0,0,0.04)'
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>📍 Ваша Локация</span>
              {isUpdatingLocation && (
                <span style={{ fontSize: '12px', color: '#aa3bff' }}>⚡ Обновление...</span>
              )}
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#666' }}>
                <span>Широта: <b>{courierLoc.lat.toFixed(5)}</b></span>
                <span>Долгота: <b>{courierLoc.lng.toFixed(5)}</b></span>
              </div>

              <button 
                onClick={() => setIsGpsTracking(!isGpsTracking)}
                style={{
                  padding: '10px',
                  backgroundColor: isGpsTracking ? '#ff3b30' : '#007bff',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                {isGpsTracking ? '🛑 Выключить GPS' : '🛰️ Включить реальный GPS'}
              </button>
            </div>
          </div>

          {/* ACTIVE DELIVERY (IF ACCEPTED OR PICKED UP) */}
          {activeOrder ? (
            <div style={{
              background: activeOrder.status === "Picked Up" 
                ? 'linear-gradient(135deg, #00b35a 0%, #007e3e 100%)' // Green for Customer Route
                : 'linear-gradient(135deg, #aa3bff 0%, #7b1fa2 100%)', // Purple for Restaurant Route
              color: '#fff',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
              position: 'relative'
            }}>
              
              <span style={{
                fontSize: '11px',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                backgroundColor: 'rgba(255,255,255,0.2)',
                padding: '4px 10px',
                borderRadius: '10px',
                display: 'inline-block',
                marginBottom: '15px'
              }}>
                {activeOrder.status === "Accepted" ? "Шаг 2: Едем за заказом в ресторан 🍳" : "Шаг 3: Доставка клиенту домой 🏠"}
              </span>

              <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '800' }}>
                {activeOrder.status === "Accepted" 
                  ? `Ресторан: ${activeOrder.vendorName}`
                  : `Доставка: ${activeOrder.deliveryAddress}`
                }
              </h2>

              <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '15px',
                fontSize: '14px'
              }}>
                <b>Заказ:</b> {activeOrder.items}
              </div>

              {/* Recipient / Delivery Details Card */}
              <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '15px',
                fontSize: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                textAlign: 'left'
              }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', opacity: 0.9, letterSpacing: '0.5px' }}>
                  📋 Карточка Доставки
                </div>

                {/* Grid for House, Apartment, Floor */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.15)', padding: '8px 10px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '10px', opacity: 0.7, display: 'block' }}>Дом</span>
                    <strong style={{ fontSize: '15px' }}>{activeOrder.house || '—'}</strong>
                  </div>
                  <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.15)', padding: '8px 10px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '10px', opacity: 0.7, display: 'block' }}>Квартира</span>
                    <strong style={{ fontSize: '15px' }}>{activeOrder.apartment || '—'}</strong>
                  </div>
                  <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.15)', padding: '8px 10px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '10px', opacity: 0.7, display: 'block' }}>Этаж</span>
                    <strong style={{ fontSize: '15px' }}>{activeOrder.floor || '—'}</strong>
                  </div>
                </div>

                {/* Recipient Phone */}
                {activeOrder.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(0, 0, 0, 0.15)', padding: '10px 12px', borderRadius: '8px' }}>
                    <span>📞</span>
                    <div style={{ flexGrow: 1 }}>
                      <span style={{ fontSize: '10px', opacity: 0.7, display: 'block' }}>Телефон получателя</span>
                      <a href={`tel:${activeOrder.phone}`} style={{ color: '#fff', fontWeight: 'bold', fontSize: '15px', textDecoration: 'underline' }}>
                        {activeOrder.phone}
                      </a>
                    </div>
                  </div>
                )}

                {/* Courier Notes */}
                {activeOrder.notes && (
                  <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.15)', padding: '10px 12px', borderRadius: '8px', borderLeft: '3px solid #ffc107' }}>
                    <span style={{ fontSize: '10px', opacity: 0.8, fontWeight: 'bold', color: '#ffc107', display: 'block', marginBottom: '3px' }}>📝 Заметка курьеру:</span>
                    <span style={{ fontSize: '13px', fontStyle: 'italic', lineHeight: '1.4' }}>"{activeOrder.notes}"</span>
                  </div>
                )}
              </div>

              {/* Google Maps Directions Navigator Button */}
              <a 
                href={getGoogleMapsDirectionsUrl()} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#ffc107',
                  color: '#333',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: 'bold',
                  textDecoration: 'none',
                  boxShadow: '0 4px 12px rgba(255, 193, 7, 0.3)',
                  transition: 'all 0.2s',
                  marginBottom: '20px',
                  boxSizing: 'border-box',
                  textAlign: 'center'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#ffe066'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#ffc107'}
              >
                🗺️ Открыть навигатор (Google Maps)
              </a>

              {/* LIVE DISTANCE READOUT */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '15px',
                marginBottom: '20px',
                borderTop: '1px solid rgba(255,255,255,0.2)',
                paddingTop: '15px'
              }}>
                <div>
                  <div style={{ fontSize: '11px', opacity: 0.8 }}>
                    {activeOrder.status === "Accepted" ? "Путь до ресторана:" : "Путь до клиента:"}
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                    {distanceInfo.distanceMeters > 0 
                      ? `${distanceInfo.distanceMeters} м` 
                      : 'Расчет...'}
                  </div>
                  <span style={{ fontSize: '11px', opacity: 0.7 }}>
                    ({distanceInfo.distanceKm} км)
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: '11px', opacity: 0.8 }}>Статус:</div>
                  <div style={{ fontSize: '15px', fontWeight: 'bold', marginTop: '4px' }}>
                    {activeOrder.status === "Accepted" ? '🛒 Еду забирать' : '🛵 Везет курьер'}
                  </div>
                </div>
              </div>

              {/* -------------------- STEP 2: ACCEPTED / RESTAURANT PICKUP -------------------- */}
              {activeOrder.status === "Accepted" && (
                <div style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  padding: '18px',
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{ fontSize: '15px', textAlign: 'center', fontWeight: 'bold' }}>
                    🔑 Код для ресторана: <span style={{ fontSize: '24px', letterSpacing: '2px', color: '#ffc107', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>#{activeOrder.id.slice(-4).toUpperCase()}</span>
                  </div>
                  <div style={{ fontSize: '13px', opacity: 0.9, textAlign: 'center', lineHeight: '1.4' }}>
                    Назовите этот код сотрудникам ресторана для выдачи заказа.
                  </div>
                  <button
                    onClick={handleConfirmPickUp}
                    style={{
                      padding: '14px',
                      backgroundColor: '#ffc107',
                      color: '#333',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 'bold',
                      fontSize: '16px',
                      cursor: 'pointer',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                      transition: 'all 0.2s',
                      marginTop: '5px'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#ffe066'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#ffc107'}
                  >
                    🍲 Подтвердить получение в ресторане
                  </button>
                </div>
              )}

              {/* -------------------- STEP 3: PICKED UP / CLIENT DELIVERY -------------------- */}
              {activeOrder.status === "Picked Up" && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', fontWeight: 'bold' }}>
                    <span>Оплата курьеру:</span>
                    <span style={{ fontSize: '24px', color: '#fff' }}>{calculatePayout(activeOrder)} PLN</span>
                  </div>
                  <button 
                    onClick={handleDeliverOrder}
                    style={{
                      width: '100%',
                      padding: '15px',
                      backgroundColor: '#fff',
                      color: '#007e3e',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '18px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                    }}
                  >
                    📦 Подтвердить доставку клиенту
                  </button>
                </div>
              )}

            </div>
          ) : null}

          {/* PREVIEW ORDER DETAILS CARD (BEFORE ACCEPTING) */}
          {previewOrder && !activeOrder ? (
            <div style={{
              background: '#fff',
              borderRadius: '16px',
              padding: '24px',
              border: '2px solid #ffc107',
              boxShadow: '0 6px 20px rgba(0,0,0,0.06)',
              position: 'relative'
            }}>
              <button 
                onClick={() => setPreviewOrder(null)}
                style={{
                  position: 'absolute',
                  top: '15px',
                  right: '15px',
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#aaa'
                }}
              >
                ×
              </button>

              <span style={{
                fontSize: '11px',
                fontWeight: 'bold',
                color: '#ffc107',
                textTransform: 'uppercase',
                backgroundColor: '#fff9e6',
                padding: '4px 10px',
                borderRadius: '10px',
                display: 'inline-block',
                marginBottom: '15px'
              }}>
                🔍 Предпросмотр Заказа
              </span>

              <h2 style={{ margin: '0 0 10px 0', fontSize: '22px', color: '#333' }}>
                {previewOrder.vendorName}
              </h2>

              <div style={{ fontSize: '14px', color: '#666', marginBottom: '15px', backgroundColor: '#f9f9f9', padding: '10px', borderRadius: '8px' }}>
                <b>Что в заказе:</b> {previewOrder.items}
              </div>

              {/* Recipient / Delivery Details Card (Preview) */}
              <div style={{
                backgroundColor: '#f9f9f9',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '15px',
                fontSize: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                textAlign: 'left',
                border: '1px solid #eee'
              }}>
                <div style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#888', letterSpacing: '0.5px' }}>
                  📋 Адрес получателя (Детали)
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  <div style={{ backgroundColor: '#fff', border: '1px solid #e0e0e0', padding: '6px 8px', borderRadius: '6px' }}>
                    <span style={{ fontSize: '9px', color: '#999', display: 'block' }}>Дом</span>
                    <strong style={{ fontSize: '13px', color: '#333' }}>{previewOrder.house || '—'}</strong>
                  </div>
                  <div style={{ backgroundColor: '#fff', border: '1px solid #e0e0e0', padding: '6px 8px', borderRadius: '6px' }}>
                    <span style={{ fontSize: '9px', color: '#999', display: 'block' }}>Квартира</span>
                    <strong style={{ fontSize: '13px', color: '#333' }}>{previewOrder.apartment || '—'}</strong>
                  </div>
                  <div style={{ backgroundColor: '#fff', border: '1px solid #e0e0e0', padding: '6px 8px', borderRadius: '6px' }}>
                    <span style={{ fontSize: '9px', color: '#999', display: 'block' }}>Этаж</span>
                    <strong style={{ fontSize: '13px', color: '#333' }}>{previewOrder.floor || '—'}</strong>
                  </div>
                </div>

                {previewOrder.phone && (
                  <div style={{ backgroundColor: '#fff', border: '1px solid #e0e0e0', padding: '8px 10px', borderRadius: '6px' }}>
                    <span style={{ fontSize: '9px', color: '#999', display: 'block' }}>Телефон</span>
                    <strong style={{ fontSize: '13px', color: '#333' }}>{previewOrder.phone}</strong>
                  </div>
                )}

                {previewOrder.notes && (
                  <div style={{ backgroundColor: '#fff', border: '1px solid #e0e0e0', padding: '8px 10px', borderRadius: '6px', borderLeft: '3px solid #ffc107' }}>
                    <span style={{ fontSize: '9px', color: '#ffc107', fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>Заметка курьеру:</span>
                    <span style={{ fontSize: '12px', fontStyle: 'italic', color: '#555' }}>"{previewOrder.notes}"</span>
                  </div>
                )}
              </div>

              {/* Distances grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '15px',
                marginBottom: '20px',
                borderTop: '1px solid #eee',
                paddingTop: '15px'
              }}>
                <div>
                  <span style={{ fontSize: '12px', color: '#888' }}>1. До ресторана (подача):</span>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#ffc107', marginTop: '4px' }}>
                    {distanceInfo.distanceMeters > 0 ? `${distanceInfo.distanceMeters} м` : 'Расчет...'}
                  </div>
                  <span style={{ fontSize: '11px', color: '#999' }}>({distanceInfo.distanceKm} км)</span>
                </div>
                
                <div>
                  <span style={{ fontSize: '12px', color: '#888' }}>2. Доставка клиенту:</span>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#00d26a', marginTop: '4px' }}>
                    {previewOrder.distance} км
                  </div>
                  <span style={{ fontSize: '11px', color: '#999' }}>(в: {previewOrder.deliveryAddress || "Poznan CDV"})</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                <span style={{ fontWeight: 'bold', color: '#333' }}>Доход курьера:</span>
                <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#00d26a' }}>{calculatePayout(previewOrder)} PLN</span>
              </div>

              <button 
                onClick={() => handleAcceptOrder(previewOrder.id)}
                style={{
                  width: '100%',
                  padding: '14px',
                  backgroundColor: '#aa3bff',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(170, 59, 255, 0.3)'
                }}
              >
                🤝 Принять и начать доставку
              </button>
            </div>
          ) : null}

          {/* LIST OF AVAILABLE ORDERS */}
          <div style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #eee',
            boxShadow: '0 4px 20px rgba(0,0,0,0.04)'
          }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', fontWeight: 'bold' }}>
              🛒 Доступные заказы ({availableOrders.length})
            </h3>

            {activeOrder ? (
              <div style={{
                padding: '15px',
                backgroundColor: '#fff9e6',
                border: '1px dashed #ffc107',
                borderRadius: '12px',
                color: '#856404',
                fontSize: '13px',
                lineHeight: '1.4'
              }}>
                Завершите текущую доставку для <b>{activeOrder.vendorName}</b>, чтобы принимать новые заказы!
              </div>
            ) : availableOrders.length === 0 ? (
              <div style={{
                padding: '30px',
                backgroundColor: '#f9f9f9',
                borderRadius: '12px',
                textAlign: 'center',
                color: '#999',
                fontSize: '14px'
              }}>
                Новых заказов пока нет. Ждем клиентов...
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {availableOrders.map(order => {
                  const isPreviewed = previewOrder?.id === order.id;
                  return (
                    <div 
                      key={order.id} 
                      onClick={() => handlePreviewOrder(order)}
                      style={{
                        border: isPreviewed ? '2px solid #ffc107' : '1px solid #eee',
                        padding: '16px',
                        borderRadius: '12px',
                        backgroundColor: isPreviewed ? '#fffdf6' : '#fff',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: isPreviewed ? '0 4px 12px rgba(0,0,0,0.05)' : 'none'
                      }}
                      onMouseOver={(e) => { if (!isPreviewed) e.currentTarget.style.borderColor = '#ccc'; }}
                      onMouseOut={(e) => { if (!isPreviewed) e.currentTarget.style.borderColor = '#eee'; }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <strong style={{ fontSize: '15px' }}>🏪 {order.vendorName}</strong>
                        <span style={{
                          backgroundColor: '#e6faf0',
                          color: '#00d26a',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '13px',
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}>
                          🔥 {calculatePayout(order)} PLN
                        </span>
                      </div>

                      <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
                        <b>Куда:</b> {order.deliveryAddress || "Poznan CDV"}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#999' }}>
                        <span>Доставка: {order.distance} км</span>
                        <span>Поступил: {order.createdAt}</span>
                      </div>
                      
                      <div style={{
                        marginTop: '10px',
                        fontSize: '12px',
                        color: '#aa3bff',
                        fontWeight: 'bold',
                        textAlign: 'right'
                      }}>
                        {isPreviewed ? "👉 Выбран для предпросмотра" : "Посмотреть маршрут и детали →"}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>

        </div>

        {/* RIGHT COLUMN: INTERACTIVE MAP */}
        <div style={{
          background: '#fff',
          borderRadius: '20px',
          padding: '15px',
          border: '1px solid #eee',
          boxShadow: '0 4px 25px rgba(0,0,0,0.04)',
          position: 'sticky',
          top: '20px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px',
            padding: '0 5px'
          }}>
            <span style={{ fontWeight: 'bold', fontSize: '15px' }}>🗺️ Интерактивная карта Познани</span>
            <span style={{ fontSize: '12px', color: '#888' }}>
              {activeOrder?.status === "Picked Up" ? "🎯 Путь к клиенту" : "🍳 Путь к ресторану"}
            </span>
          </div>

          {/* Map */}
          <div 
            ref={mapContainerRef} 
            style={{
              width: '100%',
              height: '560px',
              borderRadius: '14px',
              border: '1px solid #ddd',
              zIndex: 1
            }} 
          />
          
          <div style={{
            marginTop: '12px',
            fontSize: '11px',
            color: '#777',
            textAlign: 'center',
            lineHeight: '1.4'
          }}>
            🛵 Курьер (Синий) | 🍳 Текущая цель (Желтый) | 🏪 Все рестораны (Красный) | 🏠 Клиент (Зеленый)
          </div>
        </div>

      </div>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 193, 7, 0.7); }
          70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(255, 193, 7, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 193, 7, 0); }
        }
      `}</style>

    </div>
  );
}
