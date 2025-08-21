const jwt = require('jsonwebtoken');
const {prisma} = require('../config/prisma');

async function requireLogin(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing token' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await prisma.Users.findUnique({ where: { id: decoded.id } });
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized: User not found' });
        }
        if (user.isBanned) {
            return res.status(403).json({ error: 'Forbidden: User is banned' });
        }
        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    }
}

module.exports = requireLogin;
