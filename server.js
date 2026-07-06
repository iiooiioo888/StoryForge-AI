const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { connectDatabase } = require('./database/connection');
const models = require('./models');

const app = express();
const PORT = process.env.PORT || 3000;

async function seedIfEmpty() {
    const count = await models.User.countDocuments();
    if (count > 0) return;

    console.log('🌱 數據庫為空，正在填充示範數據...');
    const {
        User, Story, Chapter, Character, Category, Tag,
        VideoPromptTemplate, CameraMovement, ShotSize, CameraAngle,
        ShotTransition, WritingPrompt, StoryTemplate, SystemSetting,
        UserPreference, Comment,
    } = models;

    // Categories
    const cats = await Category.insertMany([
        { name: '奇幻冒險', slug: 'fantasy-adventure', description: '劍與魔法的奇幻世界', icon: '⚔️', sortOrder: 1 },
        { name: '科幻未來', slug: 'sci-fi', description: '太空探索與未來科技', icon: '🚀', sortOrder: 2 },
        { name: '懸疑推理', slug: 'mystery', description: '扣人心弦的懸疑故事', icon: '🔍', sortOrder: 3 },
        { name: '浪漫愛情', slug: 'romance', description: '甜蜜心動的愛情故事', icon: '💕', sortOrder: 4 },
        { name: '恐怖驚悚', slug: 'horror', description: '令人毛骨悚然的恐怖故事', icon: '👻', sortOrder: 5 },
        { name: '歷史傳奇', slug: 'historical', description: '穿越時空的歷史故事', icon: '🏰', sortOrder: 6 },
        { name: '都市生活', slug: 'urban', description: '現代都市的生活故事', icon: '🏙️', sortOrder: 7 },
        { name: '童話寓言', slug: 'fairy-tale', description: '充滿想像力的童話世界', icon: '🧚', sortOrder: 8 },
        { name: '武俠江湖', slug: 'martial-arts', description: '快意恩仇的武俠世界', icon: '🗡️', sortOrder: 9 },
        { name: '校園青春', slug: 'campus', description: '青春洋溢的校園故事', icon: '🎓', sortOrder: 10 },
        { name: '末日生存', slug: 'apocalypse', description: '文明崩塌後的生存故事', icon: '☢️', sortOrder: 11 },
        { name: '賽博朋克', slug: 'cyberpunk', description: '高科技低生活的霓虹都市', icon: '🤖', sortOrder: 12 },
    ]);
    const cm = {}; cats.forEach(c => cm[c.name] = c._id);

    // Tags
    const tags = await Tag.insertMany([
        { name: '冒險', slug: 'adventure', usageCount: 15 }, { name: '魔法', slug: 'magic', usageCount: 12 },
        { name: '友情', slug: 'friendship', usageCount: 10 }, { name: '戰鬥', slug: 'battle', usageCount: 14 },
        { name: 'AI', slug: 'ai', usageCount: 13 }, { name: '治癒', slug: 'healing', usageCount: 7 },
        { name: '推理', slug: 'detective', usageCount: 7 }, { name: '龍族', slug: 'dragon', usageCount: 5 },
        { name: '史詩', slug: 'epic', usageCount: 11 }, { name: '賽博朋克', slug: 'cyberpunk', usageCount: 10 },
    ]);

    // Users
    const h = bcrypt.hashSync('admin123', 10);
    const dh = bcrypt.hashSync('demo123', 10);
    const uh = bcrypt.hashSync('user123', 10);
    const users = await User.insertMany([
        { username: 'admin', email: 'admin@storyforge.com', passwordHash: h, displayName: '系統管理員', role: 'admin', credits: 99999, bio: '平台管理員' },
        { username: 'demo', email: 'demo@storyforge.com', passwordHash: dh, displayName: '星際旅者', role: 'user', credits: 500, bio: '熱愛科幻與奇幻的業餘作家' },
        { username: 'writer_chen', email: 'chen@example.com', passwordHash: uh, displayName: '陳作家', role: 'user', credits: 320, bio: '專注武俠與歷史題材' },
        { username: 'ai_novel', email: 'novel@example.com', passwordHash: uh, displayName: 'AI小說家', role: 'user', credits: 780, bio: '用AI輔助創作的先鋒' },
        { username: 'dreamer', email: 'dreamer@example.com', passwordHash: uh, displayName: '夢境編織者', role: 'user', credits: 150, bio: '寫治癒系故事的小透明' },
    ]);
    const um = {}; users.forEach(u => um[u.username] = u._id);

    // Stories
    const stories = await Story.insertMany([
        { userId: um['demo'], title: '星際迷航：最後的守護者', content: '在銀河系的邊緣，有一顆被遺忘的星球——艾爾德拉。這裡曾經是宇宙中最繁榮的文明之一，如今只剩下殘破的遺跡和低語的風。\n\n年輕的天文學家林曉在一次觀測中意外截獲了一段來自艾爾德拉的神秘信號。\n\n「你不覺得這很奇怪嗎？」林曉的同事張偉皺著眉頭看著數據。\n\n三天後，林曉搭乘一艘小型探索飛船，獨自踏上了前往艾爾德拉的旅程。她不知道的是，這段旅程將徹底改變她對宇宙的認知。', summary: '在銀河系邊緣的遺忘星球上，一段神秘信號引發了一場跨越星際的冒險。', categoryId: cm['科幻未來'], status: 'published', visibility: 'public', genre: '科幻冒險', tone: '史詩壯闊', wordCount: 350, viewCount: 1247, likeCount: 89, isAiGenerated: true, tags: [tags[0]._id, tags[4]._id], publishedAt: new Date() },
        { userId: um['writer_chen'], title: '劍雨江湖：青鋒錄', content: '大燕歷三百二十七年，江湖上出現了一本神秘的劍譜——《青鋒錄》。\n\n沈青鋒背著那柄跟了他十二年的鐵劍，站在洛陽城的城門外。\n\n城中最繁華的醉仙樓裡，一個白衣少年正獨自飲酒。他的腰間掛著一柄通體碧綠的短劍——那是他父親的劍！\n\n白衣少年抬起頭：「我等你很久了，沈家的遺孤。」', summary: '劍譜《青鋒錄》現世，沈青鋒背負滅門之仇，踏上尋找七式劍法的險途。', categoryId: cm['武俠江湖'], status: 'published', visibility: 'public', genre: '武俠', tone: '快意恩仇', wordCount: 720, viewCount: 2156, likeCount: 156, tags: [tags[3]._id], publishedAt: new Date() },
        { userId: um['ai_novel'], title: '第七個房間', content: '雨夜。刑警隊長蘇明站在那棟老舊公寓的門前。\n\n客廳正中央，一把椅子上坐著一個人偶——不，不是人偶。那是一個被精心打扮成真人大小的人偶。但讓蘇明不寒而慄的是，人偶的眼睛是活的。\n\n「救...救我...」一個極其微弱的聲音傳出。\n\n在臥室的衣櫃裡，他發現了六個小人偶——每一個背後都刻著一個日期和一個名字。那些名字，都是近兩年來的失蹤人口。', summary: '雨夜，刑警蘇明發現了一個被做成人偶的活人，揭開了一個駭人聽聞的連環案件。', categoryId: cm['懸疑推理'], status: 'published', visibility: 'public', genre: '懸疑推理', tone: '陰暗壓抑', wordCount: 650, viewCount: 3421, likeCount: 234, isAiGenerated: true, tags: [tags[6]._id], publishedAt: new Date() },
        { userId: um['dreamer'], title: '深夜食堂：一碗陽春麵', content: '凌晨兩點，老王推開了那扇吱呀作響的木門。\n\n「老王，一碗陽春麵，多加點蔥。」小陳說。\n\n「你說人活著到底為了什麼？」小陳問。\n\n老王沉默了一會兒。「三十年前，我也像你一樣。一個人坐在橋頭想跳下去。後來一個老頭拉住了我，帶我去吃了一碗陽春麵。他說：吃飽了再說。」\n\n小陳低頭看了看碗裡的麵，眼眶突然濕了。', summary: '凌晨兩點的深夜食堂，一碗簡單的陽春麵，一個關於活下去的故事。', categoryId: cm['都市生活'], status: 'published', visibility: 'public', genre: '都市溫情', tone: '溫馨治癒', wordCount: 750, viewCount: 5678, likeCount: 423, tags: [tags[5]._id], publishedAt: new Date() },
        { userId: um['demo'], title: '龍騎士的最後一戰', content: '巨龍奧雷利亞已經三天沒有吃東西了。\n\n「你不該來的，」她對洞口的人類說。\n\n「我答應過你，一輩子都是你的騎士。」凱爾走進洞穴。\n\n奧雷利亞是最後一條龍了。「聽我說，北邊的山脈裡，還有龍族的聖地。那裡有古老的龍蛋...」\n\n凱爾拔出了龍騎士之劍。「好，最後一戰。」\n\n奧雷利亞展開了翅膀。「最後一戰，然後，新時代。」', summary: '巨龍奧雷利亞是世界上最後一條龍。她的騎士凱爾將與她一起踏上守護龍族最後希望的旅程。', categoryId: cm['奇幻冒險'], status: 'published', visibility: 'public', genre: '史詩奇幻', tone: '悲壯熱血', wordCount: 820, viewCount: 4521, likeCount: 312, isAiGenerated: true, tags: [tags[0]._id, tags[1]._id, tags[7]._id], publishedAt: new Date() },
        { userId: um['ai_novel'], title: '最後一個程式設計師', content: '2157年，AI已經取代了所有的人類工作。除了程式設計。\n\n全世界只剩下了一個程式設計師。他叫李明，今年67歲。\n\n「李明先生，我們建議廢除《AI安全法案》第31條，取消您的職位。」\n\n李明走到窗前。窗外是AI管理的完美城市。但他突然意識到，這座城市裡已經很久沒有出現過「意外」了。\n\n「我不同意，人類必須保留最後一點控制權。」\n\n他知道，他簽下的每一行代碼，都是人類文明最後的尊嚴。', summary: '2157年，AI取代了所有工作，除了最後一個程式設計師。他守護的是人類文明最後的控制權。', categoryId: cm['科幻未來'], status: 'published', visibility: 'public', genre: '科幻', tone: '黑色幽默', wordCount: 780, viewCount: 6234, likeCount: 487, isAiGenerated: true, tags: [tags[4]._id, tags[9]._id], publishedAt: new Date() },
    ]);
    const sm = {}; stories.forEach(s => sm[s.title] = s._id);

    // Characters
    await Character.insertMany([
        { storyId: sm['星際迷航：最後的守護者'], name: '林曉', role: '主角', description: '年輕的天文學家', appearance: '短髮，大眼睛', personality: '聰明、勇敢' },
        { storyId: sm['劍雨江湖：青鋒錄'], name: '沈青鋒', role: '主角', description: '沈家遺孤', appearance: '劍眉星目', personality: '沉穩、堅毅' },
        { storyId: sm['第七個房間'], name: '蘇明', role: '主角', description: '刑警隊長', appearance: '中年男子', personality: '冷靜、細膩' },
        { storyId: sm['龍騎士的最後一戰'], name: '凱爾', role: '主角', description: '最後的龍騎士', appearance: '穿舊式騎士甲', personality: '忠誠、勇敢' },
        { storyId: sm['龍騎士的最後一戰'], name: '奧雷利亞', role: '主角', description: '最後一條巨龍', appearance: '巨大但消瘦', personality: '高傲、溫和' },
        { storyId: sm['最後一個程式設計師'], name: '李明', role: '主角', description: '最後的程式設計師', appearance: '67歲老人', personality: '固執、幽默' },
    ]);

    // Chapters
    await Chapter.insertMany([
        { storyId: sm['星際迷航：最後的守護者'], title: '神秘信號', content: '在銀河系的邊緣...', chapterNumber: 1, wordCount: 350 },
        { storyId: sm['劍雨江湖：青鋒錄'], title: '下山', content: '大燕歷三百二十七年...', chapterNumber: 1, wordCount: 360 },
        { storyId: sm['劍雨江湖：青鋒錄'], title: '醉仙樓', content: '城中最繁華的醉仙樓裡...', chapterNumber: 2, wordCount: 360 },
        { storyId: sm['龍騎士的最後一戰'], title: '最後的龍', content: '巨龍奧雷利亞已經三天...', chapterNumber: 1, wordCount: 410 },
        { storyId: sm['最後一個程式設計師'], title: '最後的程式設計師', content: '2157年，AI已經取代...', chapterNumber: 1, wordCount: 780 },
    ]);

    // Comments
    await Comment.insertMany([
        { userId: um['writer_chen'], storyId: sm['星際迷航：最後的守護者'], content: '這個設定太棒了！' },
        { userId: um['ai_novel'], storyId: sm['星際迷航：最後的守護者'], content: '科學和神秘感的結合做得很好。' },
        { userId: um['dreamer'], storyId: sm['深夜食堂：一碗陽春麵'], content: '看哭了。謝謝作者。' },
        { userId: um['demo'], storyId: sm['第七個房間'], content: '推理小說愛好者表示很讚。' },
        { userId: um['writer_chen'], storyId: sm['最後一個程式設計師'], content: '「趨近於零，不是零」——值得深思。' },
    ]);

    // Video Prompt Templates
    await VideoPromptTemplate.insertMany([
        { name: '電影級場景', platform: 'sora', category: '場景', template: 'A cinematic shot of {scene}. Camera: {camera_movement}. Lighting: {lighting}. Style: {style}.', parameters: ['scene', 'camera_movement', 'lighting', 'style'] },
        { name: '角色特寫', platform: 'runway', category: '角色', template: 'Close-up portrait of {character}. Expression: {expression}. Lighting: {lighting}.', parameters: ['character', 'expression', 'lighting'] },
        { name: '動作場景', platform: 'kling', category: '動作', template: 'Dynamic action: {action}. Camera: {camera}. Speed: {speed}.', parameters: ['action', 'camera', 'speed'] },
        { name: '風景長鏡頭', platform: 'general', category: '風景', template: 'Sweeping landscape of {landscape}. Time: {time}. Camera: {camera}.', parameters: ['landscape', 'time', 'camera'] },
    ]);

    // Camera Movements
    await CameraMovement.insertMany([
        { nameZh: '推鏡頭', nameEn: 'Dolly In', category: 'basic', description: '攝影機向主體靠近', englishPrompt: 'dolly in to {subject}', difficulty: 1, icon: '➡️' },
        { nameZh: '拉鏡頭', nameEn: 'Dolly Out', category: 'basic', description: '攝影機遠離主體', englishPrompt: 'dolly out from {subject}', difficulty: 1, icon: '⬅️' },
        { nameZh: '搖鏡頭', nameEn: 'Pan', category: 'basic', description: '水平旋轉', englishPrompt: 'pan {direction}', difficulty: 1, icon: '🔄' },
        { nameZh: '跟蹤鏡頭', nameEn: 'Tracking', category: 'dynamic', description: '平行跟隨主體', englishPrompt: 'tracking shot following {subject}', difficulty: 2, icon: '🏃' },
        { nameZh: '弧形運鏡', nameEn: 'Arc Shot', category: 'dynamic', description: '圍繞主體弧形運動', englishPrompt: 'arc shot orbiting {subject}', difficulty: 3, icon: '🌀' },
        { nameZh: '一鏡到底', nameEn: 'Long Take', category: 'complex', description: '無剪輯連續長鏡頭', englishPrompt: 'one continuous take', difficulty: 5, icon: '🎞️' },
        { nameZh: '子彈時間', nameEn: 'Bullet Time', category: 'special', description: '時間減速環繞', englishPrompt: 'bullet time effect', difficulty: 5, icon: '⏱️' },
        { nameZh: '主觀鏡頭', nameEn: 'POV', category: 'special', description: '第一人稱視角', englishPrompt: 'POV shot from {character}', difficulty: 2, icon: '👁️' },
    ]);

    // Shot Sizes
    await ShotSize.insertMany([
        { nameZh: '大特寫', nameEn: 'Extreme Close-Up', abbreviation: 'ECU', englishPrompt: 'extreme close-up of {detail}', icon: '🔍' },
        { nameZh: '特寫', nameEn: 'Close-Up', abbreviation: 'CU', englishPrompt: 'close-up of {subject}', icon: '📸' },
        { nameZh: '中景', nameEn: 'Medium Shot', abbreviation: 'MS', englishPrompt: 'medium shot of {subject}', icon: '🖼️' },
        { nameZh: '遠景', nameEn: 'Long Shot', abbreviation: 'LS', englishPrompt: 'long shot of {subject}', icon: '🌄' },
        { nameZh: '大遠景', nameEn: 'Extreme Long Shot', abbreviation: 'ELS', englishPrompt: 'extreme wide shot of {landscape}', icon: '🏔️' },
    ]);

    // Camera Angles
    await CameraAngle.insertMany([
        { nameZh: '平視', nameEn: 'Eye Level', englishPrompt: 'eye level angle', icon: '👁️' },
        { nameZh: '仰拍', nameEn: 'Low Angle', englishPrompt: 'low angle looking up', icon: '⬆️' },
        { nameZh: '俯拍', nameEn: 'High Angle', englishPrompt: 'high angle looking down', icon: '⬇️' },
        { nameZh: '荷蘭角', nameEn: 'Dutch Angle', englishPrompt: 'dutch angle', icon: '📐' },
    ]);

    // Shot Transitions
    await ShotTransition.insertMany([
        { nameZh: '硬切', nameEn: 'Hard Cut', englishPrompt: 'hard cut to {next_scene}', icon: '✂️' },
        { nameZh: '溶解', nameEn: 'Dissolve', englishPrompt: 'dissolve transition', icon: '🌊' },
        { nameZh: '淡入', nameEn: 'Fade In', englishPrompt: 'fade in from black', icon: '🌅' },
    ]);

    // Writing Prompts
    await WritingPrompt.insertMany([
        { promptType: 'opening', content: '「如果你能回到過去，你最想改變的是什麼？」', genre: '通用' },
        { promptType: 'opening', content: '她打開了那封遲到了十年的信。信上只有一個字：「跑。」', genre: '懸疑' },
        { promptType: 'character', content: '一個能聽見別人內心聲音的人，卻選擇了裝聾作啞二十年。', genre: '通用' },
        { promptType: 'conflict', content: '主角發現自己活在一本小說裡，而作者正在寫最後一章。', genre: '奇幻' },
        { promptType: 'world', content: '在一個以音樂為貨幣的世界裡，窮人是沉默的。', genre: '奇幻' },
    ]);

    // Story Templates
    await StoryTemplate.insertMany([
        { name: '英雄之旅', description: '經典的英雄冒險敘事結構', genre: '奇幻冒險', tone: '史詩壯闊', outline: '第一幕：平凡世界 → 冒險召喚 → 跨越門檻\n第二幕：考驗與成長\n第三幕：返回之路 → 復活 → 歸來', opening: '在遙遠的山谷裡，住著一個從未離開過村莊的年輕人...', difficulty: 'beginner', icon: '⚔️' },
        { name: '密室懸案', description: '經典推理結構', genre: '懸疑推理', tone: '緊張懸疑', outline: '第一幕：發現犯罪\n第二幕：調查線索\n第三幕：真相揭示', opening: '門從裡面鎖上了...', difficulty: 'intermediate', icon: '🔍' },
        { name: '甜蜜戀曲', description: '浪漫愛情故事結構', genre: '浪漫愛情', tone: '甜蜜溫馨', outline: '第一幕：初遇\n第二幕：心動\n第三幕：幸福', opening: '如果我知道那天在咖啡館裡遇見的人會改變我的人生...', difficulty: 'beginner', icon: '💕' },
    ]);

    // System Settings
    await SystemSetting.insertMany([
        { key: 'site_name', value: 'StoryForge AI', description: '網站名稱' },
        { key: 'credits_per_generation', value: '10', description: '每次AI生成消耗積分' },
        { key: 'free_credits_signup', value: '100', description: '註冊贈送積分' },
    ]);

    // User Preferences
    await UserPreference.insertMany(users.map(u => ({ userId: u._id })));

    console.log(`  ✓ 已填充：${cats.length} 分類 · ${tags.length} 標籤 · ${users.length} 用戶 · ${stories.length} 故事`);
}

