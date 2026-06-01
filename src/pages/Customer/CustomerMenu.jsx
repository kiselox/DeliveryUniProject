import { useState, useEffect, useRef } from 'react';
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
import AccountDrawer from './components/AccountDrawer';
import './Customer.css';
import { FALLBACK_RESTAURANT_LOGO, FALLBACK_HERO_IMAGE } from '../../utils/imageFallbacks';

export default function CustomerMenu() {
  const { id: customerId, vendorId } = useParams();
  const navigate = useNavigate();
  
  const [cart, setCart] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryLat, setDeliveryLat] = useState(52.4140);
  const [deliveryLng, setDeliveryLng] = useState(16.9295);
  const [house, setHouse] = useState('');
  const [apartment, setApartment] = useState('');
  const [floor, setFloor] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  const { orders = [], createOrder, isCreating } = useOrders();

  const activeOrder = [...orders].reverse().find(o => 
    o.customerId === customerId && 
    o.status !== "Delivered" && 
    o.status !== "Cancelled"
  );

  const { data: customer } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => customerServices.getCustomerById(customerId)
  });

  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (customer && !hasInitializedRef.current) {
      setTimeout(() => {
        if (customer.address) {
          setDeliveryAddress(customer.address);
        }
        if (customer.lat && customer.lng) {
          setDeliveryLat(customer.lat);
          setDeliveryLng(customer.lng);
        }
        if (customer.house) {
          setHouse(customer.house);
        }
        if (customer.apartment) {
          setApartment(customer.apartment);
        }
        if (customer.floor) {
          setFloor(customer.floor);
        }
        if (customer.phone) {
          setPhone(customer.phone);
        }
        if (customer.notes) {
          setNotes(customer.notes);
        }
      }, 0);
      hasInitializedRef.current = true;
    }
  }, [customer]);

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

  const filteredMenu = vendor?.menu.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  }) || [];

  const handleCheckout = async () => {
    if (totalItems === 0) return;
    if (!phone.trim()) {
      alert("Please enter the recipient's phone number to connect with the courier!");
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
      distance: 0,
      fee: totalFee,
      totalPrice: orderTotal + totalFee,
      courierId: null,
      createdAt: new Date().toISOString(),
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
      
      try {
        await customerServices.updateCustomer(customerId, {
          address: deliveryAddress,
          lat: deliveryLat,
          lng: deliveryLng,
          house: house,
          apartment: apartment,
          floor: floor,
          phone: phone,
          notes: notes
        });
      } catch (profileSaveErr) {
        console.error('Failed to auto-save delivery details to customer profile:', profileSaveErr);
      }

      alert('Order successfully placed and sent to the courier!');
      setCart({});
      setIsCartOpen(false);
      navigate(`/customer/${customerId}`);
    } catch (err) {
      alert('Error creating order: ' + err.message);
    }
  };

  const handleGetCurrentPosition = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        setDeliveryLat(lat);
        setDeliveryLng(lng);
        setDeliveryAddress("My location");
        
        if (mapRef.current) {
          mapRef.current.setView([lat, lng], 15);
        }
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        }
      },
      (error) => {
        alert("Unable to determine your location: " + error.message);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  useEffect(() => {
    const reorderVendorId = localStorage.getItem('reorder_vendor_id');
    const reorderItemsStr = localStorage.getItem('reorder_items');
    
    if (reorderVendorId && reorderVendorId === vendorId && reorderItemsStr && vendor?.menu) {
      try {
        const newCart = {};
        const itemsList = reorderItemsStr.split(', ');
        itemsList.forEach(itemStr => {
          const match = itemStr.match(/^(\d+)x\s+(.+)$/);
          if (match) {
            const count = parseInt(match[1], 10);
            const itemName = match[2].trim().toLowerCase();
            const menuItem = vendor.menu.find(m => m.name.toLowerCase() === itemName);
            if (menuItem) {
              newCart[menuItem.id] = count;
            }
          }
        });
        if (Object.keys(newCart).length > 0) {
          setTimeout(() => {
            setCart(newCart);
            setIsCartOpen(true);
          }, 0);
        }
      } catch (err) {
        console.error('Failed to parse reorder items:', err);
      } finally {
        localStorage.removeItem('reorder_vendor_id');
        localStorage.removeItem('reorder_items');
      }
    }
  }, [vendor, vendorId]);

  useEffect(() => {
    if (!isCartOpen) {
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
  }, [isCartOpen, deliveryLat, deliveryLng]);

  if (isLoading) return <div className="customer-container">Loading restaurant menu...</div>;
  if (isError || !vendor) return <div className="customer-container">Error loading restaurant!</div>;

  const cartItemsData = vendor.menu.filter(item => cart[item.id] > 0);
  const totalFoodPrice = cartItemsData.reduce((sum, item) => sum + (item.price * cart[item.id]), 0);

  return (
    <div className="customer-container">
      <Header 
        address={customer?.address} 
        onProfileClick={() => setIsAccountOpen(true)}
      />

      <button className="btn-back" onClick={() => navigate(-1)}>
        ← Back to restaurants
      </button>

      <div className="vendor-hero">
        <img 
          src={vendor.heroImage || FALLBACK_HERO_IMAGE} 
          alt="Hero" 
          className="vendor-hero-img" 
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = FALLBACK_HERO_IMAGE;
          }}
        />
        <div className="vendor-logo-wrapper">
          <img 
            src={vendor.imageUrl || FALLBACK_RESTAURANT_LOGO} 
            alt={vendor.name} 
            className="vendor-logo" 
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = FALLBACK_RESTAURANT_LOGO;
            }}
          />
        </div>
        <h2 className="vendor-hero-title">{vendor.name}</h2>
        
        <div className="vendor-search-bar">
          <input 
            type="text" 
            placeholder="Search menu…" 	
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <span>🔍</span>
        </div>
      </div>

      <div className="menu-section">
        <div className="menu-categories-tabs">
          {[
            { id: 'all', name: 'All' },
            { id: 'mains', name: 'Mains' },
            { id: 'sides', name: 'Sides & Starters' },
            { id: 'desserts', name: 'Desserts' },
            { id: 'drinks', name: 'Drinks' }
          ].map(cat => (
            <button
              key={cat.id}
              className={`btn-category-tab ${activeCategory === cat.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <h3 className="section-title">
          {activeCategory === 'all' ? 'Popular Dishes' : 
           activeCategory === 'mains' ? 'Main Menu' :
           activeCategory === 'sides' ? 'Sides & Starters' :
           activeCategory === 'desserts' ? 'Sweet Desserts' : 'Refreshing Drinks'}
        </h3>
        
        {filteredMenu.length === 0 ? (
          <p>Nothing found for your request "{searchTerm}"</p>
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

      {}
      <button 
        className="floating-cart-btn" 
        onClick={() => setIsCartOpen(true)}
        disabled={totalItems === 0 || isCreating}
      >
        🛒
        {totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
      </button>

      {}
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

      <AccountDrawer 
        isOpen={isAccountOpen} 
        onClose={() => setIsAccountOpen(false)} 
        customerId={customerId} 
      />

      <SupportChatWidget 
        userType="customer"
        userId={customerId}
        userName={customer?.name || "Customer"}
        activeOrderId={activeOrder?.id}
        activeOrderVendor={activeOrder?.vendorName}
      />
    </div>
  );
}
