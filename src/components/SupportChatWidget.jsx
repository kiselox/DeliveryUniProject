import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSupportChat } from '../hooks/useSupportChat';
import { useOrders } from '../hooks/useOrders';
import api from '../services/api';

export default function SupportChatWidget({
  userType,
  userId,
  userName,
  activeOrderId
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [chatType, setChatType] = useState('general');
  const [text, setText] = useState('');
  const [customOrderId, setCustomOrderId] = useState(null);

  const { orders = [] } = useOrders();

  const { data: chatThreads = [] } = useQuery({
    queryKey: ['supportChats'],
    queryFn: async () => {
      const res = await api.get('/support/chats');
      return res.data;
    },
    refetchInterval: 3000
  });

  useEffect(() => {
    const handleOpenSupport = (e) => {
      if (e.detail && e.detail.orderId) {
        setCustomOrderId(e.detail.orderId);
        setChatType('order');
      } else {
        setChatType('general');
      }
      setIsOpen(true);
    };
    window.addEventListener('open-support-chat', handleOpenSupport);
    return () => window.removeEventListener('open-support-chat', handleOpenSupport);
  }, []);

  const customerActiveOrders = orders.filter(o => 
    o.customerId === userId && 
    o.status !== "Delivered" && 
    o.status !== "Cancelled"
  );

  const ordersWithActiveChats = orders.filter(o => 
    o.customerId === userId && 
    chatThreads.some(t => t.chatId === `order-${o.id}`)
  );

  const candidateOrdersMap = {};
  if (activeOrderId) {
    const activeOrderObj = orders.find(o => o.id === activeOrderId);
    if (activeOrderObj) {
      candidateOrdersMap[activeOrderId] = activeOrderObj;
    }
  }
  customerActiveOrders.forEach(o => {
    candidateOrdersMap[o.id] = o;
  });
  ordersWithActiveChats.forEach(o => {
    candidateOrdersMap[o.id] = o;
  });

  const candidateOrders = Object.values(candidateOrdersMap);

  const sortedCandidates = [...candidateOrders].sort((a, b) => {
    const threadA = chatThreads.find(t => t.chatId === `order-${a.id}`);
    const threadB = chatThreads.find(t => t.chatId === `order-${b.id}`);
    const timeA = threadA ? new Date(threadA.timestamp).getTime() : 0;
    const timeB = threadB ? new Date(threadB.timestamp).getTime() : 0;
    return timeB - timeA;
  });

  const latestActiveOrderId = sortedCandidates[0]?.id || activeOrderId;
  
  const effectiveOrderId = customOrderId || latestActiveOrderId;
  const generalChatId = `general-${userId}`;
  const orderChatId = effectiveOrderId 
    ? (userType === 'courier' ? `order-${effectiveOrderId}-courier` : `order-${effectiveOrderId}`)
    : null;
  const currentChatId = chatType === 'order' && orderChatId ? orderChatId : generalChatId;

  const { messages = [], sendMessage, isSending } = useSupportChat(currentChatId);

  const selectOptionsMap = {};
  
  if (activeOrderId) {
    const primaryActiveOrder = orders.find(o => o.id === activeOrderId);
    if (primaryActiveOrder) {
      selectOptionsMap[activeOrderId] = {
        id: activeOrderId,
        label: `🍕 Current Order #${activeOrderId.slice(-4).toUpperCase()} (${primaryActiveOrder.vendorName})`
      };
    }
  }

  customerActiveOrders.forEach(o => {
    if (!selectOptionsMap[o.id]) {
      selectOptionsMap[o.id] = {
        id: o.id,
        label: `🍕 Active Order #${o.id.slice(-4).toUpperCase()} (${o.vendorName})`
      };
    }
  });

  ordersWithActiveChats.forEach(o => {
    if (!selectOptionsMap[o.id]) {
      selectOptionsMap[o.id] = {
        id: o.id,
        label: `💬 Order Chat #${o.id.slice(-4).toUpperCase()} (${o.vendorName})`
      };
    }
  });

  const selectOptions = Object.values(selectOptionsMap);

  const messagesEndRef = useRef(null);
  const buttonRef = useRef(null);
  const drawerRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  useEffect(() => {
    setTimeout(() => {
      if (effectiveOrderId) {
        setChatType('order');
      } else {
        setChatType('general');
      }
    }, 0);
  }, [effectiveOrderId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isOpen &&
        drawerRef.current &&
        !drawerRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    try {
      await sendMessage({
        chatId: currentChatId,
        senderId: userId,
        senderName: userName || `${userType === 'customer' ? 'Customer' : 'Courier'} ${userId}`,
        role: userType,
        text: text.trim()
      });
      setText('');
    } catch (err) {
      alert("Failed to send message: " + err.message);
    }
  };

  return (
    <>
      {}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`support-floating-button ${isOpen ? 'drawer-open' : ''}`}
        style={{
          position: 'fixed',
          bottom: '25px',
          right: '25px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          border: '2px solid rgba(255, 255, 255, 0.2)',
          background: 'linear-gradient(135deg, #aa3bff 0%, #7b1fa2 100%)',
          boxShadow: '0 8px 30px rgba(170, 59, 255, 0.4)',
          color: '#fff',
          fontSize: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 9999,
          transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'scale(1.1) translateY(-3px)';
          e.currentTarget.style.boxShadow = '0 12px 35px rgba(170, 59, 255, 0.6)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'scale(1) translateY(0)';
          e.currentTarget.style.boxShadow = '0 8px 30px rgba(170, 59, 255, 0.4)';
        }}
      >
        {isOpen ? '✕' : '💬'}
      </button>

      {}
      {isOpen && (
        <div
          ref={drawerRef}
          className="support-chat-drawer"
          style={{
            position: 'fixed',
            bottom: '100px',
            right: '25px',
            width: '380px',
            height: '500px',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            background: 'rgba(21, 16, 48, 0.95)',
            backdropFilter: 'blur(15px)',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 9999,
            textAlign: 'left'
          }}
        >
          {}
          <div
            style={{
              padding: '16px 20px',
              background: 'rgba(170, 59, 255, 0.1)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div>
              <span style={{ fontSize: '10px', color: '#ff7beb', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Support Service 🛠️
              </span>
              <h4 style={{ margin: '2px 0 0 0', color: '#fff', fontSize: '15px', fontWeight: 'bold' }}>
                Live Chat Dialogue
              </h4>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#00d26a', boxShadow: '0 0 8px #00d26a' }} />
              <button 
                type="button" 
                onClick={() => setIsOpen(false)}
                aria-label="Close Chat"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  padding: '4px',
                  lineHeight: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'color 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.color = '#ff7beb'}
                onMouseOut={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)'}
              >
                ✕
              </button>
            </div>
          </div>

          {}
          {effectiveOrderId && (
            <div style={{
              display: 'flex',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
              backgroundColor: 'rgba(0, 0, 0, 0.2)'
            }}>
              <button
                type="button"
                onClick={() => setChatType('order')}
                style={{
                  flex: 1,
                  padding: '12px 10px',
                  background: 'none',
                  border: 'none',
                  borderBottom: chatType === 'order' ? '2px solid #aa3bff' : 'none',
                  color: chatType === 'order' ? '#fff' : 'rgba(255,255,255,0.4)',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s'
                }}
              >
                🍕 Order #{typeof effectiveOrderId === 'string' && effectiveOrderId.length > 4 ? effectiveOrderId.slice(-4).toUpperCase() : effectiveOrderId}
              </button>

              <button
                type="button"
                onClick={() => setChatType('general')}
                style={{
                  flex: 1,
                  padding: '12px 10px',
                  background: 'none',
                  border: 'none',
                  borderBottom: chatType === 'general' ? '2px solid #aa3bff' : 'none',
                  color: chatType === 'general' ? '#fff' : 'rgba(255,255,255,0.4)',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s'
                }}
              >
                ⚙️ General Chat
              </button>
            </div>
          )}

          {}
          {chatType === 'order' && selectOptions.length > 1 && (
            <div style={{
              padding: '10px 16px',
              background: 'rgba(0, 0, 0, 0.25)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px'
            }}>
              <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Active dialogue:
              </span>
              <select
                value={effectiveOrderId || ''}
                onChange={(e) => {
                  setCustomOrderId(e.target.value);
                  setChatType('order');
                }}
                style={{
                  background: 'rgba(170, 59, 255, 0.15)',
                  color: '#ff7beb',
                  border: '1px solid rgba(170, 59, 255, 0.3)',
                  borderRadius: '8px',
                  padding: '5px 12px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  outline: 'none',
                  flexGrow: 1,
                  maxWidth: '240px'
                }}
              >
                {selectOptions.map(opt => (
                  <option key={opt.id} value={opt.id} style={{ background: '#151030', color: '#fff' }}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {}
          <div
            style={{
              flexGrow: 1,
              padding: '15px 20px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            {messages.length === 0 ? (
              <div style={{ margin: 'auto', textAlign: 'center', padding: '0 20px', color: 'rgba(255,255,255,0.4)', fontSize: '13px', lineHeight: '1.5' }}>
                <span style={{ fontSize: '24px', display: 'block', marginBottom: '10px' }}>👋</span>
                Hello! Send us a message. Support agent will respond in a couple of minutes.
              </div>
            ) : (
              messages.map((msg) => {
                const isAdmin = msg.role === 'admin';
                return (
                  <div
                    key={msg.id}
                    style={{
                      alignSelf: isAdmin ? 'flex-start' : 'flex-end',
                      maxWidth: '75%',
                      padding: '10px 14px',
                      borderRadius: '16px',
                      fontSize: '13px',
                      lineHeight: '1.4',
                      backgroundColor: isAdmin 
                        ? 'rgba(255, 255, 255, 0.08)' 
                        : (userType === 'courier' ? 'rgba(255, 193, 7, 0.12)' : 'rgba(170, 59, 255, 0.15)'),
                      border: isAdmin 
                        ? '1px solid rgba(255, 255, 255, 0.12)' 
                        : (userType === 'courier' ? '1px solid rgba(255, 193, 7, 0.25)' : '1px solid rgba(170, 59, 255, 0.3)'),
                      color: isAdmin 
                        ? '#c480ff' 
                        : (userType === 'courier' ? '#ffc107' : '#fff'),
                      borderBottomLeftRadius: isAdmin ? '4px' : '16px',
                      borderBottomRightRadius: !isAdmin ? '4px' : '16px'
                    }}
                  >
                    <div style={{ fontSize: '9px', opacity: 0.6, fontWeight: 'bold', marginBottom: '3px' }}>
                      {isAdmin ? '🛡️ Support' : msg.senderName}
                    </div>
                    <div>{msg.text}</div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {}
          <form
            onSubmit={handleSend}
            style={{
              padding: '12px 15px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(0, 0, 0, 0.3)',
              display: 'flex',
              gap: '8px'
            }}
          >
            <input
              type="text"
              placeholder="Type a message for support..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              style={{
                flexGrow: 1,
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.12)',
                backgroundColor: 'rgba(0,0,0,0.2)',
                color: '#fff',
                fontSize: '13px'
              }}
            />
            <button
              type="submit"
              disabled={isSending || !text.trim()}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #ff7beb, #aa3bff)',
                color: '#fff',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}
