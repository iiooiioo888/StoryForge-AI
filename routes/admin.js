const express = require('express');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

module.exports = function(db) {
    const router = express.Router();
    router.use(authMiddleware, adminMiddleware);

    // 儀表盤統計
    router.get('/dashboard', (req, res) => {
        try {
            const stats = {
                users: {
                    total: db.prepare('SELECT COUNT(*) as c FROM users').get().c,
                    active: db.prepare("SELECT COUNT(*) as c FROM users WHERE status = 'active'").get().c,
                    new_today: db.prepare("SELECT COUNT(*) as c FROM users WHERE date(created_at) = date('now')").get().c,
                    new_this_week: db.prepare("SELECT COUNT(*) as c FROM users WHERE created_at >= datetime('now', '-7 days')").get().c,
                },
                stories: {
                    total: db.prepare('SELECT COUNT(*) as c FROM stories').get().c,
                    published: db.prepare("SELECT COUNT(*) as c FROM stories WHERE status = 'published'").get().c,
                    drafts: db.prepare("SELECT COUNT(*) as c FROM stories WHERE status = 'draft'").get().c,
                    flagged: db.prepare("SELECT COUNT(*) as c FROM stories WHERE status = 'flagged'").get().c,
                    new_today: db.prepare("SELECT COUNT(*) as c FROM stories WHERE date(created_at) = date('now')").get().c,
                },
                prompts: {
                    total: db.prepare('SELECT COUNT(*) as c FROM video_prompts').get().c,
                    today: db.prepare("SELECT COUNT(*) as c FROM video_prompts WHERE date(created_at) = date('now')").get().c,
                },
                engagement: {
                    total_views: db.prepare('SELECT COALESCE(SUM(view_count), 0) as c FROM stories').get().c,
                    total_likes: db.prepare('SELECT COALESCE(SUM(like_count), 0) as c FROM stories').get().c,
                    total_comments: db.prepare('SELECT COUNT(*) as c FROM comments').get().c,
                },
                ai_usage: {
                    total_generations: db.prepare('SELECT COUNT(*) as c FROM ai_generation_logs').get().c,
                    total_credits_used: db.prepare('SELECT COALESCE(SUM(credits_cost), 0) as c FROM ai_generation_logs').get().c,
                    today_generations: db.prepare("SELECT COUNT(*) as c FROM ai_generation_logs WHERE date(created_at) = date('now')").get().c,
                }
            };

            // Recent activity
            stats.recent_users = db.prepare('SELECT id, username, display_name, created_at FROM users ORDER BY created_at DESC LIMIT 5').all();
            stats.recent_stories = db.prepare(`
                SELECT s.id, s.title, u.username, s.created_at, s.status 
                FROM stories s JOIN users u ON s.user_id = u.id 
                ORDER BY s.created_at DESC LIMIT 5
            `).all();

            // Popular categories
            stats.popular_categories = db.prepare(`
                SELECT c.name, c.icon, COUNT(s.id) as story_count
                FROM categories c LEFT JOIN stories s ON c.id = s.category_id
                GROUP BY c.id ORDER BY story_count DESC
            `).all();

            res.json(stats);
        } catch (err) {
            res.status(500).json({ error: '獲取統計失敗' });
        }
    });

    // 用戶管理 - 列表
    router.get('/users', (req, res) => {
        try {
            const { page = 1, limit = 20, search, status, role } = req.query;
            const offset = (page - 1) * limit;
            let where = ['1=1'];
            let params = [];

            if (search) { where.push('(username LIKE ? OR email LIKE ? OR display_name LIKE ?)'); params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
            if (status) { where.push('status = ?'); params.push(status); }
            if (role) { where.push('role = ?'); params.push(role); }

            const users = db.prepare(`
                SELECT id, username, email, display_name, role, status, credits, created_at, last_login,
                (SELECT COUNT(*) FROM stories WHERE user_id = users.id) as story_count
                FROM users WHERE ${where.join(' AND ')}
                ORDER BY created_at DESC LIMIT ? OFFSET ?
            `).all(...params, parseInt(limit), parseInt(offset));

            const total = db.prepare(`SELECT COUNT(*) as c FROM users WHERE ${where.join(' AND ')}`).get(...params);

            res.json({ users, total: total.c });
        } catch (err) {
            res.status(500).json({ error: '獲取用戶列表失敗' });
        }
    });

    // 用戶管理 - 更新狀態/角色
    router.put('/users/:id', (req, res) => {
        try {
            const { status, role, credits } = req.body;
            const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
            if (!user) return res.status(404).json({ error: '用戶不存在' });

            if (status) db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, req.params.id);
            if (role) db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
            if (credits !== undefined) db.prepare('UPDATE users SET credits = ? WHERE id = ?').run(credits, req.params.id);

            res.json({ success: true, message: '用戶已更新' });
        } catch (err) {
            res.status(500).json({ error: '更新用戶失敗' });
        }
    });

    // 用戶管理 - 刪除
    router.delete('/users/:id', (req, res) => {
        try {
            if (parseInt(req.params.id) === req.user.id) {
                return res.status(400).json({ error: '不能刪除自己的帳號' });
            }
            db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: '刪除用戶失敗' });
        }
    });

    // 內容管理 - 故事列表
    router.get('/stories', (req, res) => {
        try {
            const { page = 1, limit = 20, status, search } = req.query;
            const offset = (page - 1) * limit;
            let where = ['1=1'];
            let params = [];

            if (status) { where.push('s.status = ?'); params.push(status); }
            if (search) { where.push('(s.title LIKE ? OR u.username LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }

            const stories = db.prepare(`
                SELECT s.*, u.username, u.display_name, c.name as category_name
                FROM stories s JOIN users u ON s.user_id = u.id LEFT JOIN categories c ON s.category_id = c.id
                WHERE ${where.join(' AND ')}
                ORDER BY s.created_at DESC LIMIT ? OFFSET ?
            `).all(...params, parseInt(limit), parseInt(offset));

            const total = db.prepare(`SELECT COUNT(*) as c FROM stories s JOIN users u ON s.user_id = u.id WHERE ${where.join(' AND ')}`).get(...params);

            res.json({ stories, total: total.c });
        } catch (err) {
            res.status(500).json({ error: '獲取故事列表失敗' });
        }
    });

    // 內容管理 - 更新故事狀態
    router.put('/stories/:id', (req, res) => {
        try {
            const { status } = req.body;
            db.prepare('UPDATE stories SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, req.params.id);
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: '更新失敗' });
        }
    });

    // 內容管理 - 刪除故事
    router.delete('/stories/:id', (req, res) => {
        try {
            db.prepare('DELETE FROM stories WHERE id = ?').run(req.params.id);
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: '刪除失敗' });
        }
    });

    // 分類管理
    router.get('/categories', (req, res) => {
        const categories = db.prepare(`
            SELECT c.*, COUNT(s.id) as story_count
            FROM categories c LEFT JOIN stories s ON c.id = s.category_id
            GROUP BY c.id ORDER BY c.sort_order
        `).all();
        res.json({ categories });
    });

    router.post('/categories', (req, res) => {
        try {
            const { name, slug, description, icon, sort_order } = req.body;
            db.prepare('INSERT INTO categories (name, slug, description, icon, sort_order) VALUES (?, ?, ?, ?, ?)')
                .run(name, slug, description, icon, sort_order || 0);
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: '創建分類失敗' });
        }
    });

    router.put('/categories/:id', (req, res) => {
        try {
            const { name, description, icon, sort_order } = req.body;
            db.prepare('UPDATE categories SET name = COALESCE(?, name), description = COALESCE(?, description), icon = COALESCE(?, icon), sort_order = COALESCE(?, sort_order) WHERE id = ?')
                .run(name, description, icon, sort_order, req.params.id);
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: '更新分類失敗' });
        }
    });

    // 系統設定
    router.get('/settings', (req, res) => {
        const settings = db.prepare('SELECT * FROM system_settings ORDER BY key').all();
        res.json({ settings });
    });

    router.put('/settings', (req, res) => {
        try {
            const { settings } = req.body;
            const stmt = db.prepare('UPDATE system_settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?');
            const updateAll = db.transaction(() => {
                for (const [key, value] of Object.entries(settings)) {
                    stmt.run(value, key);
                }
            });
            updateAll();
            res.json({ success: true, message: '設定已更新' });
        } catch (err) {
            res.status(500).json({ error: '更新設定失敗' });
        }
    });

    // AI生成日誌
    router.get('/ai-logs', (req, res) => {
        try {
            const { page = 1, limit = 50 } = req.query;
            const offset = (page - 1) * limit;

            const logs = db.prepare(`
                SELECT a.*, u.username
                FROM ai_generation_logs a JOIN users u ON a.user_id = u.id
                ORDER BY a.created_at DESC LIMIT ? OFFSET ?
            `).all(parseInt(limit), parseInt(offset));

            const total = db.prepare('SELECT COUNT(*) as c FROM ai_generation_logs').get();

            res.json({ logs, total: total.c });
        } catch (err) {
            res.status(500).json({ error: '獲取日誌失敗' });
        }
    });

    // 被舉報的內容
    router.get('/flagged', (req, res) => {
        try {
            const flagged = db.prepare(`
                SELECT i.*, s.title as story_title, u.username as reporter, u2.username as author
                FROM interactions i
                JOIN stories s ON i.target_id = s.id AND i.target_type = 'story'
                JOIN users u ON i.user_id = u.id
                JOIN users u2 ON s.user_id = u2.id
                WHERE i.action = 'report'
                ORDER BY i.created_at DESC
            `).all();
            res.json({ flagged });
        } catch (err) {
            res.status(500).json({ error: '獲取舉報失敗' });
        }
    });

    return router;
};
