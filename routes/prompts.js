const express = require('express');
const { authMiddleware, optionalAuth } = require('../middleware/auth');

module.exports = function(db) {
    const router = express.Router();

    // 獲取提示詞模板列表
    router.get('/templates', optionalAuth, (req, res) => {
        try {
            const { platform, category } = req.query;
            let where = ['is_public = 1'];
            let params = [];

            if (platform) { where.push('platform = ?'); params.push(platform); }
            if (category) { where.push('category = ?'); params.push(category); }

            const templates = db.prepare(`
                SELECT * FROM video_prompt_templates WHERE ${where.join(' AND ')} ORDER BY usage_count DESC
            `).all(...params);
            res.json({ templates });
        } catch (err) {
            res.status(500).json({ error: '獲取模板失敗' });
        }
    });

    // 根據模板生成提示詞
    router.post('/generate', authMiddleware, (req, res) => {
        try {
            const { template_id, platform, parameters, scene_description, camera_movement, lighting, style, mood, duration, aspect_ratio, story_id } = req.body;

            // Check credits
            const user = db.prepare('SELECT credits FROM users WHERE id = ?').get(req.user.id);
            const creditsCost = db.prepare("SELECT value FROM system_settings WHERE key = 'credits_per_generation'").get();
            const cost = creditsCost ? parseInt(creditsCost.value) : 10;

            if (user.credits < cost) {
                return res.status(400).json({ error: `積分不足，需要 ${cost} 積分，目前有 ${user.credits} 積分` });
            }

            let fullPrompt = '';
            let template = null;

            if (template_id) {
                template = db.prepare('SELECT * FROM video_prompt_templates WHERE id = ?').get(template_id);
                if (!template) return res.status(404).json({ error: '模板不存在' });

                // Fill template
                fullPrompt = template.template;
                const paramNames = JSON.parse(template.parameters || '[]');
                if (parameters) {
                    paramNames.forEach(param => {
                        if (parameters[param]) {
                            fullPrompt = fullPrompt.replace(`{${param}}`, parameters[param]);
                        }
                    });
                }

                // Update usage count
                db.prepare('UPDATE video_prompt_templates SET usage_count = usage_count + 1 WHERE id = ?').run(template_id);
            } else {
                // Build prompt from individual fields
                const parts = [];
                if (scene_description) parts.push(scene_description);
                if (camera_movement) parts.push(`Camera: ${camera_movement}`);
                if (lighting) parts.push(`Lighting: ${lighting}`);
                if (style) parts.push(`Style: ${style}`);
                if (mood) parts.push(`Mood: ${mood}`);
                if (duration) parts.push(`Duration: ${duration}`);
                fullPrompt = parts.join('. ') + '.';
            }

            // Generate negative prompt based on platform
            let negativePrompt = '';
            switch (platform) {
                case 'sora':
                    negativePrompt = 'low quality, blurry, distorted, watermark, text overlay, oversaturated';
                    break;
                case 'runway':
                    negativePrompt = 'blurry, low resolution, artifacts, flickering, distorted faces';
                    break;
                case 'kling':
                    negativePrompt = 'bad quality, worst quality, blurry, watermark, text';
                    break;
                case 'pika':
                    negativePrompt = 'blurry, distorted, low quality, artifacts';
                    break;
                default:
                    negativePrompt = 'low quality, blurry, distorted, watermark';
            }

            // Save to database
            const result = db.prepare(`
                INSERT INTO video_prompts (user_id, story_id, template_id, platform, scene_description, camera_movement, lighting, style, mood, duration, aspect_ratio, full_prompt, negative_prompt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(req.user.id, story_id, template_id, platform || 'general', scene_description, camera_movement, lighting, style, mood, duration, aspect_ratio || '16:9', fullPrompt, negativePrompt);

            // Deduct credits
            db.prepare('UPDATE users SET credits = credits - ? WHERE id = ?').run(cost, req.user.id);

            // Log generation
            db.prepare(`
                INSERT INTO ai_generation_logs (user_id, generation_type, input_data, output_data, model_used, credits_cost, status)
                VALUES (?, 'prompt', ?, ?, ?, ?, 'success')
            `).run(req.user.id, JSON.stringify(req.body), fullPrompt, 'template-engine', cost);

            res.json({
                success: true,
                prompt: {
                    id: result.lastInsertRowid,
                    full_prompt: fullPrompt,
                    negative_prompt: negativePrompt,
                    platform,
                    aspect_ratio: aspect_ratio || '16:9'
                },
                credits_remaining: user.credits - cost
            });
        } catch (err) {
            res.status(500).json({ error: '生成提示詞失敗：' + err.message });
        }
    });

    // 從故事自動生成影片提示詞
    router.post('/from-story', authMiddleware, (req, res) => {
        try {
            const { story_id, platform = 'general', num_scenes = 5 } = req.body;

            const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(story_id);
            if (!story) return res.status(404).json({ error: '故事不存在' });
            if (story.user_id !== req.user.id && req.user.role !== 'admin') {
                return res.status(403).json({ error: '無權操作此故事' });
            }

            // Check credits
            const user = db.prepare('SELECT credits FROM users WHERE id = ?').get(req.user.id);
            const creditsCost = db.prepare("SELECT value FROM system_settings WHERE key = 'credits_per_generation'").get();
            const costPerScene = creditsCost ? parseInt(creditsCost.value) : 10;
            const totalCost = costPerScene * num_scenes;

            if (user.credits < totalCost) {
                return res.status(400).json({ error: `積分不足，需要 ${totalCost} 積分` });
            }

            // Auto-generate scenes from story content
            const content = story.content;
            const sentences = content.split(/[。！？\n]+/).filter(s => s.trim().length > 10);
            const sceneCount = Math.min(num_scenes, sentences.length);
            const step = Math.floor(sentences.length / sceneCount);

            const prompts = [];
            for (let i = 0; i < sceneCount; i++) {
                const sceneText = sentences[i * step] || sentences[sentences.length - 1];
                const sceneDesc = sceneText.trim().substring(0, 200);

                // Build cinematic prompt
                const cameraTypes = ['slow dolly forward', 'tracking shot', 'aerial crane shot', 'static wide shot', 'handheld close-up'];
                const lightings = ['golden hour', 'dramatic side lighting', 'soft diffused light', 'neon glow', 'moonlight'];
                const styles = ['cinematic', 'anime-inspired', 'watercolor painterly', 'photorealistic', 'dark fantasy'];
                const moods = ['epic and dramatic', 'serene and peaceful', 'mysterious', 'intense', 'melancholic'];

                const camera = cameraTypes[i % cameraTypes.length];
                const light = lightings[i % lightings.length];
                const style = styles[i % styles.length];
                const mood = moods[i % moods.length];

                const fullPrompt = `${sceneDesc}. Camera: ${camera}. Lighting: ${light}. Style: ${style}. Mood: ${mood}. Duration: ${8 + i * 2} seconds.`;

                const result = db.prepare(`
                    INSERT INTO video_prompts (user_id, story_id, platform, scene_description, camera_movement, lighting, style, mood, duration, aspect_ratio, full_prompt, negative_prompt)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '16:9', ?, 'low quality, blurry, distorted, watermark')
                `).run(req.user.id, story_id, platform, sceneDesc, camera, light, style, mood, `${8 + i * 2}s`, fullPrompt);

                prompts.push({
                    id: result.lastInsertRowid,
                    scene_number: i + 1,
                    full_prompt: fullPrompt,
                    scene_description: sceneDesc
                });
            }

            // Deduct credits
            db.prepare('UPDATE users SET credits = credits - ? WHERE id = ?').run(totalCost, req.user.id);

            res.json({
                success: true,
                story_title: story.title,
                prompts,
                total_scenes: prompts.length,
                credits_remaining: user.credits - totalCost
            });
        } catch (err) {
            res.status(500).json({ error: '生成失敗：' + err.message });
        }
    });

    // 獲取用戶的提示詞歷史
    router.get('/my-prompts', authMiddleware, (req, res) => {
        try {
            const { page = 1, limit = 20, platform } = req.query;
            const offset = (page - 1) * limit;
            let where = ['user_id = ?'];
            let params = [req.user.id];

            if (platform) { where.push('platform = ?'); params.push(platform); }

            const prompts = db.prepare(`
                SELECT vp.*, s.title as story_title
                FROM video_prompts vp
                LEFT JOIN stories s ON vp.story_id = s.id
                WHERE ${where.join(' AND ')}
                ORDER BY vp.created_at DESC
                LIMIT ? OFFSET ?
            `).all(...params, parseInt(limit), parseInt(offset));

            const total = db.prepare(`SELECT COUNT(*) as count FROM video_prompts WHERE ${where.join(' AND ')}`).get(...params);

            res.json({ prompts, total: total.count });
        } catch (err) {
            res.status(500).json({ error: '獲取歷史失敗' });
        }
    });

    // 收藏/取消收藏提示詞
    router.post('/:id/favorite', authMiddleware, (req, res) => {
        try {
            const prompt = db.prepare('SELECT * FROM video_prompts WHERE id = ?').get(req.params.id);
            if (!prompt) return res.status(404).json({ error: '提示詞不存在' });

            const newState = prompt.is_favorite ? 0 : 1;
            db.prepare('UPDATE video_prompts SET is_favorite = ? WHERE id = ?').run(newState, req.params.id);
            res.json({ success: true, is_favorite: newState });
        } catch (err) {
            res.status(500).json({ error: '操作失敗' });
        }
    });

    // 刪除提示詞
    router.delete('/:id', authMiddleware, (req, res) => {
        try {
            const prompt = db.prepare('SELECT * FROM video_prompts WHERE id = ?').get(req.params.id);
            if (!prompt) return res.status(404).json({ error: '提示詞不存在' });
            if (prompt.user_id !== req.user.id && req.user.role !== 'admin') {
                return res.status(403).json({ error: '無權刪除此提示詞' });
            }

            db.prepare('DELETE FROM video_prompts WHERE id = ?').run(req.params.id);
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: '刪除失敗' });
        }
    });

    // 獲取公開的提示詞（社區分享）
    router.get('/community', optionalAuth, (req, res) => {
        try {
            const { page = 1, limit = 20, platform } = req.query;
            const offset = (page - 1) * limit;
            let where = ['vp.is_favorite = 1'];
            let params = [];

            if (platform) { where.push('vp.platform = ?'); params.push(platform); }

            const prompts = db.prepare(`
                SELECT vp.*, u.username, u.display_name, s.title as story_title
                FROM video_prompts vp
                JOIN users u ON vp.user_id = u.id
                LEFT JOIN stories s ON vp.story_id = s.id
                WHERE ${where.join(' AND ')}
                ORDER BY vp.created_at DESC
                LIMIT ? OFFSET ?
            `).all(...params, parseInt(limit), parseInt(offset));

            res.json({ prompts });
        } catch (err) {
            res.status(500).json({ error: '獲取社區提示詞失敗' });
        }
    });

    return router;
};
