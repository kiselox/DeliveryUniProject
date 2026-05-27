// src/pages/Admin/AdminMain.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { useOrders } from '../../hooks/useOrders';
import { useSettings } from '../../hooks/useSettings';
import { useSupportChat } from '../../hooks/useSupportChat';
import SettingsPanel from './components/SettingsPanel';
import OrdersTable from './components/OrdersTable';
import SurgeAdjusterModal from './components/SurgeAdjusterModal';
import OrderDetailsModal from './components/OrderDetailsModal';
import './Admin.css';

export default function AdminMain() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' or 'support'
  
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

  // Use modular React Query hooks
  const { orders = [], refetch: refetchOrders, updateOrder } = useOrders();
  const { settings, updateSettings, refetch: refetchSettings } = useSettings();

  // Support Chat states
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [partnerProfile, setPartnerProfile] = useState(null);
  const [sidebarSubTab, setSidebarSubTab] = useState('orders'); // 'orders' or 'general'
  const messagesEndRef = useRef(null);

  // Pull support messages for the active conversation
  const { messages: chatMessages = [], sendMessage: sendAdminMessage } = useSupportChat(selectedChatId);  // Fetch partner profile whenever selectedChatId or messages update
  useEffect(() => {
    if (!selectedChatId) {
      setPartnerProfile(null);
      return;
    }
    
    let partnerId = null;
    let partnerRole = 'customer';

    if (selectedChatId.startsWith('order-')) {
      const isCourier = selectedChatId.endsWith('-courier');
      const orderId = selectedChatId.replace('-courier', '').replace('order-', '');
      const foundOrder = (orders || []).find(o => o.id === orderId);
      if (foundOrder) {
        partnerId = isCourier ? foundOrder.courierId : foundOrder.customerId;
        partnerRole = isCourier ? 'courier' : 'customer';
      }
    }

    if (!partnerId) {
      const clientMessage = chatMessages.find(m => m.role !== 'admin');
      partnerId = clientMessage ? clientMessage.senderId : (selectedChatId.startsWith('general-') ? selectedChatId.replace('general-', '') : null);
      partnerRole = clientMessage ? clientMessage.role : (selectedChatId.startsWith('general-') ? (selectedChatId.includes('cour') ? 'courier' : 'customer') : 'customer');
    }

    if (partnerId && partnerRole) {
      const endpoint = partnerRole === 'courier' ? `/couriers/${partnerId}` : `/customers/${partnerId}`;
      api.get(endpoint)
        .then(res => setPartnerProfile(res.data))
        .catch(err => console.error('Error fetching chat partner profile:', err));
    } else {
      setPartnerProfile(null);
    }
  }, [selectedChatId, chatMessages, orders]);
  // Poll active chats from the Express backend (every 3 seconds)
  const { data: chatThreads = [], refetch: refetchChats } = useQuery({
    queryKey: ['supportChats'],
    queryFn: async () => {
      const res = await api.get('/support/chats');
      return res.data;
    },
    refetchInterval: 3000
  });

  // Auto-scroll chat history
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, selectedChatId]);

  // Initialize inputs on settings load
  useEffect(() => {
    if (settings) {
      if (customRateVelo === '') setCustomRateVelo(settings.pricePerKm?.toString() || '4.0');
      if (customRateScooter === '') setCustomRateScooter(settings.scooterPricePerKm?.toString() || '5.5');
      if (customRateCar === '') setCustomRateCar(settings.carPricePerKm?.toString() || '7.0');
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

  const handleAdminSend = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedChatId) return;
    try {
      await sendAdminMessage({
        chatId: selectedChatId,
        senderId: 'admin',
        senderName: 'Поддержка POLONEZ',
        role: 'admin',
        text: replyText.trim()
      });
      setReplyText('');
      refetchChats();
    } catch (err) {
      alert("Не удалось отправить сообщение: " + err.message);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Ready for Pickup":
        return (
          <span style={{
            backgroundColor: 'rgba(255, 193, 7, 0.15)', color: '#ffc107',
            border: '1px solid rgba(255, 193, 7, 0.3)', padding: '6px 12px',
            borderRadius: '20px', fontSize: '13px', fontWeight: 'bold'
          }}>
            🟡 Ожидает
          </span>
        );
      case "Accepted":
        return (
          <span style={{
            backgroundColor: 'rgba(170, 59, 255, 0.15)', color: '#c480ff',
            border: '1px solid rgba(170, 59, 255, 0.3)', padding: '6px 12px',
            borderRadius: '20px', fontSize: '13px', fontWeight: 'bold'
          }}>
            🟣 Принят курьером
          </span>
        );
      case "Picked Up":
      case "Delivering":
        return (
          <span style={{
            backgroundColor: 'rgba(0, 210, 106, 0.15)', color: '#00d26a',
            border: '1px solid rgba(0, 210, 106, 0.3)', padding: '6px 12px',
            borderRadius: '20px', fontSize: '13px', fontWeight: 'bold'
          }}>
            🔵 В пути к клиенту
          </span>
        );
      case "Delivered":
        return (
          <span style={{
            backgroundColor: 'rgba(74, 144, 226, 0.15)', color: '#4a90e2',
            border: '1px solid rgba(74, 144, 226, 0.3)', padding: '6px 12px',
            borderRadius: '20px', fontSize: '13px', fontWeight: 'bold'
          }}>
            🟢 Доставлен
          </span>
        );
      case "Cancelled":
        return (
          <span style={{
            backgroundColor: 'rgba(255, 77, 77, 0.15)', color: '#ff4d4d',
            border: '1px solid rgba(255, 77, 77, 0.3)', padding: '6px 12px',
            borderRadius: '20px', fontSize: '13px', fontWeight: 'bold'
          }}>
            ❌ Отменен
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  // Safe checks
  const safeOrders = orders || [];
  const safeSettings = settings || { pricePerKm: 4.0, globalSurcharge: 0.0 };

  // Calculate stats
  const pendingOrders = safeOrders.filter(o => o.status === "Ready for Pickup").length;
  const activeDeliveries = safeOrders.filter(o => o.status === "Accepted" || o.status === "Picked Up" || o.status === "Delivering").length;
  const completedDeliveries = safeOrders.filter(o => o.status === "Delivered").length;

  // Sort orders robustly by ISO date descending
  const sortedOrders = [...safeOrders].sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    if (isNaN(timeA) || isNaN(timeB)) {
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    }
    return timeB - timeA;
  });

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

  // Compute unread counts for order vs general subtabs
  const unreadOrdersCount = (chatThreads || []).filter(t => t.chatId.startsWith('order-')).reduce((acc, t) => acc + (t.unreadCount || 0), 0);
  const unreadGeneralCount = (chatThreads || []).filter(t => t.chatId.startsWith('general-')).reduce((acc, t) => acc + (t.unreadCount || 0), 0);

  // Group order chats for the Orders sub-tab in the sidebar
  const orderGroups = [];
  const seenOrderIds = new Set();

  (chatThreads || []).forEach(thread => {
    if (thread.chatId.startsWith('order-')) {
      const baseOrderId = thread.chatId.replace('-courier', '').replace('order-', '');
      if (!seenOrderIds.has(baseOrderId)) {
        seenOrderIds.add(baseOrderId);
        
        const customerThread = chatThreads.find(t => t.chatId === `order-${baseOrderId}`);
        const courierThread = chatThreads.find(t => t.chatId === `order-${baseOrderId}-courier`);
        
        const latestTime = Math.max(
          customerThread ? new Date(customerThread.timestamp).getTime() : 0,
          courierThread ? new Date(courierThread.timestamp).getTime() : 0
        );
        
        const foundOrder = safeOrders.find(o => o.id === baseOrderId);
        const isCourierAssigned = foundOrder && foundOrder.courierId;

        orderGroups.push({
          orderId: baseOrderId,
          customerThread,
          courierThread,
          latestTime,
          foundOrder,
          isCourierAssigned
        });
      }
    }
  });

  orderGroups.sort((a, b) => b.latestTime - a.latestTime);

  // Filter general threads for the General sub-tab
  const generalThreads = (chatThreads || []).filter(thread => thread.chatId.startsWith('general-'));


  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at 50% 50%, #151030 0%, #0d091a 100%)',
      color: '#f3f1f6',
      padding: '40px 20px',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div className="admin-dashboard-container">
        
        {/* HEADER BAR */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '30px'
        }}>
          <div style={{ textAlign: 'left' }}>
            <button 
              onClick={() => navigate('/')}
              style={{
                background: 'none',
                border: 'none',
                color: '#c480ff',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                marginBottom: '10px',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              ← Сменить роль
            </button>
            <h1 style={{
              fontSize: '36px',
              fontWeight: '800',
              margin: 0,
              background: 'linear-gradient(to right, #ff7beb, #aa3bff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 2px 10px rgba(170, 59, 255, 0.2)'
            }}>
              Панель Поддержки 🛠️
            </h1>
          </div>
          
          <div style={{
            backdropFilter: 'blur(10px)',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '10px 20px',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '15px'
          }}>
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
            <div className="analytics-grid">
              <div className="analytic-card">
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', fontWeight: 'bold' }}>🛒 Ожидают курьера</span>
                <div style={{ fontSize: '32px', fontWeight: '800', marginTop: '5px', color: '#ffc107' }}>{pendingOrders}</div>
              </div>
              <div className="analytic-card">
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', fontWeight: 'bold' }}>🔵 Доставляются сейчас</span>
                <div style={{ fontSize: '32px', fontWeight: '800', marginTop: '5px', color: '#aa3bff' }}>{activeDeliveries}</div>
              </div>
              <div className="analytic-card">
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', fontWeight: 'bold' }}>🟢 Успешно доставлено</span>
                <div style={{ fontSize: '32px', fontWeight: '800', marginTop: '5px', color: '#00d26a' }}>{completedDeliveries}</div>
              </div>
            </div>

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
            <div className="chat-threads-sidebar">
              <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px', textAlign: 'left' }}>
                Активные обращения
              </h3>

              {/* SUB-TABS (Orders vs General) */}
              <div style={{
                display: 'flex',
                background: 'rgba(255, 255, 255, 0.04)',
                borderRadius: '10px',
                padding: '4px',
                marginBottom: '15px',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}>
                <button
                  onClick={() => setSidebarSubTab('orders')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '8px',
                    border: 'none',
                    background: sidebarSubTab === 'orders' ? 'linear-gradient(135deg, #ff7beb 0%, #aa3bff 100%)' : 'none',
                    color: '#fff',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.2s'
                  }}
                >
                  🍕 Заказы
                  {unreadOrdersCount > 0 && (
                    <span style={{
                      backgroundColor: '#ff3b30',
                      color: '#fff',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      borderRadius: '50%',
                      minWidth: '16px',
                      height: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 4px'
                    }}>
                      {unreadOrdersCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setSidebarSubTab('general')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '8px',
                    border: 'none',
                    background: sidebarSubTab === 'general' ? 'linear-gradient(135deg, #ff7beb 0%, #aa3bff 100%)' : 'none',
                    color: '#fff',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.2s'
                  }}
                >
                  ⚙️ Общие
                  {unreadGeneralCount > 0 && (
                    <span style={{
                      backgroundColor: '#ff3b30',
                      color: '#fff',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      borderRadius: '50%',
                      minWidth: '16px',
                      height: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 4px'
                    }}>
                      {unreadGeneralCount}
                    </span>
                  )}
                </button>
              </div>

              {/* THREADS LIST */}
              {sidebarSubTab === 'orders' ? (
                orderGroups.length === 0 ? (
                  <div style={{ margin: 'auto 0', textAlign: 'center', fontSize: '13px', color: 'rgba(255,255,255,0.4)', padding: '20px' }}>
                    Нет активных обращений по заказам.
                  </div>
                ) : (
                  orderGroups.map((group) => {
                    return (
                      <div
                        key={group.orderId}
                        style={{
                          backdropFilter: 'blur(10px)',
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '16px',
                          padding: '16px',
                          marginBottom: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          textAlign: 'left'
                        }}
                      >
                        {/* Header info */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <strong style={{ fontSize: '14px', color: '#fff', display: 'block' }}>
                              {group.foundOrder ? `🏪 ${group.foundOrder.vendorName}` : `🍕 Заказ #${group.orderId.slice(-4).toUpperCase()}`}
                            </strong>
                            <span style={{ fontSize: '11px', color: '#ff7beb', fontWeight: 'bold' }}>
                              🍕 Заказ #{group.orderId.slice(-4).toUpperCase()}
                            </span>
                          </div>
                          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                            {group.latestTime > 0 ? new Date(group.latestTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                          </span>
                        </div>

                        {/* Last message preview */}
                        <div style={{
                          fontSize: '12px',
                          color: 'rgba(255,255,255,0.5)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          background: 'rgba(0,0,0,0.15)',
                          padding: '6px 10px',
                          borderRadius: '8px'
                        }}>
                          <i>Последнее:</i> {group.customerThread?.lastMessage || group.courierThread?.lastMessage || 'Нет сообщений'}
                        </div>

                        {/* Buttons row: Courier vs Customer */}
                        {group.isCourierAssigned ? (
                          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                            {/* Client Button */}
                            <button
                              onClick={() => setSelectedChatId(`order-${group.orderId}`)}
                              style={{
                                flex: 1,
                                padding: '8px 10px',
                                borderRadius: '8px',
                                border: selectedChatId === `order-${group.orderId}` ? '1px solid #c480ff' : '1px solid rgba(255,255,255,0.12)',
                                background: selectedChatId === `order-${group.orderId}`
                                  ? 'linear-gradient(135deg, rgba(170, 59, 255, 0.25) 0%, rgba(123, 31, 162, 0.25) 100%)'
                                  : 'rgba(255,255,255,0.04)',
                                color: selectedChatId === `order-${group.orderId}` ? '#c480ff' : 'rgba(255,255,255,0.7)',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                position: 'relative',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px'
                              }}
                            >
                              👤 Клиент
                              {group.customerThread?.unreadCount > 0 && (
                                <span style={{
                                  position: 'absolute',
                                  top: '-6px',
                                  right: '-6px',
                                  backgroundColor: '#ff3b30',
                                  color: '#fff',
                                  fontSize: '10px',
                                  fontWeight: 'bold',
                                  borderRadius: '50%',
                                  minWidth: '16px',
                                  height: '16px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  border: '2px solid #1a153b',
                                  padding: '0 2px'
                                }}>
                                  {group.customerThread.unreadCount}
                                </span>
                              )}
                            </button>

                            {/* Courier Button */}
                            <button
                              onClick={() => setSelectedChatId(`order-${group.orderId}-courier`)}
                              style={{
                                flex: 1,
                                padding: '8px 10px',
                                borderRadius: '8px',
                                border: selectedChatId === `order-${group.orderId}-courier` ? '1px solid #ffc107' : '1px solid rgba(255,255,255,0.12)',
                                background: selectedChatId === `order-${group.orderId}-courier`
                                  ? 'linear-gradient(135deg, rgba(255, 193, 7, 0.25) 0%, rgba(211, 158, 0, 0.25) 100%)'
                                  : 'rgba(255,255,255,0.04)',
                                color: selectedChatId === `order-${group.orderId}-courier` ? '#ffc107' : 'rgba(255,255,255,0.7)',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                position: 'relative',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px'
                              }}
                            >
                              🛵 Курьер
                              {group.courierThread?.unreadCount > 0 && (
                                <span style={{
                                  position: 'absolute',
                                  top: '-6px',
                                  right: '-6px',
                                  backgroundColor: '#ff3b30',
                                  color: '#fff',
                                  fontSize: '10px',
                                  fontWeight: 'bold',
                                  borderRadius: '50%',
                                  minWidth: '16px',
                                  height: '16px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  border: '2px solid #1a153b',
                                  padding: '0 2px'
                                }}>
                                  {group.courierThread.unreadCount}
                                </span>
                              )}
                            </button>
                          </div>
                        ) : (
                          /* Not Assigned */
                          <button
                            onClick={() => setSelectedChatId(`order-${group.orderId}`)}
                            style={{
                              width: '100%',
                              padding: '8px 10px',
                              borderRadius: '8px',
                              border: selectedChatId === `order-${group.orderId}` ? '1px solid #c480ff' : '1px solid rgba(255,255,255,0.12)',
                              background: selectedChatId === `order-${group.orderId}`
                                ? 'linear-gradient(135deg, rgba(170, 59, 255, 0.25) 0%, rgba(123, 31, 162, 0.25) 100%)'
                                : 'rgba(255,255,255,0.04)',
                              color: selectedChatId === `order-${group.orderId}` ? '#c480ff' : 'rgba(255,255,255,0.7)',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              position: 'relative',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px'
                            }}
                          >
                            👤 Чат с клиентом
                            {group.customerThread?.unreadCount > 0 && (
                              <span style={{
                                position: 'absolute',
                                top: '-6px',
                                right: '-6px',
                                backgroundColor: '#ff3b30',
                                color: '#fff',
                                fontSize: '10px',
                                fontWeight: 'bold',
                                borderRadius: '50%',
                                minWidth: '16px',
                                height: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '2px solid #1a153b',
                                padding: '0 2px'
                              }}>
                                {group.customerThread.unreadCount}
                              </span>
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })
                )
              ) : (
                /* General Threads */
                generalThreads.length === 0 ? (
                  <div style={{ margin: 'auto 0', textAlign: 'center', fontSize: '13px', color: 'rgba(255,255,255,0.4)', padding: '20px' }}>
                    Нет общих обращений.
                  </div>
                ) : (
                  generalThreads.map((thread) => {
                    const isActive = selectedChatId === thread.chatId;
                    const time = thread.timestamp 
                      ? new Date(thread.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '—';
                      
                    return (
                      <div
                        key={thread.chatId}
                        onClick={() => setSelectedChatId(thread.chatId)}
                        className={`chat-thread-card ${isActive ? 'active' : ''}`}
                        style={{ position: 'relative' }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>
                            {thread.role === 'courier' ? '🛵' : '👤'} {thread.senderName}
                          </span>
                          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                            {time}
                          </span>
                        </div>
                        
                        <div style={{ fontSize: '11px', color: '#ff7beb', fontWeight: 'bold', marginBottom: '5px' }}>
                          ⚙️ Общий вопрос
                        </div>
                        
                        <div style={{
                          fontSize: '12px',
                          color: 'rgba(255,255,255,0.6)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {thread.lastMessage || '—'}
                        </div>

                        {thread.unreadCount > 0 && (
                          <span style={{
                            position: 'absolute',
                            top: '-5px',
                            right: '-5px',
                            backgroundColor: '#ff3b30',
                            color: '#fff',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            borderRadius: '50%',
                            minWidth: '18px',
                            height: '18px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '2px solid #1a153b',
                            padding: '0 3px'
                          }}>
                            {thread.unreadCount}
                          </span>
                        )}
                      </div>
                    );
                  })
                )
              )}
            </div>

            {/* Right Chat Pane */}
            <div className="chat-main-window">
              {selectedChatId ? (
                <>
                  {/* Chat Header */}
                  <div style={{ padding: '15px 20px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold' }}>
                      💬 Переписка по диалогу: {selectedChatId.startsWith('order-') 
                        ? `Заказ #${selectedChatId.replace('-courier', '').replace('order-', '').slice(-4).toUpperCase()} (${selectedChatId.endsWith('-courier') ? 'Курьер' : 'Клиент'})`
                        : `Общий чат с ${partnerProfile?.name || 'пользователем'}`}
                    </h3>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={handleResolveChat}
                        style={{
                          background: 'linear-gradient(135deg, #00b35a 0%, #007e3e 100%)',
                          border: 'none',
                          color: '#fff',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(0, 179, 90, 0.3)'
                        }}
                      >
                        ✅ Вопрос решен
                      </button>
                      <button
                        onClick={() => setSelectedChatId(null)}
                        style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        Свернуть
                      </button>
                    </div>
                  </div>

                  {/* Partner Contact Details Banner */}
                  {partnerProfile && (
                    <div style={{
                      padding: '12px 20px',
                      background: 'rgba(170, 59, 255, 0.08)',
                      borderBottom: '1px solid rgba(170, 59, 255, 0.15)',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '15px',
                      fontSize: '12px',
                      alignItems: 'center',
                      textAlign: 'left'
                    }}>
                      <div style={{ color: '#ff7beb', fontWeight: 'bold' }}>
                        {partnerProfile.vehicle ? '🛵 Курьер:' : '👤 Клиент:'} {partnerProfile.name} {partnerProfile.lastName}
                      </div>
                      {partnerProfile.phone && <div style={{ opacity: 0.85, color: '#fff' }}>📞 {partnerProfile.phone}</div>}
                      {partnerProfile.email && <div style={{ opacity: 0.85, color: '#fff' }}>✉️ {partnerProfile.email}</div>}
                      {partnerProfile.vehicle && (
                        <div style={{ opacity: 0.85, color: '#fff' }}>
                          🚲 Транспорт: {partnerProfile.vehicle === 'Car' ? 'Автомобиль' : partnerProfile.vehicle === 'Scooter' ? 'Самокат' : 'Велосипед'}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Message History */}
                  <div className="chat-messages-container">
                    {chatMessages.map((msg) => {
                      const isSupport = msg.role === 'admin';
                      return (
                        <div
                          key={msg.id}
                          className={`support-message-bubble ${
                            isSupport 
                              ? 'support-role-admin' 
                              : (msg.role === 'courier' ? 'support-role-courier' : 'support-role-client')
                          }`}
                        >
                          <div style={{ fontSize: '10px', opacity: 0.7, fontWeight: 'bold', marginBottom: '4px' }}>
                            {isSupport ? '🛡️ Поддержка' : `${msg.senderName} (${msg.role === 'courier' ? 'Курьер' : 'Клиент'})`}
                          </div>
                          <div>{msg.text}</div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Chat Input row */}
                  <form onSubmit={handleAdminSend} className="chat-input-row">
                    <input
                      type="text"
                      placeholder="Введите ответ клиенту/курьеру..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="chat-text-input"
                    />
                    <button
                      type="submit"
                      disabled={!replyText.trim()}
                      className="btn-admin-save"
                      style={{ padding: '10px 24px' }}
                    >
                      Ответить
                    </button>
                  </form>
                </>
              ) : (
                <div style={{ margin: 'auto', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '15px', lineHeight: '1.6' }}>
                  <span style={{ fontSize: '48px', display: 'block', marginBottom: '15px' }}>💬</span>
                  <b>Центр оперативной поддержки клиентов и курьеров</b>
                  <p style={{ margin: '10px 0 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>
                    Выберите переписку в левой колонке для начала живого диалога.
                  </p>
                </div>
              )}
            </div>
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
          getStatusBadge={getStatusBadge}
          updateOrder={updateOrder}
          refetchOrders={refetchOrders}
        />

      </div>
    </div>
  );
}
