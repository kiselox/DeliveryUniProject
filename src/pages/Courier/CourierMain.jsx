// src/pages/Courier/CourierMain.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import L from 'leaflet';
import api from '../../services/api';
import { useOrders } from '../../hooks/useOrders';
import { useSettings } from '../../hooks/useSettings';
import CourierProfileHeader from './components/CourierProfileHeader';
import ActiveOrderCard from './components/ActiveOrderCard';
import AvailableOrdersList from './components/AvailableOrdersList';
import LeafletDeliveryMap from './components/LeafletDeliveryMap';
import SupportChatWidget from '../../components/SupportChatWidget';
import './Courier.css';

// Poznań coordinates for restaurants (Vendors)
const VENDOR_COORDINATES = {
  v1: { name: 'KFC', lat: 52.4018, lng: 16.9205 },
  v2: { name: "McDonald's", lat: 52.4023, lng: 16.9261 },
  v3: { name: 'Burger King', lat: 52.4029, lng: 16.9125 },
  v4: { name: 'Pasibus', lat: 52.4048, lng: 16.9255 },
  v5: { name: "Misha's Pizza", lat: 52.4115, lng: 16.9068 }
};

export default function CourierMain() {
  const { id: courierId = 'cour1' } = useParams();
  const navigate = useNavigate();
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const courierMarkerRef = useRef(null);
  const restaurantMarkersRef = useRef([]);
  const customerMarkerRef = useRef(null);
  const pathLine1Ref = useRef(null);
  const pathLine2Ref = useRef(null);

  // Courier state
  const [courierLoc, setCourierLoc] = useState({ lat: 52.4140, lng: 16.9295 }); // Defaults to CDV Dormitory
  const [isGpsTracking, setIsGpsTracking] = useState(false);
  
  // Real-time distance state computed by backend
  const [distanceInfo, setDistanceInfo] = useState({ distanceMeters: 0, distanceKm: 0, mode: 'Local' });
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);

  // Selected order for PREVIEW (before accepting)
  const [previewOrder, setPreviewOrder] = useState(null);

  // Use modular React Query hooks
  const { orders = [], refetch, updateOrder } = useOrders();
  const { settings } = useSettings();

  // Fetch courier profile
  const { data: courier, isLoading: isCourierLoading, isError: isCourierError } = useQuery({
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

  // Load Leaflet CSS dynamically if not present
  useEffect(() => {
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
  }, []);

  // HTML5 GPS Tracking simulation
  useEffect(() => {
    if (!isGpsTracking) return;

    if (!navigator.geolocation) {
      alert("Геолокация не поддерживается вашим браузером.");
      setIsGpsTracking(false);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCourierLoc({ lat: latitude, lng: longitude });
      },
      (err) => {
        console.error("GPS Watch Position Error:", err.message);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [isGpsTracking]);

  // Synchronize location updates with the backend REST API in real time
  useEffect(() => {
    const syncLocation = async () => {
      try {
        setIsUpdatingLocation(true);
        const targetRestaurantId = activeOrder?.vendorId || previewOrder?.vendorId || null;
        
        const response = await api.post('/api/couriers/location', {
          courierId,
          lat: courierLoc.lat,
          lng: courierLoc.lng,
          restaurantId: targetRestaurantId
        });

        if (response.data) {
          setDistanceInfo({
            distanceMeters: response.data.distanceMeters,
            distanceKm: response.data.distanceKm,
            mode: response.data.mode
          });
        }
      } catch (err) {
        console.error("Failed to sync location with server:", err.message);
      } finally {
        setIsUpdatingLocation(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      syncLocation();
    }, 400);

    return () => clearTimeout(debounceTimer);
  }, [courierLoc, activeOrder?.id, previewOrder?.id, courierId]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (isCourierLoading || !mapContainerRef.current) return;

    if (!mapRef.current) {
      const map = L.map(mapContainerRef.current).setView([courierLoc.lat, courierLoc.lng], 13);
      mapRef.current = map;

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(map);

      // Manual coordinates drag selector when GPS is off
      map.on('click', (e) => {
        if (isGpsTracking) {
          alert("📡 Выключите режим GPS Tracking, чтобы вручную перемещать курьера кликами по карте!");
          return;
        }
        const { lat, lng } = e.latlng;
        setCourierLoc({ lat, lng });
      });

      // Force size recalculation to prevent gray/empty map rendering on mount
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    }
  }, [isCourierLoading, isGpsTracking, courierLoc.lat, courierLoc.lng]);

  // Redraw Layers & Markers on Coordinate/Route changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // 1. Render/Update Courier marker with absolute presence check
    if (courierMarkerRef.current && map.hasLayer(courierMarkerRef.current)) {
      courierMarkerRef.current.setLatLng([courierLoc.lat, courierLoc.lng]);
    } else {
      if (courierMarkerRef.current) {
        courierMarkerRef.current.remove();
      }
      const courierIcon = L.divIcon({
        html: `<div style="font-size: 26px; line-height: 1; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">🛵</div>`,
        className: 'leaflet-div-icon',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });
      courierMarkerRef.current = L.marker([courierLoc.lat, courierLoc.lng], { icon: courierIcon }).addTo(map);
    }

    // 2. Render all Restaurants (Vendors)
    restaurantMarkersRef.current.forEach(m => m.remove());
    restaurantMarkersRef.current = [];

    Object.entries(VENDOR_COORDINATES).forEach(([id, coords]) => {
      // Highlight vendor if it's the target for the current active/preview order
      const isTarget = activeOrder?.vendorId === id || previewOrder?.vendorId === id;
      
      const restIcon = L.divIcon({
        html: `
          <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: ${isTarget ? '#aa3bff' : '#333'};
            color: #fff;
            width: 32px;
            height: 32px;
            border-radius: 8px;
            border: 2px solid white;
            font-size: 11px;
            font-weight: bold;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          ">
            ${coords.name.slice(0, 3)}
          </div>
        `,
        className: 'leaflet-div-icon',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const m = L.marker([coords.lat, coords.lng], { icon: restIcon })
        .bindPopup(`<b>Ресторан: ${coords.name}</b>`)
        .addTo(map);
      
      restaurantMarkersRef.current.push(m);
    });

    // 3. Render Client destination marker if order active/previewed
    if (customerMarkerRef.current) {
      customerMarkerRef.current.remove();
      customerMarkerRef.current = null;
    }

    const currentOrder = activeOrder || previewOrder;
    if (currentOrder && currentOrder.deliveryLat && currentOrder.deliveryLng) {
      const clientIcon = L.divIcon({
        html: `<div style="font-size: 28px; line-height: 1; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">📍</div>`,
        className: 'leaflet-div-icon',
        iconSize: [30, 30],
        iconAnchor: [15, 30]
      });

      customerMarkerRef.current = L.marker(
        [currentOrder.deliveryLat, currentOrder.deliveryLng],
        { icon: clientIcon }
      ).bindPopup(`<b>Клиент: ${currentOrder.deliveryAddress || "Poznań CDV"}</b>`)
       .addTo(map);
    }

    // 4. Render Route Polylines (Segment 1 and Segment 2)
    if (pathLine1Ref.current) {
      pathLine1Ref.current.remove();
      pathLine1Ref.current = null;
    }
    if (pathLine2Ref.current) {
      pathLine2Ref.current.remove();
      pathLine2Ref.current = null;
    }

    if (activeOrder) {
      const restCoords = VENDOR_COORDINATES[activeOrder.vendorId];
      if (activeOrder.status === "Accepted" && restCoords) {
        // Active Order Segment 1: Courier to Restaurant (Purple, dashed)
        const points1 = [
          [courierLoc.lat, courierLoc.lng],
          [restCoords.lat, restCoords.lng]
        ];
        pathLine1Ref.current = L.polyline(points1, { color: '#aa3bff', weight: 4, dashArray: '8, 8' }).addTo(map);
      } else if (activeOrder.status === "Picked Up" && restCoords && activeOrder.deliveryLat) {
        // Active Order Segment 2: Restaurant to Client (Green, solid)
        const points2 = [
          [restCoords.lat, restCoords.lng],
          [activeOrder.deliveryLat, activeOrder.deliveryLng]
        ];
        pathLine2Ref.current = L.polyline(points2, { color: '#4cd964', weight: 5 }).addTo(map);
      }
    } else if (previewOrder) {
      // Previewing Order: Draw both segments to give a complete trip preview!
      const restCoords = VENDOR_COORDINATES[previewOrder.vendorId];
      if (restCoords) {
        // Segment 1: Courier to Restaurant (Purple, dashed)
        const points1 = [
          [courierLoc.lat, courierLoc.lng],
          [restCoords.lat, restCoords.lng]
        ];
        pathLine1Ref.current = L.polyline(points1, { color: '#aa3bff', weight: 4, dashArray: '8, 8' }).addTo(map);

        // Segment 2: Restaurant to Client (Green, solid)
        if (previewOrder.deliveryLat && previewOrder.deliveryLng) {
          const points2 = [
            [restCoords.lat, restCoords.lng],
            [previewOrder.deliveryLat, previewOrder.deliveryLng]
          ];
          pathLine2Ref.current = L.polyline(points2, { color: '#4cd964', weight: 5 }).addTo(map);
        }
      }
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

  const handlePreviewOrder = (order) => {
    setPreviewOrder(order);
    setDistanceInfo({ distanceMeters: 0, distanceKm: 0, mode: 'Local' });
  };

  const handleAcceptOrder = async (orderId) => {
    try {
      await updateOrder({
        orderId,
        updates: {
          status: "Accepted",
          courierId
        }
      });
      setPreviewOrder(null);
      refetch();
    } catch (err) {
      alert("Не удалось принять заказ: " + err.message);
    }
  };

  const handleConfirmPickUp = async () => {
    if (!activeOrder) return;
    try {
      await updateOrder({
        orderId: activeOrder.id,
        updates: { status: "Picked Up" }
      });
      alert("🍗 Получение в ресторане подтверждено. Едем к клиенту!");
      refetch();
    } catch (err) {
      alert("Не удалось забрать заказ: " + err.message);
    }
  };

  const handleDeliverOrder = async () => {
    if (!activeOrder) return;

    try {
      await updateOrder({
        orderId: activeOrder.id,
        updates: { status: "Delivered" }
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

  if (isCourierLoading) return <div style={{ padding: '20px' }}>Загрузка эмулятора курьера...</div>;
  if (isCourierError) return <div style={{ padding: '20px' }}>Ошибка загрузки API профиля курьера</div>;

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
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          color: '#aa3bff',
          padding: '6px 14px',
          borderRadius: '20px',
          fontSize: '14px',
          fontWeight: 'bold',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          {courier?.name || `Курьер: ${courierId}`} ({courier?.vehicle || 'Bicycle'})
        </span>
      </div>

      <p style={{ color: '#aaa', marginBottom: '30px', fontSize: '16px', lineHeight: '1.5', textAlign: 'left' }}>
        Эмулируйте движение курьера по г. Познань. <b>Все рестораны</b> постоянно видны на карте. Кликните по карте для перемещения.
      </p>

      {/* Main Grid Layout */}
      <div className="courier-dashboard-container">
        
        {/* Left Column: Courier Profile & Active/Available orders */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <CourierProfileHeader 
            courier={courier}
            activeOrder={activeOrder}
            isGpsTracking={isGpsTracking}
            setIsGpsTracking={setIsGpsTracking}
          />

          <ActiveOrderCard 
            activeOrder={activeOrder}
            calculatePayout={calculatePayout}
            distanceInfo={distanceInfo}
            getGoogleMapsDirectionsUrl={getGoogleMapsDirectionsUrl}
            handleConfirmPickUp={handleConfirmPickUp}
            handleDeliverOrder={handleDeliverOrder}
          />

          <AvailableOrdersList 
            activeOrder={activeOrder}
            availableOrders={availableOrders}
            previewOrder={previewOrder}
            setPreviewOrder={setPreviewOrder}
            handlePreviewOrder={handlePreviewOrder}
            calculatePayout={calculatePayout}
            distanceInfo={distanceInfo}
            handleAcceptOrder={handleAcceptOrder}
          />
        </div>

        {/* Right Column: Leaflet Micro Map */}
        <LeafletDeliveryMap mapContainerRef={mapContainerRef} />
      </div>

      <SupportChatWidget 
        userType="courier"
        userId={courierId}
        userName={courier?.name || `Курьер ${courierId}`}
        activeOrderId={activeOrder?.id}
        activeOrderVendor={activeOrder?.vendorName}
      />
    </div>
  );
}
