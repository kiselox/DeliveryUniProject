import { useState, useEffect, useRef } from 'react';
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

const VENDOR_COORDINATES = {
  v1: { name: 'KFC', lat: 52.4018, lng: 16.9205 },
  v2: { name: "McDonald's", lat: 52.4023, lng: 16.9261 },
  v3: { name: 'Burger King', lat: 52.4029, lng: 16.9125 },
  v4: { name: 'Pasibus', lat: 52.4048, lng: 16.9255 },
  v5: { name: "Misha's Pizza", lat: 52.4115, lng: 16.9068 },
  v6: { name: 'Pierogarnia Poznańska', lat: 52.4250, lng: 16.9180 },
  v7: { name: 'Poznań Kebab', lat: 52.3920, lng: 16.9220 },
  v8: { name: 'Hana Sushi', lat: 52.4080, lng: 16.9580 }
};

export default function CourierMain() {
  const { id: courierId = 'cour1', tab } = useParams();
  const navigate = useNavigate();
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const courierMarkerRef = useRef(null);
  const restaurantMarkersRef = useRef([]);
  const customerMarkerRef = useRef(null);
  const pathLine1Ref = useRef(null);
  const pathLine2Ref = useRef(null);

  const [courierLoc, setCourierLoc] = useState({ lat: 52.4140, lng: 16.9295 });
  const [isGpsTracking, setIsGpsTracking] = useState(false);
  
  const [distanceInfo, setDistanceInfo] = useState({ distanceMeters: 0, distanceKm: 0, mode: 'Local' });

  const [previewOrder, setPreviewOrder] = useState(null);
  const [isEarningsOpen, setIsEarningsOpen] = useState(false);
  const activeMobileTab = tab || 'orders';

  const { orders = [], refetch, updateOrder } = useOrders();
  const { settings } = useSettings();

  const { data: courier, isLoading: isCourierLoading, isError: isCourierError } = useQuery({
    queryKey: ['courier', courierId],
    queryFn: async () => {
      const res = await api.get(`/couriers/${courierId}`);
      return res.data;
    }
  });

  const activeOrder = orders.find(order => 
    (order.status === "Accepted" || order.status === "Picked Up") && 
    order.courierId === courierId
  );

  const hasInitializedLocRef = useRef(false);

  useEffect(() => {
    if (courier?.lat && courier?.lng && !hasInitializedLocRef.current) {
      setTimeout(() => {
        setCourierLoc({ lat: courier.lat, lng: courier.lng });
      }, 0);
      hasInitializedLocRef.current = true;
    }
  }, [courier]);

  useEffect(() => {
    if (!tab) {
      navigate(`/courier/${courierId}/orders`, { replace: true });
    }
  }, [tab, courierId, navigate]);

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

  const completedOrders = (orders || []).filter(o => o.courierId === courierId && o.status === "Delivered");
  const totalEarnings = completedOrders.reduce((sum, o) => sum + calculatePayout(o), 0);
  const totalDistance = completedOrders.reduce((sum, o) => sum + (parseFloat(o.distance) || 0), 0);

  useEffect(() => {
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    if (activeMobileTab === 'map' && mapRef.current) {
      const timer = setTimeout(() => {
        mapRef.current.invalidateSize();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [activeMobileTab]);

  useEffect(() => {
    if (!isGpsTracking) return;

    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      setTimeout(() => {
        setIsGpsTracking(false);
      }, 0);
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

  useEffect(() => {
    const syncLocation = async () => {
      try {
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
      }
    };

    const debounceTimer = setTimeout(() => {
      syncLocation();
    }, 400);

    return () => clearTimeout(debounceTimer);
  }, [courierLoc, activeOrder?.id, activeOrder?.vendorId, previewOrder?.id, previewOrder?.vendorId, courierId]);

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

      map.on('click', (e) => {
        if (isGpsTracking) {
          alert("📡 Turn off GPS Tracking to manually move the courier by clicking on the map!");
          return;
        }
        const { lat, lng } = e.latlng;
        setCourierLoc({ lat, lng });
      });

      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    }
  }, [isCourierLoading, isGpsTracking, courierLoc.lat, courierLoc.lng]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (isGpsTracking) {
      map.panTo([courierLoc.lat, courierLoc.lng]);
    }

    if (courierMarkerRef.current && map.hasLayer(courierMarkerRef.current)) {
      courierMarkerRef.current.setLatLng([courierLoc.lat, courierLoc.lng]);
    } else {
      if (courierMarkerRef.current) {
        map.removeLayer(courierMarkerRef.current);
      }
      const courierIcon = L.divIcon({
        html: `<div style="font-size: 26px; line-height: 1; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">🛵</div>`,
        className: 'leaflet-div-icon',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });
      courierMarkerRef.current = L.marker([courierLoc.lat, courierLoc.lng], { icon: courierIcon }).addTo(map);
    }

    restaurantMarkersRef.current.forEach(m => map.removeLayer(m));
    restaurantMarkersRef.current = [];

    const currentOrder = activeOrder || previewOrder;
    if (currentOrder) {
      const targetVendorId = currentOrder.vendorId;
      const coords = VENDOR_COORDINATES[targetVendorId];
      if (coords) {
        const restIcon = L.divIcon({
          html: `
            <div style="
              display: flex;
              align-items: center;
              justify-content: center;
              background-color: #aa3bff;
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
          .bindPopup(`<b>Restaurant: ${coords.name}</b>`)
          .addTo(map);
        
        restaurantMarkersRef.current.push(m);
      }
    }

    if (customerMarkerRef.current) {
      map.removeLayer(customerMarkerRef.current);
      customerMarkerRef.current = null;
    }

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
      ).bindPopup(`<b>Customer: ${currentOrder.deliveryAddress || "Poznań CDV"}</b>`)
       .addTo(map);
    }

    if (pathLine1Ref.current) {
      map.removeLayer(pathLine1Ref.current);
      pathLine1Ref.current = null;
    }
    if (pathLine2Ref.current) {
      map.removeLayer(pathLine2Ref.current);
      pathLine2Ref.current = null;
    }

    if (activeOrder) {
      const restCoords = VENDOR_COORDINATES[activeOrder.vendorId];
      if (activeOrder.status === "Accepted" && restCoords) {
        const points1 = [
          [courierLoc.lat, courierLoc.lng],
          [restCoords.lat, restCoords.lng]
        ];
        pathLine1Ref.current = L.polyline(points1, { color: '#aa3bff', weight: 4, dashArray: '8, 8' }).addTo(map);
      } else if (activeOrder.status === "Picked Up" && restCoords && activeOrder.deliveryLat) {
        const points2 = [
          [restCoords.lat, restCoords.lng],
          [activeOrder.deliveryLat, activeOrder.deliveryLng]
        ];
        pathLine2Ref.current = L.polyline(points2, { color: '#4cd964', weight: 5 }).addTo(map);
      }
    } else if (previewOrder) {
      const restCoords = VENDOR_COORDINATES[previewOrder.vendorId];
      if (restCoords) {
        const points1 = [
          [courierLoc.lat, courierLoc.lng],
          [restCoords.lat, restCoords.lng]
        ];
        pathLine1Ref.current = L.polyline(points1, { color: '#aa3bff', weight: 4, dashArray: '8, 8' }).addTo(map);

        if (previewOrder.deliveryLat && previewOrder.deliveryLng) {
          const points2 = [
            [restCoords.lat, restCoords.lng],
            [previewOrder.deliveryLat, previewOrder.deliveryLng]
          ];
          pathLine2Ref.current = L.polyline(points2, { color: '#4cd964', weight: 5 }).addTo(map);
        }
      }
    }
  }, [courierLoc, activeOrder, orders, previewOrder, isGpsTracking]);

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
      alert("Failed to accept order: " + err.message);
    }
  };

  const handleConfirmPickUp = async () => {
    if (!activeOrder) return;
    try {
      await updateOrder({
        orderId: activeOrder.id,
        updates: { status: "Picked Up" }
      });
      alert("🍗 Pickup at restaurant confirmed. Heading to the customer!");
      refetch();
    } catch (err) {
      alert("Failed to pick up order: " + err.message);
    }
  };

  const handleDeliverOrder = async () => {
    if (!activeOrder) return;

    try {
      await updateOrder({
        orderId: activeOrder.id,
        updates: { status: "Delivered" }
      });
      alert("🎉 Congratulations! Order successfully delivered to the customer!");
      refetch();
    } catch (err) {
      alert("Failed to complete order: " + err.message);
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

  if (isCourierLoading) return <div style={{ padding: '20px' }}>Loading courier emulator...</div>;
  if (isCourierError) return <div style={{ padding: '20px' }}>Error loading courier profile API</div>;

  return (
    <div className="courier-container-wrapper">
      {}
      <button 
        className="btn-role-switch"
        onClick={() => navigate('/')}
      >
        ← Switch Role
      </button>

      <div className="courier-page-header">
        <div className="courier-header-row">
          <h1 className="courier-header-title">
            Courier Panel {courier?.vehicle === 'Scooter' ? '🛵' : courier?.vehicle === 'Car' ? '🚗' : '🚲'}
          </h1>
          <span className="courier-header-badge">
            {courier?.name || `Courier: ${courierId}`} ({courier?.vehicle || 'Bicycle'})
          </span>
        </div>

        <p className="courier-header-desc">
          Simulate courier movement in Poznań. <b>All restaurants</b> are always visible on the map. Click on the map to move.
        </p>
      </div>

      {}
      <div className="courier-dashboard-container">
        
        {}
        <div className="courier-left-column flex-column-gap-md">
          
          <div className={`mobile-tab-content ${activeMobileTab === 'profile' ? 'active-tab' : ''}`}>
            <CourierProfileHeader 
              courier={courier}
              activeOrder={activeOrder}
              isGpsTracking={isGpsTracking}
              setIsGpsTracking={setIsGpsTracking}
            />
          </div>

          <div className={`mobile-tab-content ${activeMobileTab === 'earnings' ? 'active-tab' : ''}`}>
            {}
            <div style={{
              background: '#fff',
              border: '1px solid #eee',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
              textAlign: 'left',
              transition: 'all 0.3s ease'
            }}>
              {}
              <div 
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                onClick={() => setIsEarningsOpen(!isEarningsOpen)}
              >
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', color: '#333' }}>
                  📊 My Earnings Today
                </h3>
                <span style={{ fontSize: '14px', color: '#aa3bff', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {isEarningsOpen ? 'Collapse ▲' : 'Details ▼'}
                </span>
              </div>
 
              {}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '10px',
                marginTop: '15px',
                borderTop: '1px solid #eee',
                paddingTop: '15px'
              }}>
                {}
                <div style={{ background: 'rgba(0,210,106,0.05)', border: '1px solid rgba(0,210,106,0.12)', padding: '10px', borderRadius: '12px', textAlign: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#555', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>Earned</span>
                  <strong style={{ fontSize: '18px', color: '#00aa54' }}>{totalEarnings} PLN</strong>
                </div>
                {}
                <div style={{ background: 'rgba(74,144,226,0.05)', border: '1px solid rgba(74,144,226,0.12)', padding: '10px', borderRadius: '12px', textAlign: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#555', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>Deliveries</span>
                  <strong style={{ fontSize: '18px', color: '#2575fc' }}>{completedOrders.length} orders</strong>
                </div>
                {}
                <div style={{ background: 'rgba(170,59,255,0.05)', border: '1px solid rgba(170,59,255,0.12)', padding: '10px', borderRadius: '12px', textAlign: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#555', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>Distance</span>
                  <strong style={{ fontSize: '18px', color: '#8c31d8' }}>{totalDistance.toFixed(1)} km</strong>
                </div>
              </div>

              {}
              {isEarningsOpen && (
                <div style={{
                  marginTop: '15px',
                  borderTop: '1px solid #eee',
                  paddingTop: '15px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  maxHeight: '220px',
                  overflowY: 'auto',
                  paddingRight: '4px'
                }}>
                  {completedOrders.length === 0 ? (
                    <div style={{ padding: '20px 0', textAlign: 'center', color: '#777', fontSize: '13px' }}>
                      You have no completed orders today yet. 🛵
                    </div>
                  ) : (
                    completedOrders.map(order => {
                      const payout = calculatePayout(order);
                      return (
                        <div 
                          key={order.id}
                          style={{
                            background: '#f9f9f9',
                            border: '1px solid #eee',
                            borderRadius: '12px',
                            padding: '12px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f1f1f1'}
                          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f9f9f9'}
                        >
                          <div>
                            <strong style={{ fontSize: '13px', color: '#333', display: 'block' }}>
                              🏪 {order.vendorName}
                            </strong>
                            <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: '#666', marginTop: '2px' }}>
                              <span>🍕 #{order.id.slice(-4).toUpperCase()}</span>
                              <span>⏱️ {order.createdAt}</span>
                              <span>🛣️ {order.distance} km</span>
                            </div>
                          </div>
                          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#00aa54' }}>
                            +{payout} PLN
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>

          <div className={`mobile-tab-content ${activeMobileTab === 'orders' ? 'active-tab' : ''}`}>
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
        </div>

        {}
        <div className={`map-tab-wrapper ${activeMobileTab === 'map' ? 'active-tab' : ''}`} style={{ position: 'relative' }}>
          <LeafletDeliveryMap mapContainerRef={mapContainerRef} />
          {activeOrder && (
            <a 
              href={getGoogleMapsDirectionsUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="map-floating-gmaps-btn"
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 18px',
                backgroundColor: '#ffc107',
                color: '#333',
                fontSize: '13px',
                fontWeight: 'bold',
                borderRadius: '12px',
                textDecoration: 'none',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.25)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                transition: 'all 0.2s',
                fontFamily: 'inherit'
              }}
            >
              🗺️ Open Google Maps
            </a>
          )}
        </div>
      </div>

      {}
      <div className="courier-bottom-nav">
        <button 
          className={activeMobileTab === 'map' ? 'active' : ''} 
          onClick={() => navigate(`/courier/${courierId}/map`)}
        >
          <span className="nav-icon">🗺️</span>
          <span className="nav-label">Map</span>
        </button>
        <button 
          className={activeMobileTab === 'orders' ? 'active' : ''} 
          onClick={() => navigate(`/courier/${courierId}/orders`)}
        >
          <span className="nav-icon" style={{ position: 'relative' }}>
            🛒
            {availableOrders.length > 0 && (
              <span className="nav-badge">{availableOrders.length}</span>
            )}
          </span>
          <span className="nav-label">Orders</span>
        </button>
        <button 
          className={activeMobileTab === 'earnings' ? 'active' : ''} 
          onClick={() => navigate(`/courier/${courierId}/earnings`)}
        >
          <span className="nav-icon">📈</span>
          <span className="nav-label">Earnings</span>
        </button>
        <button 
          className={activeMobileTab === 'profile' ? 'active' : ''} 
          onClick={() => navigate(`/courier/${courierId}/profile`)}
        >
          <span className="nav-icon">👤</span>
          <span className="nav-label">Profile</span>
        </button>
      </div>

      <SupportChatWidget 
        userType="courier"
        userId={courierId}
        userName={courier?.name || `Courier ${courierId}`}
        activeOrderId={activeOrder?.id}
        activeOrderVendor={activeOrder?.vendorName}
      />
    </div>
  );
}
