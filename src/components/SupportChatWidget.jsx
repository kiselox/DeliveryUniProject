// src/components/SupportChatWidget.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useSupportChat } from '../hooks/useSupportChat';

export default function SupportChatWidget({
  userType,
  userId,
  userName,
  activeOrderId,
  activeOrderVendor
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [chatType, setChatType] = useState('general'); // 'general' or 'order'
  const [text, setText] = useState('');
  
  // Determine actual chatId
  const generalChatId = `general-${userId}`;
  const orderChatId = activeOrderId ? `order-${activeOrderId}` : null;
  const currentChatId = chatType === 'order' && orderChatId ? orderChatId : generalChatId;

  // Load support messages via our custom real-time hook
  const { messages = [], sendMessage, isSending } = useSupportChat(currentChatId);

  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of chats
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Handle order changes
  useEffect(() => {
    if (activeOrderId) {
      setChatType('order');
    } else {
      setChatType('general');
    }
  }, [activeOrderId]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    try {
      await sendMessage({
        chatId: currentChatId,
        senderId: userId,
        senderName: userName || `${userType === 'customer' ? 'Клиент' : 'Курьер'} ${userId}`,
        role: userType, // 'customer' or 'courier'
        text: text.trim()
      });
      setText('');
    } catch (err) {
      alert("Не удалось отправить сообщение: " + err.message);
    }
  };

  return (
    <>
      {/* FLOATING BLUE/PURPLE CHAT TRIGGER BUTTON */}
      <button
        onClick={() => setIsOpen(!isOpen)}
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

      {/* CHAT DRAWER PANEL */}
      {isOpen && (
        <div
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
          {/* HEADER */}
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
                Служба Поддержки 🛠️
              </span>
              <h4 style={{ margin: '2px 0 0 0', color: '#fff', fontSize: '15px', fontWeight: 'bold' }}>
                Диалог в реальном времени
              </h4>
            </div>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#00d26a', boxShadow: '0 0 8px #00d26a' }} />
          </div>

          {/* CHAT SELECTOR (IF ACTIVE ORDER EXISTS) */}
          {activeOrderId && (
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
                  padding: '10px',
                  background: 'none',
                  border: 'none',
                  borderBottom: chatType === 'order' ? '2px solid #aa3bff' : 'none',
                  color: chatType === 'order' ? '#fff' : 'rgba(255,255,255,0.4)',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                🍕 О заказе #{activeOrderId.slice(-4).toUpperCase()}
              </button>
              <button
                type="button"
                onClick={() => setChatType('general')}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: 'none',
                  border: 'none',
                  borderBottom: chatType === 'general' ? '2px solid #aa3bff' : 'none',
                  color: chatType === 'general' ? '#fff' : 'rgba(255,255,255,0.4)',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                ⚙️ Общий чат
              </button>
            </div>
          )}

          {/* MESSAGES VIEW CONTAINER */}
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
                Здравствуйте! Напишите нам сообщение. Оператор поддержки ответит вам в течение пары минут.
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
                      {isAdmin ? '🛡️ Поддержка' : msg.senderName}
                    </div>
                    <div>{msg.text}</div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* CHAT INPUT AREA */}
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
              placeholder="Напишите сообщение саппорту..."
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
              Отпр.
            </button>
          </form>
        </div>
      )}
    </>
  );
}
