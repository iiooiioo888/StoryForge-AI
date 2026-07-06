const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, authMiddleware } = require('../middleware/auth');

module.exports = function (models) {
    const router = express.Router();

    // ========== 註冊 ==========
    router.post('/register', async (req, res) => {
        try {
            const { username, email, password, display_name } = req.body;

            if (!username || !email || !password) {
                return res.status(400).json({ error: '請填寫所有必填欄位' });
            }
            if (password.length < 6) {
                return res.status(400).json({ error: '密碼至少需要6個字元' });
            }

            const existing = await models.User.findOne({
                $or: [{ username }, { email: email.toLowerCase() }],
            });
            if (existing) {
                return res.status(400).json({ error: '用戶名或電子郵件已被使用' });
            }

            let freeCredits = 100;
            try {
                const setting = await models.SystemSetting.findOne({ key: 'free_credits_signup' });
                if (setting) freeCredits = parseInt(setting.value) || 100;
            } catch (_) { /* use default */ }

            const passwordHash = await bcrypt.hash(password, 10);
            const user = await models.User.create({
                username,
                email: email.toLowerCase(),
                passwordHash,
                displayName: display_name || username,
                credits: freeCredits,
            });

            const token = jwt.sign(
                { id: user._id.toString(), username: user.username, role: user.role },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
            res.json({
                success: true,
                message: '註冊成功！',
                user: {
                    id: user._id,
                    username: user.username,
                    display_name: user.displayName,
                    role: user.role,
                    credits: user.credits,
                },
            });
        } catch (err) {
            res.status(500).json({ error: '註冊失敗：' + err.message });
        }
    });

    // ========== 登入 ==========
    router.post('/login', async (req, res) => {
        try {
            const { username, password } = req.body;
            if (!username || !password) {
                return res.status(400).json({ error: '請輸入用戶名和密碼' });
            }

            const user = await models.User.findOne({
                $or: [{ username }, { email: username.toLowerCase() }],
            });
            if (!user) {
                return res.status(401).json({ error: '用戶名或密碼錯誤' });
            }
            if (user.status !== 'active') {
                return res.status(403).json({ error: '帳號已被停用' });
            }

            const valid = await bcrypt.compare(password, user.passwordHash);
            if (!valid) {
                return res.status(401).json({ error: '用戶名或密碼錯誤' });
            }

            user.lastLogin = new Date();
            await user.save();

            const token = jwt.sign(
                { id: user._id.toString(), username: user.username, role: user.role },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
            res.json({
                success: true,
                message: '登入成功！',
                user: {
                    id: user._id,
                    username: user.username,
                    display_name: user.displayName,
                    role: user.role,
                    credits: user.credits,
                    avatar_url: user.avatarUrl,
                },
            });
        } catch (err) {
            res.status(500).json({ error: '登入失敗：' + err.message });
        }
    });

    // ========== 登出 ==========
    router.post('/logout', (req, res) => {
        res.clearCookie('token');
        res.json({ success: true, message: '已登出' });
    });

    // ========== 取得當前用戶 ==========
    router.get('/me', authMiddleware, async (req, res) => {
        try {
            const user = await models.User.findById(req.user.id).select('-passwordHash');
            if (!user) return res.status(404).json({ error: '用戶不存在' });
            res.json({ user });
        } catch (err) {
            res.status(500).json({ error: '獲取用戶資訊失敗' });
        }
    });

    // ========== 更新個人資料 ==========
    router.put('/profile', authMiddleware, async (req, res) => {
        try {
            const { display_name, bio, avatar_url } = req.body;
            const update = {};
            if (display_name !== undefined) update.displayName = display_name;
            if (bio !== undefined) update.bio = bio;
            if (avatar_url !== undefined) update.avatarUrl = avatar_url;

            const user = await models.User.findByIdAndUpdate(req.user.id, update, { new: true }).select('-passwordHash');
            res.json({ success: true, user });
        } catch (err) {
            res.status(500).json({ error: '更新個人資料失敗' });
        }
    });

    // ========== 獲取通知 ==========
    router.get('/notifications', authMiddleware, async (req, res) => {
        try {
            const { page = 1, limit = 20, unread_only } = req.query;
            const filter = { userId: req.user.id };
            if (unread_only === 'true') filter.isRead = false;

            const notifications = await models.Notification.find(filter)
                .sort({ createdAt: -1 })
                .skip((parseInt(page) - 1) * parseInt(limit))
                .limit(parseInt(limit));

            const total = await models.Notification.countDocuments(filter);
            const unreadCount = await models.Notification.countDocuments({ userId: req.user.id, isRead: false });

            res.json({ notifications, total, unreadCount, page: parseInt(page), limit: parseInt(limit) });
        } catch (err) {
            res.status(500).json({ error: '獲取通知失敗' });
        }
    });

    // ========== 標記通知已讀 ==========
    router.put('/notifications/:id/read', authMiddleware, async (req, res) => {
        try {
            const notification = await models.Notification.findOneAndUpdate(
                { _id: req.params.id, userId: req.user.id },
                { isRead: true },
                { new: true }
            );
            if (!notification) return res.status(404).json({ error: '通知不存在' });
            res.json({ success: true, notification });
        } catch (err) {
            res.status(500).json({ error: '標記通知失敗' });
        }
    });

    // ========== 標記所有通知已讀 ==========
    router.put('/notifications/read-all', authMiddleware, async (req, res) => {
        try {
            await models.Notification.updateMany({ userId: req.user.id, isRead: false }, { isRead: true });
            res.json({ success: true, message: '所有通知已標記為已讀' });
        } catch (err) {
            res.status(500).json({ error: '標記通知失敗' });
        }
    });

    // ========== 修改密碼 ==========
    router.put('/password', authMiddleware, async (req, res) => {
        try {
            const { old_password, new_password } = req.body;
            if (!old_password || !new_password) {
                return res.status(400).json({ error: '請填寫舊密碼和新密碼' });
            }
            if (new_password.length < 6) {
                return res.status(400).json({ error: '新密碼至少需要6個字元' });
            }

            const user = await models.User.findById(req.user.id);
            if (!user) return res.status(404).json({ error: '用戶不存在' });

            const valid = await bcrypt.compare(old_password, user.passwordHash);
            if (!valid) return res.status(401).json({ error: '舊密碼錯誤' });

            user.passwordHash = await bcrypt.hash(new_password, 10);
            await user.save();

            res.json({ success: true, message: '密碼已更新' });
        } catch (err) {
            res.status(500).json({ error: '修改密碼失敗' });
        }
    });

    return router;
};
