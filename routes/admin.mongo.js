const express = require('express');
const bcrypt = require('bcryptjs');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

module.exports = function (models) {
    const router = express.Router();

    // All admin routes require auth + admin role
    router.use(authMiddleware, adminMiddleware);

    // ========== 儀表板 ==========
    router.get('/dashboard', async (req, res) => {
        try {
            const [userCount, storyCount, publishedCount, draftCount, commentCount, interactionCount, aiLogCount] = await Promise.all([
                models.User.countDocuments(),
                models.Story.countDocuments(),
                models.Story.countDocuments({ status: 'published' }),
                models.Story.countDocuments({ status: 'draft' }),
                models.Comment.countDocuments(),
                models.Interaction.countDocuments(),
                models.AIInteraction.countDocuments(),
            ]);

            const recentUsers = await models.User.find().sort({ createdAt: -1 }).limit(5).select('username email role status createdAt');
            const recentStories = await models.Story.find().sort({ createdAt: -1 }).limit(5)
                .populate('userId', 'username displayName')
                .select('title status viewCount likeCount createdAt');

            const topStories = await models.Story.find({ status: 'published' })
                .sort({ viewCount: -1 })
                .limit(5)
                .populate('userId', 'username displayName')
                .select('title viewCount likeCount bookmarkCount');

            res.json({
                dashboard: {
                    counts: { users: userCount, stories: storyCount, published: publishedCount, drafts: draftCount, comments: commentCount, interactions: interactionCount, aiLogs: aiLogCount },
                    recentUsers,
                    recentStories,
                    topStories,
                },
            });
        } catch (err) {
            res.status(500).json({ error: '獲取儀表板數據失敗' });
        }
    });

    // ========== 用戶列表 ==========
    router.get('/users', async (req, res) => {
        try {
            const { page = 1, limit = 20, search, role, status } = req.query;
            const filter = {};
            if (search) {
                filter.$or = [
                    { username: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                    { displayName: { $regex: search, $options: 'i' } },
                ];
            }
            if (role) filter.role = role;
            if (status) filter.status = status;

            const users = await models.User.find(filter)
                .select('-passwordHash')
                .sort({ createdAt: -1 })
                .skip((parseInt(page) - 1) * parseInt(limit))
                .limit(parseInt(limit));

            const total = await models.User.countDocuments(filter);
            res.json({ users, total, page: parseInt(page), limit: parseInt(limit) });
        } catch (err) {
            res.status(500).json({ error: '獲取用戶列表失敗' });
        }
    });

    // ========== 獲取單個用戶 ==========
    router.get('/users/:id', async (req, res) => {
        try {
            const user = await models.User.findById(req.params.id).select('-passwordHash');
            if (!user) return res.status(404).json({ error: '用戶不存在' });

            const storyCount = await models.Story.countDocuments({ userId: user._id });
            const commentCount = await models.Comment.countDocuments({ userId: user._id });

            res.json({ user, stats: { stories: storyCount, comments: commentCount } });
        } catch (err) {
            res.status(500).json({ error: '獲取用戶失敗' });
        }
    });

    // ========== 創建用戶 ==========
    router.post('/users', async (req, res) => {
        try {
            const { username, email, password, display_name, role, status, credits } = req.body;
            if (!username || !email || !password) {
                return res.status(400).json({ error: '請填寫所有必填欄位' });
            }

            const existing = await models.User.findOne({
                $or: [{ username }, { email: email.toLowerCase() }],
            });
            if (existing) return res.status(400).json({ error: '用戶名或電子郵件已被使用' });

            const passwordHash = await bcrypt.hash(password, 10);
            const user = await models.User.create({
                username,
                email: email.toLowerCase(),
                passwordHash,
                displayName: display_name || username,
                role: role || 'user',
                status: status || 'active',
                credits: credits || 100,
            });

            const userObj = user.toObject();
            delete userObj.passwordHash;
            res.status(201).json({ success: true, user: userObj });
        } catch (err) {
            res.status(500).json({ error: '創建用戶失敗' });
        }
    });

    // ========== 更新用戶 ==========
    router.put('/users/:id', async (req, res) => {
        try {
            const { display_name, role, status, credits, bio } = req.body;
            const update = {};
            if (display_name !== undefined) update.displayName = display_name;
            if (role !== undefined) update.role = role;
            if (status !== undefined) update.status = status;
            if (credits !== undefined) update.credits = credits;
            if (bio !== undefined) update.bio = bio;

            const user = await models.User.findByIdAndUpdate(req.params.id, update, { new: true }).select('-passwordHash');
            if (!user) return res.status(404).json({ error: '用戶不存在' });
            res.json({ success: true, user });
        } catch (err) {
            res.status(500).json({ error: '更新用戶失敗' });
        }
    });

    // ========== 刪除用戶 ==========
    router.delete('/users/:id', async (req, res) => {
        try {
            const user = await models.User.findById(req.params.id);
            if (!user) return res.status(404).json({ error: '用戶不存在' });
            if (user.role === 'admin') return res.status(400).json({ error: '不能刪除管理員帳號' });

            await user.deleteOne();
            // Clean up user data
            await models.Story.deleteMany({ userId: req.params.id });
            await models.Comment.deleteMany({ userId: req.params.id });
            await models.Interaction.deleteMany({ userId: req.params.id });
            await models.Notification.deleteMany({ userId: req.params.id });

            res.json({ success: true, message: '用戶已刪除' });
        } catch (err) {
            res.status(500).json({ error: '刪除用戶失敗' });
        }
    });

    // ========== 故事管理列表 ==========
    router.get('/stories', async (req, res) => {
        try {
            const { page = 1, limit = 20, status, search, user_id } = req.query;
            const filter = {};
            if (status) filter.status = status;
            if (user_id) filter.userId = user_id;
            if (search) {
                filter.$or = [
                    { title: { $regex: search, $options: 'i' } },
                    { summary: { $regex: search, $options: 'i' } },
                ];
            }

            const stories = await models.Story.find(filter)
                .populate('userId', 'username displayName')
                .populate('categoryId', 'name')
                .sort({ createdAt: -1 })
                .skip((parseInt(page) - 1) * parseInt(limit))
                .limit(parseInt(limit));

            const total = await models.Story.countDocuments(filter);
            res.json({ stories, total, page: parseInt(page), limit: parseInt(limit) });
        } catch (err) {
            res.status(500).json({ error: '獲取故事列表失敗' });
        }
    });

    // ========== 更新故事（管理員） ==========
    router.put('/stories/:id', async (req, res) => {
        try {
            const { status, visibility, title, summary } = req.body;
            const update = {};
            if (status !== undefined) update.status = status;
            if (visibility !== undefined) update.visibility = visibility;
            if (title !== undefined) update.title = title;
            if (summary !== undefined) update.summary = summary;

            const story = await models.Story.findByIdAndUpdate(req.params.id, update, { new: true })
                .populate('userId', 'username displayName');
            if (!story) return res.status(404).json({ error: '故事不存在' });
            res.json({ success: true, story });
        } catch (err) {
            res.status(500).json({ error: '更新故事失敗' });
        }
    });

    // ========== 刪除故事（管理員） ==========
    router.delete('/stories/:id', async (req, res) => {
        try {
            const story = await models.Story.findByIdAndDelete(req.params.id);
            if (!story) return res.status(404).json({ error: '故事不存在' });

            await models.Chapter.deleteMany({ storyId: req.params.id });
            await models.Character.deleteMany({ storyId: req.params.id });
            await models.Comment.deleteMany({ storyId: req.params.id });
            await models.Interaction.deleteMany({ targetType: 'story', targetId: req.params.id });

            res.json({ success: true, message: '故事已刪除' });
        } catch (err) {
            res.status(500).json({ error: '刪除故事失敗' });
        }
    });

    // ========== 分類管理 ==========
    router.get('/categories', async (req, res) => {
        try {
            const categories = await models.Category.find().sort({ sortOrder: 1, name: 1 });
            res.json({ categories });
        } catch (err) {
            res.status(500).json({ error: '獲取分類失敗' });
        }
    });

    router.post('/categories', async (req, res) => {
        try {
            const { name, slug, description, icon, sort_order } = req.body;
            if (!name || !slug) return res.status(400).json({ error: '名稱和slug為必填' });

            const category = await models.Category.create({
                name,
                slug,
                description: description || '',
                icon: icon || '',
                sortOrder: sort_order || 0,
            });
            res.status(201).json({ success: true, category });
        } catch (err) {
            if (err.code === 11000) return res.status(400).json({ error: '分類名稱或slug已存在' });
            res.status(500).json({ error: '創建分類失敗' });
        }
    });

    router.put('/categories/:id', async (req, res) => {
        try {
            const { name, slug, description, icon, sort_order } = req.body;
            const update = {};
            if (name !== undefined) update.name = name;
            if (slug !== undefined) update.slug = slug;
            if (description !== undefined) update.description = description;
            if (icon !== undefined) update.icon = icon;
            if (sort_order !== undefined) update.sortOrder = sort_order;

            const category = await models.Category.findByIdAndUpdate(req.params.id, update, { new: true });
            if (!category) return res.status(404).json({ error: '分類不存在' });
            res.json({ success: true, category });
        } catch (err) {
            res.status(500).json({ error: '更新分類失敗' });
        }
    });

    router.delete('/categories/:id', async (req, res) => {
        try {
            const category = await models.Category.findByIdAndDelete(req.params.id);
            if (!category) return res.status(404).json({ error: '分類不存在' });
            // Unlink stories from this category
            await models.Story.updateMany({ categoryId: req.params.id }, { $unset: { categoryId: 1 } });
            res.json({ success: true, message: '分類已刪除' });
        } catch (err) {
            res.status(500).json({ error: '刪除分類失敗' });
        }
    });

    // ========== 系統設定 ==========
    router.get('/settings', async (req, res) => {
        try {
            const settings = await models.SystemSetting.find().sort({ key: 1 });
            const settingsMap = {};
            settings.forEach(s => { settingsMap[s.key] = s.value; });
            res.json({ settings: settingsMap, raw: settings });
        } catch (err) {
            res.status(500).json({ error: '獲取設定失敗' });
        }
    });

    router.put('/settings', async (req, res) => {
        try {
            const updates = req.body;
            const results = [];

            for (const [key, value] of Object.entries(updates)) {
                const setting = await models.SystemSetting.findOneAndUpdate(
                    { key },
                    { key, value: String(value) },
                    { upsert: true, new: true }
                );
                results.push(setting);
            }

            res.json({ success: true, settings: results });
        } catch (err) {
            res.status(500).json({ error: '更新設定失敗' });
        }
    });

    // ========== AI 日誌 ==========
    router.get('/ai-logs', async (req, res) => {
        try {
            const { page = 1, limit = 50, type, status, user_id } = req.query;
            const filter = {};
            if (type) filter.interactionType = type;
            if (status) filter.status = status;
            if (user_id) filter.userId = user_id;

            const logs = await models.AIInteraction.find(filter)
                .populate('userId', 'username displayName')
                .sort({ createdAt: -1 })
                .skip((parseInt(page) - 1) * parseInt(limit))
                .limit(parseInt(limit));

            const total = await models.AIInteraction.countDocuments(filter);
            res.json({ logs, total, page: parseInt(page), limit: parseInt(limit) });
        } catch (err) {
            res.status(500).json({ error: '獲取AI日誌失敗' });
        }
    });

    return router;
};
