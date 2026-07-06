const express = require('express');
const { authMiddleware, optionalAuth } = require('../middleware/auth');

module.exports = function (models) {
    const router = express.Router();

    // ========== 獲取故事列表 ==========
    router.get('/', optionalAuth, async (req, res) => {
        try {
            const { page = 1, limit = 20, category, search, sort = 'latest', status = 'published' } = req.query;
            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);

            const filter = { status };
            if (category) filter.categoryId = category;
            if (search) {
                filter.$or = [
                    { title: { $regex: search, $options: 'i' } },
                    { summary: { $regex: search, $options: 'i' } },
                ];
            }

            let sortObj = { createdAt: -1 };
            if (sort === 'popular') sortObj = { viewCount: -1 };
            if (sort === 'likes') sortObj = { likeCount: -1 };

            const stories = await models.Story.find(filter)
                .populate('userId', 'username displayName avatarUrl')
                .populate('categoryId', 'name icon')
                .sort(sortObj)
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum);

            const total = await models.Story.countDocuments(filter);
            res.json({ stories, total, page: pageNum, limit: limitNum });
        } catch (err) {
            res.status(500).json({ error: '獲取故事列表失敗' });
        }
    });

    // ========== 用戶自己的故事 ==========
    router.get('/user/mine', authMiddleware, async (req, res) => {
        try {
            const stories = await models.Story.find({ userId: req.user.id })
                .populate('categoryId', 'name icon')
                .sort({ updatedAt: -1 });
            res.json({ stories });
        } catch (err) {
            res.status(500).json({ error: '獲取故事失敗' });
        }
    });

    // ========== meta/categories ==========
    router.get('/meta/categories', async (req, res) => {
        try {
            const categories = await models.Category.find().sort({ sortOrder: 1, name: 1 });
            res.json({ categories });
        } catch (err) {
            res.status(500).json({ error: '獲取分類失敗' });
        }
    });

    // ========== meta/tags ==========
    router.get('/meta/tags', async (req, res) => {
        try {
            const { search, limit = 50 } = req.query;
            const filter = {};
            if (search) filter.name = { $regex: search, $options: 'i' };
            const tags = await models.Tag.find(filter).sort({ usageCount: -1 }).limit(parseInt(limit));
            res.json({ tags });
        } catch (err) {
            res.status(500).json({ error: '獲取標籤失敗' });
        }
    });

    // ========== 獲取單個故事 ==========
    router.get('/:id', optionalAuth, async (req, res) => {
        try {
            const story = await models.Story.findById(req.params.id)
                .populate('userId', 'username displayName avatarUrl')
                .populate('categoryId', 'name icon')
                .populate('tags');
            if (!story) return res.status(404).json({ error: '故事不存在' });

            await models.Story.updateOne({ _id: req.params.id }, { $inc: { viewCount: 1 } });

            const chapters = await models.Chapter.find({ storyId: req.params.id }).sort({ chapterNumber: 1 });
            const characters = await models.Character.find({ storyId: req.params.id });

            let userInteractions = {};
            if (req.user) {
                const interactions = await models.Interaction.find({
                    userId: req.user.id,
                    targetType: 'story',
                    targetId: story._id,
                });
                interactions.forEach(i => { userInteractions[i.action] = true; });
            }

            res.json({ story, chapters, characters, userInteractions });
        } catch (err) {
            res.status(500).json({ error: '獲取故事失敗' });
        }
    });

    // ========== 創建故事 ==========
    router.post('/', authMiddleware, async (req, res) => {
        try {
            const { title, content, summary, category_id, genre, tone, target_audience, visibility, tags, is_ai_generated, prompt_used, status } = req.body;
            if (!title || !content) return res.status(400).json({ error: '標題和內容為必填' });

            const storyData = {
                userId: req.user.id,
                title,
                content,
                summary: summary || '',
                categoryId: category_id || undefined,
                genre: genre || '',
                tone: tone || '',
                targetAudience: target_audience || '',
                visibility: visibility || 'private',
                wordCount: content.length,
                status: status || 'draft',
                isAiGenerated: !!is_ai_generated,
                promptUsed: prompt_used || undefined,
            };
            if (status === 'published') storyData.publishedAt = new Date();

            const story = await models.Story.create(storyData);

            // Handle tags
            if (tags && tags.length > 0) {
                const tagIds = [];
                for (const tagName of tags) {
                    const slug = tagName.toLowerCase().replace(/\s+/g, '-');
                    let tag = await models.Tag.findOneAndUpdate(
                        { name: tagName },
                        { $setOnInsert: { name: tagName, slug }, $inc: { usageCount: 1 } },
                        { upsert: true, new: true }
                    );
                    tagIds.push(tag._id);
                }
                story.tags = tagIds;
                await story.save();
            }

            res.status(201).json({ success: true, story });
        } catch (err) {
            res.status(500).json({ error: '創建故事失敗：' + err.message });
        }
    });

    // ========== 更新故事 ==========
    router.put('/:id', authMiddleware, async (req, res) => {
        try {
            const story = await models.Story.findById(req.params.id);
            if (!story) return res.status(404).json({ error: '故事不存在' });
            if (story.userId.toString() !== req.user.id && req.user.role !== 'admin') {
                return res.status(403).json({ error: '無權編輯此故事' });
            }

            const fields = ['title', 'content', 'summary', 'genre', 'tone', 'targetAudience', 'visibility', 'status', 'coverImage'];
            const bodyMap = {
                category_id: 'categoryId', target_audience: 'targetAudience', cover_image: 'coverImage',
            };

            for (const [key, value] of Object.entries(req.body)) {
                const field = bodyMap[key] || key;
                if (fields.includes(field) && value !== undefined) {
                    story[field] = value;
                }
            }
            if (req.body.content) story.wordCount = req.body.content.length;
            if (req.body.status === 'published' && !story.publishedAt) story.publishedAt = new Date();

            if (req.body.tags) {
                const tagIds = [];
                for (const tagName of req.body.tags) {
                    const slug = tagName.toLowerCase().replace(/\s+/g, '-');
                    let tag = await models.Tag.findOneAndUpdate(
                        { name: tagName },
                        { $setOnInsert: { name: tagName, slug }, $inc: { usageCount: 1 } },
                        { upsert: true, new: true }
                    );
                    tagIds.push(tag._id);
                }
                story.tags = tagIds;
            }

            await story.save();
            res.json({ success: true, story });
        } catch (err) {
            res.status(500).json({ error: '更新故事失敗' });
        }
    });

    // ========== 刪除故事 ==========
    router.delete('/:id', authMiddleware, async (req, res) => {
        try {
            const story = await models.Story.findById(req.params.id);
            if (!story) return res.status(404).json({ error: '故事不存在' });
            if (story.userId.toString() !== req.user.id && req.user.role !== 'admin') {
                return res.status(403).json({ error: '無權刪除此故事' });
            }
            await story.deleteOne();
            await models.Chapter.deleteMany({ storyId: req.params.id });
            await models.Character.deleteMany({ storyId: req.params.id });
            await models.Comment.deleteMany({ storyId: req.params.id });
            await models.Interaction.deleteMany({ targetType: 'story', targetId: req.params.id });
            res.json({ success: true, message: '故事已刪除' });
        } catch (err) {
            res.status(500).json({ error: '刪除故事失敗' });
        }
    });

    // ========== 獲取評論 ==========
    router.get('/:id/comments', async (req, res) => {
        try {
            const { page = 1, limit = 20 } = req.query;
            const comments = await models.Comment.find({ storyId: req.params.id, status: 'active' })
                .populate('userId', 'username displayName avatarUrl')
                .sort({ createdAt: -1 })
                .skip((parseInt(page) - 1) * parseInt(limit))
                .limit(parseInt(limit));
            const total = await models.Comment.countDocuments({ storyId: req.params.id, status: 'active' });
            res.json({ comments, total });
        } catch (err) {
            res.status(500).json({ error: '獲取評論失敗' });
        }
    });

    // ========== 添加評論 ==========
    router.post('/:id/comments', authMiddleware, async (req, res) => {
        try {
            const { content, parent_id } = req.body;
            if (!content) return res.status(400).json({ error: '評論內容不能為空' });

            const story = await models.Story.findById(req.params.id);
            if (!story) return res.status(404).json({ error: '故事不存在' });

            const comment = await models.Comment.create({
                userId: req.user.id,
                storyId: req.params.id,
                parentId: parent_id || undefined,
                content,
            });

            const populated = await comment.populate('userId', 'username displayName avatarUrl');
            res.status(201).json({ success: true, comment: populated });
        } catch (err) {
            res.status(500).json({ error: '添加評論失敗' });
        }
    });

    // ========== 獲取章節 ==========
    router.get('/:id/chapters', async (req, res) => {
        try {
            const chapters = await models.Chapter.find({ storyId: req.params.id }).sort({ chapterNumber: 1 });
            res.json({ chapters });
        } catch (err) {
            res.status(500).json({ error: '獲取章節失敗' });
        }
    });

    // ========== 添加章節 ==========
    router.post('/:id/chapters', authMiddleware, async (req, res) => {
        try {
            const { title, content, chapter_number } = req.body;
            if (!title || !content) return res.status(400).json({ error: '章節標題和內容為必填' });

            const story = await models.Story.findById(req.params.id);
            if (!story) return res.status(404).json({ error: '故事不存在' });
            if (story.userId.toString() !== req.user.id && req.user.role !== 'admin') {
                return res.status(403).json({ error: '無權添加章節' });
            }

            let chapterNum = chapter_number;
            if (!chapterNum) {
                const last = await models.Chapter.findOne({ storyId: req.params.id }).sort({ chapterNumber: -1 });
                chapterNum = last ? last.chapterNumber + 1 : 1;
            }

            const chapter = await models.Chapter.create({
                storyId: req.params.id,
                title,
                content,
                chapterNumber: chapterNum,
                wordCount: content.length,
            });

            res.status(201).json({ success: true, chapter });
        } catch (err) {
            res.status(500).json({ error: '添加章節失敗' });
        }
    });

    // ========== 獲取角色 ==========
    router.get('/:id/characters', async (req, res) => {
        try {
            const characters = await models.Character.find({ storyId: req.params.id });
            res.json({ characters });
        } catch (err) {
            res.status(500).json({ error: '獲取角色失敗' });
        }
    });

    // ========== 添加角色 ==========
    router.post('/:id/characters', authMiddleware, async (req, res) => {
        try {
            const { name, role, description, appearance, personality, backstory, avatar_prompt } = req.body;
            if (!name) return res.status(400).json({ error: '角色名稱為必填' });

            const story = await models.Story.findById(req.params.id);
            if (!story) return res.status(404).json({ error: '故事不存在' });

            const character = await models.Character.create({
                storyId: req.params.id,
                name,
                role: role || '',
                description: description || '',
                appearance: appearance || '',
                personality: personality || '',
                backstory: backstory || '',
                avatarPrompt: avatar_prompt || '',
            });

            res.status(201).json({ success: true, character });
        } catch (err) {
            res.status(500).json({ error: '添加角色失敗' });
        }
    });

    // ========== 互動 (like, bookmark 等) ==========
    router.post('/:id/interact', authMiddleware, async (req, res) => {
        try {
            const { action, rating } = req.body;
            if (!action) return res.status(400).json({ error: '缺少操作類型' });

            const story = await models.Story.findById(req.params.id);
            if (!story) return res.status(404).json({ error: '故事不存在' });

            const existing = await models.Interaction.findOne({
                userId: req.user.id,
                targetType: 'story',
                targetId: req.params.id,
                action,
            });

            if (existing) {
                // Toggle off
                await existing.deleteOne();
                if (action === 'like') await models.Story.updateOne({ _id: req.params.id }, { $inc: { likeCount: -1 } });
                if (action === 'bookmark') await models.Story.updateOne({ _id: req.params.id }, { $inc: { bookmarkCount: -1 } });
                return res.json({ success: true, action: 'removed', interaction: null });
            }

            const interaction = await models.Interaction.create({
                userId: req.user.id,
                targetType: 'story',
                targetId: req.params.id,
                action,
                rating: rating || undefined,
            });

            if (action === 'like') await models.Story.updateOne({ _id: req.params.id }, { $inc: { likeCount: 1 } });
            if (action === 'bookmark') await models.Story.updateOne({ _id: req.params.id }, { $inc: { bookmarkCount: 1 } });

            res.json({ success: true, action: 'added', interaction });
        } catch (err) {
            res.status(500).json({ error: '互動操作失敗' });
        }
    });

    return router;
};