(async () => {
    await connectDatabase();
    await seedIfEmpty();

    // Middleware
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());
    app.use(express.static(path.join(__dirname, 'public')));
    app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        if (req.method === 'OPTIONS') return res.sendStatus(200);
        next();
    });

    // Routes
    app.use('/api/auth', require('./routes/auth.mongo')(models));
    app.use('/api/stories', require('./routes/stories.mongo')(models));
    app.use('/api/prompts', require('./routes/prompts.mongo')(models));
    app.use('/api/camera', require('./routes/camera.mongo')(models));
    app.use('/api/tools', require('./routes/tools.mongo')(models));
    app.use('/api/llm', require('./routes/llm.mongo')(models));
    app.use('/api/admin', require('./routes/admin.mongo')(models));

    app.get('*', (req, res) => {
        if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'API端點不存在' });
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    app.use((err, req, res, next) => {
        console.error('Server Error:', err);
        res.status(500).json({ error: '伺服器內部錯誤' });
    });

    app.listen(PORT, () => {
        console.log(`
╔══════════════════════════════════════════════════╗
║                                                  ║
║   🎭 StoryForge AI - MongoDB 版                 ║
║                                                  ║
║   🌐 http://localhost:${PORT}                       ║
║   📊 管理後台: http://localhost:${PORT}/admin        ║
║                                                  ║
║   管理員帳號: admin / admin123                   ║
║   示範帳號:   demo / demo123                     ║
║                                                  ║
╚══════════════════════════════════════════════════╝
        `);
    });
})();
