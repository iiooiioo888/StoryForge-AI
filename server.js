const express = require('express');
const compression = require('compression');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { connectDatabase } = require('./database/connection');
const models = require('./models');
const { setupPerformance } = require('./middleware/performance');
const { logger, httpLogger, requestLogger } = require('./middleware/logger');
const LLMService = require('./services/llm');
const StreamingService = require('./services/streaming');
const ContentModeration = require('./services/moderation');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== Performance Middleware =====
// Gzip/Brotli compression
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

// Security headers (lightweight)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// Initialize services
const llmService = new LLMService();
const streamingService = new StreamingService(llmService);

async function seedIfEmpty() {
    const count = await models.User.countDocuments();
    if (count > 0) return;
    console.log('🌱 數據庫為空，正在填充示範數據...');
    const { User, Story, Chapter, Character, Category, Tag, VideoPromptTemplate, CameraMovement, ShotSize, CameraAngle, ShotTransition, WritingPrompt, StoryTemplate, SystemSetting, UserPreference, Comment, LightingPreset, VisualStyle, ColorPalette, Prop, Scene, CharacterContinuity, SceneContinuity } = models;

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

    const tags = await Tag.insertMany([
        { name: '冒險', slug: 'adventure', usageCount: 15 }, { name: '魔法', slug: 'magic', usageCount: 12 },
        { name: '友情', slug: 'friendship', usageCount: 10 }, { name: '戰鬥', slug: 'battle', usageCount: 14 },
        { name: 'AI', slug: 'ai', usageCount: 13 }, { name: '治癒', slug: 'healing', usageCount: 7 },
        { name: '推理', slug: 'detective', usageCount: 7 }, { name: '龍族', slug: 'dragon', usageCount: 5 },
        { name: '史詩', slug: 'epic', usageCount: 11 }, { name: '賽博朋克', slug: 'cyberpunk', usageCount: 10 },
    ]);

    const h = bcrypt.hashSync('admin123', 10), dh = bcrypt.hashSync('demo123', 10), uh = bcrypt.hashSync('user123', 10);
    const users = await User.insertMany([
        { username: 'admin', email: 'admin@storyforge.com', passwordHash: h, displayName: '系統管理員', role: 'admin', credits: 99999, bio: '平台管理員' },
        { username: 'demo', email: 'demo@storyforge.com', passwordHash: dh, displayName: '星際旅者', role: 'user', credits: 500, bio: '熱愛科幻與奇幻的業餘作家' },
        { username: 'writer_chen', email: 'chen@example.com', passwordHash: uh, displayName: '陳作家', role: 'user', credits: 320, bio: '專注武俠與歷史題材' },
        { username: 'ai_novel', email: 'novel@example.com', passwordHash: uh, displayName: 'AI小說家', role: 'user', credits: 780, bio: '用AI輔助創作的先鋒' },
        { username: 'dreamer', email: 'dreamer@example.com', passwordHash: uh, displayName: '夢境編織者', role: 'user', credits: 150, bio: '寫治癒系故事的小透明' },
    ]);
    const um = {}; users.forEach(u => um[u.username] = u._id);

    const stories = await Story.insertMany([
        { userId: um['demo'], title: '星際迷航：最後的守護者', content: '在銀河系的邊緣，有一顆被遺忘的星球——艾爾德拉。這裡曾經是宇宙中最繁榮的文明之一，如今只剩下殘破的遺跡和低語的風。\n\n年輕的天文學家林曉在一次觀測中意外截獲了一段來自艾爾德拉的神秘信號。\n\n三天後，林曉搭乘一艘小型探索飛船，獨自踏上了前往艾爾德拉的旅程。', summary: '在銀河系邊緣的遺忘星球上，一段神秘信號引發了一場跨越星際的冒險。', categoryId: cm['科幻未來'], status: 'published', visibility: 'public', genre: '科幻冒險', tone: '史詩壯闊', wordCount: 350, viewCount: 1247, likeCount: 89, isAiGenerated: true, tags: [tags[0]._id, tags[4]._id], publishedAt: new Date() },
        { userId: um['writer_chen'], title: '劍雨江湖：青鋒錄', content: '大燕歷三百二十七年，江湖上出現了一本神秘的劍譜——《青鋒錄》。\n\n沈青鋒背著那柄跟了他十二年的鐵劍，站在洛陽城的城門外。\n\n白衣少年抬起頭：「我等你很久了，沈家的遺孤。」', summary: '劍譜《青鋒錄》現世，沈青鋒背負滅門之仇，踏上尋找七式劍法的險途。', categoryId: cm['武俠江湖'], status: 'published', visibility: 'public', genre: '武俠', tone: '快意恩仇', wordCount: 720, viewCount: 2156, likeCount: 156, tags: [tags[3]._id], publishedAt: new Date() },
        { userId: um['ai_novel'], title: '第七個房間', content: '雨夜。刑警隊長蘇明站在那棟老舊公寓的門前。\n\n客廳正中央，一把椅子上坐著一個人偶——不，不是人偶。那是一個被精心打扮成真人大小的人偶。但讓蘇明不寒而慄的是，人偶的眼睛是活的。', summary: '雨夜，刑警蘇明發現了一個被做成人偶的活人，揭開了一個駭人聽聞的連環案件。', categoryId: cm['懸疑推理'], status: 'published', visibility: 'public', genre: '懸疑推理', tone: '陰暗壓抑', wordCount: 650, viewCount: 3421, likeCount: 234, isAiGenerated: true, tags: [tags[6]._id], publishedAt: new Date() },
        { userId: um['dreamer'], title: '深夜食堂：一碗陽春麵', content: '凌晨兩點，老王推開了那扇吱呀作響的木門。\n\n「老王，一碗陽春麵，多加點蔥。」\n\n老王沉默了一會兒。「三十年前，我也像你一樣。一個人坐在橋頭想跳下去。後來一個老頭拉住了我，帶我去吃了一碗陽春麵。他說：吃飽了再說。」\n\n小陳低頭看了看碗裡的麵，眼眶突然濕了。', summary: '凌晨兩點的深夜食堂，一碗簡單的陽春麵，一個關於活下去的故事。', categoryId: cm['都市生活'], status: 'published', visibility: 'public', genre: '都市溫情', tone: '溫馨治癒', wordCount: 750, viewCount: 5678, likeCount: 423, tags: [tags[5]._id], publishedAt: new Date() },
        { userId: um['demo'], title: '龍騎士的最後一戰', content: '巨龍奧雷利亞已經三天沒有吃東西了。\n\n「你不該來的，」她對洞口的人類說。\n\n「我答應過你，一輩子都是你的騎士。」凱爾走進洞穴。\n\n凱爾拔出了龍騎士之劍。「好，最後一戰。」\n\n奧雷利亞展開了翅膀。「最後一戰，然後，新時代。」', summary: '巨龍奧雷利亞是世界上最後一條龍。她的騎士凱爾將與她一起踏上守護龍族最後希望的旅程。', categoryId: cm['奇幻冒險'], status: 'published', visibility: 'public', genre: '史詩奇幻', tone: '悲壯熱血', wordCount: 820, viewCount: 4521, likeCount: 312, isAiGenerated: true, tags: [tags[0]._id, tags[1]._id, tags[7]._id], publishedAt: new Date() },
        { userId: um['ai_novel'], title: '最後一個程式設計師', content: '2157年，AI已經取代了所有的人類工作。除了程式設計。\n\n全世界只剩下了一個程式設計師。他叫李明，今年67歲。\n\n「我不同意，人類必須保留最後一點控制權。」\n\n他知道，他簽下的每一行代碼，都是人類文明最後的尊嚴。', summary: '2157年，AI取代了所有工作，除了最後一個程式設計師。他守護的是人類文明最後的控制權。', categoryId: cm['科幻未來'], status: 'published', visibility: 'public', genre: '科幻', tone: '黑色幽默', wordCount: 780, viewCount: 6234, likeCount: 487, isAiGenerated: true, tags: [tags[4]._id, tags[9]._id], publishedAt: new Date() },
    ]);
    const sm = {}; stories.forEach(s => sm[s.title] = s._id);

    await Character.insertMany([
        { storyId: sm['星際迷航：最後的守護者'], name: '林曉', role: '主角', description: '年輕的天文學家' },
        { storyId: sm['劍雨江湖：青鋒錄'], name: '沈青鋒', role: '主角', description: '沈家遺孤' },
        { storyId: sm['第七個房間'], name: '蘇明', role: '主角', description: '刑警隊長' },
        { storyId: sm['龍騎士的最後一戰'], name: '凱爾', role: '主角', description: '最後的龍騎士' },
        { storyId: sm['龍騎士的最後一戰'], name: '奧雷利亞', role: '主角', description: '最後一條巨龍' },
        { storyId: sm['最後一個程式設計師'], name: '李明', role: '主角', description: '最後的程式設計師' },
    ]);
    await Chapter.insertMany([
        { storyId: sm['星際迷航：最後的守護者'], title: '神秘信號', content: '在銀河系的邊緣...', chapterNumber: 1, wordCount: 350 },
        { storyId: sm['劍雨江湖：青鋒錄'], title: '下山', content: '大燕歷三百二十七年...', chapterNumber: 1, wordCount: 360 },
        { storyId: sm['劍雨江湖：青鋒錄'], title: '醉仙樓', content: '城中最繁華的醉仙樓裡...', chapterNumber: 2, wordCount: 360 },
    ]);
    await Comment.insertMany([
        { userId: um['writer_chen'], storyId: sm['星際迷航：最後的守護者'], content: '這個設定太棒了！' },
        { userId: um['ai_novel'], storyId: sm['星際迷航：最後的守護者'], content: '科學和神秘感的結合做得很好。' },
        { userId: um['dreamer'], storyId: sm['深夜食堂：一碗陽春麵'], content: '看哭了。謝謝作者。' },
    ]);
    await VideoPromptTemplate.insertMany([
        { name: '電影級場景', platform: 'sora', category: '場景', template: 'A cinematic shot of {scene}.', parameters: ['scene'] },
        { name: '角色特寫', platform: 'runway', category: '角色', template: 'Close-up of {character}.', parameters: ['character'] },
        { name: '動作場面', platform: 'kling', category: '動作', template: 'Dynamic action scene: {action}. Camera: {camera}.', parameters: ['action', 'camera'] },
        { name: '氛圍空鏡', platform: 'sora', category: '空鏡', template: 'Atmospheric establishing shot of {environment}. Mood: {mood}.', parameters: ['environment', 'mood'] },
        { name: '對話場景', platform: 'runway', category: '對話', template: 'Two-shot conversation: {characters}. Intimacy level: {intimacy}.', parameters: ['characters', 'intimacy'] },
        { name: '追逐戲', platform: 'kling', category: '動作', template: 'High-speed chase through {location}. Camera: handheld shaky. Speed: {speed}.', parameters: ['location', 'speed'] },
    ]);
    await CameraMovement.insertMany([
        // ── basic ──
        { nameZh: '推鏡頭', nameEn: 'Dolly In', category: 'basic', englishPrompt: 'slow dolly in towards {subject}', difficulty: 1, icon: '➡️', description: '鏡頭物理向前移動，逐漸接近主體', useCase: '強調細節、營造壓迫感', visualEffect: '主體逐漸變大，背景漸虛' },
        { nameZh: '拉鏡頭', nameEn: 'Dolly Out', category: 'basic', englishPrompt: 'dolly out revealing the full scene', difficulty: 1, icon: '⬅️', description: '鏡頭物理向後移動，展開全景', useCase: '揭曉環境、建立空間感', visualEffect: '主體變小，場景全貌顯現' },
        { nameZh: '水平搖鏡', nameEn: 'Pan', category: 'basic', englishPrompt: 'horizontal pan {direction}', difficulty: 1, icon: '🔄', description: '鏡頭固定位置水平旋轉', useCase: '掃視場景、跟隨角色移動', visualEffect: '畫面水平展開' },
        { nameZh: '垂直搖鏡', nameEn: 'Tilt', category: 'basic', englishPrompt: 'tilt {up/down} revealing', difficulty: 1, icon: '↕️', description: '鏡頭固定位置垂直旋轉', useCase: '展示建築高度、角色全身', visualEffect: '畫面垂直展開' },
        { nameZh: '變焦推進', nameEn: 'Zoom In', category: 'basic', englishPrompt: 'zoom in to {subject}', difficulty: 1, icon: '🔍', description: '鏡頭焦距拉長，畫面放大', useCase: '快速聚焦、強調', visualEffect: '背景壓縮，主體放大' },
        { nameZh: '變焦拉遠', nameEn: 'Zoom Out', category: 'basic', englishPrompt: 'zoom out revealing', difficulty: 1, icon: '🔎', description: '鏡頭焦距縮短，畫面展開', useCase: '揭曉場景全貌', visualEffect: '背景展開，主體縮小' },
        // ── dynamic ──
        { nameZh: '跟蹤鏡頭', nameEn: 'Tracking Shot', category: 'dynamic', englishPrompt: 'tracking shot following {subject}', difficulty: 2, icon: '🏃', description: '鏡頭跟隨主體移動', useCase: '追逐、行走、奔跑場景', visualEffect: '主體穩定，背景流動' },
        { nameZh: '弧形運鏡', nameEn: 'Arc/Orbit Shot', category: 'dynamic', englishPrompt: 'orbital arc shot circling around {subject}', difficulty: 3, icon: '🌀', description: '鏡頭繞主體弧形運動', useCase: '角色出場、情緒升華', visualEffect: '360度展示，戲劇性強' },
        { nameZh: '穩定器跟拍', nameEn: 'Steadicam Follow', category: 'dynamic', englishPrompt: 'steadicam smooth follow behind {subject}', difficulty: 3, icon: '📹', description: '使用穩定器平滑跟隨', useCase: '長鏡頭敘事、沉浸式體驗', visualEffect: '絲滑流暢的運動感' },
        { nameZh: '手持搖晃', nameEn: 'Handheld', category: 'dynamic', englishPrompt: 'handheld camera with natural shake', difficulty: 2, icon: '🤳', description: '手持拍攝的自然晃動', useCase: '紀錄片感、緊張場景', visualEffect: '真實感、不安感' },
        { nameZh: '快速甩鏡', nameEn: 'Whip Pan', category: 'dynamic', englishPrompt: 'whip pan to {direction}', difficulty: 2, icon: '💨', description: '極速水平搖鏡產生運動模糊', useCase: '場景轉換、動作銜接', visualEffect: '速度感、動態模糊' },
        { nameZh: '升降鏡頭', nameEn: 'Crane/Jib', category: 'dynamic', englishPrompt: 'crane shot rising above the scene', difficulty: 3, icon: '🏗️', description: '鏡頭垂直升降', useCase: '開場/結尾、全貌展示', visualEffect: '宏大感、史詩感' },
        // ── complex ──
        { nameZh: '一鏡到底', nameEn: 'Long Take / Oner', category: 'complex', englishPrompt: 'one continuous unbroken take', difficulty: 5, icon: '🎞️', description: '不切鏡的超長鏡頭', useCase: '展示演技、沉浸敘事', visualEffect: '真實時間感、戲劇張力' },
        { nameZh: '眩暈變焦', nameEn: 'Dolly Zoom / Vertigo', category: 'complex', englishPrompt: 'dolly zoom vertigo effect on {subject}', difficulty: 5, icon: '😵', description: '推鏡頭+變焦拉遠同時進行', useCase: '角色頓悟、世界觀崩塌', visualEffect: '背景扭曲，主體不變，眩暈感' },
        { nameZh: '焦點轉移', nameEn: 'Rack Focus', category: 'complex', englishPrompt: 'rack focus from {foreground} to {background}', difficulty: 3, icon: '🎯', description: '焦點從前景轉到背景', useCase: '揭示隱藏信息、引導視線', visualEffect: '視覺注意力轉移' },
        { nameZh: '多軌運動', nameEn: 'Compound Move', category: 'complex', englishPrompt: 'compound camera move: dolly + pan + tilt simultaneously', difficulty: 5, icon: '🎭', description: '多軸同時運動的複雜鏡頭', useCase: '高潮場景、動作戲', visualEffect: '極度動態、視覺衝擊' },
        // ── aerial ──
        { nameZh: '航拍俯瞰', nameEn: 'Drone Flyover', category: 'aerial', englishPrompt: 'aerial drone flyover above {location}', difficulty: 3, icon: '🚁', description: '無人機高空飛越', useCase: '場景建立、地理展示', visualEffect: '宏大空間感' },
        { nameZh: '鳥瞰下降', nameEn: "Bird's Eye Descent", category: 'aerial', englishPrompt: "bird's eye view descending into the scene", difficulty: 4, icon: '🦅', description: '從正上方逐漸下降', useCase: '進入場景、揭曉秘密', visualEffect: '從上帝視角到人間視角' },
        { nameZh: '低空穿越', nameEn: 'FPV Drone', category: 'aerial', englishPrompt: 'FPV drone racing through {environment}', difficulty: 5, icon: '🏎️', description: 'FPV無人機高速穿越', useCase: '動作戲、空間探索', visualEffect: '極速沉浸感' },
        // ── special ──
        { nameZh: '子彈時間', nameEn: 'Bullet Time', category: 'special', englishPrompt: 'bullet time effect, frozen moment', difficulty: 5, icon: '⏱️', description: '時間凍結，鏡頭環繞', useCase: '關鍵瞬間、動作特寫', visualEffect: '超級慢動作+自由視角' },
        { nameZh: '主觀鏡頭', nameEn: 'POV Shot', category: 'special', englishPrompt: 'first person POV shot', difficulty: 2, icon: '👁️', description: '角色第一人稱視角', useCase: '沉浸體驗、恐怖場景', visualEffect: '觀眾成為角色' },
        { nameZh: '滑軌平移', nameEn: 'Slider', category: 'special', englishPrompt: 'slider lateral movement', difficulty: 2, icon: '↔️', description: '滑軌水平平移', useCase: '產品展示、細節掃描', visualEffect: '平滑橫移' },
        { nameZh: '360度環繞', nameEn: 'Full Rotation', category: 'special', englishPrompt: 'full 360 degree rotation around {subject}', difficulty: 4, icon: '🔄', description: '完整一圈環繞', useCase: '角色介紹、空間展示', visualEffect: '全方位展示' },
    ]);
    await ShotSize.insertMany([
        { nameZh: '大特寫', nameEn: 'Extreme Close-Up', abbreviation: 'ECU', englishPrompt: 'extreme close-up of {detail}', icon: '🔍', description: '只拍攝極小細節（眼睛、手指、嘴唇）', emotionalImpact: '極度親密、揭示隱藏信息', useCase: '情緒爆發、重要線索' },
        { nameZh: '特寫', nameEn: 'Close-Up', abbreviation: 'CU', englishPrompt: 'close-up shot of {subject}', icon: '📸', description: '臉部或物體佔滿畫面', emotionalImpact: '親密、情緒聚焦', useCase: '對話、表情、反應' },
        { nameZh: '中近景', nameEn: 'Medium Close-Up', abbreviation: 'MCU', englishPrompt: 'medium close-up, chest and above', icon: '👤', description: '胸部以上', emotionalImpact: '平衡親密與環境', useCase: '對話場景、日常互動' },
        { nameZh: '中景', nameEn: 'Medium Shot', abbreviation: 'MS', englishPrompt: 'medium shot, waist up', icon: '🖼️', description: '腰部以上', emotionalImpact: '中性、觀察', useCase: '一般敘事、互動場景' },
        { nameZh: '中遠景', nameEn: 'Medium Long Shot', abbreviation: 'MLS', englishPrompt: 'medium long shot, full body', icon: '🧍', description: '全身入鏡', emotionalImpact: '觀察、動作展示', useCase: '肢體語言、動作場景' },
        { nameZh: '全景', nameEn: 'Wide Shot', abbreviation: 'WS', englishPrompt: 'wide shot showing full environment', icon: '🏞️', description: '人物在環境中的完整呈現', emotionalImpact: '環境感、孤立感', useCase: '場景建立、人與環境關係' },
        { nameZh: '遠景', nameEn: 'Long Shot', abbreviation: 'LS', englishPrompt: 'long shot, figure small in landscape', icon: '🌄', description: '人物在遠處，環境為主', emotionalImpact: '渺小、史詩、孤獨', useCase: '史詩場景、自然風光' },
        { nameZh: '大遠景', nameEn: 'Extreme Long Shot', abbreviation: 'ELS', englishPrompt: 'extreme wide shot, vast landscape', icon: '🏔️', description: '極度廣闊的環境', emotionalImpact: '宏大、敬畏', useCase: '開場建立、世界觀展示' },
        { nameZh: '雙人鏡頭', nameEn: 'Two Shot', abbreviation: '2S', englishPrompt: 'two shot framing both characters', icon: '👥', description: '兩個角色同時入鏡', emotionalImpact: '關係、對比', useCase: '對話、關係展示' },
        { nameZh: '過肩鏡頭', nameEn: 'Over-the-Shoulder', abbreviation: 'OTS', englishPrompt: 'over-the-shoulder shot', icon: '👔', description: '從一個角色肩膀後方拍攝另一個', emotionalImpact: '對話感、對立', useCase: '對話場景、衝突場景' },
        { nameZh: '插入鏡頭', nameEn: 'Insert Shot', abbreviation: 'INS', englishPrompt: 'insert close-up of {object}', icon: '📌', description: '插入的細節鏡頭', emotionalImpact: '強調、線索', useCase: '重要道具、細節揭示' },
    ]);
    await CameraAngle.insertMany([
        { nameZh: '平視', nameEn: 'Eye Level', englishPrompt: 'eye level angle', icon: '👁️', description: '與角色視線齊平', psychologicalEffect: '中性、平等、觀眾代入', useCase: '一般敘事、日常場景' },
        { nameZh: '仰拍', nameEn: 'Low Angle', englishPrompt: 'low angle looking up at {subject}', icon: '⬆️', description: '從下往上拍攝', psychologicalEffect: '權威、威嚴、英雄感', useCase: '角色出場、力量展示' },
        { nameZh: '俯拍', nameEn: 'High Angle', englishPrompt: 'high angle looking down at {subject}', icon: '⬇️', description: '從上往下拍攝', psychologicalEffect: '渺小、脆弱、被觀察', useCase: '弱勢展示、全貌觀察' },
        { nameZh: '鳥瞰', nameEn: "Bird's Eye", englishPrompt: "bird's eye view directly above", icon: '🦅', description: '正上方90度俯瞰', psychologicalEffect: '上帝視角、命運感', useCase: '布局展示、死亡暗示' },
        { nameZh: '蟲視', nameEn: "Worm's Eye", englishPrompt: "worm's eye view from ground level", icon: '🐛', description: '地面極低角度', psychologicalEffect: '壓迫、巨大、震撼', useCase: '建築展示、巨人感' },
        { nameZh: '荷蘭角', nameEn: 'Dutch Angle', englishPrompt: 'dutch angle tilted frame', icon: '📐', description: '畫面傾斜', psychologicalEffect: '不安、失衡、瘋狂', useCase: '懸疑、精神錯亂、衝突' },
        { nameZh: '斜側面', nameEn: 'Three-Quarter View', englishPrompt: 'three-quarter angle view', icon: '🎭', description: '45度斜側面', psychologicalEffect: '立體感、自然', useCase: '角色展示、最常見角度' },
        { nameZh: '背面', nameEn: 'Rear View', englishPrompt: 'rear view behind {subject}', icon: '🚶', description: '從角色背後拍攝', psychologicalEffect: '神秘、跟隨、未知', useCase: '角色離開、懸念營造' },
    ]);
    await ShotTransition.insertMany([
        { nameZh: '硬切', nameEn: 'Hard Cut', englishPrompt: 'hard cut to next scene', icon: '✂️', description: '直接切換到下一畫面', technique: '最基本的剪接', mood: '乾脆、節奏快' },
        { nameZh: '溶解', nameEn: 'Dissolve / Cross-Fade', englishPrompt: 'dissolve transition', icon: '🌊', description: '兩個畫面疊化過渡', technique: '前畫面淡出同時後畫面淡入', mood: '時間流逝、回憶、夢境' },
        { nameZh: '淡入', nameEn: 'Fade In', englishPrompt: 'fade in from black', icon: '🌅', description: '從黑屏逐漸顯現', technique: '透明度從0到100', mood: '開始、覺醒、新章' },
        { nameZh: '淡出', nameEn: 'Fade Out', englishPrompt: 'fade out to black', icon: '🌙', description: '畫面逐漸變黑', technique: '透明度從100到0', mood: '結束、死亡、離別' },
        { nameZh: '匹配剪接', nameEn: 'Match Cut', englishPrompt: 'match cut with visual continuity', icon: '🔗', description: '利用相似圖形/動作銜接', technique: '前後畫面有視覺關聯', mood: '隱喻、時間跳躍、因果' },
        { nameZh: '跳接', nameEn: 'Jump Cut', englishPrompt: 'jump cut, time skip', icon: '⚡', description: '同一主體的不連續剪接', technique: '打破時間連續性', mood: '焦慮、時間壓縮、意識流' },
        { nameZh: '疊化至黑', nameEn: 'Fade Through Black', englishPrompt: 'fade through black transition', icon: '⬛', description: '淡出到黑屏再淡入', technique: '完整的淡出+淡入', mood: '重大轉折、章節分隔' },
        { nameZh: '擦除', nameEn: 'Wipe', englishPrompt: 'wipe transition {direction}', icon: '📐', description: '新畫面推走舊畫面', technique: '線性/幾何圖形擦除', mood: '場景轉換、復古感' },
        { nameZh: '形變', nameEn: 'Morph', englishPrompt: 'morphing transition between scenes', icon: '🦋', description: '畫面元素形體漸變', technique: '像素級形變運算', mood: '變形、幻覺、超現實' },
        { nameZh: '甩鏡轉場', nameEn: 'Whip Transition', englishPrompt: 'whip pan transition with motion blur', icon: '💨', description: '快速甩鏡產生運動模糊過渡', technique: '高速搖鏡+模糊', mood: '動感、速度、活力' },
        { nameZh: 'L型剪接', nameEn: 'L-Cut', englishPrompt: 'L-cut, audio leads visual', icon: '🔊', description: '聲音先於畫面轉換', technique: '音頻比視頻早切', mood: '對話流暢、自然過渡' },
        { nameZh: 'J型剪接', nameEn: 'J-Cut', englishPrompt: 'J-cut, visual leads audio', icon: '🔇', description: '畫面先於聲音轉換', technique: '視頻比音頻早切', mood: '視覺引導、期待感' },
    ]);
    await LightingPreset.insertMany([
        { nameZh: '黃金時刻', nameEn: 'Golden Hour', category: 'natural', englishPrompt: 'golden hour warm sunlight, long shadows, amber tones', icon: '🌅', colorTemperature: '3500K warm', mood: '溫暖、浪漫、懷舊', useCase: '愛情、回憶、史詩場景', technique: '日出後/日落前1小時的自然光' },
        { nameZh: '藍色時刻', nameEn: 'Blue Hour', category: 'natural', englishPrompt: 'blue hour twilight, deep blue sky, cool ambient light', icon: '🌆', colorTemperature: '9000K cool', mood: '寧靜、神秘、憂鬱', useCase: '懸疑、城市夜景、冥想', technique: '日落後/日出前的藍色天光' },
        { nameZh: '陰天漫射', nameEn: 'Overcast Diffused', category: 'natural', englishPrompt: 'overcast soft diffused light, no harsh shadows, even illumination', icon: '☁️', colorTemperature: '6500K neutral', mood: '平靜、中性、真實', useCase: '紀錄片、日常場景', technique: '雲層自然柔化光線' },
        { nameZh: '正午硬光', nameEn: 'Harsh Noon', category: 'natural', englishPrompt: 'harsh overhead noon sunlight, strong shadows, high contrast', icon: '☀️', colorTemperature: '5500K daylight', mood: '壓迫、真實、殘酷', useCase: '沙漠、衝突、現實主義', technique: '正午太陽直射' },
        { nameZh: '燭光', nameEn: 'Candlelight', category: 'practical', englishPrompt: 'warm candlelight, flickering amber glow, intimate atmosphere', icon: '🕯️', colorTemperature: '1800K warm', mood: '親密、溫馨、神秘', useCase: '晚餐、祈禱、密室', technique: '實際光源照明' },
        { nameZh: '霓虹燈光', nameEn: 'Neon Lighting', category: 'creative', englishPrompt: 'neon light reflections, vibrant pink blue purple, urban night', icon: '💜', colorTemperature: 'mixed', mood: '賽博朋克、夜生活、未來', useCase: '科幻、都市、MV', technique: '霓虹燈管反射' },
        { nameZh: '月光', nameEn: 'Moonlight', category: 'natural', englishPrompt: 'cool blue moonlight, soft shadows, night scene', icon: '🌙', colorTemperature: '4100K cool blue', mood: '寧靜、孤獨、浪漫', useCase: '夜景、獨白、夢境', technique: '月光模擬' },
        { nameZh: '三點布光', nameEn: 'Three-Point Lighting', category: 'studio', englishPrompt: 'classic three-point lighting setup, key fill and back light', icon: '💡', colorTemperature: '5600K', mood: '專業、平衡、戲劇', useCase: '採訪、對話、標準影視', technique: '主光+補光+輪廓光' },
        { nameZh: '倫勃朗光', nameEn: 'Rembrandt Lighting', category: 'studio', englishPrompt: 'Rembrandt lighting, triangle of light on cheek, dramatic chiaroscuro', icon: '🎨', colorTemperature: '3200K warm', mood: '古典、深度、戲劇', useCase: '肖像、內心獨白、藝術', technique: '45度側光形成臉部三角形光斑' },
        { nameZh: '明暗對比', nameEn: 'Chiaroscuro', category: 'dramatic', englishPrompt: 'extreme chiaroscuro, deep shadows and bright highlights, Caravaggio style', icon: '⬛', colorTemperature: '3000K', mood: '戲劇、衝突、神秘', useCase: '犯罪、心理驚悚、藝術', technique: '極端明暗對比' },
        { nameZh: '剪影光', nameEn: 'Silhouette', category: 'dramatic', englishPrompt: 'silhouette lighting, subject completely dark against bright background', icon: '🕴️', colorTemperature: 'varies', mood: '神秘、力量、懸念', useCase: '角色出場、反派、懸念', technique: '強逆光，主體全黑' },
        { nameZh: '體積霧光', nameEn: 'Volumetric Fog', category: 'creative', englishPrompt: 'volumetric light rays through fog, god rays, atmospheric haze', icon: '🌫️', colorTemperature: '5000K', mood: '神聖、夢幻、超現實', useCase: '森林、教堂、幻想', technique: '霧氣中的丁達爾效應' },
    ]);
    await VisualStyle.insertMany([
        { nameZh: '35mm電影質感', nameEn: 'Cinematic 35mm', category: 'cinematic', englishPrompt: 'shot on 35mm film, cinematic color grading, shallow depth of field, film grain', colorProfile: 'warm desaturated, teal and orange', textureDescription: '細膩膠片顆粒感', referenceWork: 'The Shawshank Redemption', compatibleGenres: ['drama', 'thriller', 'romance'], icon: '🎬' },
        { nameZh: '變形寬銀幕', nameEn: 'Anamorphic', category: 'cinematic', englishPrompt: 'anamorphic lens, horizontal lens flares, 2.39:1 widescreen, oval bokeh', colorProfile: 'warm with blue flares', textureDescription: '橢圓形散景、水平光暈', referenceWork: 'Blade Runner 2049', compatibleGenres: ['sci-fi', 'epic', 'noir'], icon: '🎞️' },
        { nameZh: 'IMAX巨幕', nameEn: 'IMAX', category: 'cinematic', englishPrompt: 'IMAX format, extreme clarity, massive scale, pristine image quality', colorProfile: 'vivid natural', textureDescription: '超高清晰度、無顆粒', referenceWork: 'Interstellar', compatibleGenres: ['epic', 'adventure', 'documentary'], icon: '🎥' },
        { nameZh: '動漫賽璐璐', nameEn: 'Anime / Cel-Shaded', category: 'artistic', englishPrompt: 'anime cel-shaded style, bold outlines, vibrant flat colors, Studio Ghibli aesthetic', colorProfile: 'vibrant saturated', textureDescription: '平塗色彩、清晰線條', referenceWork: '你的名字', compatibleGenres: ['fantasy', 'romance', 'adventure'], icon: '🎨' },
        { nameZh: '水彩畫風', nameEn: 'Watercolor', category: 'artistic', englishPrompt: 'watercolor painting style, soft edges, color bleeding, paper texture', colorProfile: 'soft pastel', textureDescription: '水彩暈染、紙張質感', referenceWork: 'Song of the Sea', compatibleGenres: ['fairy-tale', 'romance', 'artistic'], icon: '🖌️' },
        { nameZh: '黑色電影', nameEn: 'Film Noir', category: 'cinematic', englishPrompt: 'film noir style, high contrast black and white, venetian blind shadows, femme fatale aesthetic', colorProfile: 'monochrome high contrast', textureDescription: '高對比黑白、條紋陰影', referenceWork: 'Double Indemnity', compatibleGenres: ['noir', 'mystery', 'thriller'], icon: '🖤' },
        { nameZh: '賽博朋克', nameEn: 'Cyberpunk', category: 'experimental', englishPrompt: 'cyberpunk aesthetic, neon-lit dystopia, holographic displays, rain-slicked streets', colorProfile: 'neon pink blue purple on dark', textureDescription: '霓虹反射、濕潤街道', referenceWork: 'Ghost in the Shell', compatibleGenres: ['cyberpunk', 'sci-fi', 'action'], icon: '🤖' },
        { nameZh: '復古VHS', nameEn: 'Retro VHS', category: 'experimental', englishPrompt: 'retro VHS aesthetic, scan lines, color bleeding, tracking artifacts, 80s nostalgia', colorProfile: 'warm degraded', textureDescription: '掃描線、色彩溢出、磁帶質感', referenceWork: 'Stranger Things', compatibleGenres: ['horror', 'nostalgia', 'thriller'], icon: '📼' },
        { nameZh: '紀錄片原生', nameEn: 'Documentary Raw', category: 'documentary', englishPrompt: 'raw documentary style, natural lighting, handheld camera, ungraded footage', colorProfile: 'natural ungraded', textureDescription: '原始未調色、自然質感', referenceWork: 'Planet Earth', compatibleGenres: ['documentary', 'realism'], icon: '📹' },
        { nameZh: '廣告精緻', nameEn: 'Commercial Polish', category: 'commercial', englishPrompt: 'high-end commercial production, perfect lighting, glossy finish, aspirational', colorProfile: 'polished vibrant', textureDescription: '高光精緻、完美打光', referenceWork: 'Apple product launch', compatibleGenres: ['commercial', 'luxury'], icon: '✨' },
        { nameZh: '韋斯安德森', nameEn: 'Wes Anderson Pastel', category: 'artistic', englishPrompt: 'Wes Anderson style, symmetrical framing, pastel color palette, whimsical details', colorProfile: 'pastel pink yellow mint', textureDescription: '對稱構圖、粉彩色調', referenceWork: 'The Grand Budapest Hotel', compatibleGenres: ['comedy', 'fairy-tale', 'quirky'], icon: '🎪' },
        { nameZh: '吉卜力手繪', en: 'Ghibli Hand-Painted', category: 'artistic', englishPrompt: 'Studio Ghibli hand-painted backgrounds, soft natural light, lush detailed environments, anime characters in painterly world', nameEn: 'Ghibli Hand-Painted', colorProfile: 'warm natural greens and blues', textureDescription: '手繪水彩背景、自然環境細節', referenceWork: '千與千尋', compatibleGenres: ['fantasy', 'nature', 'adventure'], icon: '🌿' },
    ]);
    await ColorPalette.insertMany([
        { nameZh: '暖日落', nameEn: 'Warm Sunset', category: 'warm', colors: ['#FF6B35', '#F7931E', '#FFD700', '#FF4500', '#8B0000'], description: '日落暖橙紅色系', mood: '溫暖、浪漫、結束', englishPrompt: 'warm sunset orange and red tones' },
        { nameZh: '冷北極', nameEn: 'Cool Arctic', category: 'cool', colors: ['#001F3F', '#003F7F', '#007FFF', '#7FDBFF', '#B0E0E6'], description: '冰藍冷色系', mood: '寒冷、孤獨、清澈', englishPrompt: 'cool arctic blue tones' },
        { nameZh: '霓虹賽博', nameEn: 'Neon Cyberpunk', category: 'vibrant', colors: ['#FF00FF', '#00FFFF', '#FF1493', '#7B68EE', '#00FF00'], description: '霓虹粉紫青綠', mood: '未來、科技、夜生活', englishPrompt: 'vibrant neon pink cyan purple' },
        { nameZh: '自然泥土', nameEn: 'Earthy Natural', category: 'neutral', colors: ['#8B4513', '#A0522D', '#D2B48C', '#556B2F', '#6B8E23'], description: '泥土棕綠色系', mood: '自然、質樸、溫暖', englishPrompt: 'earthy brown and olive green tones' },
        { nameZh: '黑白經典', nameEn: 'Noir Monochrome', category: 'monochrome', colors: ['#000000', '#1A1A1A', '#4D4D4D', '#808080', '#FFFFFF'], description: '經典黑白灰', mood: '經典、戲劇、永恆', englishPrompt: 'classic black and white monochrome' },
        { nameZh: '粉彩夢境', nameEn: 'Pastel Dream', category: 'muted', colors: ['#FFB6C1', '#DDA0DD', '#B0E0E6', '#98FB98', '#FFFACD'], description: '柔和粉彩色系', mood: '夢幻、溫柔、治癒', englishPrompt: 'soft pastel pink lavender mint' },
        { nameZh: '熱帶繽紛', nameEn: 'Vibrant Tropical', category: 'vibrant', colors: ['#FF6347', '#FFD700', '#00CED1', '#FF69B4', '#32CD32'], description: '熱帶鮮豔色系', mood: '活力、快樂、冒險', englishPrompt: 'vibrant tropical coral turquoise' },
        { nameZh: '獨立電影', nameEn: 'Indie Muted', category: 'muted', colors: ['#696969', '#808000', '#BDB76B', '#556B2F', '#8B7D6B'], description: '低飽和度獨立色系', mood: '沉思、寫實、文藝', englishPrompt: 'desaturated indie earth tones' },
        { nameZh: '黃金調色板', nameEn: 'Golden Hour Palette', category: 'warm', colors: ['#FFD700', '#FFA500', '#FF8C00', '#E6BE8A', '#C08B5C'], description: '黃金時刻暖金色', englishPrompt: 'golden hour amber and warm tones' },
        { nameZh: '驚悚暗調', nameEn: 'Thriller Desaturated', category: 'cool', colors: ['#2C3E50', '#34495E', '#1A252F', '#1B2631', '#566573'], description: '低飽和暗冷色系', mood: '緊張、壓迫、不安', englishPrompt: 'desaturated dark cold thriller tones' },
    ]);
    await Prop.insertMany([
        { storyId: stories[0]._id, name: '信號接收器', category: 'technology', description: '林曉用來截獲神秘信號的天文設備', appearance: { material: '金屬+碳纖維', color: '深空灰', size: '手掌大小', condition: '使用過的磨損痕跡', markings: '背面刻有型號 XR-7' }, heldBy: [], visualPrompt: 'a compact metallic signal receiver device, space-gray carbon fiber, worn edges, model number XR-7 engraved on back', continuityNotes: '第一場出現，始終在林曉口袋裡', tags: ['關鍵道具', '科技'] },
        { storyId: stories[1]._id, name: '鐵劍', category: 'weapon', description: '沈青鋒背了十二年的鐵劍', appearance: { material: '鍛鐵', color: '暗銀色', size: '三尺長劍', condition: '劍身有無數細小劃痕，劍柄纏繞已泛黃的布條', markings: '劍格處刻有「沈」字' }, heldBy: [], visualPrompt: 'a worn three-foot iron sword, countless fine scratches on blade, yellowed cloth wrapping on handle, Chinese character "Shen" engraved on guard', continuityNotes: '全程隨身，第二集劍鞘被劈裂', tags: ['武器', '身份象徵'] },
        { storyId: stories[2]._id, name: '人偶', category: 'artifact', description: '被精心打扮成真人大小的人偶', appearance: { material: '陶瓷+布料', color: '蒼白膚色+紅色洋裝', size: '真人大小', condition: '完美無瑕，但眼睛是活的', markings: '左手腕內側有編號' }, heldBy: [], visualPrompt: 'life-sized porcelain doll, pale skin, red dress, perfectly preserved, unsettling living eyes, number tag on inner left wrist', continuityNotes: '關鍵證物，始終在案發現場椅子上', tags: ['證物', '恐怖'] },
    ]);
    await Scene.insertMany([
        { storyId: stories[0]._id, sceneNumber: 1, title: '信號截獲', synopsis: '林曉在天文台截獲來自艾爾德拉的神秘信號', location: '山頂天文台', timeOfDay: 'night', weather: '晴朗星空', characters: [{ action: '專注監聽', emotion: '好奇→震驚', position: '坐在控制台前' }], props: [], camera: { shotSize: 'medium shot', angle: 'low angle', movement: 'slow dolly in' }, lighting: { source: '螢幕光+月光', direction: '正面+側面', mood: '神秘' }, mood: '神秘、期待', status: 'approved' },
        { storyId: stories[0]._id, sceneNumber: 2, title: '啟程', synopsis: '林曉搭乘探索飛船離開地球', location: '太空港', timeOfDay: 'dawn', weather: '人造環境', characters: [{ action: '走上舷梯', emotion: '堅定', position: '側面輪廓' }], camera: { shotSize: 'wide shot', angle: 'low angle', movement: 'crane rising' }, lighting: { source: '太空港燈光+晨光', mood: '希望' }, mood: '壯闊、啟程', status: 'approved' },
    ]);
    await WritingPrompt.insertMany([
        { promptType: 'opening', content: '「如果你能回到過去，你最想改變的是什麼？」', genre: '通用' },
        { promptType: 'character', content: '一個能聽見別人內心聲音的人，卻選擇了裝聾作啞二十年。', genre: '通用' },
        { promptType: 'opening', content: '最後一班列車在雨中緩緩駛離，月台上只剩下一個人。', genre: '懸疑' },
        { promptType: 'conflict', content: '他知道這扇門後面是真相，但他更害怕的是，真相會讓他失去最後一個朋友。', genre: '懸疑推理' },
    ]);
    await StoryTemplate.insertMany([
        { name: '英雄之旅', description: '經典英雄冒險結構', genre: '奇幻冒險', outline: '平凡世界 → 冒險召喚 → 拒絕召喚 → 導師出現 → 跨越門檚 → 考驗盟友敵人 → 最深洞穴 → 獎賞 → 歸來', difficulty: 'beginner', icon: '⚔️' },
        { name: '密室懸案', description: '經典推理結構', genre: '懸疑推理', outline: '發現犯罪 → 封鎖現場 → 初步調查 → 線索收集 → 嫌疑人盤問 → 真相揭曉 → 結案', difficulty: 'intermediate', icon: '🔍' },
        { name: '三幕結構', description: '最經典的敘事結構', genre: '通用', outline: '第一幕：建置 → 第二幕：對抗 → 第三幕：解決', difficulty: 'beginner', icon: '📐' },
    ]);
    await SystemSetting.insertMany([
        { key: 'site_name', value: 'StoryForge AI', description: '網站名稱' },
        { key: 'credits_per_generation', value: '10', description: '每次AI生成消耗積分' },
        { key: 'free_credits_signup', value: '100', description: '註冊贈送積分' },
    ]);
    await UserPreference.insertMany(users.map(u => ({ userId: u._id })));
    console.log(`  ✓ 已填充：${cats.length} 分類 · ${tags.length} 標籤 · ${users.length} 用戶 · ${stories.length} 故事`);
}

