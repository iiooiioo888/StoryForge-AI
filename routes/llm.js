const express = require('express');
const { authMiddleware, optionalAuth } = require('../middleware/auth');
const LLMService = require('../services/llm');
const PROMPTS = require('../services/prompts');

module.exports = function(db) {
    const router = express.Router();

    // 初始化 LLM 服務
    const llm = new LLMService({
        defaultProvider: process.env.LLM_PROVIDER || 'openai',
        defaultTier: 'balanced',
    });

    // ==========================================
    // LLM 狀態檢查
    // ==========================================
    router.get('/status', (req, res) => {
        const providers = llm.getAvailableProviders();
        res.json({
            providers,
            default: llm.defaultProvider,
            configured: providers.filter(p => p.hasApiKey).map(p => p.id),
        });
    });

    // ==========================================
    // LLM 設定
    // ==========================================
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

    // ==========================================
    // LLM 故事大綱生成
    // ==========================================
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

            // Parse JSON response
            let outline;
            try {
                const jsonMatch = result.content.match(/\{[\s\S]*\}/);
                outline = JSON.parse(jsonMatch ? jsonMatch[0] : result.content);
            } catch (e) {
                outline = { raw: result.content };
            }

            // Log generation
            db.prepare(`INSERT INTO ai_generation_logs (user_id, generation_type, input_data, output_data, model_used, credits_cost, status) VALUES (?, 'story', ?, ?, ?, 15, 'success')`)
                .run(req.user.id, JSON.stringify(params), JSON.stringify(outline), result.model);

            // Deduct credits
            db.prepare('UPDATE users SET credits = credits - 15 WHERE id = ?').run(req.user.id);

            const user = db.prepare('SELECT credits FROM users WHERE id = ?').get(req.user.id);

            res.json({
                success: true,
                outline,
                model: result.model,
                provider: result.provider,
                usage: result.usage,
                credits_remaining: user.credits,
            });
        } catch (err) {
            db.prepare(`INSERT INTO ai_generation_logs (user_id, generation_type, input_data, model_used, credits_cost, status, error_message) VALUES (?, 'story', ?, ?, 0, 'failed', ?)`)
                .run(req.user.id, JSON.stringify(req.body), 'N/A', err.message);
            res.status(500).json({ error: '生成失敗：' + err.message });
        }
    });

    // ==========================================
    // LLM 故事正文生成
    // ==========================================
    router.post('/generate-content', authMiddleware, async (req, res) => {
        try {
            const { provider, tier, ...params } = req.body;

            const result = await llm.chat({
                systemPrompt: PROMPTS.storyContent.system,
                prompt: PROMPTS.storyContent.user(params),
                provider, tier,
                temperature: 0.8,
                maxTokens: 8192,
            });

            const wordCount = result.content.length;

            db.prepare(`INSERT INTO ai_generation_logs (user_id, generation_type, input_data, output_data, model_used, credits_cost, status) VALUES (?, 'story', ?, ?, ?, 20, 'success')`)
                .run(req.user.id, JSON.stringify(params), result.content.substring(0, 1000), result.model);

            db.prepare('UPDATE users SET credits = credits - 20 WHERE id = ?').run(req.user.id);
            const user = db.prepare('SELECT credits FROM users WHERE id = ?').get(req.user.id);

            res.json({
                success: true,
                content: result.content,
                word_count: wordCount,
                model: result.model,
                provider: result.provider,
                credits_remaining: user.credits,
            });
        } catch (err) {
            res.status(500).json({ error: '生成失敗：' + err.message });
        }
    });

    // ==========================================
    // LLM 完整故事生成（一鍵）
    // ==========================================
    router.post('/generate-full-story', authMiddleware, async (req, res) => {
        try {
            const { provider, tier, ...params } = req.body;

            // Step 1: Generate outline
            const outlineResult = await llm.chat({
                systemPrompt: PROMPTS.storyOutline.system,
                prompt: PROMPTS.storyOutline.user({ ...params, chapterCount: 1 }),
                provider, tier,
                temperature: 0.7,
                maxTokens: 4096,
            });

            let outline;
            try {
                const jsonMatch = outlineResult.content.match(/\{[\s\S]*\}/);
                outline = JSON.parse(jsonMatch ? jsonMatch[0] : outlineResult.content);
            } catch (e) {
                outline = { title: params.idea?.substring(0, 20) || '未命名故事', chapters: [] };
            }

            // Step 2: Generate content
            const contentResult = await llm.chat({
                systemPrompt: PROMPTS.storyFull.system,
                prompt: PROMPTS.storyFull.user({
                    ...params,
                    characterName: params.characterName,
                }),
                provider, tier,
                temperature: 0.8,
                maxTokens: 8192,
            });

            const totalCost = 35;
            db.prepare(`INSERT INTO ai_generation_logs (user_id, generation_type, input_data, output_data, model_used, credits_cost, status) VALUES (?, 'story', ?, ?, ?, ?, 'success')`)
                .run(req.user.id, JSON.stringify(params), contentResult.content.substring(0, 1000), contentResult.model, totalCost);

            db.prepare('UPDATE users SET credits = credits - ? WHERE id = ?').run(totalCost, req.user.id);
            const user = db.prepare('SELECT credits FROM users WHERE id = ?').get(req.user.id);

            res.json({
                success: true,
                outline,
                content: contentResult.content,
                word_count: contentResult.content.length,
                model: contentResult.model,
                provider: contentResult.provider,
                credits_remaining: user.credits,
            });
        } catch (err) {
            res.status(500).json({ error: '生成失敗：' + err.message });
        }
    });

    // ==========================================
    // LLM 全權生成所有表單欄位
    // ==========================================
    router.post('/generate-all-fields', authMiddleware, async (req, res) => {
        try {
            const { provider, tier } = req.body;

            const result = await llm.chat({
                systemPrompt: PROMPTS.aiAutoFill.system,
                prompt: PROMPTS.aiAutoFill.user(),
                provider, tier,
                temperature: 0.9,
                maxTokens: 2048,
            });

            let fields;
            try {
                const jsonMatch = result.content.match(/\{[\s\S]*\}/);
                fields = JSON.parse(jsonMatch ? jsonMatch[0] : result.content);
            } catch (e) {
                return res.status(500).json({ error: 'AI 回應格式異常，請重試' });
            }

            const totalCost = 5;
            db.prepare(`INSERT INTO ai_generation_logs (user_id, generation_type, input_data, output_data, model_used, credits_cost, status) VALUES (?, 'autofill', '{}', ?, ?, ?, 'success')`)
                .run(req.user.id, JSON.stringify(fields).substring(0, 1000), result.model, totalCost);

            db.prepare('UPDATE users SET credits = credits - ? WHERE id = ?').run(totalCost, req.user.id);
            const user = db.prepare('SELECT credits FROM users WHERE id = ?').get(req.user.id);

            res.json({
                success: true,
                fields,
                model: result.model,
                provider: result.provider,
                credits_remaining: user.credits,
            });
        } catch (err) {
            res.status(500).json({ error: '生成失敗：' + err.message });
        }
    });

    // ==========================================
    // LLM 影片提示詞生成（從故事）
    // ==========================================
    router.post('/generate-video-prompts', authMiddleware, async (req, res) => {
        try {
            const { story_id, provider, tier, sceneCount = 5, platform = 'general', aspectRatio = '16:9' } = req.body;

            const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(story_id);
            if (!story) return res.status(404).json({ error: '故事不存在' });
            if (story.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: '無權操作' });

            const characters = db.prepare('SELECT * FROM characters WHERE story_id = ?').all(story_id);

            const result = await llm.chat({
                systemPrompt: PROMPTS.videoPromptFromStory.system,
                prompt: PROMPTS.videoPromptFromStory.user({
                    title: story.title,
                    genre: story.genre,
                    content: story.content,
                    characters,
                    sceneCount,
                    platform,
                    aspectRatio,
                }),
                provider, tier,
                temperature: 0.6,
                maxTokens: 8192,
            });

            // Parse response
            let scenes;
            try {
                const jsonMatch = result.content.match(/\{[\s\S]*\}/);
                scenes = JSON.parse(jsonMatch ? jsonMatch[0] : result.content);
            } catch (e) {
                scenes = { scenes: [{ scene_number: 1, prompt_en: result.content, prompt_zh: 'LLM 生成的提示詞' }] };
            }

            // Save to database
            const insertPrompt = db.prepare(`INSERT INTO video_prompts (user_id, story_id, platform, scene_description, camera_movement, lighting, style, mood, duration, aspect_ratio, full_prompt, negative_prompt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

            const savedPrompts = [];
            db.transaction(() => {
                for (const scene of (scenes.scenes || [])) {
                    const result = insertPrompt.run(
                        req.user.id, story_id, platform,
                        scene.visual_description || scene.scene_name || '',
                        scene.camera?.movement || '',
                        scene.lighting || '',
                        scene.style || '',
                        scene.mood || '',
                        scene.duration ? `${scene.duration}s` : '8s',
                        aspectRatio,
                        scene.prompt_en || '',
                        'low quality, blurry, distorted, watermark'
                    );
                    savedPrompts.push({ id: result.lastInsertRowid, ...scene });
                }
            })();

            const totalCost = 25;
            db.prepare(`INSERT INTO ai_generation_logs (user_id, generation_type, input_data, output_data, model_used, credits_cost, status) VALUES (?, 'prompt', ?, ?, ?, ?, 'success')`)
                .run(req.user.id, `story:${story_id}`, JSON.stringify(scenes).substring(0, 1000), result.model, totalCost);

            db.prepare('UPDATE users SET credits = credits - ? WHERE id = ?').run(totalCost, req.user.id);
            const user = db.prepare('SELECT credits FROM users WHERE id = ?').get(req.user.id);

            res.json({
                success: true,
                story_title: story.title,
                scenes: savedPrompts,
                total_scenes: savedPrompts.length,
                model: result.model,
                provider: result.provider,
                credits_remaining: user.credits,
            });
        } catch (err) {
            res.status(500).json({ error: '生成失敗：' + err.message });
        }
    });

    // ==========================================
    // LLM 影片提示詞生成（從描述）
    // ==========================================
    router.post('/generate-video-prompt', authMiddleware, async (req, res) => {
        try {
            const { provider, tier, ...params } = req.body;

            const result = await llm.chat({
                systemPrompt: PROMPTS.videoPromptFromDescription.system,
                prompt: PROMPTS.videoPromptFromDescription.user(params),
                provider, tier,
                temperature: 0.5,
                maxTokens: 2048,
            });

            let promptData;
            try {
                const jsonMatch = result.content.match(/\{[\s\S]*\}/);
                promptData = JSON.parse(jsonMatch ? jsonMatch[0] : result.content);
            } catch (e) {
                promptData = { prompt_en: result.content };
            }

            // Save
            db.prepare(`INSERT INTO video_prompts (user_id, platform, scene_description, camera_movement, lighting, style, mood, duration, aspect_ratio, full_prompt, negative_prompt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
                .run(req.user.id, params.platform || 'general', params.scene, promptData.camera_breakdown?.movement || '', params.lighting || '', params.style || '', params.mood || '', params.duration || '8s', params.aspectRatio || '16:9', promptData.prompt_en || '', promptData.negative_prompt || '');

            db.prepare(`INSERT INTO ai_generation_logs (user_id, generation_type, input_data, output_data, model_used, credits_cost, status) VALUES (?, 'prompt', ?, ?, ?, 10, 'success')`)
                .run(req.user.id, JSON.stringify(params), JSON.stringify(promptData).substring(0, 500), result.model);

            db.prepare('UPDATE users SET credits = credits - 10 WHERE id = ?').run(req.user.id);
            const user = db.prepare('SELECT credits FROM users WHERE id = ?').get(req.user.id);

            res.json({
                success: true,
                prompt: promptData,
                model: result.model,
                provider: result.provider,
                credits_remaining: user.credits,
            });
        } catch (err) {
            res.status(500).json({ error: '生成失敗：' + err.message });
        }
    });

    // ==========================================
    // LLM 續寫
    // ==========================================
    router.post('/stories/:id/continue', authMiddleware, async (req, res) => {
        try {
            const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(req.params.id);
            if (!story) return res.status(404).json({ error: '故事不存在' });
            if (story.user_id !== req.user.id) return res.status(403).json({ error: '無權操作' });

            const { direction, hint, wordCount = 500, provider, tier } = req.body;
            const lastContent = story.content.slice(-800);

            const result = await llm.chat({
                systemPrompt: PROMPTS.storyContinuation.system,
                prompt: PROMPTS.storyContinuation.user({
                    title: story.title,
                    genre: story.genre,
                    lastContent,
                    direction,
                    hint,
                    wordCount,
                }),
                provider, tier,
                temperature: 0.8,
                maxTokens: 4096,
            });

            db.prepare(`INSERT INTO ai_generation_logs (user_id, generation_type, input_data, output_data, model_used, credits_cost, status) VALUES (?, 'story', ?, ?, ?, 10, 'success')`)
                .run(req.user.id, `continue:${req.params.id}`, result.content.substring(0, 500), result.model);

            db.prepare('UPDATE users SET credits = credits - 10 WHERE id = ?').run(req.user.id);
            const user = db.prepare('SELECT credits FROM users WHERE id = ?').get(req.user.id);

            res.json({
                success: true,
                continuation: result.content,
                context: lastContent,
                model: result.model,
                provider: result.provider,
                credits_remaining: user.credits,
            });
        } catch (err) {
            res.status(500).json({ error: '續寫失敗：' + err.message });
        }
    });

    // ==========================================
    // LLM 角色生成
    // ==========================================
    router.post('/generate-characters', authMiddleware, async (req, res) => {
        try {
            const { provider, tier, ...params } = req.body;

            const result = await llm.chat({
                systemPrompt: PROMPTS.characterGeneration.system,
                prompt: PROMPTS.characterGeneration.user(params),
                provider, tier,
                temperature: 0.7,
                maxTokens: 4096,
            });

            let characters;
            try {
                const jsonMatch = result.content.match(/\{[\s\S]*\}/);
                characters = JSON.parse(jsonMatch ? jsonMatch[0] : result.content);
            } catch (e) {
                characters = { characters: [{ name: '角色', description: result.content }] };
            }

            db.prepare(`INSERT INTO ai_generation_logs (user_id, generation_type, output_data, model_used, credits_cost, status) VALUES (?, 'character', ?, ?, 10, 'success')`)
                .run(req.user.id, JSON.stringify(characters).substring(0, 500), result.model);

            db.prepare('UPDATE users SET credits = credits - 10 WHERE id = ?').run(req.user.id);
            const user = db.prepare('SELECT credits FROM users WHERE id = ?').get(req.user.id);

            res.json({
                success: true,
                characters: characters.characters || [],
                model: result.model,
                credits_remaining: user.credits,
            });
        } catch (err) {
            res.status(500).json({ error: '生成失敗：' + err.message });
        }
    });

    // ==========================================
    // LLM 世界觀生成
    // ==========================================
    router.post('/generate-world', authMiddleware, async (req, res) => {
        try {
            const { provider, tier, ...params } = req.body;

            const result = await llm.chat({
                systemPrompt: PROMPTS.worldBuilding.system,
                prompt: PROMPTS.worldBuilding.user(params),
                provider, tier,
                temperature: 0.7,
                maxTokens: 4096,
            });

            let world;
            try {
                const jsonMatch = result.content.match(/\{[\s\S]*\}/);
                world = JSON.parse(jsonMatch ? jsonMatch[0] : result.content);
            } catch (e) {
                world = { world: { name: '世界', description: result.content } };
            }

            db.prepare(`INSERT INTO ai_generation_logs (user_id, generation_type, output_data, model_used, credits_cost, status) VALUES (?, 'world', ?, ?, 15, 'success')`)
                .run(req.user.id, JSON.stringify(world).substring(0, 500), result.model);

            db.prepare('UPDATE users SET credits = credits - 15 WHERE id = ?').run(req.user.id);
            const user = db.prepare('SELECT credits FROM users WHERE id = ?').get(req.user.id);

            res.json({
                success: true,
                world: world.world || world,
                model: result.model,
                credits_remaining: user.credits,
            });
        } catch (err) {
            res.status(500).json({ error: '生成失敗：' + err.message });
        }
    });

    // ==========================================
    // LLM 改寫/潤色
    // ==========================================
    router.post('/rewrite', authMiddleware, async (req, res) => {
        try {
            const { content, type, requirement, style, wordCount, provider, tier } = req.body;
            if (!content) return res.status(400).json({ error: '請提供內容' });

            const result = await llm.chat({
                systemPrompt: PROMPTS.storyRewrite.system,
                prompt: PROMPTS.storyRewrite.user({ content, type, requirement, style, wordCount }),
                provider, tier,
                temperature: 0.6,
                maxTokens: 8192,
            });

            db.prepare(`INSERT INTO ai_generation_logs (user_id, generation_type, model_used, credits_cost, status) VALUES (?, 'story', ?, 15, 'success')`)
                .run(req.user.id, result.model);

            db.prepare('UPDATE users SET credits = credits - 15 WHERE id = ?').run(req.user.id);
            const user = db.prepare('SELECT credits FROM users WHERE id = ?').get(req.user.id);

            res.json({
                success: true,
                content: result.content,
                word_count: result.content.length,
                model: result.model,
                credits_remaining: user.credits,
            });
        } catch (err) {
            res.status(500).json({ error: '改寫失敗：' + err.message });
        }
    });

    // ==========================================
    // LLM 翻譯
    // ==========================================
    router.post('/translate', authMiddleware, async (req, res) => {
        try {
            const { content, targetLang, notes, provider, tier } = req.body;
            if (!content) return res.status(400).json({ error: '請提供內容' });

            const result = await llm.chat({
                systemPrompt: PROMPTS.translation.system,
                prompt: PROMPTS.translation.user({ content, targetLang, notes }),
                provider, tier,
                temperature: 0.3,
                maxTokens: 8192,
            });

            db.prepare(`INSERT INTO ai_generation_logs (user_id, generation_type, model_used, credits_cost, status) VALUES (?, 'story', ?, 10, 'success')`)
                .run(req.user.id, result.model);

            db.prepare('UPDATE users SET credits = credits - 10 WHERE id = ?').run(req.user.id);
            const user = db.prepare('SELECT credits FROM users WHERE id = ?').get(req.user.id);

            res.json({
                success: true,
                translation: result.content,
                model: result.model,
                credits_remaining: user.credits,
            });
        } catch (err) {
            res.status(500).json({ error: '翻譯失敗：' + err.message });
        }
    });

    // ==========================================
    // LLM 對話生成
    // ==========================================
    router.post('/generate-dialogue', authMiddleware, async (req, res) => {
        try {
            const { provider, tier, ...params } = req.body;

            const result = await llm.chat({
                systemPrompt: PROMPTS.dialogueGeneration.system,
                prompt: PROMPTS.dialogueGeneration.user(params),
                provider, tier,
                temperature: 0.8,
                maxTokens: 4096,
            });

            db.prepare(`INSERT INTO ai_generation_logs (user_id, generation_type, model_used, credits_cost, status) VALUES (?, 'story', ?, 10, 'success')`)
                .run(req.user.id, result.model);

            db.prepare('UPDATE users SET credits = credits - 10 WHERE id = ?').run(req.user.id);
            const user = db.prepare('SELECT credits FROM users WHERE id = ?').get(req.user.id);

            res.json({
                success: true,
                dialogue: result.content,
                model: result.model,
                credits_remaining: user.credits,
            });
        } catch (err) {
            res.status(500).json({ error: '生成失敗：' + err.message });
        }
    });

    // ==========================================
    // LLM 名字生成（增強版）
    // ==========================================
    router.post('/generate-names', authMiddleware, async (req, res) => {
        try {
            const { provider, tier, useAI = false, ...params } = req.body;

            if (useAI) {
                const result = await llm.chat({
                    systemPrompt: PROMPTS.nameGeneration.system,
                    prompt: PROMPTS.nameGeneration.user(params),
                    provider, tier,
                    temperature: 0.8,
                    maxTokens: 2048,
                });

                let names;
                try {
                    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
                    names = JSON.parse(jsonMatch ? jsonMatch[0] : result.content);
                } catch (e) {
                    names = { names: result.content.split('\n').filter(n => n.trim()) };
                }

                db.prepare('UPDATE users SET credits = credits - 5 WHERE id = ?').run(req.user.id);
                const user = db.prepare('SELECT credits FROM users WHERE id = ?').get(req.user.id);

                res.json({
                    success: true,
                    names: names.names || [],
                    model: result.model,
                    credits_remaining: user.credits,
                });
            } else {
                // Fallback to built-in name generator
                const toolsRouter = require('./tools')(db);
                // Delegate to tools router - but we can't easily do that, so just handle inline
                res.status(400).json({ error: '請使用 /api/tools/generate-names 端點進行基礎名字生成' });
            }
        } catch (err) {
            res.status(500).json({ error: '生成失敗：' + err.message });
        }
    });

    return router;
};
