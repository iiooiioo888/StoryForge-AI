const express = require('express');
const { authMiddleware, optionalAuth } = require('../middleware/auth');

module.exports = function (models) {
    const router = express.Router();

    // ========== 鏡頭運動 ==========
    router.get('/movements', async (req, res) => {
        try {
            const { category, difficulty } = req.query;
            const filter = {};
            if (category) filter.category = category;
            if (difficulty) filter.difficulty = parseInt(difficulty);

            const movements = await models.CameraMovement.find(filter).sort({ sortOrder: 1, nameZh: 1 });
            res.json({ movements });
        } catch (err) {
            res.status(500).json({ error: '獲取鏡頭運動失敗' });
        }
    });

    // ========== 景別 ==========
    router.get('/shot-sizes', async (req, res) => {
        try {
            const shotSizes = await models.ShotSize.find().sort({ sortOrder: 1, nameZh: 1 });
            res.json({ sizes: shotSizes });
        } catch (err) {
            res.status(500).json({ error: '獲取景別失敗' });
        }
    });

    // ========== 鏡頭角度 ==========
    router.get('/angles', async (req, res) => {
        try {
            const angles = await models.CameraAngle.find().sort({ sortOrder: 1, nameZh: 1 });
            res.json({ angles });
        } catch (err) {
            res.status(500).json({ error: '獲取鏡頭角度失敗' });
        }
    });

    // ========== 轉場效果 ==========
    router.get('/transitions', async (req, res) => {
        try {
            const transitions = await models.ShotTransition.find().sort({ sortOrder: 1, nameZh: 1 });
            res.json({ transitions });
        } catch (err) {
            res.status(500).json({ error: '獲取轉場效果失敗' });
        }
    });

    // ========== 燈光預設 ==========
    router.get('/lighting-presets', async (req, res) => {
        try {
            const { category } = req.query;
            const filter = {};
            if (category) filter.category = category;
            const presets = await models.LightingPreset.find(filter).sort({ sortOrder: 1, nameZh: 1 });
            res.json({ presets });
        } catch (err) {
            res.status(500).json({ error: '獲取燈光預設失敗' });
        }
    });

    router.get('/lighting-presets/:id', async (req, res) => {
        try {
            const preset = await models.LightingPreset.findById(req.params.id);
            if (!preset) return res.status(404).json({ error: '燈光預設不存在' });
            res.json({ preset });
        } catch (err) {
            res.status(500).json({ error: '獲取燈光預設失敗' });
        }
    });

    // ========== 視覺風格 ==========
    router.get('/visual-styles', async (req, res) => {
        try {
            const { category } = req.query;
            const filter = {};
            if (category) filter.category = category;
            const styles = await models.VisualStyle.find(filter).sort({ sortOrder: 1, nameZh: 1 });
            res.json({ styles });
        } catch (err) {
            res.status(500).json({ error: '獲取視覺風格失敗' });
        }
    });

    router.get('/visual-styles/:id', async (req, res) => {
        try {
            const style = await models.VisualStyle.findById(req.params.id);
            if (!style) return res.status(404).json({ error: '視覺風格不存在' });
            res.json({ style });
        } catch (err) {
            res.status(500).json({ error: '獲取視覺風格失敗' });
        }
    });

    // ========== 色彩調板 ==========
    router.get('/color-palettes', async (req, res) => {
        try {
            const { category } = req.query;
            const filter = {};
            if (category) filter.category = category;
            const palettes = await models.ColorPalette.find(filter).sort({ sortOrder: 1, nameZh: 1 });
            res.json({ palettes });
        } catch (err) {
            res.status(500).json({ error: '獲取色彩調板失敗' });
        }
    });

    router.get('/color-palettes/:id', async (req, res) => {
        try {
            const palette = await models.ColorPalette.findById(req.params.id);
            if (!palette) return res.status(404).json({ error: '色彩調板不存在' });
            res.json({ palette });
        } catch (err) {
            res.status(500).json({ error: '獲取色彩調板失敗' });
        }
    });

    // ========== 鏡頭語言模板 ==========
    router.get('/language-templates', async (req, res) => {
        try {
            const { genre } = req.query;
            const filter = {};
            if (genre) filter.genre = genre;

            const templates = await models.CameraLanguageTemplate.find(filter)
                .populate('shotSizeId')
                .populate('angleId')
                .populate('movementId')
                .populate('transitionId')
                .sort({ name: 1 });

            res.json({ templates });
        } catch (err) {
            res.status(500).json({ error: '獲取鏡頭語言模板失敗' });
        }
    });

    // ========== 組合鏡頭語言 ==========
    router.post('/compose', optionalAuth, async (req, res) => {
        try {
            const { shot_size_id, angle_id, movement_id, transition_id, lighting_id, visual_style_id, color_palette_id, scene_description, style, mood } = req.body;

            const parts = [];
            let shotSize, angle, movement, transition, lightingPreset, visualStyle, colorPalette;

            if (shot_size_id) {
                shotSize = await models.ShotSize.findById(shot_size_id);
                if (shotSize) parts.push(shotSize.englishPrompt || shotSize.nameEn);
            }
            if (angle_id) {
                angle = await models.CameraAngle.findById(angle_id);
                if (angle) parts.push(angle.englishPrompt || angle.nameEn);
            }
            if (movement_id) {
                movement = await models.CameraMovement.findById(movement_id);
                if (movement) parts.push(movement.englishPrompt || movement.nameEn);
            }
            if (transition_id) {
                transition = await models.ShotTransition.findById(transition_id);
                if (transition) parts.push(transition.englishPrompt || transition.nameEn);
            }
            if (lighting_id) {
                lightingPreset = await models.LightingPreset.findById(lighting_id);
                if (lightingPreset) parts.push(lightingPreset.englishPrompt || lightingPreset.nameEn);
            }
            if (visual_style_id) {
                visualStyle = await models.VisualStyle.findById(visual_style_id);
                if (visualStyle) parts.push(visualStyle.englishPrompt || visualStyle.nameEn);
            }
            if (color_palette_id) {
                colorPalette = await models.ColorPalette.findById(color_palette_id);
                if (colorPalette) parts.push(colorPalette.englishPrompt || colorPalette.nameEn);
            }

            const fullPrompt = [
                scene_description || '',
                ...parts.filter(Boolean),
                style ? `--style ${style}` : '',
                mood ? `--mood ${mood}` : '',
            ].filter(Boolean).join(' ');

            // Build a Chinese description for display
            const zhParts = [];
            if (shotSize) zhParts.push(shotSize.nameZh);
            if (angle) zhParts.push(angle.nameZh);
            if (movement) zhParts.push(movement.nameZh);
            if (lightingPreset) zhParts.push(lightingPreset.nameZh);
            if (visualStyle) zhParts.push(visualStyle.nameZh);
            if (colorPalette) zhParts.push(colorPalette.nameZh);

            // Save as a video prompt if user is logged in
            let savedPrompt = null;
            if (req.user) {
                savedPrompt = await models.VideoPrompt.create({
                    userId: req.user.id,
                    platform: 'general',
                    sceneDescription: scene_description || '',
                    cameraMovement: movement?.nameEn || '',
                    cameraAngle: angle?.nameEn || '',
                    shotSize: shotSize?.nameEn || '',
                    lighting: lightingPreset?.nameEn || '',
                    style: visualStyle?.nameEn || style || '',
                    mood: mood || '',
                    fullPrompt,
                });
            }

            res.json({
                success: true,
                composition: {
                    shotSize, angle, movement, transition,
                    lightingPreset, visualStyle, colorPalette,
                    fullPrompt,
                    zhDescription: zhParts.join(' + '),
                },
                zh_description: zhParts.join(' + '),
                full_prompt: fullPrompt,
                savedPrompt,
            });
        } catch (err) {
            res.status(500).json({ error: '組合鏡頭語言失敗' });
        }
    });

    // ========== 統計 ==========
    router.get('/stats', async (req, res) => {
        try {
            const [movementCount, shotSizeCount, angleCount, transitionCount, templateCount, lightingCount, styleCount, paletteCount] = await Promise.all([
                models.CameraMovement.countDocuments(),
                models.ShotSize.countDocuments(),
                models.CameraAngle.countDocuments(),
                models.ShotTransition.countDocuments(),
                models.CameraLanguageTemplate.countDocuments(),
                models.LightingPreset.countDocuments(),
                models.VisualStyle.countDocuments(),
                models.ColorPalette.countDocuments(),
            ]);

            res.json({
                stats: {
                    movements: movementCount,
                    shotSizes: shotSizeCount,
                    angles: angleCount,
                    transitions: transitionCount,
                    templates: templateCount,
                    lightingPresets: lightingCount,
                    visualStyles: styleCount,
                    colorPalettes: paletteCount,
                },
            });
        } catch (err) {
            res.status(500).json({ error: '獲取統計失敗' });
        }
    });

    // ========== 燈光預設 ==========
    router.get('/lighting-presets', async (req, res) => {
        try {
            const { category } = req.query;
            const filter = {};
            if (category) filter.category = category;
            const presets = await models.LightingPreset.find(filter).sort({ sortOrder: 1, nameZh: 1 });
            res.json({ presets });
        } catch (err) {
            res.status(500).json({ error: '獲取燈光預設失敗' });
        }
    });

    // ========== 視覺風格 ==========
    router.get('/visual-styles', async (req, res) => {
        try {
            const { category } = req.query;
            const filter = {};
            if (category) filter.category = category;
            const styles = await models.VisualStyle.find(filter).sort({ sortOrder: 1, nameZh: 1 });
            res.json({ styles });
        } catch (err) {
            res.status(500).json({ error: '獲取視覺風格失敗' });
        }
    });

    // ========== 色彩調色板 ==========
    router.get('/color-palettes', async (req, res) => {
        try {
            const { category } = req.query;
            const filter = {};
            if (category) filter.category = category;
            const palettes = await models.ColorPalette.find(filter).sort({ sortOrder: 1, nameZh: 1 });
            res.json({ palettes });
        } catch (err) {
            res.status(500).json({ error: '獲取色彩調色板失敗' });
        }
    });

    // ========== 道具管理 ==========
    router.get('/props', async (req, res) => {
        try {
            const { story_id, category } = req.query;
            const filter = {};
            if (story_id) filter.storyId = story_id;
            if (category) filter.category = category;
            const props = await models.Prop.find(filter).sort({ name: 1 });
            res.json({ props });
        } catch (err) {
            res.status(500).json({ error: '獲取道具失敗' });
        }
    });

    router.post('/props', authMiddleware, async (req, res) => {
        try {
            const prop = await models.Prop.create(req.body);
            res.json({ success: true, prop });
        } catch (err) {
            res.status(500).json({ error: '創建道具失敗：' + err.message });
        }
    });

    router.put('/props/:id', authMiddleware, async (req, res) => {
        try {
            const prop = await models.Prop.findByIdAndUpdate(req.params.id, req.body, { new: true });
            res.json({ success: true, prop });
        } catch (err) {
            res.status(500).json({ error: '更新道具失敗：' + err.message });
        }
    });

    router.delete('/props/:id', authMiddleware, async (req, res) => {
        try {
            await models.Prop.findByIdAndDelete(req.params.id);
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: '刪除道具失敗：' + err.message });
        }
    });

    // ========== 場景管理 ==========
    router.get('/scenes', async (req, res) => {
        try {
            const { story_id } = req.query;
            const filter = {};
            if (story_id) filter.storyId = story_id;
            const scenes = await models.Scene.find(filter).sort({ sceneNumber: 1 });
            res.json({ scenes });
        } catch (err) {
            res.status(500).json({ error: '獲取場景失敗' });
        }
    });

    router.post('/scenes', authMiddleware, async (req, res) => {
        try {
            const scene = await models.Scene.create(req.body);
            res.json({ success: true, scene });
        } catch (err) {
            res.status(500).json({ error: '創建場景失敗：' + err.message });
        }
    });

    router.put('/scenes/:id', authMiddleware, async (req, res) => {
        try {
            const scene = await models.Scene.findByIdAndUpdate(req.params.id, req.body, { new: true });
            res.json({ success: true, scene });
        } catch (err) {
            res.status(500).json({ error: '更新場景失敗：' + err.message });
        }
    });

    router.delete('/scenes/:id', authMiddleware, async (req, res) => {
        try {
            await models.Scene.findByIdAndDelete(req.params.id);
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: '刪除場景失敗：' + err.message });
        }
    });

    // ========== 角色接戲記錄 ==========
    router.get('/character-continuity', async (req, res) => {
        try {
            const { story_id, character_id, scene_number } = req.query;
            const filter = {};
            if (story_id) filter.storyId = story_id;
            if (character_id) filter.characterId = character_id;
            if (scene_number) filter.sceneNumber = parseInt(scene_number);
            const records = await models.CharacterContinuity.find(filter)
                .populate('characterId', 'name role')
                .populate('holdingProps', 'name category')
                .sort({ sceneNumber: 1 });
            res.json({ records });
        } catch (err) {
            res.status(500).json({ error: '獲取角色接戲記錄失敗' });
        }
    });

    router.post('/character-continuity', authMiddleware, async (req, res) => {
        try {
            const record = await models.CharacterContinuity.create(req.body);
            res.json({ success: true, record });
        } catch (err) {
            res.status(500).json({ error: '創建角色接戲記錄失敗：' + err.message });
        }
    });

    router.put('/character-continuity/:id', authMiddleware, async (req, res) => {
        try {
            const record = await models.CharacterContinuity.findByIdAndUpdate(req.params.id, req.body, { new: true });
            res.json({ success: true, record });
        } catch (err) {
            res.status(500).json({ error: '更新角色接戲記錄失敗：' + err.message });
        }
    });

    // ========== 場景接戲記錄 ==========
    router.get('/scene-continuity', async (req, res) => {
        try {
            const { story_id } = req.query;
            const filter = {};
            if (story_id) filter.storyId = story_id;
            const records = await models.SceneContinuity.find(filter).sort({ sceneNumber: 1 });
            res.json({ records });
        } catch (err) {
            res.status(500).json({ error: '獲取場景接戲記錄失敗' });
        }
    });

    router.post('/scene-continuity', authMiddleware, async (req, res) => {
        try {
            const record = await models.SceneContinuity.create(req.body);
            res.json({ success: true, record });
        } catch (err) {
            res.status(500).json({ error: '創建場景接戲記錄失敗：' + err.message });
        }
    });

    // ========== 15秒原子單元 ==========
    router.get('/atomic-clips', async (req, res) => {
        try {
            const { story_id } = req.query;
            const filter = {};
            if (story_id) filter.storyId = story_id;
            const clips = await models.AtomicClip.find(filter).sort({ sequenceIndex: 1 });
            res.json({ clips });
        } catch (err) {
            res.status(500).json({ error: '獲取原子單元失敗' });
        }
    });

    // ========== 過渡橋接 ==========
    router.get('/transition-bridges', async (req, res) => {
        try {
            const { story_id } = req.query;
            const filter = {};
            if (story_id) filter.storyId = story_id;
            const bridges = await models.TransitionBridge.find(filter)
                .populate('fromClipId', 'sequenceIndex endFrameUrl')
                .populate('toClipId', 'sequenceIndex')
                .sort({ bridgeIndex: 1 });
            res.json({ bridges });
        } catch (err) {
            res.status(500).json({ error: '獲取過渡橋接失敗' });
        }
    });

    // ========== 一致性校驗報告 ==========
    router.get('/consistency-reports', async (req, res) => {
        try {
            const { story_id } = req.query;
            const filter = {};
            if (story_id) filter.storyId = story_id;
            const reports = await models.ConsistencyReport.find(filter).sort({ createdAt: -1 });
            res.json({ reports });
        } catch (err) {
            res.status(500).json({ error: '獲取校驗報告失敗' });
        }
    });

    return router;
};
