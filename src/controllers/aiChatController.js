// src/controllers/aiChatController.js
const {
  sendUserMessage,
  listUserMessages,
} = require("../services/aiChatService");

async function sendMessage(req, res) {
  try {
    const userId = req.user.id; // requireLogin
    const { content } = req.body || {};
    const result = await sendUserMessage(userId, content);
    return res.status(200).json(result); // { answer, context, messages }
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

async function getMessages(req, res) {
  try {
    const userId = req.user.id; // requireLogin
    const messages = await listUserMessages(userId);
    return res.status(200).json({ messages });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

module.exports = { sendMessage, getMessages };
