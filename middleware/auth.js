const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'storyforge_secret_key_2024';

function authMiddleware(req, res, next) {
    const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ error: '未登入，請先登入' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: '登入已過期，請重新登入' });
    }
}

function adminMiddleware(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: '需要管理員權限' });
    }
    next();
}

function optionalAuth(req, res, next) {
    const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
    
    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = decoded;
        } catch (err) {
            // Token invalid, continue as unauthenticated
        }
    }
    next();
}

module.exports = { authMiddleware, adminMiddleware, optionalAuth, JWT_SECRET };
