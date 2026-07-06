const express = require('express');
const { authMiddleware, optionalAuth } = require('../middleware/auth');

module.exports = function(db) {
    const router = express.Router();

    // ========== 獲取所有鏡頭運動 ==========
    router.get('/movements', (req, res) => {
        try {
            const { category } = req.query;
            let where = '1=1'; let params = [];
            if (category) { where = 'category = ?'; params.push(category); }
            const movements = db.prepare(`SELECT * FROM camera_movements WHERE ${where} ORDER BY sort_order`).all(...params);
            res.json({ movements });
        } catch (err) { res.status(500).json({ error: '獲取鏡頭運動失敗' }); }
    });

    // ========== 獲取所有景別 ==========
    router.get('/shot-sizes', (req, res) => {
        try {
            const sizes = db.prepare('SELECT * FROM shot_sizes ORDER BY sort_order').all();
            res.json({ sizes });
        } catch (err) { res.status(500).json({ error: '獲取景別失敗' }); }
    });

    // ========== 獲取所有角度 ==========
    router.get('/angles', (req, res) => {
        try {
            const angles = db.prepare('SELECT * FROM camera_angles ORDER BY sort_order').all();
            res.json({ angles });
        } catch (err) { res.status(500).json({ error: '獲取角度失敗' }); }
    });

    // ========== 獲取所有轉場 ==========
    router.get('/transitions', (req, res) => {
        try {
            const transitions = db.prepare('SELECT * FROM shot_transitions ORDER BY sort_order').all();
            res.json({ transitions });
        } catch (err) { res.status(500).json({ error: '獲取轉場失敗' }); }
    });

    // ========== 獲取鏡頭語言組合模板 ==========
    router.get('/language-templates', (req, res) => {
        try {
            const { genre } = req.query;
            let where = '1=1'; let params = [];
            if (genre) { where = 'genre = ?'; params.push(genre); }
            const templates = db.prepare(`SELECT * FROM camera_language_templates WHERE ${where} ORDER BY id`).all(...params);
            res.json({ templates });
        } catch (err) { res.status(500).json({ error: '獲取模板失敗' }); }
    });

    // ========== 鏡頭語言組合生成 ==========
    router.post('/compose', optionalAuth, (req, res) => {
        try {
            const { shot_size_id, angle_id, movement_id, transition_id, scene_description, style, mood } = req.body;

            let parts = [];

            // Shot size
            if (shot_size_id) {
                const size = db.prepare('SELECT * FROM shot_sizes WHERE id = ?').get(shot_size_id);
                if (size) parts.push(size.english_prompt);
            }

            // Angle
            if (angle_id) {
                const angle = db.prepare('SELECT * FROM camera_angles WHERE id = ?').get(angle_id);
                if (angle) parts.push(angle.english_prompt);
            }

            // Movement
            if (movement_id) {
                const movement = db.prepare('SELECT * FROM camera_movements WHERE id = ?').get(movement_id);
                if (movement) parts.push(movement.english_prompt);
            }

            // Build composed prompt
            let composedPrompt = parts.join('. ');

            // Add scene description
            if (scene_description) {
                composedPrompt = `${scene_description}. ${composedPrompt}`;
            }

            // Add style and mood
            if (style) composedPrompt += `. Style: ${style}`;
            if (mood) composedPrompt += `. Mood: ${mood}`;

            // Add transition if specified
            let transitionPrompt = null;
            if (transition_id) {
                const transition = db.prepare('SELECT * FROM shot_transitions WHERE id = ?').get(transition_id);
                if (transition) transitionPrompt = transition.english_prompt;
            }

            // Build Chinese description
            let zhDescription = [];
            if (shot_size_id) {
                const s = db.prepare('SELECT name_zh FROM shot_sizes WHERE id = ?').get(shot_size_id);
                if (s) zhDescription.push(s.name_zh);
            }
            if (angle_id) {
                const a = db.prepare('SELECT name_zh FROM camera_angles WHERE id = ?').get(angle_id);
                if (a) zhDescription.push(a.name_zh);
            }
            if (movement_id) {
                const m = db.prepare('SELECT name_zh FROM camera_movements WHERE id = ?').get(movement_id);
                if (m) zhDescription.push(m.name_zh);
            }

            res.json({
                success: true,
                composed_prompt: composedPrompt,
                transition_prompt: transitionPrompt,
                zh_description: zhDescription.join(' + '),
                full_prompt: transitionPrompt ? `${composedPrompt}. ${transitionPrompt}` : composedPrompt
            });
        } catch (err) { res.status(500).json({ error: '組合失敗：' + err.message }); }
    });

    // ========== 獲取鏡頭運動分類統計 ==========
    router.get('/stats', (req, res) => {
        try {
            const categories = db.prepare(`
                SELECT category, COUNT(*) as count FROM camera_movements GROUP BY category
            `).all();
            const totalMovements = db.prepare('SELECT COUNT(*) as c FROM camera_movements').get().c;
            const totalSizes = db.prepare('SELECT COUNT(*) as c FROM shot_sizes').get().c;
            const totalAngles = db.prepare('SELECT COUNT(*) as c FROM camera_angles').get().c;
            const totalTransitions = db.prepare('SELECT COUNT(*) as c FROM shot_transitions').get().c;
            const totalTemplates = db.prepare('SELECT COUNT(*) as c FROM camera_language_templates').get().c;

            res.json({
                movements_by_category: categories,
                totals: {
                    movements: totalMovements,
                    shot_sizes: totalSizes,
                    angles: totalAngles,
                    transitions: totalTransitions,
                    language_templates: totalTemplates
                }
            });
        } catch (err) { res.status(500).json({ error: '獲取統計失敗' }); }
    });

    return router;
};
