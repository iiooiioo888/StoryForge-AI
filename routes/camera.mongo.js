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
            res.json({ shotSizes });
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
            const { shot_size_id, angle_id, movement_id, transition_id, scene_description, style, mood } = req.body;

            const parts = [];
            let shotSize, angle, movement, transition;

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

            const fullPrompt = [
                scene_description || '',
                ...parts.filter(Boolean),
                style ? `--style ${style}` : '',
                mood ? `--mood ${mood}` : '',
            ].filter(Boolean).join(' ');

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
                    style: style || '',
                    mood: mood || '',
                    fullPrompt,
                });
            }

            res.json({
                success: true,
                composition: {
                    shotSize, angle, movement, transition,
                    fullPrompt,
                },
                savedPrompt,
            });
        } catch (err) {
            res.status(500).json({ error: '組合鏡頭語言失敗' });
        }
    });

    // ========== 統計 ==========
    router.get('/stats', async (req, res) => {
        try {
            const [movementCount, shotSizeCount, angleCount, transitionCount, templateCount] = await Promise.all([
                models.CameraMovement.countDocuments(),
                models.ShotSize.countDocuments(),
                models.CameraAngle.countDocuments(),
                models.ShotTransition.countDocuments(),
                models.CameraLanguageTemplate.countDocuments(),
            ]);

            res.json({
                stats: {
                    movements: movementCount,
                    shotSizes: shotSizeCount,
                    angles: angleCount,
                    transitions: transitionCount,
                    templates: templateCount,
                },
            });
        } catch (err) {
            res.status(500).json({ error: '獲取統計失敗' });
        }
    });

    return router;
};
