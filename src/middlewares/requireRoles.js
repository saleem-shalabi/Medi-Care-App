const requireRoles = (allowedRoles) => {
    return (req, res, next) => {
        const user = req.user;
        if (!user || !user.role) {
            return res.status(403).json({ error: 'Forbidden: Access denied.' });
        }
        if (!allowedRoles.includes(user.role)) {
            return res.status(403).json({ error: 'Forbidden: You do not have the necessary permissions.' });
        }
        next();
    };
};

module.exports = requireRoles;