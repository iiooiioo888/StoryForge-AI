const express = require('express');
const { authMiddleware, optionalAuth } = require('../middleware/auth');

module.exports = function (models) {
    const router = express.Router();

    // ========== 獲取公共模板 ==========
    router.get('/templates', async (req, res) => {
        try {
            const { platform, category, page = 1, limit = 20 } = req.query;
            const filter = { isPublic: true };
            if (platform) filter.platform = platform;
            if (category) filter.category = category;

            const templates = await models.VideoPromptTemplate.find(filter)
                .populate('userId', 'username displayName')
                .sort({ usageCount: -1, rating: -1 })
                .skip((parseInt(page) - 1) * parseInt(limit))
                .limit(parseInt(limit));

            const total = await models.VideoPromptTemplate.countDocuments(filter);
            res.json({ templates, total });
        } catch (err) {
            res.status(500).json({ error: '獲取模板失敗' });
        }
    });

    // ========== 從模板生成提示詞 ==========
    router.post('/generate', authMiddleware, async (req, res) => {
        try {
            const { template_id, parameters } = req.body;
            if (!template_id) return res.status(400).json({ error: '缺少模板ID' });

            const template = await models.VideoPromptTemplate.findById(template_id);
            if (!template) return res.status(404).json({ error: '模板不存在' });

            let fullPrompt = template.template;
            if (parameters) {
                for (const [key, value] of Object.entries(parameters)) {
                    fullPrompt = fullPrompt.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
                }
            }

            const prompt = await models.VideoPrompt.create({
                userId: req.user.id,
                templateId: template._id,
                platform: template.platform,
                fullPrompt,
                sceneDescription: parameters?.scene || '',
            });

            await models.VideoPromptTemplate.updateOne({ _id: template._id }, { $inc: { usageCount: 1 } });

            res.json({ success: true, prompt });
        } catch (err) {
            res.status(500).json({ error: '生成提示詞失敗' });
        }
    });

    // ========== 從故事生成提示詞 ==========
    router.post('/from-story', authMiddleware, async (req, res) => {
        try {
            const { story_id, platform = 'general', scene_index } = req.body;
            if (!story_id) return res.status(400).json({ error: '缺少故事ID' });

            const story = await models.Story.findById(story_id).populate('tags');
            if (!story) return res.status(404).json({ error: '故事不存在' });

            const sceneDesc = scene_index !== undefined
                ? (story.content.split('\n\n')[scene_index] || story.summary || story.title)
                : (story.summary || story.title);

            const prompt = await models.VideoPrompt.create({
                userId: req.user.id,
                storyId: story._id,
                platform,
                sceneDescription: sceneDesc,
                sceneName: story.title,
                style: story.genre || '',
                mood: story.tone || '',
                fullPrompt: `[${platform}] ${sceneDesc} --style ${story.genre || 'cinematic'} --mood ${story.tone || 'dramatic'}`,
            });

            res.json({ success: true, prompt });
        } catch (err) {
            res.status(500).json({ error: '從故事生成提示詞失敗' });
        }
    });

    // ========== 我的提示詞 ==========
    router.get('/my-prompts', authMiddleware, async (req, res) => {
        try {
            const { page = 1, limit = 20, platform, favorite } = req.query;
            const filter = { userId: req.user.id };
            if (platform) filter.platform = platform;
            if (favorite === 'true') filter.isFavorite = true;

            const prompts = await models.VideoPrompt.find(filter)
                .populate('storyId', 'title')
                .sort({ createdAt: -1 })
                .skip((parseInt(page) - 1) * parseInt(limit))
                .limit(parseInt(limit));

            const total = await models.VideoPrompt.countDocuments(filter);
            res.json({ prompts, total });
        } catch (err) {
            res.status(500).json({ error: '獲取提示詞失敗' });
        }
    });

    // ========== 收藏/取消收藏 ==========
    router.put('/:id/favorite', authMiddleware, async (req, res) => {
        try {
            const prompt = await models.VideoPrompt.findById(req.params.id);
            if (!prompt) return res.status(404).json({ error: '提示詞不存在' });
            if (prompt.userId.toString() !== req.user.id) return res.status(403).json({ error: '無權操作' });

            prompt.isFavorite = !prompt.isFavorite;
            await prompt.save();
            res.json({ success: true, isFavorite: prompt.isFavorite });
        } catch (err) {
            res.status(500).json({ error: '操作失敗' });
        }
    });

    // ========== 刪除提示詞 ==========
    router.delete('/:id', authMiddleware, async (req, res) => {
        try {
            const prompt = await models.VideoPrompt.findById(req.params.id);
            if (!prompt) return res.status(404).json({ error: '提示詞不存在' });
            if (prompt.userId.toString() !== req.user.id && req.user.role !== 'admin') {
                return res.status(403).json({ error: '無權刪除此提示詞' });
            }
            await prompt.deleteOne();
            res.json({ success: true, message: '提示詞已刪除' });
        } catch (err) {
            res.status(500).json({ error: '刪除失敗' });
        }
    });

    // ========== 社區提示詞 ==========
    router.get('/community', async (req, res) => {
        try {
            const { platform, sort = 'popular', page = 1, limit = 20 } = req.query;
            const filter = { isFavorite: true };
            if (platform) filter.platform = platform;

            let sortObj = { createdAt: -1 };
            if (sort === 'popular') sortObj = { rating: -1 };

            const prompts = await models.VideoPrompt.find(filter)
                .populate('userId', 'username displayName avatarUrl')
                .populate('storyId', 'title')
                .sort(sortObj)
                .skip((parseInt(page) - 1) * parseInt(limit))
                .limit(parseInt(limit));

            res.json({ prompts });
        } catch (err) {
            res.status(500).json({ error: '獲取社區提示詞失敗' });
        }
    });

    return router;
};
