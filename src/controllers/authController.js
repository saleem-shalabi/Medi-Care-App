const registerDirect = require('../services/registerDirect');
const registerWithEmail = require('../services/registerWithEmail');
const verifyCode = require('../services/verifyCode');
const login = require('../services/login');
const changePassword = require('../services/changePassword');
const forgetPassword = require('../services/forgetPassword');

async function registerHandler(req, res) {
  try {
    const data = req.body;
    const result = await registerDirect(data);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function registerWithEmailHandler(req, res) {
  try {
    const data = req.body;
    const result = await registerWithEmail(data);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function verifyCodeHandler(req, res) {
 try {
    const { email, code } = req.body;
    const result = await verifyCode(email, code);
    res.status(200).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function loginHandler(req, res) {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Identifier and password are required' });
    }
    const result = await login({ identifier, password });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function changePasswordHandler(req, res) {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;
    const result = await changePassword({ userId, currentPassword, newPassword });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    const result = await forgetPassword.sendResetCode(email);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function resetPassword(req, res) {
  try {
    const { email, code, newPassword } = req.body;
    const result = await forgetPassword.resetPassword(email, code, newPassword);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

module.exports = {
  registerHandler,
  registerWithEmailHandler,
  verifyCodeHandler,
  loginHandler,
  changePasswordHandler,
  forgotPassword,
  resetPassword,
};
