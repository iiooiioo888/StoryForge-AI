const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, authMiddleware } = require('../middleware/auth');

module.exports = function(db) {
    const router = express.Router();

    // 註冊
    router.post('/register', (req, res) => {
        try {
            const { username, email, password, display_name } = req.body;

            if (!username || !email || !password) {
                return res.status(400).json({ error: '請填寫所有必填欄位' });
            }

            if (password.length < 6) {
                return res.status(400).json({ error: '密碼至少需要6個字元' });
            }

            const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
            if (existing) {
                return res.status(400).json({ error: '用戶名或電子郵件已被使用' });
            }

            const password_hash = bcrypt.hashSync(password, 10);
            const freeCredits = db.prepare("SELECT value FROM system_settings WHERE key = 'free_credits_signup'").get();
            const credits = freeCredits ? parseInt(freeCredits.value) : 100;

            const result = db.prepare(`
                INSERT INTO users (username, email, password_hash, display_name, credits) 
                VALUES (?, ?, ?, ?, ?)
            `).run(username, email, password_hash, display_name || username, credits);

            const token = jwt.sign(
                { id: result.lastInsertRowid, username, role: 'user' },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
            res.json({ 
                success: true, 
                message: '註冊成功！',
                user: { id: result.lastInsertRowid, username, display_name: display_name || username, role: 'user', credits }
            });
        } catch (err) {
            res.status(500).json({ error: '註冊失敗：' + err.message });
        }
    });

    // 登入
    router.post('/login', (req, res) => {
        try {
            const { username, password } = req.body;

            if (!username || !password) {
                return res.status(400).json({ error: '請輸入用戶名和密碼' });
            }

            const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(username, username);
            if (!user) {
                return res.status(401).json({ error: '用戶名或密碼錯誤' });
            }

            if (user.status !== 'active') {
                return res.status(403).json({ error: '帳號已被停用' });
            }

            if (!bcrypt.compareSync(password, user.password_hash)) {
                return res.status(401).json({ error: '用戶名或密碼錯誤' });
            }

            // Update last login
            db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

            const token = jwt.sign(
                { id: user.id, username: user.username, role: user.role },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
            res.json({
                success: true,
                user: {
                    id: user.id,
                    username: user.username,
                    display_name: user.display_name,
                    email: user.email,
                    role: user.role,
                    credits: user.credits,
                    avatar_url: user.avatar_url
                }
            });
        } catch (err) {
            res.status(500).json({ error: '登入失敗：' + err.message });
        }
    });

    // 登出
    router.post('/logout', (req, res) => {
        res.clearCookie('token');
        res.json({ success: true });
    });

    // 獲取當前用戶
    router.get('/me', authMiddleware, (req, res) => {
        const user = db.prepare('SELECT id, username, email, display_name, avatar_url, role, credits, bio, created_at, last_login FROM users WHERE id = ?').get(req.user.id);
        if (!user) return res.status(404).json({ error: '用戶不存在' });
        res.json({ user });
    });

    // 更新個人資料
    router.put('/profile', authMiddleware, (req, res) => {
        const { display_name, bio, avatar_url } = req.body;
        db.prepare('UPDATE users SET display_name = COALESCE(?, display_name), bio = COALESCE(?, bio), avatar_url = COALESCE(?, avatar_url), updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run(display_name, bio, avatar_url, req.user.id);
        res.json({ success: true, message: '個人資料已更新' });
    });

    // 獲取通知
    router.get('/notifications', authMiddleware, (req, res) => {
        try {
            const notifications = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(req.user.id);
            res.json({ notifications });
        } catch (err) {
            res.status(500).json({ error: '獲取通知失敗' });
        }
    });

    // 修改密碼
    router.put('/password', authMiddleware, (req, res) => {
        const { current_password, new_password } = req.body;
        const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
        
        if (!bcrypt.compareSync(current_password, user.password_hash)) {
            return res.status(400).json({ error: '當前密碼錯誤' });
        }

        const hash = bcrypt.hashSync(new_password, 10);
        db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(hash, req.user.id);
        res.json({ success: true, message: '密碼已更新' });
    });

    return router;
};
