const express = require("express");
const router = express.Router();
const requireRole = require("../middlewares/requireRole");
const { getMainView } = require("../controllers/viewController");

router.get("/main-view", getMainView);

module.exports = router;
