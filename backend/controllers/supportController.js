// backend/controllers/supportController.js
import { pool, usePostgres, localDb, saveLocalDb } from '../db.js';

// Send a support message
export const sendChatMessage = async (req, res, next) => {
  try {
    const { chatId, senderId, senderName, role, text } = req.body;
    if (!chatId || !senderId || !senderName || !role || !text) {
      return res.status(400).json({ error: 'Missing required message parameters' });
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
      res.status(201).json({
        id: row.id,
        chatId: row.chat_id,
        senderId: row.sender_id,
        senderName: row.sender_name,
        role: row.role,
        text: row.text,
        timestamp: row.timestamp
      });
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
      res.status(201).json(newMessage);
    }
  } catch (err) {
    next(err);
  }
};

// Fetch messages for a specific chat
export const getChatMessages = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    if (usePostgres) {
      const result = await pool.query(
        'SELECT * FROM messages WHERE chat_id = $1 AND NOT COALESCE(resolved, FALSE) ORDER BY timestamp ASC',
        [chatId]
      );
      res.json(result.rows.map(row => ({
        id: row.id,
        chatId: row.chat_id,
        senderId: row.sender_id,
        senderName: row.sender_name,
        role: row.role,
        text: row.text,
        timestamp: row.timestamp
      })));
    } else {
      const messages = (localDb.messages || []).filter(msg => msg.chatId === chatId && !msg.resolved);
      res.json(messages);
    }
  } catch (err) {
    next(err);
  }
};

// Fetch all active chats (grouped by chatId, sorted by last message time)
export const getActiveChats = async (req, res, next) => {
  try {
    if (usePostgres) {
      // Fetch distinct chats with their latest messages and calculate unreadCount using SQL
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
      
      // Sort in JS by timestamp descending
      chats.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      res.json(chats);
    } else {
      const msgs = (localDb.messages || []).filter(msg => !msg.resolved);
      const chatsMap = {};
      
      // Group and get latest message
      msgs.forEach(msg => {
        const existing = chatsMap[msg.chatId];
        // If it's sent by admin, keep the original sender details (role, name)
        const isMsgAdmin = msg.role === 'admin';
        const senderName = isMsgAdmin ? (existing?.senderName || 'Пользователь') : msg.senderName;
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
          // Keep user info if admin sent last message
          chatsMap[msg.chatId].senderName = existing.senderName;
          chatsMap[msg.chatId].role = existing.role;
        }
      });
      
      // Compute unreadCount for each active chat
      Object.keys(chatsMap).forEach(cId => {
        const chatMsgs = msgs.filter(m => m.chatId === cId);
        // Find latest admin message timestamp
        const adminMsgs = chatMsgs.filter(m => m.role === 'admin');
        const latestAdminTime = adminMsgs.length > 0
          ? Math.max(...adminMsgs.map(m => new Date(m.timestamp).getTime()))
          : 0;
          
        // Count user messages sent after latestAdminTime
        const unread = chatMsgs.filter(m => m.role !== 'admin' && new Date(m.timestamp).getTime() > latestAdminTime).length;
        chatsMap[cId].unreadCount = unread;
      });
      
      const chats = Object.values(chatsMap);
      chats.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      res.json(chats);
    }
  } catch (err) {
    next(err);
  }
};

// Mark a support chat as resolved/closed
export const resolveChat = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    if (!chatId) {
      return res.status(400).json({ error: 'Missing chatId parameter' });
    }

    // If it's an order-related chat, resolve both customer and courier chats for this order
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
    
    res.json({ success: true, message: `Chat ${chatId} has been successfully resolved.` });
  } catch (err) {
    next(err);
  }
};