(async () => {
    await connectDatabase();
    await seedIfEmpty();

    // Seed demo workflows if none exist
    try {
        const wfCount = await models.Workflow.countDocuments();
        console.log(`  📊 Workflow count: ${wfCount}`);
        if (wfCount === 0) {
            const demoUser = await models.User.findOne({ username: 'demo' });
            console.log(`  📊 Demo user: ${demoUser ? demoUser.username : 'NOT FOUND'}`);
            if (demoUser) {
                await models.Workflow.insertMany([
                    { userId: demoUser._id, name: 'Cinematic Scene Pipeline', description: 'A 3-node chain for cinematic scene creation', status: 'draft', tags: ['demo','cinematic'],
                      nodes: [
                          { id: 'n1', type: 'world-anchor', x: 100, y: 200, params: { gravity: 9.8, globalLighting: 'HDRi' } },
                          { id: 'n2', type: 'scene-composer', x: 400, y: 150, params: { cameraLayout: 'free', depthRange: 100, weather: { type: 'clear', intensity: 0.3, wind: 5 } } },
                          { id: 'n3', type: 'cinematic-camera', x: 700, y: 200, params: { lensModel: 'ARRI', focalLength: 85, fStop: 2.8, iso: 800, frameRate: '24' } },
                      ],
                      connections: [
                          { id: 'c1', fromNode: 'n1', fromOutput: 'worldDNA', toNode: 'n2', toInput: 'worldDNA' },
                          { id: 'c2', fromNode: 'n2', fromOutput: 'sceneBlueprint', toNode: 'n3', toInput: 'sceneBlueprint' },
                      ]},
                    { userId: demoUser._id, name: 'Full Production Pipeline', description: 'Complete 5-node production workflow', status: 'draft', tags: ['demo','full'],
                      nodes: [
                          { id: 'n1', type: 'world-anchor', x: 100, y: 300, params: { gravity: 9.8, globalLighting: 'Raytraced' } },
                          { id: 'n2', type: 'scene-composer', x: 400, y: 200, params: { cameraLayout: 'side', depthRange: 200 } },
                          { id: 'n3', type: 'cinematic-camera', x: 400, y: 400, params: { lensModel: 'ARRI', focalLength: 50, fStop: 1.8 } },
                          { id: 'n4', type: 'performance-director', x: 700, y: 300, params: { rainInteraction: true } },
                          { id: 'n5', type: 'cine-sync', x: 1000, y: 300, params: { audioType: 'atmos' } },
                      ],
                      connections: [
                          { id: 'c1', fromNode: 'n1', fromOutput: 'worldDNA', toNode: 'n2', toInput: 'worldDNA' },
                          { id: 'c2', fromNode: 'n1', fromOutput: 'worldDNA', toNode: 'n3', toInput: 'worldDNA' },
                          { id: 'c3', fromNode: 'n2', fromOutput: 'sceneBlueprint', toNode: 'n4', toInput: 'worldDNA' },
                          { id: 'c4', fromNode: 'n3', fromOutput: 'cameraData', toNode: 'n5', toInput: 'cameraData' },
                          { id: 'c5', fromNode: 'n4', fromOutput: 'performanceData', toNode: 'n5', toInput: 'performanceData' },
                      ]},
                ]);
                console.log('  ✓ Seeded 2 demo workflows');
                // 新增包含新節點類型的工作流範本
                await models.Workflow.create({
                    userId: demoUser._id,
                    name: 'Lighting & Render Pipeline',
                    description: '含燈光設定、渲染匯出、AI prompt 生成的完整工作流',
                    status: 'draft',
                    tags: ['demo', 'lighting', 'render', 'ai'],
                    nodes: [
                        { id: 'wa1', type: 'world-anchor', x: 80, y: 150, params: { gravity: 9.8, globalLighting: 'HDRi', physicsRules: { gravity: 9.8, fluid: false, cloth: false } } },
                        { id: 'sc1', type: 'scene-composer', x: 360, y: 100, params: { cameraLayout: 'free', depthRange: 150, weather: { type: 'clear', intensity: 0.5, wind: 5 } } },
                        { id: 'cc1', type: 'cinematic-camera', x: 360, y: 300, params: { lensModel: 'ARRI', focalLength: 85, fStop: 2.8, iso: 800, frameRate: '24' } },
                        { id: 'lr1', type: 'lighting-rig', x: 640, y: 150, params: { preset: 'golden-hour', intensity: 1.0, colorTemperature: 3500, mood: 'warm' } },
                        { id: 'pg1', type: 'prompt-generator', x: 640, y: 350, params: { style: 'cinematic', platform: 'sora', customInstructions: 'Golden hour mood' } },
                        { id: 'ro1', type: 'render-output', x: 920, y: 200, params: { renderEngine: 'cycles', resolution: '4K', format: 'mp4', quality: 90, frameRate: '24' } },
                    ],
                    connections: [
                        { id: 'c1', fromNode: 'wa1', fromOutput: 'worldDNA', toNode: 'sc1', toInput: 'worldDNA' },
                        { id: 'c2', fromNode: 'sc1', fromOutput: 'sceneBlueprint', toNode: 'cc1', toInput: 'sceneBlueprint' },
                        { id: 'c3', fromNode: 'wa1', fromOutput: 'worldDNA', toNode: 'lr1', toInput: 'worldDNA' },
                        { id: 'c4', fromNode: 'sc1', fromOutput: 'sceneBlueprint', toNode: 'lr1', toInput: 'sceneBlueprint' },
                        { id: 'c5', fromNode: 'wa1', fromOutput: 'worldDNA', toNode: 'pg1', toInput: 'worldDNA' },
                        { id: 'c6', fromNode: 'sc1', fromOutput: 'sceneBlueprint', toNode: 'pg1', toInput: 'sceneBlueprint' },
                        { id: 'c7', fromNode: 'cc1', fromOutput: 'cameraData', toNode: 'pg1', toInput: 'cameraData' },
                        { id: 'c8', fromNode: 'lr1', fromOutput: 'lightingData', toNode: 'pg1', toInput: 'lightingData' },
                        { id: 'c9', fromNode: 'cc1', fromOutput: 'cameraData', toNode: 'ro1', toInput: 'cameraData' },
                        { id: 'c10', fromNode: 'lr1', fromOutput: 'lightingData', toNode: 'ro1', toInput: 'lightingData' },
                    ],
                });
                console.log('  ✓ Seeded extended workflow: Lighting & Render Pipeline');
            }
        }
    } catch (e) { console.error('Workflow seed error:', e.message, e.stack); }

    // ===== Performance Middleware =====
    setupPerformance(app);

    // ===== Logging =====
    app.use(httpLogger);
    app.use(requestLogger);

    // ===== Body Parsing =====
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());
    
    // ===== Static Files with Cache Headers =====
    const staticOptions = {
        maxAge: '1d',           // Cache for 1 day
        etag: true,             // Enable ETag
        lastModified: true,     // Enable Last-Modified
        setHeaders: (res, filePath) => {
            // Long cache for immutable assets (CSS/JS with hash)
            if (filePath.match(/\.(css|js)$/)) {
                res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
            }
            // No cache for HTML
            if (filePath.endsWith('.html')) {
                res.setHeader('Cache-Control', 'no-cache, must-revalidate');
            }
            // Service Worker - no cache
            if (filePath.endsWith('sw.js')) {
                res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            }
        }
    };
    app.use(express.static(path.join(__dirname, 'public'), staticOptions));

    // ===== CORS =====
    app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        if (req.method === 'OPTIONS') return res.sendStatus(200);
        next();
    });

    // ===== Content Moderation on write endpoints =====
    
    
    // ===== Request Timeout (30s) =====
    app.use((req, res, next) => {
        req.setTimeout(30000, () => {
            res.status(408).json({ error: '請求超時' });
        });
        next();
    });
    
    // ===== Simple Rate Limiting (100 req/min per IP) =====
    const rateLimitMap = new Map();
    function rateLimit(maxRequests = 100, windowMs = 60000) {
        return (req, res, next) => {
            const ip = req.ip || req.connection.remoteAddress;
            const now = Date.now();
            const record = rateLimitMap.get(ip) || { count: 0, reset: now + windowMs };
            if (now > record.reset) {
                record.count = 0;
                record.reset = now + windowMs;
            }
            record.count++;
            rateLimitMap.set(ip, record);
            if (record.count > maxRequests) {
                return res.status(429).json({ error: '請求太頻繁，請稍後再試' });
            }
            next();
        };
    }
    
    // Apply rate limit to all API routes
    app.use('/api', rateLimit(200, 60000));
    
