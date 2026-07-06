const express = require('express');
const { authMiddleware, optionalAuth } = require('../middleware/auth');

module.exports = function(db) {
    const router = express.Router();

    // ========== 獲取故事列表 ==========
    router.get('/', optionalAuth, (req, res) => {
        try {
            const { page = 1, limit = 20, category, search, sort = 'latest', status = 'published' } = req.query;
            const offset = (page - 1) * limit;
            let where = ['s.status = ?']; let params = [status];
            if (category) { where.push('s.category_id = ?'); params.push(category); }
            if (search) { where.push('(s.title LIKE ? OR s.summary LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
            let orderBy = 's.created_at DESC';
            if (sort === 'popular') orderBy = 's.view_count DESC';
            if (sort === 'likes') orderBy = 's.like_count DESC';

            const stories = db.prepare(`
                SELECT s.*, u.username, u.display_name, u.avatar_url, c.name as category_name, c.icon as category_icon
                FROM stories s JOIN users u ON s.user_id = u.id LEFT JOIN categories c ON s.category_id = c.id
                WHERE ${where.join(' AND ')} ORDER BY ${orderBy} LIMIT ? OFFSET ?
            `).all(...params, parseInt(limit), parseInt(offset));

            const total = db.prepare(`SELECT COUNT(*) as count FROM stories s WHERE ${where.join(' AND ')}`).get(...params);
            res.json({ stories, total: total.count, page: parseInt(page), limit: parseInt(limit) });
        } catch (err) { res.status(500).json({ error: '獲取故事列表失敗' }); }
    });

    // ========== 用戶自己的故事（必須在 /:id 之前） ==========
    router.get('/user/mine', authMiddleware, (req, res) => {
        try {
            const stories = db.prepare(`
                SELECT s.*, c.name as category_name, c.icon as category_icon
                FROM stories s LEFT JOIN categories c ON s.category_id = c.id
                WHERE s.user_id = ? ORDER BY s.updated_at DESC
            `).all(req.user.id);
            res.json({ stories });
        } catch (err) { res.status(500).json({ error: '獲取故事失敗' }); }
    });

    // ========== 獲取單個故事 ==========
    router.get('/:id', optionalAuth, (req, res) => {
        try {
            const story = db.prepare(`
                SELECT s.*, u.username, u.display_name, u.avatar_url, c.name as category_name, c.icon as category_icon
                FROM stories s JOIN users u ON s.user_id = u.id LEFT JOIN categories c ON s.category_id = c.id WHERE s.id = ?
            `).get(req.params.id);
            if (!story) return res.status(404).json({ error: '故事不存在' });
            db.prepare('UPDATE stories SET view_count = view_count + 1 WHERE id = ?').run(req.params.id);

            const tags = db.prepare(`SELECT t.* FROM tags t JOIN story_tags st ON t.id = st.tag_id WHERE st.story_id = ?`).all(req.params.id);
            const chapters = db.prepare('SELECT * FROM chapters WHERE story_id = ? ORDER BY chapter_number').all(req.params.id);
            const characters = db.prepare('SELECT * FROM characters WHERE story_id = ?').all(req.params.id);

            let userInteractions = {};
            if (req.user) {
                const interactions = db.prepare('SELECT action FROM interactions WHERE user_id = ? AND target_type = ? AND target_id = ?').all(req.user.id, 'story', story.id);
                interactions.forEach(i => { userInteractions[i.action] = true; });
            }
            res.json({ story, tags, chapters, characters, userInteractions });
        } catch (err) { res.status(500).json({ error: '獲取故事失敗' }); }
    });

    // ========== 創建故事 ==========
    router.post('/', authMiddleware, (req, res) => {
        try {
            const { title, content, summary, category_id, genre, tone, target_audience, visibility, tags, is_ai_generated, prompt_used, status } = req.body;
            if (!title || !content) return res.status(400).json({ error: '標題和內容為必填' });

            const word_count = content.length;
            const result = db.prepare(`
                INSERT INTO stories (user_id, title, content, summary, category_id, genre, tone, target_audience, visibility, word_count, status, is_ai_generated, prompt_used, published_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${status === 'published' ? 'CURRENT_TIMESTAMP' : 'NULL'})
            `).run(req.user.id, title, content, summary, category_id, genre, tone, target_audience, visibility || 'private', word_count, status || 'draft', is_ai_generated ? 1 : 0, prompt_used);

            if (tags && tags.length > 0) {
                const insertTag = db.prepare('INSERT OR IGNORE INTO tags (name, slug) VALUES (?, ?)');
                const getTag = db.prepare('SELECT id FROM tags WHERE name = ?');
                const linkTag = db.prepare('INSERT OR IGNORE INTO story_tags (story_id, tag_id) VALUES (?, ?)');
                for (const tagName of tags) {
                    insertTag.run(tagName, tagName.toLowerCase().replace(/\s+/g, '-'));
                    const tag = getTag.get(tagName);
                    if (tag) linkTag.run(result.lastInsertRowid, tag.id);
                }
            }
            res.json({ success: true, story_id: result.lastInsertRowid });
        } catch (err) { res.status(500).json({ error: '創建故事失敗：' + err.message }); }
    });

    // ========== 更新故事 ==========
    router.put('/:id', authMiddleware, (req, res) => {
        try {
            const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(req.params.id);
            if (!story) return res.status(404).json({ error: '故事不存在' });
            if (story.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: '無權修改' });

            const { title, content, summary, category_id, genre, tone, target_audience, visibility, status } = req.body;
            const word_count = content ? content.length : story.word_count;

            db.prepare(`
                UPDATE stories SET title=COALESCE(?,title), content=COALESCE(?,content), summary=COALESCE(?,summary),
                category_id=COALESCE(?,category_id), genre=COALESCE(?,genre), tone=COALESCE(?,tone),
                target_audience=COALESCE(?,target_audience), visibility=COALESCE(?,visibility),
                status=COALESCE(?,status), word_count=?, updated_at=CURRENT_TIMESTAMP WHERE id = ?
            `).run(title, content, summary, category_id, genre, tone, target_audience, visibility, status, word_count, req.params.id);

            if (status === 'published' && story.status !== 'published') {
                db.prepare('UPDATE stories SET published_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
            }
            res.json({ success: true });
        } catch (err) { res.status(500).json({ error: '更新失敗' }); }
    });

    // ========== 刪除故事 ==========
    router.delete('/:id', authMiddleware, (req, res) => {
        try {
            const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(req.params.id);
            if (!story) return res.status(404).json({ error: '故事不存在' });
            if (story.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: '無權刪除' });
            db.prepare('DELETE FROM stories WHERE id = ?').run(req.params.id);
            res.json({ success: true });
        } catch (err) { res.status(500).json({ error: '刪除失敗' }); }
    });

    // ========== 互動 ==========
    router.post('/:id/interact', authMiddleware, (req, res) => {
        try {
            const { action } = req.body;
            const existing = db.prepare('SELECT id FROM interactions WHERE user_id=? AND target_type=? AND target_id=? AND action=?').get(req.user.id, 'story', req.params.id, action);
            if (existing) {
                db.prepare('DELETE FROM interactions WHERE id = ?').run(existing.id);
                const f = action === 'like' ? 'like_count' : 'bookmark_count';
                db.prepare(`UPDATE stories SET ${f} = MAX(0, ${f} - 1) WHERE id = ?`).run(req.params.id);
                res.json({ success: true, active: false });
            } else {
                db.prepare('INSERT INTO interactions (user_id, target_type, target_id, action) VALUES (?,?,?,?)').run(req.user.id, 'story', req.params.id, action);
                const f = action === 'like' ? 'like_count' : 'bookmark_count';
                db.prepare(`UPDATE stories SET ${f} = ${f} + 1 WHERE id = ?`).run(req.params.id);
                res.json({ success: true, active: true });
            }
        } catch (err) { res.status(500).json({ error: '操作失敗' }); }
    });

    // ========== 評論 ==========
    router.get('/:id/comments', optionalAuth, (req, res) => {
        try {
            const comments = db.prepare(`
                SELECT c.*, u.username, u.display_name FROM comments c JOIN users u ON c.user_id = u.id
                WHERE c.story_id = ? AND c.status = 'active' ORDER BY c.created_at DESC
            `).all(req.params.id);
            res.json({ comments });
        } catch (err) { res.status(500).json({ error: '獲取評論失敗' }); }
    });

    router.post('/:id/comments', authMiddleware, (req, res) => {
        try {
            const { content } = req.body;
            if (!content) return res.status(400).json({ error: '評論內容不能為空' });
            db.prepare('INSERT INTO comments (user_id, story_id, content) VALUES (?, ?, ?)').run(req.user.id, req.params.id, content);
            res.json({ success: true });
        } catch (err) { res.status(500).json({ error: '發表評論失敗' }); }
    });

    // ========== 章節 ==========
    router.get('/:id/chapters', (req, res) => {
        try {
            const chapters = db.prepare('SELECT * FROM chapters WHERE story_id = ? ORDER BY chapter_number').all(req.params.id);
            res.json({ chapters });
        } catch (err) { res.status(500).json({ error: '獲取章節失敗' }); }
    });

    router.post('/:id/chapters', authMiddleware, (req, res) => {
        try {
            const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(req.params.id);
            if (!story) return res.status(404).json({ error: '故事不存在' });
            if (story.user_id !== req.user.id) return res.status(403).json({ error: '無權操作' });

            const { title, content } = req.body;
            if (!title || !content) return res.status(400).json({ error: '標題和內容為必填' });

            const maxNum = db.prepare('SELECT MAX(chapter_number) as max FROM chapters WHERE story_id = ?').get(req.params.id);
            const nextNum = (maxNum?.max || 0) + 1;
            const word_count = content.length;

            const result = db.prepare('INSERT INTO chapters (story_id, title, content, chapter_number, word_count) VALUES (?, ?, ?, ?, ?)').run(req.params.id, title, content, nextNum, word_count);

            // Update story word count
            db.prepare('UPDATE stories SET word_count = word_count + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(word_count, req.params.id);

            res.json({ success: true, chapter_id: result.lastInsertRowid, chapter_number: nextNum });
        } catch (err) { res.status(500).json({ error: '創建章節失敗' }); }
    });

    router.put('/:storyId/chapters/:chapterId', authMiddleware, (req, res) => {
        try {
            const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(req.params.storyId);
            if (!story || story.user_id !== req.user.id) return res.status(403).json({ error: '無權操作' });

            const { title, content } = req.body;
            const old = db.prepare('SELECT word_count FROM chapters WHERE id = ? AND story_id = ?').get(req.params.chapterId, req.params.storyId);
            if (!old) return res.status(404).json({ error: '章節不存在' });

            const newWC = content ? content.length : old.word_count;
            db.prepare('UPDATE chapters SET title=COALESCE(?,title), content=COALESCE(?,content), word_count=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(title, content, newWC, req.params.chapterId);

            // Adjust story word count
            const diff = newWC - old.word_count;
            if (diff !== 0) db.prepare('UPDATE stories SET word_count = word_count + ? WHERE id = ?').run(diff, req.params.storyId);

            res.json({ success: true });
        } catch (err) { res.status(500).json({ error: '更新章節失敗' }); }
    });

    router.delete('/:storyId/chapters/:chapterId', authMiddleware, (req, res) => {
        try {
            const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(req.params.storyId);
            if (!story || story.user_id !== req.user.id) return res.status(403).json({ error: '無權操作' });

            const chapter = db.prepare('SELECT word_count FROM chapters WHERE id = ? AND story_id = ?').get(req.params.chapterId, req.params.storyId);
            if (!chapter) return res.status(404).json({ error: '章節不存在' });

            db.prepare('DELETE FROM chapters WHERE id = ?').run(req.params.chapterId);
            db.prepare('UPDATE stories SET word_count = MAX(0, word_count - ?) WHERE id = ?').run(chapter.word_count, req.params.storyId);

            res.json({ success: true });
        } catch (err) { res.status(500).json({ error: '刪除章節失敗' }); }
    });

    // ========== 角色 ==========
    router.get('/:id/characters', (req, res) => {
        try {
            const characters = db.prepare('SELECT * FROM characters WHERE story_id = ?').all(req.params.id);
            res.json({ characters });
        } catch (err) { res.status(500).json({ error: '獲取角色失敗' }); }
    });

    router.post('/:id/characters', authMiddleware, (req, res) => {
        try {
            const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(req.params.id);
            if (!story || story.user_id !== req.user.id) return res.status(403).json({ error: '無權操作' });

            const { name, role, description, appearance, personality, backstory } = req.body;
            if (!name) return res.status(400).json({ error: '角色名稱為必填' });

            const result = db.prepare('INSERT INTO characters (story_id, name, role, description, appearance, personality, backstory) VALUES (?,?,?,?,?,?,?)').run(req.params.id, name, role, description, appearance, personality, backstory);
            res.json({ success: true, character_id: result.lastInsertRowid });
        } catch (err) { res.status(500).json({ error: '創建角色失敗' }); }
    });

    router.put('/:storyId/characters/:characterId', authMiddleware, (req, res) => {
        try {
            const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(req.params.storyId);
            if (!story || story.user_id !== req.user.id) return res.status(403).json({ error: '無權操作' });

            const { name, role, description, appearance, personality, backstory } = req.body;
            db.prepare('UPDATE characters SET name=COALESCE(?,name), role=COALESCE(?,role), description=COALESCE(?,description), appearance=COALESCE(?,appearance), personality=COALESCE(?,personality), backstory=COALESCE(?,backstory) WHERE id=? AND story_id=?')
                .run(name, role, description, appearance, personality, backstory, req.params.characterId, req.params.storyId);
            res.json({ success: true });
        } catch (err) { res.status(500).json({ error: '更新角色失敗' }); }
    });

    router.delete('/:storyId/characters/:characterId', authMiddleware, (req, res) => {
        try {
            const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(req.params.storyId);
            if (!story || story.user_id !== req.user.id) return res.status(403).json({ error: '無權操作' });
            db.prepare('DELETE FROM characters WHERE id = ? AND story_id = ?').run(req.params.characterId, req.params.storyId);
            res.json({ success: true });
        } catch (err) { res.status(500).json({ error: '刪除角色失敗' }); }
    });

    // ========== 元數據 ==========
    router.get('/meta/categories', (req, res) => {
        res.json({ categories: db.prepare('SELECT * FROM categories ORDER BY sort_order').all() });
    });

    router.get('/meta/tags', (req, res) => {
        res.json({ tags: db.prepare('SELECT * FROM tags ORDER BY usage_count DESC LIMIT 30').all() });
    });

    return router;
};
