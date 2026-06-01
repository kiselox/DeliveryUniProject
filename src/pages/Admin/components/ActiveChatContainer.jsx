// src/pages/Admin/components/ActiveChatContainer.jsx
import { useState, useEffect, useRef } from 'react';

export default function ActiveChatContainer({
  selectedChatId,
  setSelectedChatId,
  chatMessages = [],
  partnerProfile,
  handleResolveChat,
  sendAdminMessage,
  refetchChats
}) {
  const [replyText, setReplyText] = useState('');
  const messagesEndRef = useRef(null);

  // Auto-scroll chat history on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, selectedChatId]);

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

  if (!selectedChatId) {
    return (
      <div className="chat-main-window">
        <div style={{ margin: 'auto', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '15px', lineHeight: '1.6' }}>
          <span style={{ fontSize: '48px', display: 'block', marginBottom: '15px' }}>💬</span>
          <b>Центр оперативной поддержки клиентов и курьеров</b>
          <p style={{ margin: '10px 0 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>
            Выберите переписку в левой колонке для начала живого диалога.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-main-window">
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
              {partnerProfile.vehicle === 'Car' ? '🚗' : partnerProfile.vehicle === 'Scooter' ? '🛵' : '🚲'} : {partnerProfile.vehicle === 'Car' ? 'Автомобиль' : partnerProfile.vehicle === 'Scooter' ? 'Скутер' : 'Велосипед'}
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
    </div>
  );
}
