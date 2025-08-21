const jwt = require('jsonwebtoken');
const {prisma} = require('../config/prisma');

function requireRole(requiredRole) {
  return async function (req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await prisma.Users.findUnique({ where: { id: decoded.id } });

      if (!user || user.role !== requiredRole) {
        return res.status(403).json({ error: `Forbidden: ${requiredRole}s only` });
      }

      req.user = user;
      next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
}

module.exports = requireRole;

