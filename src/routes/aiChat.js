// src/routes/aiChat.js
const express = require("express");
const router = express.Router();
const requireLogin = require("../middlewares/requireLogin");
const { sendMessage, getMessages } = require("../controllers/aiChatController");

// يرسل رسالة ويستلم الرد (ضمن جلسة المستخدم الوحيدة)
router.post("/message", requireLogin, sendMessage);

// يجلب كل رسائل جلسة المستخدم الوحيدة
router.get("/messages", requireLogin, getMessages);

module.exports = router;
