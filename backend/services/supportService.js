import { pool, usePostgres, localDb, saveLocalDb } from '../db.js';

export const sendChatMessage = async ({ chatId, senderId, senderName, role, text }) => {
  if (!chatId || !senderId || !senderName || !role || !text) {
    return { status: 400, error: 'Missing required message parameters' };
  }

  const messageId = Math.random().toString(36).substring(2, 11);
  const timestamp = new Date().toISOString();

  if (usePostgres) {
    const result = await pool.query(
      `INSERT INTO messages (id, chat_id, sender_id, sender_name, role, text, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [messageId, chatId, senderId, senderName, role, text, timestamp]
    );
    const row = result.rows[0];
    return {
      status: 201,
      data: {
        id: row.id,
        chatId: row.chat_id,
        senderId: row.sender_id,
        senderName: row.sender_name,
        role: row.role,
        text: row.text,
        timestamp: row.timestamp
      }
    };
  } else {
    const newMessage = {
      id: messageId,
      chatId,
      senderId,
      senderName,
      role,
      text,
      timestamp,
      resolved: false
    };
    if (!localDb.messages) {
      localDb.messages = [];
    }
    localDb.messages.push(newMessage);
    saveLocalDb();
    return {
      status: 201,
      data: newMessage
    };
  }
};

export const getChatMessages = async (chatId) => {
  if (usePostgres) {
    const result = await pool.query(
      'SELECT * FROM messages WHERE chat_id = $1 AND NOT COALESCE(resolved, FALSE) ORDER BY timestamp ASC',
      [chatId]
    );
    return {
      status: 200,
      data: result.rows.map(row => ({
        id: row.id,
        chatId: row.chat_id,
        senderId: row.sender_id,
        senderName: row.sender_name,
        role: row.role,
        text: row.text,
        timestamp: row.timestamp
      }))
    };
  } else {
    const messages = (localDb.messages || []).filter(msg => msg.chatId === chatId && !msg.resolved);
    return {
      status: 200,
      data: messages
    };
  }
};

export const getActiveChats = async () => {
  if (usePostgres) {
    const result = await pool.query(`
      SELECT 
        m.chat_id,
        m.sender_name,
        m.role,
        m.text AS last_message,
        m.timestamp,
        COALESCE(u.unread_count, 0)::INTEGER AS unread_count
      FROM (
        SELECT DISTINCT ON (chat_id) 
          chat_id, sender_name, role, text, timestamp
        FROM messages
        WHERE NOT COALESCE(resolved, FALSE)
        ORDER BY chat_id, timestamp DESC
      ) m
      LEFT JOIN (
        SELECT 
          chat_id, 
          COUNT(*) AS unread_count
        FROM messages msg
        WHERE role != 'admin' 
          AND NOT COALESCE(resolved, FALSE)
          AND timestamp > COALESCE(
            (SELECT MAX(timestamp) FROM messages WHERE chat_id = msg.chat_id AND role = 'admin' AND NOT COALESCE(resolved, FALSE)),
            ''
          )
        GROUP BY chat_id
      ) u ON m.chat_id = u.chat_id
    `);
    
    const chats = result.rows.map(row => ({
      chatId: row.chat_id,
      senderName: row.sender_name,
      role: row.role,
      lastMessage: row.last_message,
      timestamp: row.timestamp,
      unreadCount: row.unread_count
    }));
    
    chats.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return {
      status: 200,
      data: chats
    };
  } else {
    const msgs = (localDb.messages || []).filter(msg => !msg.resolved);
    const chatsMap = {};
    
    msgs.forEach(msg => {
      const existing = chatsMap[msg.chatId];
      const isMsgAdmin = msg.role === 'admin';
      const senderName = isMsgAdmin ? (existing?.senderName || 'User') : msg.senderName;
      const role = isMsgAdmin ? (existing?.role || 'customer') : msg.role;

      if (!existing || new Date(msg.timestamp) > new Date(existing.timestamp)) {
        chatsMap[msg.chatId] = {
          chatId: msg.chatId,
          senderName,
          role,
          lastMessage: msg.text,
          timestamp: msg.timestamp,
          unreadCount: 0
        };
      } else if (existing && isMsgAdmin) {
        chatsMap[msg.chatId].senderName = existing.senderName;
        chatsMap[msg.chatId].role = existing.role;
      }
    });
    
    Object.keys(chatsMap).forEach(cId => {
      const chatMsgs = msgs.filter(m => m.chatId === cId);
      const adminMsgs = chatMsgs.filter(m => m.role === 'admin');
      const latestAdminTime = adminMsgs.length > 0
        ? Math.max(...adminMsgs.map(m => new Date(m.timestamp).getTime()))
        : 0;
        
      const unread = chatMsgs.filter(m => m.role !== 'admin' && new Date(m.timestamp).getTime() > latestAdminTime).length;
      chatsMap[cId].unreadCount = unread;
    });
    
    const chats = Object.values(chatsMap);
    chats.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return {
      status: 200,
      data: chats
    };
  }
};

export const resolveChat = async (chatId) => {
  if (!chatId) {
    return { status: 400, error: 'Missing chatId parameter' };
  }

  const chatIdsToResolve = [chatId];
  if (chatId.startsWith('order-')) {
    const baseOrderId = chatId.replace('-courier', '').replace('order-', '');
    chatIdsToResolve.push(`order-${baseOrderId}`);
    chatIdsToResolve.push(`order-${baseOrderId}-courier`);
  }

  if (usePostgres) {
    await pool.query(
      'UPDATE messages SET resolved = TRUE WHERE chat_id = ANY($1)',
      [chatIdsToResolve]
    );
  } else {
    localDb.messages = (localDb.messages || []).map(msg => 
      chatIdsToResolve.includes(msg.chatId) ? { ...msg, resolved: true } : msg
    );
    saveLocalDb();
  }

  return {
    status: 200,
    data: { success: true, message: `Chat ${chatId} has been successfully resolved.` }
  };
};
