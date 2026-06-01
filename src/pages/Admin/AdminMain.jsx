// src/pages/Admin/AdminMain.jsx
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { useOrders } from '../../hooks/useOrders';
import { useSettings } from '../../hooks/useSettings';
import { useSupportChat } from '../../hooks/useSupportChat';
import { useAuth } from '../../context/AuthContext';

// Global shared page components
import SettingsPanel from './components/SettingsPanel';
import OrdersTable from './components/OrdersTable';
import SurgeAdjusterModal from './components/SurgeAdjusterModal';
import OrderDetailsModal from './components/OrderDetailsModal';

// Refactored granular page components
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

  const [activeTab, setActiveTab] = useState('orders'); // 'orders' or 'support'
  const [sidebarSubTab, setSidebarSubTab] = useState('orders'); // 'orders' or 'general'
  
  const [rateSaving, setRateSaving] = useState(false);
  const [customRateVelo, setCustomRateVelo] = useState('');
  const [customRateScooter, setCustomRateScooter] = useState('');
  const [customRateCar, setCustomRateCar] = useState('');
  
  // Modal state for editing order coefficient
  const [editingOrder, setEditingOrder] = useState(null);
  const [newCoefficient, setNewCoefficient] = useState('');

  // Modal state for viewing order details
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  // Client-side pagination state
  const [visibleCount, setVisibleCount] = useState(10);

  // Selected chat ID for Center Support dialogues
  const [selectedChatId, setSelectedChatId] = useState(null);

  // Use modular React Query hooks
  const { orders = [], refetch: refetchOrders, updateOrder } = useOrders();
  const { settings, updateSettings, refetch: refetchSettings } = useSettings();

  // Pull support messages for the active conversation
  const { messages: chatMessages = [], sendMessage: sendAdminMessage } = useSupportChat(selectedChatId);

  // Selected Chat partner info derivation
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

  // Fetch partner profile using TanStack React Query instead of useEffect!
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

  // Poll active chats from the Express backend (every 3 seconds)
  const { data: chatThreads = [], refetch: refetchChats } = useQuery({
    queryKey: ['supportChats'],
    queryFn: async () => {
      const res = await api.get('/support/chats');
      return res.data;
    },
    refetchInterval: 3000
  });

  // Initialize inputs on settings load
  useEffect(() => {
    if (settings) {
      setTimeout(() => {
        setCustomRateVelo(prev => prev === '' ? (settings.pricePerKm?.toString() || '4.0') : prev);
        setCustomRateScooter(prev => prev === '' ? (settings.scooterPricePerKm?.toString() || '5.5') : prev);
        setCustomRateCar(prev => prev === '' ? (settings.carPricePerKm?.toString() || '7.0') : prev);
      }, 0);
    }
  }, [settings]);

  // Action: Save custom price rate
  const handleSaveRate = async (e) => {
    e.preventDefault();
    if (!customRateVelo || isNaN(customRateVelo) || !customRateScooter || isNaN(customRateScooter) || !customRateCar || isNaN(customRateCar)) {
      alert("Пожалуйста, введите корректные числовые значения тарифов.");
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
      alert("✅ Тарифы успешно обновлены!");
    } catch (err) {
      alert("Ошибка при обновлении тарифов: " + err.message);
    } finally {
      setRateSaving(false);
    }
  };

  // Action: Toggle weather surcharge
  const handleSelectWeather = async (surchargeValue) => {
    try {
      await updateSettings({
        globalSurcharge: parseFloat(surchargeValue)
      });
      await refetchSettings();
    } catch (err) {
      alert("Ошибка при выборе погодных условий: " + err.message);
    }
  };

  // Action: Update Order Coefficient via Modal
  const handleUpdateOrderCoefficient = async (e) => {
    e.preventDefault();
    if (!editingOrder) return;
    if (!newCoefficient || isNaN(newCoefficient) || parseFloat(newCoefficient) < 1.0) {
      alert("Пожалуйста, введите корректный коэффициент (не менее 1.0).");
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
      alert("⚡ Коэффициент повышенного спроса успешно обновлен!");
    } catch (err) {
      alert("Не удалось обновить коэффициент спроса: " + err.message);
    }
  };

  // Handle resolving a support chat
  const handleResolveChat = async () => {
    if (!selectedChatId) return;
    if (!window.confirm("Вы действительно хотите пометить это обращение как решенное? Чат будет перемещен в архив.")) {
      return;
    }
    try {
      await api.post(`/support/chats/${selectedChatId}/resolve`);
      setSelectedChatId(null);
      refetchChats();
    } catch (err) {
      alert("Не удалось закрыть чат: " + err.message);
    }
  };

  // Safe checks
  const safeOrders = orders || [];
  const safeSettings = settings || { pricePerKm: 4.0, globalSurcharge: 0.0 };

  // Sort orders robustly by ISO date descending
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
            Вход в панель диспетчера...
          </h2>
          <p className="admin-loading-desc">
            Авторизация администратора системы
          </p>
        </div>
      ) : (
        <div className="admin-dashboard-container">
          
          {/* HEADER BAR */}
          <div className="admin-header-bar">
            <div style={{ textAlign: 'left' }}>
              <h1 className="admin-header-title">
                Панель Поддержки 🛠️
              </h1>
            </div>
            
            <div className="admin-online-badge">
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#00d26a', boxShadow: '0 0 10px #00d26a' }} />
              <span style={{ fontSize: '14px', fontWeight: 'bold' }}>Служба поддержки онлайн</span>
            </div>
          </div>

          {/* NAVIGATION TABS */}
          <div className="support-tabs-container">
            <button
              onClick={() => setActiveTab('orders')}
              className={`support-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
            >
              📦 Заказы и Тарифы
            </button>
            <button
              onClick={() => {
                setActiveTab('support');
                refetchChats();
              }}
              className={`support-tab-btn ${activeTab === 'support' ? 'active' : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              💬 Центр Поддержки
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

          {/* TAB CONTENT: ORDERS */}
          {activeTab === 'orders' && (
            <>
              {/* ANALYTICS SECTION */}
              <AdminStats orders={safeOrders} />

              {/* SETTINGS PANEL */}
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

              {/* ORDERS TABLE */}
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

          {/* TAB CONTENT: SUPPORT REAL-TIME CHATS */}
          {activeTab === 'support' && (
            <div className="chat-center-grid">
              {/* Left Thread Sidebar */}
              <SupportChatSidebar 
                chatThreads={chatThreads}
                orders={safeOrders}
                selectedChatId={selectedChatId}
                setSelectedChatId={setSelectedChatId}
                sidebarSubTab={sidebarSubTab}
                setSidebarSubTab={setSidebarSubTab}
              />

              {/* Right Chat Pane */}
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

          {/* OVERLAY MODAL FOR DYNAMIC SURGE COEFFICIENT */}
          <SurgeAdjusterModal 
            editingOrder={editingOrder}
            setEditingOrder={setEditingOrder}
            newCoefficient={newCoefficient}
            setNewCoefficient={setNewCoefficient}
            handleUpdateOrderCoefficient={handleUpdateOrderCoefficient}
            safeSettings={safeSettings}
          />

          {/* OVERLAY MODAL FOR FULL ORDER DETAILS VIEW */}
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
