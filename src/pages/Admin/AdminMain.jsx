import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { useOrders } from '../../hooks/useOrders';
import { useSettings } from '../../hooks/useSettings';
import { useSupportChat } from '../../hooks/useSupportChat';
import { useAuth } from '../../context/AuthContext';

import SettingsPanel from './components/SettingsPanel';
import OrdersTable from './components/OrdersTable';
import SurgeAdjusterModal from './components/SurgeAdjusterModal';
import OrderDetailsModal from './components/OrderDetailsModal';

import OrderStatusBadge from './components/OrderStatusBadge';
import AdminStats from './components/AdminStats';
import SupportChatSidebar from './components/SupportChatSidebar';
import ActiveChatContainer from './components/ActiveChatContainer';

import './Admin.css';

export default function AdminMain() {
  const { user, developerLogin } = useAuth();
  const [isAdminChecking, setIsAdminChecking] = useState(true);

  useEffect(() => {
    async function ensureAdmin() {
      if (!user || user.role !== 'admin') {
        try {
          await developerLogin('admin', 'admin');
        } catch (err) {
          console.error('Failed auto-login as admin:', err);
        }
      }
      setIsAdminChecking(false);
    }
    ensureAdmin();
  }, [user, developerLogin]);

  const [activeTab, setActiveTab] = useState('orders');
  const [sidebarSubTab, setSidebarSubTab] = useState('orders');
  
  const [rateSaving, setRateSaving] = useState(false);
  const [customRateVelo, setCustomRateVelo] = useState('');
  const [customRateScooter, setCustomRateScooter] = useState('');
  const [customRateCar, setCustomRateCar] = useState('');
  
  const [editingOrder, setEditingOrder] = useState(null);
  const [newCoefficient, setNewCoefficient] = useState('');

  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [visibleCount, setVisibleCount] = useState(10);

  const [selectedChatId, setSelectedChatId] = useState(null);

  const { orders = [], refetch: refetchOrders, updateOrder } = useOrders();
  const { settings, updateSettings, refetch: refetchSettings } = useSettings();

  const { messages: chatMessages = [], sendMessage: sendAdminMessage } = useSupportChat(selectedChatId);

  const isCourierChat = selectedChatId ? selectedChatId.endsWith('-courier') : false;
  let chatPartnerId = null;
  let chatPartnerRole = 'customer';

  if (selectedChatId) {
    if (selectedChatId.startsWith('order-')) {
      const orderId = selectedChatId.replace('-courier', '').replace('order-', '');
      const foundOrder = orders.find(o => o.id === orderId);
      if (foundOrder) {
        chatPartnerId = isCourierChat ? foundOrder.courierId : foundOrder.customerId;
        chatPartnerRole = isCourierChat ? 'courier' : 'customer';
      }
    } else if (selectedChatId.startsWith('general-')) {
      const rawId = selectedChatId.replace('general-', '');
      chatPartnerId = rawId;
      chatPartnerRole = rawId.startsWith('cour') ? 'courier' : 'customer';
    }
  }

  const { data: partnerProfile = null } = useQuery({
    queryKey: ['chatPartner', chatPartnerId, chatPartnerRole],
    queryFn: async () => {
      if (!chatPartnerId) return null;
      const endpoint = chatPartnerRole === 'courier' ? `/couriers/${chatPartnerId}` : `/customers/${chatPartnerId}`;
      const res = await api.get(endpoint);
      return res.data;
    },
    enabled: !!chatPartnerId
  });

  const { data: chatThreads = [], refetch: refetchChats } = useQuery({
    queryKey: ['supportChats'],
    queryFn: async () => {
      const res = await api.get('/support/chats');
      return res.data;
    },
    refetchInterval: 3000
  });

  useEffect(() => {
    if (settings) {
      setTimeout(() => {
        setCustomRateVelo(prev => prev === '' ? (settings.pricePerKm?.toString() || '4.0') : prev);
        setCustomRateScooter(prev => prev === '' ? (settings.scooterPricePerKm?.toString() || '5.5') : prev);
        setCustomRateCar(prev => prev === '' ? (settings.carPricePerKm?.toString() || '7.0') : prev);
      }, 0);
    }
  }, [settings]);

  const handleSaveRate = async (e) => {
    e.preventDefault();
    if (!customRateVelo || isNaN(customRateVelo) || !customRateScooter || isNaN(customRateScooter) || !customRateCar || isNaN(customRateCar)) {
      alert("Please enter valid numeric values for tariffs.");
      return;
    }
    try {
      setRateSaving(true);
      await updateSettings({
        pricePerKm: parseFloat(customRateVelo),
        scooterPricePerKm: parseFloat(customRateScooter),
        carPricePerKm: parseFloat(customRateCar)
      });
      await refetchSettings();
      alert("✅ Tariffs successfully updated!");
    } catch (err) {
      alert("Error updating tariffs: " + err.message);
    } finally {
      setRateSaving(false);
    }
  };

  const handleSelectWeather = async (surchargeValue) => {
    try {
      await updateSettings({
        globalSurcharge: parseFloat(surchargeValue)
      });
      await refetchSettings();
    } catch (err) {
      alert("Error setting weather conditions: " + err.message);
    }
  };

  const handleUpdateOrderCoefficient = async (e) => {
    e.preventDefault();
    if (!editingOrder) return;
    if (!newCoefficient || isNaN(newCoefficient) || parseFloat(newCoefficient) < 1.0) {
      alert("Please enter a valid coefficient (at least 1.0).");
      return;
    }

    try {
      await updateOrder({
        orderId: editingOrder.id,
        updates: { coefficient: parseFloat(newCoefficient) }
      });
      setEditingOrder(null);
      setNewCoefficient('');
      refetchOrders();
      alert("⚡ Surge coefficient successfully updated!");
    } catch (err) {
      alert("Failed to update surge coefficient: " + err.message);
    }
  };

  const handleResolveChat = async () => {
    if (!selectedChatId) return;
    if (!window.confirm("Are you sure you want to mark this ticket as resolved? The chat will be archived.")) {
      return;
    }
    try {
      await api.post(`/support/chats/${selectedChatId}/resolve`);
      setSelectedChatId(null);
      refetchChats();
    } catch (err) {
      alert("Failed to close chat: " + err.message);
    }
  };

  const safeOrders = orders || [];
  const safeSettings = settings || { pricePerKm: 4.0, globalSurcharge: 0.0 };

  const sortedOrders = [...safeOrders].sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    if (isNaN(timeA) || isNaN(timeB)) {
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    }
    return timeB - timeA;
  });

  const getStatusBadgeWrapper = (status) => <OrderStatusBadge status={status} />;

  return (
    <div className="admin-page-wrapper">
      {isAdminChecking ? (
        <div className="admin-loading-wrapper">
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>🛠️</div>
          <h2 className="admin-loading-title">
            Entering Dispatch Panel...
          </h2>
          <p className="admin-loading-desc">
            System Administrator Authorization
          </p>
        </div>
      ) : (
        <div className="admin-dashboard-container">
          
          {}
          <div className="admin-header-bar">
            <div style={{ textAlign: 'left' }}>
              <h1 className="admin-header-title">
                Support Dashboard 🛠️
              </h1>
            </div>
            
            <div className="admin-online-badge">
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#00d26a', boxShadow: '0 0 10px #00d26a' }} />
              <span style={{ fontSize: '14px', fontWeight: 'bold' }}>Support Service Online</span>
            </div>
          </div>

          {}
          <div className="support-tabs-container">
            <button
              onClick={() => setActiveTab('orders')}
              className={`support-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
            >
              📦 Orders and Tariffs
            </button>
            <button
              onClick={() => {
                setActiveTab('support');
                refetchChats();
              }}
              className={`support-tab-btn ${activeTab === 'support' ? 'active' : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              💬 Support Center
              {chatThreads.length > 0 && (
                <span style={{
                  backgroundColor: '#ff3b30',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  padding: '2px 8px',
                  borderRadius: '10px'
                }}>
                  {chatThreads.length}
                </span>
              )}
            </button>
          </div>

          {}
          {activeTab === 'orders' && (
            <>
              {}
              <AdminStats orders={safeOrders} />

              {}
              <SettingsPanel 
                settings={settings}
                customRateVelo={customRateVelo}
                setCustomRateVelo={setCustomRateVelo}
                customRateScooter={customRateScooter}
                setCustomRateScooter={setCustomRateScooter}
                customRateCar={customRateCar}
                setCustomRateCar={setCustomRateCar}
                handleSaveRate={handleSaveRate}
                handleSelectWeather={handleSelectWeather}
                rateSaving={rateSaving}
              />

              {}
              <OrdersTable 
                orders={sortedOrders}
                visibleCount={visibleCount}
                setVisibleCount={setVisibleCount}
                setEditingOrder={setEditingOrder}
                setNewCoefficient={setNewCoefficient}
                setSelectedOrderDetails={setSelectedOrderDetails}
              />
            </>
          )}

          {}
          {activeTab === 'support' && (
            <div className="chat-center-grid">
              {}
              <SupportChatSidebar 
                chatThreads={chatThreads}
                orders={safeOrders}
                selectedChatId={selectedChatId}
                setSelectedChatId={setSelectedChatId}
                sidebarSubTab={sidebarSubTab}
                setSidebarSubTab={setSidebarSubTab}
              />

              {}
              <ActiveChatContainer 
                selectedChatId={selectedChatId}
                setSelectedChatId={setSelectedChatId}
                chatMessages={chatMessages}
                partnerProfile={partnerProfile}
                handleResolveChat={handleResolveChat}
                sendAdminMessage={sendAdminMessage}
                refetchChats={refetchChats}
              />
            </div>
          )}

          {}
          <SurgeAdjusterModal 
            editingOrder={editingOrder}
            setEditingOrder={setEditingOrder}
            newCoefficient={newCoefficient}
            setNewCoefficient={setNewCoefficient}
            handleUpdateOrderCoefficient={handleUpdateOrderCoefficient}
            safeSettings={safeSettings}
          />

          {}
          <OrderDetailsModal 
            selectedOrderDetails={selectedOrderDetails}
            setSelectedOrderDetails={setSelectedOrderDetails}
            safeSettings={safeSettings}
            getStatusBadge={getStatusBadgeWrapper}
            updateOrder={updateOrder}
            refetchOrders={refetchOrders}
            setActiveTab={setActiveTab}
            setSelectedChatId={setSelectedChatId}
            setSidebarSubTab={setSidebarSubTab}
          />

        </div>
      )}
    </div>
  );
}
