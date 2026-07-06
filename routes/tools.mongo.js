const express = require('express');
const { authMiddleware, optionalAuth } = require('../middleware/auth');

module.exports = function (models) {
    const router = express.Router();

    // ========== 故事模板 ==========
    router.get('/story-templates', async (req, res) => {
        try {
            const { category, genre, difficulty, page = 1, limit = 20 } = req.query;
            const filter = { isPublic: true };
            if (genre) filter.genre = genre;
            if (difficulty) filter.difficulty = difficulty;

            const templates = await models.StoryTemplate.find(filter)
                .populate('categoryId', 'name icon')
                .sort({ usageCount: -1 })
                .skip((parseInt(page) - 1) * parseInt(limit))
                .limit(parseInt(limit));

            const total = await models.StoryTemplate.countDocuments(filter);
            res.json({ templates, total });
        } catch (err) {
            res.status(500).json({ error: '獲取故事模板失敗' });
        }
    });

    // ========== 寫作提示 ==========
    router.get('/writing-prompts', async (req, res) => {
        try {
            const { prompt_type, genre, difficulty } = req.query;
            const filter = {};
            if (prompt_type) filter.promptType = prompt_type;
            if (genre) filter.genre = genre;
            if (difficulty) filter.difficulty = difficulty;

            const prompts = await models.WritingPrompt.find(filter).sort({ usedCount: -1 });
            res.json({ prompts });
        } catch (err) {
            res.status(500).json({ error: '獲取寫作提示失敗' });
        }
    });

    // ========== 閱讀清單 ==========
    router.get('/reading-lists', authMiddleware, async (req, res) => {
        try {
            const lists = await models.ReadingList.find({ userId: req.user.id })
                .populate('items.storyId', 'title summary coverImage userId')
                .sort({ updatedAt: -1 });
            res.json({ lists });
        } catch (err) {
            res.status(500).json({ error: '獲取閱讀清單失敗' });
        }
    });

    // ========== 創建閱讀清單 ==========
    router.post('/reading-lists', authMiddleware, async (req, res) => {
        try {
            const { name, description, is_public } = req.body;
            const list = await models.ReadingList.create({
                userId: req.user.id,
                name: name || '我的閱讀清單',
                description: description || '',
                isPublic: !!is_public,
            });
            res.status(201).json({ success: true, list });
        } catch (err) {
            res.status(500).json({ error: '創建閱讀清單失敗' });
        }
    });

    // ========== 添加故事到閱讀清單 ==========
    router.post('/reading-lists/:id/items', authMiddleware, async (req, res) => {
        try {
            const { story_id, notes } = req.body;
            const list = await models.ReadingList.findOne({ _id: req.params.id, userId: req.user.id });
            if (!list) return res.status(404).json({ error: '閱讀清單不存在' });

            const exists = list.items.some(item => item.storyId.toString() === story_id);
            if (exists) return res.status(400).json({ error: '故事已在清單中' });

            list.items.push({ storyId: story_id, notes: notes || '' });
            await list.save();

            const populated = await list.populate('items.storyId', 'title summary coverImage');
            res.json({ success: true, list: populated });
        } catch (err) {
            res.status(500).json({ error: '添加故事失敗' });
        }
    });

    // ========== 從閱讀清單移除 ==========
    router.delete('/reading-lists/:id/items/:storyId', authMiddleware, async (req, res) => {
        try {
            const list = await models.ReadingList.findOne({ _id: req.params.id, userId: req.user.id });
            if (!list) return res.status(404).json({ error: '閱讀清單不存在' });

            list.items = list.items.filter(item => item.storyId.toString() !== req.params.storyId);
            await list.save();
            res.json({ success: true, list });
        } catch (err) {
            res.status(500).json({ error: '移除故事失敗' });
        }
    });

    // ========== 匯出故事 ==========
    router.get('/stories/:id/export', optionalAuth, async (req, res) => {
        try {
            const { format = 'txt' } = req.query;
            const story = await models.Story.findById(req.params.id)
                .populate('userId', 'username displayName')
                .populate('categoryId', 'name');
            if (!story) return res.status(404).json({ error: '故事不存在' });

            const chapters = await models.Chapter.find({ storyId: story._id }).sort({ chapterNumber: 1 });
            const characters = await models.Character.find({ storyId: story._id });

            if (format === 'txt') {
                let text = `# ${story.title}\n\n`;
                text += `作者：${story.userId.displayName || story.userId.username}\n`;
                if (story.categoryId) text += `分類：${story.categoryId.name}\n`;
                text += `字數：${story.wordCount}\n\n`;
                text += `## 簡介\n${story.summary || '無'}\n\n`;

                if (characters.length > 0) {
                    text += `## 角色\n`;
                    characters.forEach(c => {
                        text += `- ${c.name}（${c.role}）：${c.description}\n`;
                    });
                    text += '\n';
                }

                if (chapters.length > 0) {
                    chapters.forEach(ch => {
                        text += `\n## 第${ch.chapterNumber}章 ${ch.title}\n\n${ch.content}\n`;
                    });
                } else {
                    text += `## 正文\n\n${story.content}\n`;
                }

                res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(story.title)}.txt"`);
                res.send(text);
            } else if (format === 'json') {
                res.json({
                    story: {
                        title: story.title,
                        summary: story.summary,
                        content: story.content,
                        genre: story.genre,
                        tone: story.tone,
                        author: story.userId.displayName || story.userId.username,
                        category: story.categoryId?.name,
                        wordCount: story.wordCount,
                    },
                    chapters: chapters.map(ch => ({
                        number: ch.chapterNumber,
                        title: ch.title,
                        content: ch.content,
                    })),
                    characters: characters.map(c => ({
                        name: c.name,
                        role: c.role,
                        description: c.description,
                        appearance: c.appearance,
                        personality: c.personality,
                    })),
                });
            } else {
                res.status(400).json({ error: '不支持的格式，請使用 txt 或 json' });
            }
        } catch (err) {
            res.status(500).json({ error: '匯出失敗' });
        }
    });

    // ========== 用戶偏好 ==========
    router.get('/preferences', authMiddleware, async (req, res) => {
        try {
            let pref = await models.UserPreference.findOne({ userId: req.user.id });
            if (!pref) {
                pref = await models.UserPreference.create({ userId: req.user.id });
            }
            res.json({ preferences: pref });
        } catch (err) {
            res.status(500).json({ error: '獲取偏好失敗' });
        }
    });

    router.put('/preferences', authMiddleware, async (req, res) => {
        try {
            const allowedFields = ['theme', 'fontSize', 'editorFont', 'language', 'emailNotifications', 'autoSave'];
            const update = {};
            for (const field of allowedFields) {
                if (req.body[field] !== undefined) update[field] = req.body[field];
            }

            const pref = await models.UserPreference.findOneAndUpdate(
                { userId: req.user.id },
                update,
                { upsert: true, new: true }
            );
            res.json({ success: true, preferences: pref });
        } catch (err) {
            res.status(500).json({ error: '更新偏好失敗' });
        }
    });

    // ========== 生成名字 ==========
    router.post('/generate-names', authMiddleware, async (req, res) => {
        try {
            const { gender, genre, culture, count = 5 } = req.body;

            const LLMService = require('../services/llm');
            const PROMPTS = require('../services/prompts');
            const llm = new LLMService();

            const result = await llm.chat({
                systemPrompt: PROMPTS.nameGen?.system || '你是一個名字生成器。根據要求生成角色名字，以JSON數組格式返回。',
                prompt: PROMPTS.nameGen?.user?.({ gender, genre, culture, count }) || `生成${count}個${culture || '中文'}風格的${gender || '中性'}角色名字，適合${genre || '奇幻'}類型故事。以JSON數組返回。`,
                temperature: 0.8,
                maxTokens: 1024,
            });

            let names;
            try {
                const jsonMatch = result.content.match(/\[[\s\S]*\]/);
                names = JSON.parse(jsonMatch ? jsonMatch[0] : result.content);
            } catch (e) {
                names = result.content.split('\n').filter(n => n.trim()).map(n => n.replace(/^[\d.\-*]+\s*/, ''));
            }

            // Log interaction
            await models.AIInteraction.create({
                userId: req.user.id,
                interactionType: 'name_gen',
                input: { prompt: `gender=${gender}, genre=${genre}, culture=${culture}`, parameters: { gender, genre, culture, count } },
                llmConfig: { provider: result.provider, model: result.model, tier: 'fast' },
                output: { rawResponse: result.content, parsedData: names, contentType: 'json' },
                status: 'completed',
            });

            res.json({ success: true, names });
        } catch (err) {
            res.status(500).json({ error: '生成名字失敗：' + err.message });
        }
    });

    // ========== 故事分析 ==========
    router.get('/stories/:id/analytics', authMiddleware, async (req, res) => {
        try {
            const story = await models.Story.findById(req.params.id);
            if (!story) return res.status(404).json({ error: '故事不存在' });
            if (story.userId.toString() !== req.user.id && req.user.role !== 'admin') {
                return res.status(403).json({ error: '無權查看分析' });
            }

            const [commentCount, interactionStats, chapterStats] = await Promise.all([
                models.Comment.countDocuments({ storyId: story._id, status: 'active' }),
                models.Interaction.aggregate([
                    { $match: { targetType: 'story', targetId: story._id } },
                    { $group: { _id: '$action', count: { $sum: 1 } } },
                ]),
                models.Chapter.aggregate([
                    { $match: { storyId: story._id } },
                    { $group: { _id: null, totalWords: { $sum: '$wordCount' }, count: { $sum: 1 } } },
                ]),
            ]);

            const interactions = {};
            interactionStats.forEach(i => { interactions[i._id] = i.count; });

            res.json({
                analytics: {
                    views: story.viewCount,
                    likes: story.likeCount || 0,
                    bookmarks: story.bookmarkCount || 0,
                    comments: commentCount,
                    interactions,
                    chapters: chapterStats[0] || { totalWords: 0, count: 0 },
                    wordCount: story.wordCount,
                    publishedAt: story.publishedAt,
                    createdAt: story.createdAt,
                },
            });
        } catch (err) {
            res.status(500).json({ error: '獲取分析失敗' });
        }
    });

    // ========== 故事版本歷史 ==========
    router.get('/stories/:id/versions', authMiddleware, async (req, res) => {
        try {
            const story = await models.Story.findById(req.params.id);
            if (!story) return res.status(404).json({ error: '故事不存在' });

            const versions = await models.StoryVersion.find({ storyId: req.params.id })
                .sort({ versionNumber: -1 });
            res.json({ versions });
        } catch (err) {
            res.status(500).json({ error: '獲取版本歷史失敗' });
        }
    });

    // ========== 保存版本 ==========
    router.post('/stories/:id/versions', authMiddleware, async (req, res) => {
        try {
            const { change_note } = req.body;
            const story = await models.Story.findById(req.params.id);
            if (!story) return res.status(404).json({ error: '故事不存在' });
            if (story.userId.toString() !== req.user.id && req.user.role !== 'admin') {
                return res.status(403).json({ error: '無權操作' });
            }

            const lastVersion = await models.StoryVersion.findOne({ storyId: story._id }).sort({ versionNumber: -1 });
            const nextVersion = lastVersion ? lastVersion.versionNumber + 1 : 1;

            const version = await models.StoryVersion.create({
                storyId: story._id,
                versionNumber: nextVersion,
                title: story.title,
                content: story.content,
                summary: story.summary,
                changeNote: change_note || `版本 ${nextVersion}`,
            });

            res.status(201).json({ success: true, version });
        } catch (err) {
            res.status(500).json({ error: '保存版本失敗' });
        }
    });

    // ========== 續寫故事 ==========
    router.post('/stories/:id/continue', authMiddleware, async (req, res) => {
        try {
            const { direction, length = 'medium' } = req.body;
            const story = await models.Story.findById(req.params.id).populate('tags');
            if (!story) return res.status(404).json({ error: '故事不存在' });

            const LLMService = require('../services/llm');
            const PROMPTS = require('../services/prompts');
            const llm = new LLMService();

            const contentPreview = story.content.slice(-2000);

            const result = await llm.chat({
                systemPrompt: PROMPTS.storyContinue?.system || '你是一位出色的小說家。根據提供的故事內容，自然地續寫下去。保持風格一致。',
                prompt: PROMPTS.storyContinue?.user?.({ title: story.title, genre: story.genre, content: contentPreview, direction, length }) ||
                    `故事：${story.title}\n類型：${story.genre}\n\n最近內容：\n${contentPreview}\n\n${direction ? `續寫方向：${direction}\n` : ''}請續寫${length === 'short' ? '500字' : length === 'long' ? '2000字' : '1000字'}左右。`,
                temperature: 0.8,
                maxTokens: 4096,
            });

            const continuedContent = result.content;

            // Log interaction
            await models.AIInteraction.create({
                userId: req.user.id,
                interactionType: 'story_continue',
                input: {
                    prompt: `續寫故事 ${story.title}`,
                    parameters: { direction, length, storyId: story._id },
                    storyId: story._id,
                },
                llmConfig: { provider: result.provider, model: result.model, tier: 'balanced' },
                output: { rawResponse: continuedContent, contentType: 'text', wordCount: continuedContent.length },
                status: 'completed',
                usage: { tokensInput: result.usage?.prompt_tokens, tokensOutput: result.usage?.completion_tokens, totalTokens: result.usage?.total_tokens },
            });

            res.json({ success: true, continuation: continuedContent, model: result.model });
        } catch (err) {
            res.status(500).json({ error: '續寫失敗：' + err.message });
        }
    });

    return router;
};
