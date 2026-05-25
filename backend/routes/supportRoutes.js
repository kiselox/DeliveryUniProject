// backend/routes/supportRoutes.js
import express from 'express';
import { sendChatMessage, getChatMessages, getActiveChats } from '../controllers/supportController.js';

const router = express.Router();

router.get('/chats', getActiveChats);
router.get('/messages/:chatId', getChatMessages);
router.post('/messages', sendChatMessage);

export default router;
