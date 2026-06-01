import * as supportService from '../services/supportService.js';

export const sendChatMessage = async (req, res, next) => {
  try {
    const { chatId, senderId, senderName, role, text } = req.body;
    const result = await supportService.sendChatMessage({ chatId, senderId, senderName, role, text });
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }
    res.status(201).json(result.data);
  } catch (err) {
    next(err);
  }
};

export const getChatMessages = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const result = await supportService.getChatMessages(chatId);
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }
    res.json(result.data);
  } catch (err) {
    next(err);
  }
};

export const getActiveChats = async (req, res, next) => {
  try {
    const result = await supportService.getActiveChats();
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }
    res.json(result.data);
  } catch (err) {
    next(err);
  }
};

export const resolveChat = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const result = await supportService.resolveChat(chatId);
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }
    res.json(result.data);
  } catch (err) {
    next(err);
  }
};