// ===== API Response Cache (read-only endpoints) =====
    const apiCache = new Map();
    function cacheMiddleware(ttl = 60) {
        return (req, res, next) => {
            if (req.method !== 'GET') return next();
            const key = req.originalUrl;
            const cached = apiCache.get(key);
            if (cached && Date.now() - cached.time < ttl * 1000) {
                res.set('X-Cache', 'HIT');
                return res.json(cached.data);
            }
            const originalJson = res.json.bind(res);
            res.json = (data) => {
                apiCache.set(key, { data, time: Date.now() });
                // Evict old entries
                if (apiCache.size > 500) {
                    const oldest = apiCache.keys().next().value;
                    apiCache.delete(oldest);
                }
                res.set('X-Cache', 'MISS');
                return originalJson(data);
            };
            next();
        };
    }
    
    // Cache camera data (rarely changes)
    app.use('/api/camera', cacheMiddleware(300));
    app.use('/api/prompts/templates', cacheMiddleware(300));
    
app.use('/api/stories', ContentModeration.middleware({ fields: ['content', 'title', 'summary'] }));

    // ===== API Routes =====
    app.use('/api/auth', require('./routes/auth.mongo')(models));
    app.use('/api/stories', require('./routes/stories.mongo')(models));
    app.use('/api/prompts', require('./routes/prompts.mongo')(models));
    app.use('/api/camera', require('./routes/camera.mongo')(models));
    app.use('/api/tools', require('./routes/tools.mongo')(models));
    app.use('/api/llm', require('./routes/llm.mongo')(models));
    app.use('/api/admin', require('./routes/admin.mongo')(models));
    app.use('/api/workflows', require('./routes/workflows.mongo')(models));
    app.use('/api/credits', require('./routes/credits.mongo')(models));

    // ===== SSE Streaming Endpoint =====
    app.post('/api/llm/stream', require('./middleware/auth').authMiddleware, async (req, res) => {
        const { prompt, systemPrompt, provider, tier, model, maxTokens, temperature } = req.body;
        await streamingService.streamChat(req, res, { prompt, systemPrompt, provider, tier, model, maxTokens, temperature });
    });

    // ===== Health Check =====
    app.get('/api/health', (req, res) => {
        res.json({
            status: 'ok',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
            memory: process.memoryUsage(),
        });
    });

    // ===== Landing Page（首頁） =====
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'landing.html'));
    });

    // ===== App 路由（SPA） =====
    app.get('/app', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    // ===== robots.txt 與 sitemap.xml =====
    app.get('/robots.txt', (req, res) => {
        res.type('text/plain');
        res.send(`User-agent: *
Allow: /
Disallow: /api/
Sitemap: https://storyforge.ai/sitemap.xml`);
    });

    app.get('/sitemap.xml', (req, res) => {
        res.type('application/xml');
        res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://storyforge.ai/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://storyforge.ai/app</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
</urlset>`);
    });

    // ===== SPA Fallback =====
    app.get('*', (req, res) => {
        if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'API端點不存在' });
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    // ===== Error Handler =====
    app.use((err, req, res, next) => {
        logger.error('Unhandled error', { error: err.message, stack: err.stack, url: req.originalUrl });
        res.status(500).json({ error: '伺服器內部錯誤' });
    });

    app.listen(PORT, () => {
        logger.info(`StoryForge AI started on port ${PORT}`);
        console.log(`
╔══════════════════════════════════════════════════════╗
║                                                      ║
║   🎭 StoryForge AI - Production Ready                ║
║                                                      ║
║   🌐 http://localhost:${PORT}                           ║
║   📊 Admin: http://localhost:${PORT}/admin                ║
║   💚 Health: http://localhost:${PORT}/api/health           ║
║                                                      ║
║   管理員: admin / admin123 | 用戶: demo / demo123    ║
║   🗄️  MongoDB | 📦 Compression | 🔒 Rate Limiting    ║
║   📝 Winston Logger | 🛡️ Content Moderation           ║
║   🌊 SSE Streaming | 🐳 Docker Ready                  ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
        `);
    });
})();
