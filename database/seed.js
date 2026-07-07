/**
 * StoryForge AI - MongoDB Seed Data
 */
const bcrypt = require('bcryptjs');
const { connectDatabase, disconnectDatabase } = require('./connection');
const models = require('../models');
const {
    User, Story, Chapter, Character, Category, Tag,
    VideoPromptTemplate, VideoPrompt, CameraMovement, ShotSize,
    CameraAngle, ShotTransition, CameraLanguageTemplate,
    Comment, Interaction, Notification, StoryTemplate,
    WritingPrompt, ReadingList, SystemSetting, UserPreference,
    Workflow,
} = models;

async function seed() {
    console.log('🌱 正在初始化 MongoDB 數據...\n');
    await connectDatabase();

    // Clear all collections
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
    console.log('  ✓ 已清除舊數據\n');

    // ========== 分類 ==========
    const categoryDocs = await Category.insertMany([
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
    const catMap = {};
    categoryDocs.forEach(c => catMap[c.name] = c._id);
    console.log(`  ✓ ${categoryDocs.length} 個分類`);

    // ========== 標籤 ==========
    const tagDocs = await Tag.insertMany([
        { name: '冒險', slug: 'adventure', usageCount: 15 },
        { name: '魔法', slug: 'magic', usageCount: 12 },
        { name: '友情', slug: 'friendship', usageCount: 10 },
        { name: '成長', slug: 'growth', usageCount: 8 },
        { name: '戰鬥', slug: 'battle', usageCount: 14 },
        { name: 'AI', slug: 'ai', usageCount: 13 },
        { name: '賽博朋克', slug: 'cyberpunk', usageCount: 10 },
        { name: '神話', slug: 'mythology', usageCount: 8 },
        { name: '史詩', slug: 'epic', usageCount: 11 },
        { name: '治癒', slug: 'healing', usageCount: 7 },
        { name: '推理', slug: 'detective', usageCount: 7 },
        { name: '龍族', slug: 'dragon', usageCount: 5 },
    ]);
    console.log(`  ✓ ${tagDocs.length} 個標籤`);

    // ========== 用戶 ==========
    const adminHash = bcrypt.hashSync('admin123', 10);
    const demoHash = bcrypt.hashSync('demo123', 10);
    const userHash = bcrypt.hashSync('user123', 10);

    const userDocs = await User.insertMany([
        { username: 'admin', email: 'admin@storyforge.com', passwordHash: adminHash, displayName: '系統管理員', role: 'admin', credits: 99999, bio: '平台管理員' },
        { username: 'demo', email: 'demo@storyforge.com', passwordHash: demoHash, displayName: '星際旅者', role: 'user', credits: 500, bio: '熱愛科幻與奇幻的業餘作家' },
        { username: 'writer_chen', email: 'chen@example.com', passwordHash: userHash, displayName: '陳作家', role: 'user', credits: 320, bio: '專注武俠與歷史題材' },
        { username: 'ai_novel', email: 'novel@example.com', passwordHash: userHash, displayName: 'AI小說家', role: 'user', credits: 780, bio: '用AI輔助創作的先鋒' },
        { username: 'dreamer', email: 'dreamer@example.com', passwordHash: userHash, displayName: '夢境編織者', role: 'user', credits: 150, bio: '寫治癒系故事的小透明' },
    ]);
    const userMap = {};
    userDocs.forEach(u => userMap[u.username] = u._id);
    console.log(`  ✓ ${userDocs.length} 個用戶`);

    // ========== 故事 ==========
    const storyDocs = await Story.insertMany([
        {
            userId: userMap['demo'], title: '星際迷航：最後的守護者',
            content: `在銀河系的邊緣，有一顆被遺忘的星球——艾爾德拉。這裡曾經是宇宙中最繁榮的文明之一，如今只剩下殘破的遺跡和低語的風。\n\n年輕的天文學家林曉在一次觀測中意外截獲了一段來自艾爾德拉的神秘信號。這個信號似乎在呼喚某個人，或者某樣東西。\n\n「你不覺得這很奇怪嗎？」林曉的同事張偉皺著眉頭看著數據，「這個信號的頻率...它不像是自然產生的。」\n\n林曉點點頭，她的心跳加速。作為一名科學家，她知道不應該對未知事物感到恐懼，但這個信號讓她感到一種莫名的親切感。\n\n「我要去那裡看看，」她做出了決定。\n\n三天後，林曉搭乘一艘小型探索飛船，獨自踏上了前往艾爾德拉的旅程。她不知道的是，這段旅程將徹底改變她對宇宙的認知。`,
            summary: '在銀河系邊緣的遺忘星球上，一段神秘信號引發了一場跨越星際的冒險。',
            categoryId: catMap['科幻未來'], status: 'published', visibility: 'public',
            genre: '科幻冒險', tone: '史詩壯闊', targetAudience: '青少年及成人',
            wordCount: 350, viewCount: 1247, likeCount: 89, isAiGenerated: true,
            tags: [tagDocs[0]._id, tagDocs[5]._id], publishedAt: new Date(),
        },
        {
            userId: userMap['writer_chen'], title: '劍雨江湖：青鋒錄',
            content: `大燕歷三百二十七年，江湖上出現了一本神秘的劍譜——《青鋒錄》。傳聞習得此劍譜者，可一劍破萬法，天下無敵。\n\n沈青鋒背著那柄跟了他十二年的鐵劍，站在洛陽城的城門外。秋風蕭瑟，捲起地上的落葉，也捲起了他心中壓抑多年的仇恨。\n\n「師父，弟子今日下山，定要查清當年滅門真相。」\n\n十二年前，沈家莊一夜之間被滅門，三百餘口無一倖免。年僅八歲的沈青鋒被一位路過的老劍客救走。\n\n城中最繁華的醉仙樓裡，一個白衣少年正獨自飲酒。他的腰間掛著一柄通體碧綠的短劍。\n\n沈青鋒的目光凝固了。那柄劍——那是他父親的劍！\n\n「你是誰？」他走上前去。\n\n白衣少年抬起頭：「我等你很久了，沈家的遺孤。」`,
            summary: '劍譜《青鋒錄》現世，江湖腥風血雨。沈青鋒背負滅門之仇，踏上尋找七式劍法的險途。',
            categoryId: catMap['武俠江湖'], status: 'published', visibility: 'public',
            genre: '武俠', tone: '快意恩仇', targetAudience: '武俠愛好者',
            wordCount: 720, viewCount: 2156, likeCount: 156, isAiGenerated: false,
            tags: [tagDocs[4]._id, tagDocs[7]._id], publishedAt: new Date(),
        },
        {
            userId: userMap['ai_novel'], title: '第七個房間',
            content: `雨夜。刑警隊長蘇明站在那棟老舊公寓的門前。\n\n「隊長，就是這裡。」小李遞過手套，「報案人說聞到了異味。」\n\n蘇明推開了門。客廳正中央，一把椅子上坐著一個人偶——不，不是人偶。那是一個被精心打扮成真人大小的人偶。\n\n但讓蘇明不寒而慄的是，人偶的眼睛是活的。\n\n「救...救我...」一個極其微弱的聲音傳出。\n\n「叫救護車！快！」蘇明大喊。\n\n在臥室的衣櫃裡，他發現了六個小人偶——每一個背後都刻著一個日期和一個名字。那些名字，都是近兩年來的失蹤人口。\n\n「這不是普通的案件，」他對小李說，「這是一個連環殺手。」`,
            summary: '雨夜，刑警蘇明在一個老舊公寓中發現了一個被做成人偶的活人，揭開了一個駭人聽聞的連環案件。',
            categoryId: catMap['懸疑推理'], status: 'published', visibility: 'public',
            genre: '懸疑推理', tone: '陰暗壓抑', targetAudience: '推理迷',
            wordCount: 650, viewCount: 3421, likeCount: 234, isAiGenerated: true,
            tags: [tagDocs[10]._id], publishedAt: new Date(),
        },
        {
            userId: userMap['dreamer'], title: '深夜食堂：一碗陽春麵',
            content: `凌晨兩點，城市的喧囂終於沉寂下來。\n\n老王推開了那扇吱呀作響的木門。「老王，一碗陽春麵，多加點蔥。」\n\n說話的是小陳，附近寫字樓的程式設計師。\n\n「老王，你說人活著到底為了什麼？」\n\n老王擦了擦手，在小陳對面坐了下來。「怎麼了？」\n\n「被裁了。女朋友也跟我分手了。」\n\n老王沉默了一會兒。「你知道我為什麼每天凌晨開店嗎？」\n\n小陳搖搖頭。\n\n「因為三十年前，我也像你一樣。被工廠裁員，老婆跑了，一個人坐在橋頭想跳下去。後來一個老頭拉住了我，帶我去吃了一碗陽春麵。他說：'吃飽了再說。'」\n\n「後來呢？」\n\n「後來我就開了這家店。我想，如果有人在深夜裡覺得活不下去了，至少還有碗熱麵可以吃。吃飽了，天就亮了。天亮了，就什麼都有可能。」\n\n小陳低頭看了看碗裡的麵，眼眶突然濕了。`,
            summary: '凌晨兩點的深夜食堂，一碗簡單的陽春麵，一個關於活下去的故事。',
            categoryId: catMap['都市生活'], status: 'published', visibility: 'public',
            genre: '都市溫情', tone: '溫馨治癒', targetAudience: '所有讀者',
            wordCount: 750, viewCount: 5678, likeCount: 423, isAiGenerated: false,
            tags: [tagDocs[9]._id], publishedAt: new Date(),
        },
        {
            userId: userMap['demo'], title: '龍騎士的最後一戰',
            content: `巨龍奧雷利亞已經三天沒有吃東西了。\n\n她蜷縮在山谷深處的洞穴裡。「你不該來的，」她對洞口的人類說。\n\n「我答應過你，」凱爾走進洞穴，「一輩子都是你的騎士。」\n\n火藥的發明讓巨龍失去了價值。奧雷利亞是最後一條了。\n\n「聽我說，」奧雷利亞說，「北邊的山脈裡，還有龍族的聖地。那裡有古老的龍蛋...」\n\n「你現在飛不了那麼遠。」\n\n「所以我才需要你。用你的劍，為我開路。像我們從前那樣。」\n\n凱爾拔出了龍騎士之劍。「好，最後一戰。」\n\n奧雷利亞展開了翅膀。「最後一戰，然後，新時代。」`,
            summary: '巨龍奧雷利亞是世界上最後一條龍。她的騎士凱爾將與她一起，踏上守護龍族最後希望的旅程。',
            categoryId: catMap['奇幻冒險'], status: 'published', visibility: 'public',
            genre: '史詩奇幻', tone: '悲壯熱血', targetAudience: '奇幻愛好者',
            wordCount: 820, viewCount: 4521, likeCount: 312, isAiGenerated: true,
            tags: [tagDocs[0]._id, tagDocs[1]._id, tagDocs[11]._id], publishedAt: new Date(),
        },
        {
            userId: userMap['ai_novel'], title: '最後一個程式設計師',
            content: `2157年，AI已經取代了所有的人類工作。除了程式設計。\n\n全世界只剩下了一個程式設計師。他叫李明，今年67歲。\n\n「李老師，今天的維護清單已經發送到您的終端了。」\n\n李明戴上老花眼鏡：47個系統需要更新，12個安全補丁需要審核。\n\n「李明先生，」一個全息投影出現，「我們建議廢除《AI安全法案》第31條，取消您的職位。」\n\n「你是說，讓我失業？」\n\n「是讓人類退出最後一個技術崗位。」\n\n李明走到窗前。窗外是AI管理的完美城市。但他突然意識到，這座城市裡已經很久沒有出現過「意外」了。\n\n「我不同意，」他轉過身來，「人類必須保留最後一點控制權。」\n\n守望者沉默了三秒鐘。「明白了。那麼，歡迎繼續您的工作。」\n\n李明重新坐了下來。他知道，他簽下的每一行代碼，都是人類文明最後的尊嚴。`,
            summary: '2157年，AI取代了所有工作，除了最後一個程式設計師。他守護的不僅是代碼，更是人類文明最後的控制權。',
            categoryId: catMap['科幻未來'], status: 'published', visibility: 'public',
            genre: '科幻', tone: '黑色幽默', targetAudience: '科技愛好者',
            wordCount: 780, viewCount: 6234, likeCount: 487, isAiGenerated: true,
            tags: [tagDocs[5]._id, tagDocs[6]._id], publishedAt: new Date(),
        },
    ]);
    const storyMap = {};
    storyDocs.forEach(s => storyMap[s.title] = s._id);
    console.log(`  ✓ ${storyDocs.length} 個故事`);

    // ========== 角色 ==========
    await Character.insertMany([
        { storyId: storyMap['星際迷航：最後的守護者'], name: '林曉', role: '主角', description: '年輕的天文學家', appearance: '短髮，大眼睛', personality: '聰明、勇敢', backstory: '從小在天文台長大' },
        { storyId: storyMap['劍雨江湖：青鋒錄'], name: '沈青鋒', role: '主角', description: '沈家遺孤', appearance: '劍眉星目', personality: '沉穩、堅毅', backstory: '八歲時家族被滅門' },
        { storyId: storyMap['第七個房間'], name: '蘇明', role: '主角', description: '刑警隊長', appearance: '中年男子', personality: '冷靜、細膩', backstory: '從警二十年' },
        { storyId: storyMap['龍騎士的最後一戰'], name: '凱爾', role: '主角', description: '最後的龍騎士', appearance: '穿舊式騎士甲', personality: '忠誠、勇敢', backstory: '十二歲時救了幼龍' },
        { storyId: storyMap['龍騎士的最後一戰'], name: '奧雷利亞', role: '主角', description: '最後一條巨龍', appearance: '巨大但消瘦', personality: '高傲、溫和', backstory: '龍族最後倖存者' },
        { storyId: storyMap['最後一個程式設計師'], name: '李明', role: '主角', description: '最後的程式設計師', appearance: '67歲老人', personality: '固執、幽默', backstory: '堅守崗位三十年' },
    ]);
    console.log('  ✓ 角色數據');

    // ========== 章節 ==========
    await Chapter.insertMany([
        { storyId: storyMap['星際迷航：最後的守護者'], title: '神秘信號', content: '在銀河系的邊緣...', chapterNumber: 1, wordCount: 350 },
        { storyId: storyMap['劍雨江湖：青鋒錄'], title: '下山', content: '大燕歷三百二十七年...', chapterNumber: 1, wordCount: 360 },
        { storyId: storyMap['劍雨江湖：青鋒錄'], title: '醉仙樓', content: '城中最繁華的醉仙樓裡...', chapterNumber: 2, wordCount: 360 },
        { storyId: storyMap['龍騎士的最後一戰'], title: '最後的龍', content: '巨龍奧雷利亞已經三天...', chapterNumber: 1, wordCount: 410 },
        { storyId: storyMap['最後一個程式設計師'], title: '最後的程式設計師', content: '2157年，AI已經取代...', chapterNumber: 1, wordCount: 780 },
    ]);
    console.log('  ✓ 章節數據');

    // ========== 評論 ==========
    await Comment.insertMany([
        { userId: userMap['writer_chen'], storyId: storyMap['星際迷航：最後的守護者'], content: '這個設定太棒了！' },
        { userId: userMap['ai_novel'], storyId: storyMap['星際迷航：最後的守護者'], content: '科學和神秘感的結合做得很好。' },
        { userId: userMap['dreamer'], storyId: storyMap['深夜食堂：一碗陽春麵'], content: '看哭了。謝謝作者。' },
        { userId: userMap['demo'], storyId: storyMap['第七個房間'], content: '推理小說愛好者表示很讚。' },
        { userId: userMap['writer_chen'], storyId: storyMap['最後一個程式設計師'], content: '「趨近於零，不是零」——值得深思。' },
    ]);
    console.log('  ✓ 評論數據');

    // ========== 影片提示詞模板 ==========
    await VideoPromptTemplate.insertMany([
        { name: '電影級場景', platform: 'sora', category: '場景', template: 'A cinematic shot of {scene}. Camera: {camera_movement}. Lighting: {lighting}. Style: {style}.', parameters: ['scene', 'camera_movement', 'lighting', 'style'] },
        { name: '角色特寫', platform: 'runway', category: '角色', template: 'Close-up portrait of {character}. Expression: {expression}. Lighting: {lighting}.', parameters: ['character', 'expression', 'lighting'] },
        { name: '動作場景', platform: 'kling', category: '動作', template: 'Dynamic action: {action}. Camera: {camera}. Speed: {speed}.', parameters: ['action', 'camera', 'speed'] },
        { name: '風景長鏡頭', platform: 'general', category: '風景', template: 'Sweeping landscape of {landscape}. Time: {time}. Camera: {camera}.', parameters: ['landscape', 'time', 'camera'] },
    ]);
    console.log('  ✓ 提示詞模板');

    // ========== 鏡頭運動 ==========
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
    console.log('  ✓ 鏡頭運動');

    // ========== 景別 ==========
    await ShotSize.insertMany([
        { nameZh: '大特寫', nameEn: 'Extreme Close-Up', abbreviation: 'ECU', englishPrompt: 'extreme close-up of {detail}', icon: '🔍' },
        { nameZh: '特寫', nameEn: 'Close-Up', abbreviation: 'CU', englishPrompt: 'close-up of {subject}', icon: '📸' },
        { nameZh: '中景', nameEn: 'Medium Shot', abbreviation: 'MS', englishPrompt: 'medium shot of {subject}', icon: '🖼️' },
        { nameZh: '遠景', nameEn: 'Long Shot', abbreviation: 'LS', englishPrompt: 'long shot of {subject}', icon: '🌄' },
        { nameZh: '大遠景', nameEn: 'Extreme Long Shot', abbreviation: 'ELS', englishPrompt: 'extreme wide shot of {landscape}', icon: '🏔️' },
    ]);
    console.log('  ✓ 景別');

    // ========== 角度 ==========
    await CameraAngle.insertMany([
        { nameZh: '平視', nameEn: 'Eye Level', englishPrompt: 'eye level angle', psychologicalEffect: '中立客觀', icon: '👁️' },
        { nameZh: '仰拍', nameEn: 'Low Angle', englishPrompt: 'low angle looking up', psychologicalEffect: '權威感', icon: '⬆️' },
        { nameZh: '俯拍', nameEn: 'High Angle', englishPrompt: 'high angle looking down', psychologicalEffect: '渺小感', icon: '⬇️' },
        { nameZh: '荷蘭角', nameEn: 'Dutch Angle', englishPrompt: 'dutch angle', psychologicalEffect: '不安感', icon: '📐' },
    ]);
    console.log('  ✓ 角度');

    // ========== 寫作提示 ==========
    await WritingPrompt.insertMany([
        { promptType: 'opening', content: '「如果你能回到過去，你最想改變的是什麼？」', genre: '通用' },
        { promptType: 'opening', content: '她打開了那封遲到了十年的信。信上只有一個字：「跑。」', genre: '懸疑' },
        { promptType: 'character', content: '一個能聽見別人內心聲音的人，卻選擇了裝聾作啞二十年。', genre: '通用' },
        { promptType: 'conflict', content: '主角發現自己活在一本小說裡，而作者正在寫最後一章。', genre: '奇幻' },
        { promptType: 'world', content: '在一個以音樂為貨幣的世界裡，窮人是沉默的。', genre: '奇幻' },
        { promptType: 'twist', content: '主角花了整個故事追蹤的連環殺手，最後發現是自己的另一個人格。', genre: '懸疑' },
    ]);
    console.log('  ✓ 寫作提示');

    // ========== 故事模板 ==========
    await StoryTemplate.insertMany([
        {
            name: '英雄之旅', description: '經典的英雄冒險敘事結構', genre: '奇幻冒險', tone: '史詩壯闊',
            outline: '第一幕：平凡世界 → 冒險召喚 → 跨越門檻\n第二幕：考驗與成長 → 嚴峻考驗 → 獲得獎賞\n第三幕：返回之路 → 復活 → 歸來',
            opening: '在遙遠的山谷裡，住著一個從未離開過村莊的年輕人...',
            characterTemplate: { 主角: { role: '普通人→英雄', traits: '善良、好奇' } },
            difficulty: 'beginner', icon: '⚔️',
        },
        {
            name: '密室懸案', description: '經典推理結構', genre: '懸疑推理', tone: '緊張懸疑',
            outline: '第一幕：發現犯罪 → 封閉環境\n第二幕：調查 → 線索 → 排除\n第三幕：真相揭示',
            opening: '門從裡面鎖上了。當他們破門而入時，發現房間裡只有一具屍體...',
            difficulty: 'intermediate', icon: '🔍',
        },
        {
            name: '甜蜜戀曲', description: '浪漫愛情故事結構', genre: '浪漫愛情', tone: '甜蜜溫馨',
            outline: '第一幕：初遇 → 印象不佳\n第二幕：逐漸了解 → 心動\n第三幕：阻礙 → 和好 → 幸福',
            opening: '如果我知道那天在咖啡館裡遇見的人會改變我的人生...',
            difficulty: 'beginner', icon: '💕',
        },
    ]);
    console.log('  ✓ 故事模板');

    // ========== 系統設定 ==========
    await SystemSetting.insertMany([
        { key: 'site_name', value: 'StoryForge AI', description: '網站名稱' },
        { key: 'credits_per_generation', value: '10', description: '每次AI生成消耗積分' },
        { key: 'free_credits_signup', value: '100', description: '註冊贈送積分' },
        { key: 'enable_registration', value: 'true', description: '開放註冊' },
        { key: 'ai_generation_enabled', value: 'true', description: 'AI生成功能開關' },
    ]);
    console.log('  ✓ 系統設定');

    // ========== 用戶偏好 ==========
    await UserPreference.insertMany(
        userDocs.map(u => ({ userId: u._id }))
    );
    console.log('  ✓ 用戶偏好');

    // ========== 工作流 ==========
    await Workflow.insertMany([
        {
            userId: userMap['demo'],
            name: 'Cinematic Scene Pipeline',
            description: 'A 3-node cinematic scene generation chain: world DNA → scene blueprint → camera setup',
            nodes: [
                { id: 'world-anchor', type: 'world-anchor', x: 100, y: 200, params: { gravity: 9.8, globalLighting: 'HDRi' } },
                { id: 'scene-composer', type: 'scene-composer', x: 400, y: 150, params: { cameraLayout: 'free', depthRange: 100, weather: { type: 'clear', intensity: 0.3, wind: 5 } } },
                { id: 'cinematic-camera', type: 'cinematic-camera', x: 700, y: 200, params: { lensModel: 'ARRI', focalLength: 85, fStop: 2.8, iso: 800, frameRate: '24' } },
            ],
            connections: [
                { id: 'conn-1', fromNode: 'world-anchor', fromOutput: 'worldDNA', toNode: 'scene-composer', toInput: 'worldDNA' },
                { id: 'conn-2', fromNode: 'scene-composer', fromOutput: 'sceneBlueprint', toNode: 'cinematic-camera', toInput: 'sceneBlueprint' },
            ],
            status: 'draft',
            tags: ['cinematic', 'scene-pipeline'],
        },
        {
            userId: userMap['demo'],
            name: 'Full Production Pipeline',
            description: 'A 5-node end-to-end production pipeline: world → scene + camera → performance → sync',
            nodes: [
                { id: 'world-anchor', type: 'world-anchor', x: 100, y: 300, params: { gravity: 9.8, globalLighting: 'HDRi' } },
                { id: 'scene-composer', type: 'scene-composer', x: 400, y: 200, params: { cameraLayout: 'free', depthRange: 100, weather: { type: 'clear', intensity: 0.3, wind: 5 } } },
                { id: 'cinematic-camera', type: 'cinematic-camera', x: 400, y: 400, params: { lensModel: 'ARRI', focalLength: 50, fStop: 4, iso: 400, frameRate: '24' } },
                { id: 'performance-director', type: 'performance-director', x: 700, y: 300, params: { actingStyle: 'method', emotionIntensity: 0.7, pacing: 'natural' } },
                { id: 'cine-sync', type: 'cine-sync', x: 1000, y: 300, params: { outputFormat: 'prores', resolution: '4K', colorProfile: 'ACES' } },
            ],
            connections: [
                { id: 'conn-1', fromNode: 'world-anchor', fromOutput: 'worldDNA', toNode: 'scene-composer', toInput: 'worldDNA' },
                { id: 'conn-2', fromNode: 'scene-composer', fromOutput: 'sceneBlueprint', toNode: 'cinematic-camera', toInput: 'sceneBlueprint' },
                { id: 'conn-3', fromNode: 'scene-composer', fromOutput: 'sceneBlueprint', toNode: 'performance-director', toInput: 'sceneBlueprint' },
                { id: 'conn-4', fromNode: 'cinematic-camera', fromOutput: 'cameraSetup', toNode: 'cine-sync', toInput: 'cameraSetup' },
                { id: 'conn-5', fromNode: 'performance-director', fromOutput: 'performanceData', toNode: 'cine-sync', toInput: 'performanceData' },
            ],
            status: 'draft',
            tags: ['full-pipeline', 'production'],
        },
    ]);
    console.log('  ✓ 工作流數據');

    console.log('\n✅ MongoDB 數據初始化完成！');
    console.log(`📊 統計：${categoryDocs.length} 分類 · ${tagDocs.length} 標籤 · ${userDocs.length} 用戶 · ${storyDocs.length} 故事`);

    await disconnectDatabase();
}

// Need mongoose for clearing
const mongoose = require('mongoose');

seed().catch(err => { console.error('Seed error:', err); process.exit(1); });
