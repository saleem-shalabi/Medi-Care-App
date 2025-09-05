const { getMainViewService } = require("../services/getMainViewService");

async function getMainView(req, res) {
  const userId = req.user.id;
  try {
    const result = await getMainViewService(userId, req);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getMainView };
