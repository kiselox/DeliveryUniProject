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
        timestamp
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
        'SELECT * FROM messages WHERE chat_id = $1 ORDER BY timestamp ASC',
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
      const messages = (localDb.messages || []).filter(msg => msg.chatId === chatId);
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
      // Fetch distinct chats with their latest messages using SQL
      const result = await pool.query(`
        SELECT DISTINCT ON (chat_id) 
          chat_id, sender_name, role, text, timestamp
        FROM messages
        ORDER BY chat_id, timestamp DESC
      `);
      
      const chats = result.rows.map(row => ({
        chatId: row.chat_id,
        senderName: row.sender_name,
        role: row.role,
        lastMessage: row.text,
        timestamp: row.timestamp
      }));
      
      // Sort in JS by timestamp descending
      chats.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      res.json(chats);
    } else {
      const msgs = localDb.messages || [];
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
            timestamp: msg.timestamp
          };
        } else if (existing && isMsgAdmin) {
          // Keep user info if admin sent last message
          chatsMap[msg.chatId].senderName = existing.senderName;
          chatsMap[msg.chatId].role = existing.role;
        }
      });
      
      const chats = Object.values(chatsMap);
      chats.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      res.json(chats);
    }
  } catch (err) {
    next(err);
  }
};
