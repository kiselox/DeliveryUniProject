import express from 'express';
import { sendChatMessage, getChatMessages, getActiveChats, resolveChat } from '../controllers/supportController.js';

const router = express.Router();

router.get('/chats', getActiveChats);
router.get('/messages/:chatId', getChatMessages);
router.post('/messages', sendChatMessage);
router.post('/chats/:chatId/resolve', resolveChat);

export default router;
