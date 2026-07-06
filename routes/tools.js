const express = require('express');
const { authMiddleware, optionalAuth } = require('../middleware/auth');

module.exports = function(db) {
    const router = express.Router();

    // ==========================================
    // 故事模板
    // ==========================================
    router.get('/story-templates', (req, res) => {
        try {
            const { difficulty, genre } = req.query;
            let where = ['is_public = 1']; let params = [];
            if (difficulty) { where.push('difficulty = ?'); params.push(difficulty); }
            if (genre) { where.push('genre = ?'); params.push(genre); }
            const templates = db.prepare(`
                SELECT st.*, c.name as category_name, c.icon as category_icon
                FROM story_templates st LEFT JOIN categories c ON st.category_id = c.id
                WHERE ${where.join(' AND ')} ORDER BY usage_count DESC
            `).all(...params);
            res.json({ templates });
        } catch (err) { res.status(500).json({ error: '獲取模板失敗' }); }
    });

    router.get('/story-templates/:id', (req, res) => {
        try {
            const template = db.prepare(`
                SELECT st.*, c.name as category_name FROM story_templates st
                LEFT JOIN categories c ON st.category_id = c.id WHERE st.id = ?
            `).get(req.params.id);
            if (!template) return res.status(404).json({ error: '模板不存在' });
            db.prepare('UPDATE story_templates SET usage_count = usage_count + 1 WHERE id = ?').run(req.params.id);
            res.json({ template });
        } catch (err) { res.status(500).json({ error: '獲取模板失敗' }); }
    });

    // ==========================================
    // 寫作提示/每日靈感
    // ==========================================
    router.get('/writing-prompts', (req, res) => {
        try {
            const { type, genre, limit = 10 } = req.query;
            let where = ['1=1']; let params = [];
            if (type) { where.push('prompt_type = ?'); params.push(type); }
            if (genre) { where.push('(genre = ? OR genre = "通用")'); params.push(genre); }
            const prompts = db.prepare(`SELECT * FROM writing_prompts WHERE ${where.join(' AND ')} ORDER BY RANDOM() LIMIT ?`).all(...params, parseInt(limit));
            res.json({ prompts });
        } catch (err) { res.status(500).json({ error: '獲取寫作提示失敗' }); }
    });

    router.get('/writing-prompts/random', (req, res) => {
        try {
            const { count = 5 } = req.query;
            const prompts = db.prepare('SELECT * FROM writing_prompts ORDER BY RANDOM() LIMIT ?').all(parseInt(count));
            res.json({ prompts });
        } catch (err) { res.status(500).json({ error: '獲取提示失敗' }); }
    });

    // ==========================================
    // 閱讀清單
    // ==========================================
    router.get('/reading-lists', authMiddleware, (req, res) => {
        try {
            const lists = db.prepare(`
                SELECT rl.*, COUNT(rli.id) as item_count
                FROM reading_lists rl LEFT JOIN reading_list_items rli ON rl.id = rli.list_id
                WHERE rl.user_id = ? GROUP BY rl.id ORDER BY rl.created_at DESC
            `).all(req.user.id);
            res.json({ lists });
        } catch (err) { res.status(500).json({ error: '獲取閱讀清單失敗' }); }
    });

    router.post('/reading-lists', authMiddleware, (req, res) => {
        try {
            const { name, description } = req.body;
            const result = db.prepare('INSERT INTO reading_lists (user_id, name, description) VALUES (?, ?, ?)').run(req.user.id, name || '新閱讀清單', description);
            res.json({ success: true, list_id: result.lastInsertRowid });
        } catch (err) { res.status(500).json({ error: '創建失敗' }); }
    });

    router.get('/reading-lists/:id', authMiddleware, (req, res) => {
        try {
            const list = db.prepare('SELECT * FROM reading_lists WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
            if (!list) return res.status(404).json({ error: '清單不存在' });
            const items = db.prepare(`
                SELECT rli.*, s.title, s.summary, s.genre, s.view_count, s.like_count, u.username, u.display_name,
                c.name as category_name, c.icon as category_icon
                FROM reading_list_items rli
                JOIN stories s ON rli.story_id = s.id
                JOIN users u ON s.user_id = u.id
                LEFT JOIN categories c ON s.category_id = c.id
                WHERE rli.list_id = ? ORDER BY rli.added_at DESC
            `).all(req.params.id);
            res.json({ list, items });
        } catch (err) { res.status(500).json({ error: '獲取清單失敗' }); }
    });

    router.post('/reading-lists/:id/items', authMiddleware, (req, res) => {
        try {
            const { story_id } = req.body;
            const list = db.prepare('SELECT * FROM reading_lists WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
            if (!list) return res.status(404).json({ error: '清單不存在' });
            db.prepare('INSERT OR IGNORE INTO reading_list_items (list_id, story_id) VALUES (?, ?)').run(req.params.id, story_id);
            res.json({ success: true });
        } catch (err) { res.status(500).json({ error: '添加失敗' }); }
    });

    router.delete('/reading-lists/:listId/items/:storyId', authMiddleware, (req, res) => {
        try {
            db.prepare('DELETE FROM reading_list_items WHERE list_id = ? AND story_id = ?').run(req.params.listId, req.params.storyId);
            res.json({ success: true });
        } catch (err) { res.status(500).json({ error: '移除失敗' }); }
    });

    router.delete('/reading-lists/:id', authMiddleware, (req, res) => {
        try {
            db.prepare('DELETE FROM reading_lists WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
            res.json({ success: true });
        } catch (err) { res.status(500).json({ error: '刪除失敗' }); }
    });

    // ==========================================
    // 故事版本歷史
    // ==========================================
    router.get('/stories/:id/versions', authMiddleware, (req, res) => {
        try {
            const versions = db.prepare('SELECT * FROM story_versions WHERE story_id = ? ORDER BY version_number DESC').all(req.params.id);
            res.json({ versions });
        } catch (err) { res.status(500).json({ error: '獲取版本失敗' }); }
    });

    router.post('/stories/:id/versions', authMiddleware, (req, res) => {
        try {
            const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(req.params.id);
            if (!story || story.user_id !== req.user.id) return res.status(403).json({ error: '無權操作' });

            const maxVer = db.prepare('SELECT MAX(version_number) as max FROM story_versions WHERE story_id = ?').get(req.params.id);
            const nextVer = (maxVer?.max || 0) + 1;

            db.prepare('INSERT INTO story_versions (story_id, version_number, title, content, summary, change_note) VALUES (?,?,?,?,?,?)')
                .run(req.params.id, nextVer, story.title, story.content, story.summary, req.body.change_note || `版本 ${nextVer}`);
            res.json({ success: true, version_number: nextVer });
        } catch (err) { res.status(500).json({ error: '保存版本失敗' }); }
    });

    router.post('/stories/:id/versions/:versionId/restore', authMiddleware, (req, res) => {
        try {
            const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(req.params.id);
            if (!story || story.user_id !== req.user.id) return res.status(403).json({ error: '無權操作' });

            const version = db.prepare('SELECT * FROM story_versions WHERE id = ? AND story_id = ?').get(req.params.versionId, req.params.id);
            if (!version) return res.status(404).json({ error: '版本不存在' });

            // Save current as new version first
            const maxVer = db.prepare('SELECT MAX(version_number) as max FROM story_versions WHERE story_id = ?').get(req.params.id);
            db.prepare('INSERT INTO story_versions (story_id, version_number, title, content, summary, change_note) VALUES (?,?,?,?,?,?)')
                .run(req.params.id, (maxVer?.max || 0) + 1, story.title, story.content, story.summary, '自動備份（恢復前）');

            // Restore
            db.prepare('UPDATE stories SET title=?, content=?, summary=?, updated_at=CURRENT_TIMESTAMP WHERE id=?')
                .run(version.title, version.content, version.summary, req.params.id);
            res.json({ success: true });
        } catch (err) { res.status(500).json({ error: '恢復版本失敗' }); }
    });

    // ==========================================
    // 導出功能
    // ==========================================
    router.get('/stories/:id/export', (req, res) => {
        try {
            const { format = 'txt' } = req.query;
            const story = db.prepare(`
                SELECT s.*, u.display_name as author_name FROM stories s JOIN users u ON s.user_id = u.id WHERE s.id = ?
            `).get(req.params.id);
            if (!story) return res.status(404).json({ error: '故事不存在' });

            const chapters = db.prepare('SELECT * FROM chapters WHERE story_id = ? ORDER BY chapter_number').all(req.params.id);
            const characters = db.prepare('SELECT * FROM characters WHERE story_id = ?').all(req.params.id);

            if (format === 'txt') {
                let txt = `═══════════════════════════════════════\n`;
                txt += `  ${story.title}\n`;
                txt += `  作者：${story.author_name}\n`;
                txt += `  類型：${story.genre || '-'}\n`;
                txt += `═══════════════════════════════════════\n\n`;
                if (story.summary) txt += `【簡介】\n${story.summary}\n\n`;
                if (characters.length > 0) {
                    txt += `【角色】\n`;
                    characters.forEach(ch => {
                        txt += `  ${ch.name}${ch.role ? `（${ch.role}）` : ''}\n`;
                        if (ch.description) txt += `    ${ch.description}\n`;
                    });
                    txt += `\n`;
                }
                txt += `【正文】\n\n`;
                if (chapters.length > 0) {
                    chapters.forEach(ch => {
                        txt += `── 第${ch.chapter_number}章：${ch.title} ──\n\n`;
                        txt += `${ch.content}\n\n`;
                    });
                } else {
                    txt += story.content;
                }
                txt += `\n═══════════════════════════════════════\n`;
                txt += `  由 StoryForge AI 生成\n`;
                txt += `  ${new Date().toLocaleString('zh-TW')}\n`;
                txt += `═══════════════════════════════════════\n`;

                res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(story.title)}.txt"`);
                res.send(txt);
            } else if (format === 'json') {
                const data = {
                    title: story.title,
                    author: story.author_name,
                    genre: story.genre,
                    tone: story.tone,
                    summary: story.summary,
                    content: story.content,
                    characters: characters.map(c => ({ name: c.name, role: c.role, description: c.description })),
                    chapters: chapters.map(ch => ({ number: ch.chapter_number, title: ch.title, content: ch.content })),
                    exported_at: new Date().toISOString(),
                    platform: 'StoryForge AI'
                };
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(story.title)}.json"`);
                res.json(data);
            } else {
                res.status(400).json({ error: '支援格式：txt, json' });
            }
        } catch (err) { res.status(500).json({ error: '導出失敗' }); }
    });

    // ==========================================
    // 用戶偏好設定
    // ==========================================
    router.get('/preferences', authMiddleware, (req, res) => {
        try {
            let prefs = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(req.user.id);
            if (!prefs) {
                db.prepare('INSERT INTO user_preferences (user_id) VALUES (?)').run(req.user.id);
                prefs = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(req.user.id);
            }
            res.json({ preferences: prefs });
        } catch (err) { res.status(500).json({ error: '獲取偏好失敗' }); }
    });

    router.put('/preferences', authMiddleware, (req, res) => {
        try {
            const { theme, font_size, editor_font, language, email_notifications, auto_save } = req.body;
            db.prepare(`INSERT INTO user_preferences (user_id, theme, font_size, editor_font, language, email_notifications, auto_save)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(user_id) DO UPDATE SET
                    theme=COALESCE(?,theme), font_size=COALESCE(?,font_size), editor_font=COALESCE(?,editor_font),
                    language=COALESCE(?,language), email_notifications=COALESCE(?,email_notifications),
                    auto_save=COALESCE(?,auto_save), updated_at=CURRENT_TIMESTAMP
            `).run(req.user.id, theme, font_size, editor_font, language, email_notifications, auto_save,
                   theme, font_size, editor_font, language, email_notifications, auto_save);
            res.json({ success: true });
        } catch (err) { res.status(500).json({ error: '更新偏好失敗' }); }
    });

    // ==========================================
    // 名字生成器
    // ==========================================
    router.post('/generate-names', optionalAuth, (req, res) => {
        try {
            const { name_type = 'character', genre = 'fantasy', count = 8, gender, style } = req.body;

            // 名字庫
            const nameDatabase = {
                character: {
                    fantasy: {
                        male: ['艾瑞克', '凱爾', '雷恩', '亞瑟', '加文', '奧斯卡', '馬庫斯', '西蒙', '菲利普', '尼古拉斯', '伊森', '盧卡斯', '塞巴斯蒂安', '奧利弗', '亞歷山大'],
                        female: ['艾琳娜', '莉莉安', '索菲亞', '伊莎貝拉', '奧羅拉', '塞萊斯特', '維多利亞', '阿麗亞娜', '伊芙琳', '夏洛特', '斯嘉麗', '羅莎琳德', '伊莫金', '菲歐娜', '海倫娜'],
                        neutral: ['亞歷克斯', '摩根', '泰勒', '喬丹', '奎因', '賽奇', '阿里', '諾瓦', '瑞恩', '斯凱']
                    },
                    'sci-fi': {
                        male: ['諾克斯', '澤恩', '凱德', '萊德', '阿斯特', '奧里昂', '諾瓦', '尼克斯', '維克托', '馬克西姆斯', '賽勒斯', '戴克斯', '阿波羅', '赫爾墨斯', '普羅米修斯'],
                        female: ['諾瓦', '盧娜', '阿斯特拉', '維加', '卡西歐佩亞', '安德洛墨達', '尼克斯', '塞勒涅', '奧羅拉', '伊卡洛斯', '尼奧比', '菲比', '泰坦尼亞', '歐若拉', '斯塔拉'],
                        neutral: ['零', '量子', '位元', '脈衝', '光速', '星塵', '暗物質', '奇點', '波函數', '超新星']
                    },
                    martial: {
                        male: ['沈青鋒', '葉無雙', '楚天行', '蕭逸風', '林劍心', '韓鐵衣', '趙雲龍', '秦霜', '白玉堂', '慕容劍', '獨孤求敗', '令狐沖', '張無忌', '喬峰', '楊過'],
                        female: ['小龍女', '趙敏', '黃蓉', '王語嫣', '任盈盈', '周芷若', '岳靈珊', '阿朱', '阿紫', '木婉清', '程靈素', '袁紫衣', '霍青桐', '香香公主', '李莫愁'],
                        neutral: ['無名', '逍遙子', '風清揚', '掃地僧', '獨孤劍', '天山童姥', '東方不敗', '任我行', '向問天', '左冷禪']
                    },
                    modern: {
                        male: ['陳宇軒', '林浩然', '張子豪', '王俊傑', '劉天佑', '趙明哲', '周子恆', '吳思遠', '黃文傑', '李志偉', '鄭凱文', '孫逸飛', '楊啟航', '許景行', '馬天成'],
                        female: ['林詩涵', '陳雨萱', '張芷晴', '王心怡', '劉語嫣', '趙雅芝', '周若曦', '吳夢琪', '黃思穎', '李佳穎', '鄭曉薇', '孫藝珊', '楊紫萱', '許舒寧', '馬晨曦'],
                        neutral: ['子軒', '思遠', '雨澤', '晨曦', '若溪', '清風', '明月', '星河', '天涯', '歸雲']
                    }
                },
                place: {
                    fantasy: ['龍脊山脈', '銀月森林', '永夜城', '星辰湖', '迷霧谷', '風暴海', '水晶洞穴', '天空之城', '幽暗深淵', '翡翠平原', '龍焰火山', '冰封王座', '精靈之泉', '矮人堡壘', '亡者之地'],
                    'sci-fi': ['新東京', '火星基地', '深空站', '量子城', '賽博區', '太空港', '暗物質帶', '銀河中心', '時間裂隙', '維度走廊', '超光速航道', '人工行星', '戴森球', '星際堡壘', '蟲洞樞紐'],
                    martial: ['龍門客棧', '逍遙谷', '華山之巔', '少林寺', '武當山', '峨眉金頂', '光明頂', '絕情谷', '桃花島', '終南山', '崑崙山', '天山', '嵩山', '衡山', '泰山'],
                    modern: ['望京SOHO', '陸家嘴', '銅鑼灣', '西門町', '南京路', '春熙路', '三里屯', '太古里', '環球港', '時代廣場']
                },
                organization: {
                    fantasy: ['銀月騎士團', '暗影公會', '元素法師塔', '龍騎士聯盟', '傭兵協會', '精靈長老會', '矮人鐵匠鋪', '亡靈法師團', '光明教會', '黑暗議會'],
                    'sci-fi': ['銀河聯盟', '量子集團', '星際貿易公會', 'AI倫理委員會', '深空探索隊', '時間管理局', '維度研究所', '暗物質公司', '超光速工業', '人工意識法庭'],
                    martial: ['武林盟', '丐幫', '少林派', '武當派', '峨眉派', '明教', '日月神教', '天地會', '紅花會', '天地盟'],
                    modern: ['星辰科技', '未來傳媒', '環球投資', '新世界集團', '藍海基金', '銀河資本', '量子創投', '深藍實驗室', '光年工作室', '無限可能公司']
                },
                item: {
                    fantasy: ['聖劍·黎明', '暗影匕首', '龍鱗盾', '鳳凰之羽', '精靈之弓', '矮人戰斧', '魔法水晶球', '時間沙漏', '隱身斗篷', '飛行靴', '生命之書', '死亡之鐮', '智慧王冠', '力量戒指', '守護項鍊'],
                    'sci-fi': ['量子槍', '納米刀', '反物質炸彈', '全息投影器', '神經接口', '空間摺疊器', '時間機器', '隱形力場', '等離子劍', '引力波發生器', '暗能量電池', '超光速引擎', '記憶讀取器', '意識轉移裝置', '維度跳躍器'],
                }
            };

            const typeData = nameDatabase[name_type] || nameDatabase.character;
            const genreData = typeData[genre] || typeData.fantasy || Object.values(typeData)[0];

            let pool;
            if (name_type === 'character') {
                pool = genreData[gender || 'male'] || genreData.male || genreData.neutral || [];
            } else {
                pool = Array.isArray(genreData) ? genreData : Object.values(genreData)[0] || [];
            }

            // Shuffle and pick
            const shuffled = [...pool].sort(() => Math.random() - 0.5);
            const selected = shuffled.slice(0, Math.min(count, pool.length));

            // Save to history
            if (req.user) {
                db.prepare('INSERT INTO name_generator_history (user_id, name_type, genre, generated_names, parameters) VALUES (?,?,?,?,?)')
                    .run(req.user.id, name_type, genre, JSON.stringify(selected), JSON.stringify(req.body));
            }

            res.json({ names: selected, type: name_type, genre });
        } catch (err) { res.status(500).json({ error: '生成名字失敗：' + err.message }); }
    });

    // ==========================================
    // 故事數據分析
    // ==========================================
    router.get('/stories/:id/analytics', optionalAuth, (req, res) => {
        try {
            const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(req.params.id);
            if (!story) return res.status(404).json({ error: '故事不存在' });

            const comments = db.prepare('SELECT COUNT(*) as c FROM comments WHERE story_id = ?').get(req.params.id).c;
            const likes = story.like_count;
            const views = story.view_count;
            const bookmarks = db.prepare("SELECT COUNT(*) as c FROM interactions WHERE target_type='story' AND target_id=? AND action='bookmark'").get(req.params.id).c;

            // Engagement rate
            const engagementRate = views > 0 ? ((likes + comments) / views * 100).toFixed(1) : 0;

            // Word count per chapter
            const chapterStats = db.prepare('SELECT chapter_number, title, word_count FROM chapters WHERE story_id = ? ORDER BY chapter_number').all(req.params.id);

            // Rating distribution (based on likes vs views)
            const likeRate = views > 0 ? (likes / views * 100).toFixed(1) : 0;

            res.json({
                story_id: story.id,
                title: story.title,
                stats: {
                    views, likes, comments, bookmarks,
                    word_count: story.word_count,
                    engagement_rate: parseFloat(engagementRate),
                    like_rate: parseFloat(likeRate),
                    chapter_count: chapterStats.length,
                    character_count: db.prepare('SELECT COUNT(*) as c FROM characters WHERE story_id = ?').get(req.params.id).c,
                    created_at: story.created_at,
                    published_at: story.published_at,
                    last_updated: story.updated_at
                },
                chapter_stats: chapterStats,
                status: story.status,
                is_ai_generated: story.is_ai_generated
            });
        } catch (err) { res.status(500).json({ error: '獲取分析失敗' }); }
    });

    // ==========================================
    // AI續寫
    // ==========================================
    router.post('/stories/:id/continue', authMiddleware, (req, res) => {
        try {
            const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(req.params.id);
            if (!story) return res.status(404).json({ error: '故事不存在' });
            if (story.user_id !== req.user.id) return res.status(403).json({ error: '無權操作' });

            const { direction, length = 500 } = req.body;

            // Get last few sentences for context
            const content = story.content;
            const lastPart = content.slice(-300);

            // Generate continuation based on genre and tone
            const continuations = {
                '科幻': [
                    '\n\n就在這時，一道刺眼的藍光從遠處射來，將整個空間照亮。那光芒中似乎蘊含著某種訊息，某種古老的、超越人類理解的智慧。',
                    '\n\n飛船的警報系統突然響起。儀表盤上的數據開始瘋狂跳動，所有的物理常數似乎都在這一刻失去了意義。',
                    '\n\n「你不覺得奇怪嗎？」她指著螢幕上的數據，「這個信號的頻率...它在回應我們的想法。」'
                ],
                '武俠': [
                    '\n\n月光下，一道劍影劃破長空。那劍快得驚人，彷彿連空氣都被劈成了兩半。',
                    '\n\n「好劍法！」一個蒼老的聲音從黑暗中傳來。沈青鋒猛然轉身，卻發現身後空無一人。',
                    '\n\n他握緊了手中的劍。劍身微微顫動，彷彿在回應主人的殺意。'
                ],
                '懸疑': [
                    '\n\n門後的黑暗像一張巨大的嘴，等待著吞噬一切。蘇明打開了手電筒，光柱刺入黑暗，照亮了一個令人窒息的場景。',
                    '\n\n他注意到了一個細節——一個所有人都忽略的細節。那個細節，將徹底改變案件的走向。',
                    '\n\n「等等，」他突然停下腳步，「我們一直都搞錯了。這不是密室殺人...這是自殺。一場精心偽裝的自殺。」'
                ],
                'default': [
                    '\n\n時間在這一刻彷彿凝固了。所有的聲音都消失了，只剩下心跳的迴響。',
                    '\n\n她深吸一口氣，做出了那個改變一切的決定。',
                    '\n\n遠處傳來了鐘聲。那鐘聲像是在提醒什麼，又像是在告別什麼。'
                ]
            };

            const genreKey = Object.keys(continuations).find(k => (story.genre || '').includes(k)) || 'default';
            const options = continuations[genreKey];
            const continuation = options[Math.floor(Math.random() * options.length)];

            res.json({
                continuation,
                context: lastPart,
                suggestion: '你可以將續寫內容添加到故事末尾，或根據需要修改後使用。'
            });
        } catch (err) { res.status(500).json({ error: '續寫失敗' }); }
    });

    // ==========================================
    // 故事評分
    // ==========================================
    router.post('/stories/:id/rate', authMiddleware, (req, res) => {
        try {
            const { rating } = req.body;
            if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: '評分範圍 1-5' });

            // Use interactions table to store ratings
            const existing = db.prepare("SELECT id FROM interactions WHERE user_id=? AND target_type='story' AND target_id=? AND action='rate'").get(req.user.id, req.params.id);
            if (existing) {
                db.prepare("UPDATE interactions SET created_at=CURRENT_TIMESTAMP WHERE id=?").run(existing.id);
            } else {
                db.prepare("INSERT INTO interactions (user_id, target_type, target_id, action) VALUES (?,?,?,'rate')").run(req.user.id, 'story', req.params.id);
            }
            res.json({ success: true, rating });
        } catch (err) { res.status(500).json({ error: '評分失敗' }); }
    });

    return router;
};
