
export default function SupportChatSidebar({
  chatThreads = [],
  orders = [],
  selectedChatId,
  setSelectedChatId,
  sidebarSubTab,
  setSidebarSubTab
}) {
  const unreadOrdersCount = chatThreads.filter(t => t.chatId.startsWith('order-')).reduce((acc, t) => acc + (t.unreadCount || 0), 0);
  const unreadGeneralCount = chatThreads.filter(t => t.chatId.startsWith('general-')).reduce((acc, t) => acc + (t.unreadCount || 0), 0);

  const orderGroups = [];
  const seenOrderIds = new Set();

  chatThreads.forEach(thread => {
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
        
        const foundOrder = orders.find(o => o.id === baseOrderId);
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

  const generalThreads = chatThreads.filter(thread => thread.chatId.startsWith('general-'));

  return (
    <div className="chat-threads-sidebar">
      <h3 className="chat-threads-sidebar-title">
        Active Tickets
      </h3>

      {}
      <div className="sidebar-tabs">
        <button
          onClick={() => setSidebarSubTab('orders')}
          className={`sidebar-tab-btn ${sidebarSubTab === 'orders' ? 'active' : ''}`}
        >
          🍕 Orders
          {unreadOrdersCount > 0 && (
            <span className="sidebar-tab-badge">
              {unreadOrdersCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setSidebarSubTab('general')}
          className={`sidebar-tab-btn ${sidebarSubTab === 'general' ? 'active' : ''}`}
        >
          ⚙️ General
          {unreadGeneralCount > 0 && (
            <span className="sidebar-tab-badge">
              {unreadGeneralCount}
            </span>
          )}
        </button>
      </div>

      {}
      {sidebarSubTab === 'orders' ? (
        orderGroups.length === 0 ? (
          <div className="sidebar-empty-state">
            No active order tickets.
          </div>
        ) : (
          orderGroups.map((group) => {
            const isClientSelected = selectedChatId === `order-${group.orderId}`;
            const isCourierSelected = selectedChatId === `order-${group.orderId}-courier`;

            return (
              <div
                key={group.orderId}
                className="order-group-card"
              >
                {}
                <div className="order-group-header">
                  <div>
                    <strong className="order-group-vendor">
                      {group.foundOrder ? `🏪 ${group.foundOrder.vendorName}` : `🍕 Order #${group.orderId.slice(-4).toUpperCase()}`}
                    </strong>
                    <span className="order-group-subtitle">
                      🍕 Order #{group.orderId.slice(-4).toUpperCase()}
                    </span>
                  </div>
                  <span className="order-group-time">
                    {group.latestTime > 0 ? new Date(group.latestTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </span>
                </div>

                {}
                <div className="order-group-preview">
                  <i>Latest:</i> {group.customerThread?.lastMessage || group.courierThread?.lastMessage || 'No messages'}
                </div>

                {}
                {group.isCourierAssigned ? (
                  <div className="order-group-buttons">
                    {}
                    <button
                      onClick={() => setSelectedChatId(`order-${group.orderId}`)}
                      className={`order-group-btn-client ${isClientSelected ? 'active' : ''}`}
                    >
                      👤 Customer
                      {group.customerThread?.unreadCount > 0 && (
                        <span className="order-group-btn-badge">
                          {group.customerThread.unreadCount}
                        </span>
                      )}
                    </button>

                    {}
                    <button
                      onClick={() => setSelectedChatId(`order-${group.orderId}-courier`)}
                      className={`order-group-btn-courier ${isCourierSelected ? 'active' : ''}`}
                    >
                      🛵 Courier
                      {group.courierThread?.unreadCount > 0 && (
                        <span className="order-group-btn-badge">
                          {group.courierThread.unreadCount}
                        </span>
                      )}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setSelectedChatId(`order-${group.orderId}`)}
                    className={`order-group-btn-client ${isClientSelected ? 'active' : ''}`}
                    style={{ width: '100%' }}
                  >
                    👤 Chat with Customer
                    {group.customerThread?.unreadCount > 0 && (
                      <span className="order-group-btn-badge">
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
        generalThreads.length === 0 ? (
          <div className="sidebar-empty-state">
            No general tickets.
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
                style={{ position: 'relative', cursor: 'pointer' }}
              >
                <div className="general-thread-card-header">
                  <span className="general-thread-card-title">
                    {thread.role === 'courier' ? '🛵' : '👤'} {thread.senderName}
                  </span>
                  <span className="general-thread-card-time">
                    {time}
                  </span>
                </div>
                
                <div className="general-thread-card-subtitle">
                  ⚙️ General Question
                </div>
                
                <div className="general-thread-card-preview">
                  {thread.lastMessage || '—'}
                </div>

                {thread.unreadCount > 0 && (
                  <span className="general-thread-card-badge">
                    {thread.unreadCount}
                  </span>
                )}
              </div>
            );
          })
        )
      )}
    </div>
  );
}
