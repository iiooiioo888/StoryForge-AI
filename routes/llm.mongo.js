const express = require('express');
const { authMiddleware, optionalAuth } = require('../middleware/auth');
const LLMService = require('../services/llm');
const PROMPTS = require('../services/prompts');

module.exports = function (models) {
    const router = express.Router();

    const llm = new LLMService({
        defaultProvider: process.env.LLM_PROVIDER || 'openai',
        defaultTier: 'balanced',
    });

    // Helper: log AI interaction
    async function logInteraction(userId, type, input, llmConfig, output, status = 'completed', usage = {}, error = null) {
        try {
            const doc = {
                userId,
                interactionType: type,
                input: {
                    prompt: input.prompt,
                    systemPrompt: input.systemPrompt,
                    parameters: input.parameters,
                    storyId: input.storyId,
                },
                llmConfig,
                output: {
                    rawResponse: output.rawResponse,
                    parsedData: output.parsedData,
                    contentType: output.contentType || 'text',
                    wordCount: output.rawResponse ? output.rawResponse.length : 0,
                },
                status,
                usage: {
                    tokensInput: usage.prompt_tokens || 0,
                    tokensOutput: usage.completion_tokens || 0,
                    totalTokens: usage.total_tokens || 0,
                },
            };
            if (error) doc.error = { message: error.message, code: error.code };
            await models.AIInteraction.create(doc);
        } catch (logErr) {
            console.error('AI interaction log failed:', logErr.message);
        }
    }

    // ========== LLM 狀態 ==========
    router.get('/status', (req, res) => {
        const providers = llm.getAvailableProviders();
        res.json({
            providers,
            default: llm.defaultProvider,
            configured: providers.filter(p => p.hasApiKey).map(p => p.id),
        });
    });

    // ========== LLM 設定 ==========
    router.post('/configure', authMiddleware, (req, res) => {
        try {
            const { provider, apiKey, baseUrl } = req.body;
            if (apiKey) llm.setApiKey(provider, apiKey);
            if (baseUrl && llm.providers[provider]) {
                llm.providers[provider].baseUrl = baseUrl;
            }
            res.json({ success: true, message: `${provider} 配置已更新` });
        } catch (err) {
            res.status(500).json({ error: '配置失敗：' + err.message });
        }
    });

    // ========== 生成大綱 ==========
    router.post('/generate-outline', authMiddleware, async (req, res) => {
        try {
            const { provider, tier, ...params } = req.body;

            const result = await llm.chat({
                systemPrompt: PROMPTS.storyOutline.system,
                prompt: PROMPTS.storyOutline.user(params),
                provider, tier,
                temperature: 0.7,
                maxTokens: 4096,
            });

            let outline;
            try {
                const jsonMatch = result.content.match(/\{[\s\S]*\}/);
                outline = JSON.parse(jsonMatch ? jsonMatch[0] : result.content);
            } catch (e) {
                outline = { raw: result.content };
            }

            await logInteraction(req.user.id, 'story_outline',
                { prompt: JSON.stringify(params), systemPrompt: PROMPTS.storyOutline.system, parameters: params },
                { provider: result.provider, model: result.model, tier: tier || 'balanced', temperature: 0.7 },
                { rawResponse: result.content, parsedData: outline, contentType: 'json' },
                'completed', result.usage || {}
            );

            await models.User.updateOne({ _id: req.user.id }, { $inc: { credits: -15 } });
            const user = await models.User.findById(req.user.id).select('credits');

            res.json({ success: true, outline, model: result.model, provider: result.provider, credits: user.credits });
        } catch (err) {
            await logInteraction(req.user.id, 'story_outline',
                { prompt: JSON.stringify(req.body) }, {}, {}, 'failed', {}, err
            );
            res.status(500).json({ error: '生成大綱失敗：' + err.message });
        }
    });

    // ========== 生成內容 ==========
    router.post('/generate-content', authMiddleware, async (req, res) => {
        try {
            const { provider, tier, ...params } = req.body;

            const result = await llm.chat({
                systemPrompt: PROMPTS.storyContent?.system || '你是一位才華橫溢的小說家。根據提供的大綱和章節信息，生成高質量的故事正文。',
                prompt: PROMPTS.storyContent?.user?.(params) || `請根據以下大綱生成第${params.chapter_number || 1}章的正文：\n${JSON.stringify(params)}`,
                provider, tier,
                temperature: 0.8,
                maxTokens: 8192,
            });

            await logInteraction(req.user.id, 'story_content',
                { prompt: JSON.stringify(params), parameters: params },
                { provider: result.provider, model: result.model, tier: tier || 'balanced', temperature: 0.8 },
                { rawResponse: result.content, contentType: 'text' },
                'completed', result.usage || {}
            );

            await models.User.updateOne({ _id: req.user.id }, { $inc: { credits: -20 } });
            const user = await models.User.findById(req.user.id).select('credits');

            res.json({ success: true, content: result.content, model: result.model, provider: result.provider, credits: user.credits });
        } catch (err) {
            await logInteraction(req.user.id, 'story_content',
                { prompt: JSON.stringify(req.body) }, {}, {}, 'failed', {}, err
            );
            res.status(500).json({ error: '生成內容失敗：' + err.message });
        }
    });

    // ========== 生成完整故事 ==========
    router.post('/generate-full-story', authMiddleware, async (req, res) => {
        try {
            const { provider, tier, ...params } = req.body;

            const result = await llm.chat({
                systemPrompt: PROMPTS.storyFull?.system || PROMPTS.storyOutline.system,
                prompt: PROMPTS.storyFull?.user?.(params) || `請根據以下設定生成一個完整的故事：\n${JSON.stringify(params)}`,
                provider, tier,
                temperature: 0.8,
                maxTokens: 16384,
            });

            let storyData;
            try {
                const jsonMatch = result.content.match(/\{[\s\S]*\}/);
                storyData = JSON.parse(jsonMatch ? jsonMatch[0] : result.content);
            } catch (e) {
                storyData = { content: result.content };
            }

            await logInteraction(req.user.id, 'story_full',
                { prompt: JSON.stringify(params), systemPrompt: PROMPTS.storyFull?.system || PROMPTS.storyOutline.system, parameters: params },
                { provider: result.provider, model: result.model, tier: tier || 'powerful', temperature: 0.8 },
                { rawResponse: result.content, parsedData: storyData, contentType: 'json' },
                'completed', result.usage || {}
            );

            await models.User.updateOne({ _id: req.user.id }, { $inc: { credits: -50 } });
            const user = await models.User.findById(req.user.id).select('credits');

            res.json({ success: true, story: storyData, model: result.model, provider: result.provider, credits: user.credits });
        } catch (err) {
            await logInteraction(req.user.id, 'story_full',
                { prompt: JSON.stringify(req.body) }, {}, {}, 'failed', {}, err
            );
            res.status(500).json({ error: '生成完整故事失敗：' + err.message });
        }
    });

    // ========== 生成影片提示詞（從故事） ==========
    router.post('/generate-video-prompts', authMiddleware, async (req, res) => {
        try {
            const { story_id, platform = 'general', provider, tier } = req.body;
            if (!story_id) return res.status(400).json({ error: '缺少故事ID' });

            const story = await models.Story.findById(story_id);
            if (!story) return res.status(404).json({ error: '故事不存在' });

            const result = await llm.chat({
                systemPrompt: PROMPTS.videoPrompt?.system || '你是影片提示詞專家。根據故事內容生成適合AI影片生成的場景提示詞。以JSON數組返回。',
                prompt: PROMPTS.videoPrompt?.user?.({ title: story.title, content: story.content, platform }) ||
                    `故事：${story.title}\n內容摘要：${story.content.slice(0, 3000)}\n\n請為這個故事生成5-8個影片場景提示詞，適用於${platform}平台。每個包含：scene_name, scene_description, camera_movement, shot_size, lighting, style, mood, full_prompt。以JSON數組返回。`,
                provider, tier,
                temperature: 0.7,
                maxTokens: 8192,
            });

            let prompts;
            try {
                const jsonMatch = result.content.match(/\[[\s\S]*\]/);
                prompts = JSON.parse(jsonMatch ? jsonMatch[0] : result.content);
            } catch (e) {
                prompts = [{ full_prompt: result.content }];
            }

            // Save generated prompts
            const savedPrompts = [];
            for (const p of prompts) {
                const saved = await models.VideoPrompt.create({
                    userId: req.user.id,
                    storyId: story._id,
                    platform,
                    sceneDescription: p.scene_description || '',
                    sceneName: p.scene_name || '',
                    cameraMovement: p.camera_movement || '',
                    shotSize: p.shot_size || '',
                    lighting: p.lighting || '',
                    style: p.style || '',
                    mood: p.mood || '',
                    fullPrompt: p.full_prompt || '',
                });
                savedPrompts.push(saved);
            }

            await logInteraction(req.user.id, 'video_prompt_story',
                { prompt: `為故事 ${story.title} 生成影片提示詞`, parameters: { story_id, platform }, storyId: story._id },
                { provider: result.provider, model: result.model, tier: tier || 'balanced', temperature: 0.7 },
                { rawResponse: result.content, parsedData: prompts, contentType: 'json' },
                'completed', result.usage || {}
            );

            await models.User.updateOne({ _id: req.user.id }, { $inc: { credits: -25 } });
            const user = await models.User.findById(req.user.id).select('credits');

            res.json({ success: true, prompts: savedPrompts, model: result.model, provider: result.provider, credits: user.credits });
        } catch (err) {
            await logInteraction(req.user.id, 'video_prompt_story',
                { prompt: JSON.stringify(req.body) }, {}, {}, 'failed', {}, err
            );
            res.status(500).json({ error: '生成影片提示詞失敗：' + err.message });
        }
    });

    // ========== 從描述生成影片提示詞 ==========
    router.post('/generate-video-prompt', authMiddleware, async (req, res) => {
        try {
            const { description, platform = 'general', style, mood, provider, tier } = req.body;
            if (!description) return res.status(400).json({ error: '缺少場景描述' });

            const result = await llm.chat({
                systemPrompt: PROMPTS.videoPromptSingle?.system || '你是影片提示詞專家。根據描述生成一個詳細的AI影片生成提示詞。以JSON格式返回。',
                prompt: PROMPTS.videoPromptSingle?.user?.({ description, platform, style, mood }) ||
                    `場景描述：${description}\n平台：${platform}\n風格：${style || 'cinematic'}\n氛圍：${mood || 'dramatic'}\n\n生成一個詳細的影片提示詞，包含：scene_description, camera_movement, shot_size, lighting, style, mood, duration, aspect_ratio, full_prompt, negative_prompt。以JSON格式返回。`,
                provider, tier,
                temperature: 0.7,
                maxTokens: 2048,
            });

            let promptData;
            try {
                const jsonMatch = result.content.match(/\{[\s\S]*\}/);
                promptData = JSON.parse(jsonMatch ? jsonMatch[0] : result.content);
            } catch (e) {
                promptData = { full_prompt: result.content };
            }

            const saved = await models.VideoPrompt.create({
                userId: req.user.id,
                platform,
                sceneDescription: promptData.scene_description || description,
                cameraMovement: promptData.camera_movement || '',
                shotSize: promptData.shot_size || '',
                lighting: promptData.lighting || '',
                style: promptData.style || style || '',
                mood: promptData.mood || mood || '',
                duration: promptData.duration || '8s',
                aspectRatio: promptData.aspect_ratio || '16:9',
                fullPrompt: promptData.full_prompt || result.content,
                negativePrompt: promptData.negative_prompt || '',
            });

            await logInteraction(req.user.id, 'video_prompt_desc',
                { prompt: description, parameters: { description, platform, style, mood } },
                { provider: result.provider, model: result.model, tier: tier || 'balanced', temperature: 0.7 },
                { rawResponse: result.content, parsedData: promptData, contentType: 'json' },
                'completed', result.usage || {}
            );

            await models.User.updateOne({ _id: req.user.id }, { $inc: { credits: -10 } });
            const user = await models.User.findById(req.user.id).select('credits');

            res.json({ success: true, prompt: saved, model: result.model, provider: result.provider, credits: user.credits });
        } catch (err) {
            await logInteraction(req.user.id, 'video_prompt_desc',
                { prompt: JSON.stringify(req.body) }, {}, {}, 'failed', {}, err
            );
            res.status(500).json({ error: '生成影片提示詞失敗：' + err.message });
        }
    });

    // ========== 續寫故事 ==========
    router.post('/continue', authMiddleware, async (req, res) => {
        try {
            const { story_id, direction, length = 'medium', provider, tier } = req.body;
            if (!story_id) return res.status(400).json({ error: '缺少故事ID' });

            const story = await models.Story.findById(story_id);
            if (!story) return res.status(404).json({ error: '故事不存在' });

            const contentPreview = story.content.slice(-2000);
            const lengthMap = { short: 500, medium: 1000, long: 2000 };
            const targetWords = lengthMap[length] || 1000;

            const result = await llm.chat({
                systemPrompt: PROMPTS.storyContinue?.system || '你是一位出色的小說家。根據提供的故事內容，自然地續寫下去。保持風格和語調一致。',
                prompt: PROMPTS.storyContinue?.user?.({ title: story.title, genre: story.genre, content: contentPreview, direction, length: targetWords }) ||
                    `故事標題：${story.title}\n類型：${story.genre}\n\n最近內容：\n${contentPreview}\n\n${direction ? `續寫方向：${direction}\n` : ''}請續寫約${targetWords}字。`,
                provider, tier,
                temperature: 0.8,
                maxTokens: 4096,
            });

            await logInteraction(req.user.id, 'story_continue',
                { prompt: `續寫故事 ${story.title}`, parameters: { story_id, direction, length }, storyId: story._id },
                { provider: result.provider, model: result.model, tier: tier || 'balanced', temperature: 0.8 },
                { rawResponse: result.content, contentType: 'text' },
                'completed', result.usage || {}
            );

            await models.User.updateOne({ _id: req.user.id }, { $inc: { credits: -20 } });
            const user = await models.User.findById(req.user.id).select('credits');

            res.json({ success: true, continuation: result.content, model: result.model, provider: result.provider, credits: user.credits });
        } catch (err) {
            await logInteraction(req.user.id, 'story_continue',
                { prompt: JSON.stringify(req.body) }, {}, {}, 'failed', {}, err
            );
            res.status(500).json({ error: '續寫失敗：' + err.message });
        }
    });

    // ========== 生成角色 ==========
    router.post('/characters', authMiddleware, async (req, res) => {
        try {
            const { genre, role_type, count = 3, provider, tier } = req.body;

            const result = await llm.chat({
                systemPrompt: PROMPTS.characterGen?.system || '你是角色設計專家。根據要求生成豐富、立體的角色。以JSON數組返回。',
                prompt: PROMPTS.characterGen?.user?.({ genre, role_type, count }) ||
                    `類型：${genre || '奇幻'}\n角色類型：${role_type || '混合'}\n數量：${count}\n\n生成${count}個角色，每個包含：name, role, description, appearance, personality, backstory, motivation, weakness。以JSON數組返回。`,
                provider, tier,
                temperature: 0.8,
                maxTokens: 4096,
            });

            let characters;
            try {
                const jsonMatch = result.content.match(/\[[\s\S]*\]/);
                characters = JSON.parse(jsonMatch ? jsonMatch[0] : result.content);
            } catch (e) {
                characters = [{ name: 'Generated', description: result.content }];
            }

            await logInteraction(req.user.id, 'character_gen',
                { prompt: `生成角色: genre=${genre}, role=${role_type}`, parameters: { genre, role_type, count } },
                { provider: result.provider, model: result.model, tier: tier || 'balanced', temperature: 0.8 },
                { rawResponse: result.content, parsedData: characters, contentType: 'json' },
                'completed', result.usage || {}
            );

            await models.User.updateOne({ _id: req.user.id }, { $inc: { credits: -10 } });
            const user = await models.User.findById(req.user.id).select('credits');

            res.json({ success: true, characters, model: result.model, provider: result.provider, credits: user.credits });
        } catch (err) {
            await logInteraction(req.user.id, 'character_gen',
                { prompt: JSON.stringify(req.body) }, {}, {}, 'failed', {}, err
            );
            res.status(500).json({ error: '生成角色失敗：' + err.message });
        }
    });

    // ========== 生成世界觀 ==========
    router.post('/world', authMiddleware, async (req, res) => {
        try {
            const { genre, era, elements, provider, tier } = req.body;

            const result = await llm.chat({
                systemPrompt: PROMPTS.worldGen?.system || '你是世界觀設計專家。根據要求生成詳細、豐富的世界觀設定。以JSON格式返回。',
                prompt: PROMPTS.worldGen?.user?.({ genre, era, elements }) ||
                    `類型：${genre || '奇幻'}\n時代：${era || '中世紀'}\n${elements ? `元素：${elements}\n` : ''}\n\n生成一個完整的世界觀，包含：name, era, geography, culture, magic_system_or_technology, politics, history, notable_locations, factions, atmosphere。以JSON格式返回。`,
                provider, tier,
                temperature: 0.7,
                maxTokens: 4096,
            });

            let world;
            try {
                const jsonMatch = result.content.match(/\{[\s\S]*\}/);
                world = JSON.parse(jsonMatch ? jsonMatch[0] : result.content);
            } catch (e) {
                world = { raw: result.content };
            }

            await logInteraction(req.user.id, 'world_gen',
                { prompt: `生成世界觀: genre=${genre}, era=${era}`, parameters: { genre, era, elements } },
                { provider: result.provider, model: result.model, tier: tier || 'balanced', temperature: 0.7 },
                { rawResponse: result.content, parsedData: world, contentType: 'json' },
                'completed', result.usage || {}
            );

            await models.User.updateOne({ _id: req.user.id }, { $inc: { credits: -15 } });
            const user = await models.User.findById(req.user.id).select('credits');

            res.json({ success: true, world, model: result.model, provider: result.provider, credits: user.credits });
        } catch (err) {
            await logInteraction(req.user.id, 'world_gen',
                { prompt: JSON.stringify(req.body) }, {}, {}, 'failed', {}, err
            );
            res.status(500).json({ error: '生成世界觀失敗：' + err.message });
        }
    });

    // ========== 改寫/潤色 ==========
    router.post('/rewrite', authMiddleware, async (req, res) => {
        try {
            const { text, style, instruction, provider, tier } = req.body;
            if (!text) return res.status(400).json({ error: '缺少文本內容' });

            const result = await llm.chat({
                systemPrompt: PROMPTS.rewrite?.system || '你是一位文字潤色專家。根據要求改寫或潤色文本，保持核心含義不變。',
                prompt: PROMPTS.rewrite?.user?.({ text, style, instruction }) ||
                    `原文：\n${text}\n\n${style ? `目標風格：${style}\n` : ''}${instruction ? `改寫要求：${instruction}\n` : ''}請改寫以上文本。`,
                provider, tier,
                temperature: 0.6,
                maxTokens: 8192,
            });

            await logInteraction(req.user.id, 'story_rewrite',
                { prompt: text.slice(0, 500), parameters: { style, instruction } },
                { provider: result.provider, model: result.model, tier: tier || 'balanced', temperature: 0.6 },
                { rawResponse: result.content, contentType: 'text' },
                'completed', result.usage || {}
            );

            await models.User.updateOne({ _id: req.user.id }, { $inc: { credits: -10 } });
            const user = await models.User.findById(req.user.id).select('credits');

            res.json({ success: true, rewritten: result.content, model: result.model, provider: result.provider, credits: user.credits });
        } catch (err) {
            await logInteraction(req.user.id, 'story_rewrite',
                { prompt: (req.body.text || '').slice(0, 500) }, {}, {}, 'failed', {}, err
            );
            res.status(500).json({ error: '改寫失敗：' + err.message });
        }
    });

    // ========== 翻譯 ==========
    router.post('/translate', authMiddleware, async (req, res) => {
        try {
            const { text, target_language = 'English', source_language, provider, tier } = req.body;
            if (!text) return res.status(400).json({ error: '缺少文本內容' });

            const result = await llm.chat({
                systemPrompt: PROMPTS.translate?.system || `你是一位專業翻譯。將文本翻譯成${target_language}，保持風格和語氣。`,
                prompt: PROMPTS.translate?.user?.({ text, target_language, source_language }) ||
                    `${source_language ? `原文語言：${source_language}\n` : ''}目標語言：${target_language}\n\n請翻譯以下文本：\n${text}`,
                provider, tier,
                temperature: 0.3,
                maxTokens: 8192,
            });

            await logInteraction(req.user.id, 'story_translate',
                { prompt: text.slice(0, 500), parameters: { target_language, source_language } },
                { provider: result.provider, model: result.model, tier: tier || 'balanced', temperature: 0.3 },
                { rawResponse: result.content, contentType: 'text' },
                'completed', result.usage || {}
            );

            await models.User.updateOne({ _id: req.user.id }, { $inc: { credits: -10 } });
            const user = await models.User.findById(req.user.id).select('credits');

            res.json({ success: true, translation: result.content, model: result.model, provider: result.provider, credits: user.credits });
        } catch (err) {
            await logInteraction(req.user.id, 'story_translate',
                { prompt: (req.body.text || '').slice(0, 500) }, {}, {}, 'failed', {}, err
            );
            res.status(500).json({ error: '翻譯失敗：' + err.message });
        }
    });

    // ========== 生成對話 ==========
    router.post('/dialogue', authMiddleware, async (req, res) => {
        try {
            const { characters, context, tone, count = 5, provider, tier } = req.body;

            const result = await llm.chat({
                systemPrompt: PROMPTS.dialogue?.system || '你是對話寫作專家。根據角色和場景生成自然、有張力的對話。以JSON數組返回。',
                prompt: PROMPTS.dialogue?.user?.({ characters, context, tone, count }) ||
                    `角色：${JSON.stringify(characters || [])}\n場景：${context || ''}\n語調：${tone || '自然'}\n\n生成${count}組對話，每組包含：speaker, content, action, emotion。以JSON數組返回。`,
                provider, tier,
                temperature: 0.8,
                maxTokens: 4096,
            });

            let dialogues;
            try {
                const jsonMatch = result.content.match(/\[[\s\S]*\]/);
                dialogues = JSON.parse(jsonMatch ? jsonMatch[0] : result.content);
            } catch (e) {
                dialogues = [{ speaker: 'unknown', content: result.content }];
            }

            await logInteraction(req.user.id, 'dialogue_gen',
                { prompt: `生成對話: ${context}`, parameters: { characters, context, tone, count } },
                { provider: result.provider, model: result.model, tier: tier || 'balanced', temperature: 0.8 },
                { rawResponse: result.content, parsedData: dialogues, contentType: 'json' },
                'completed', result.usage || {}
            );

            await models.User.updateOne({ _id: req.user.id }, { $inc: { credits: -10 } });
            const user = await models.User.findById(req.user.id).select('credits');

            res.json({ success: true, dialogues, model: result.model, provider: result.provider, credits: user.credits });
        } catch (err) {
            await logInteraction(req.user.id, 'dialogue_gen',
                { prompt: JSON.stringify(req.body) }, {}, {}, 'failed', {}, err
            );
            res.status(500).json({ error: '生成對話失敗：' + err.message });
        }
    });

    return router;
};
