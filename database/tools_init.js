const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'story_platform.db');
const TOOLS_SCHEMA = path.join(__dirname, 'tools_schema.sql');

function initToolsData() {
    console.log('🛠️  正在初始化工具數據...');

    const db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    const schema = fs.readFileSync(TOOLS_SCHEMA, 'utf8');
    db.exec(schema);
    console.log('  ✓ 工具數據表已創建');

    // ========== 故事模板 ==========
    const insertTemplate = db.prepare(`INSERT INTO story_templates (name, description, category_id, genre, tone, target_audience, outline, opening, character_template, writing_tips, difficulty, icon) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);

    const storyTemplates = [
        ['英雄之旅', '經典的英雄冒險敘事結構，適合奇幻和冒險類故事', 1, '奇幻冒險', '史詩壯闊', '青少年及成人',
            '第一幕：平凡世界 → 冒險召喚 → 拒絕召喚 → 遇見導師 → 跨越第一道門檻\n第二幕：考驗、盟友與敵人 → 接近最深的洞穴 → 嚴峻考驗 → 獲得獎賞\n第三幕：返回之路 → 復活 → 攜帶萬能藥歸來',
            '在遙遠的山谷裡，住著一個從未離開過村莊的年輕人。他不知道的是，命運早已為他準備好了一場改變世界的冒險...',
            '{"主角":{"role":"普通人→英雄","traits":"善良、好奇、不自信"},"導師":{"role":"智者","traits":"神秘、經驗豐富"},"反派":{"role":"黑暗勢力","traits":"強大、有說服力的動機"}}',
            '1. 英雄的缺陷比能力更重要\n2. 導師不能代替英雄完成旅程\n3. 反派應該有合理的動機\n4. 每個考驗都應該推動角色成長',
            'beginner', '⚔️'],

        ['校園青春物語', '以校園為背景的青春成長故事，適合輕鬆或感人類型', 10, '校園青春', '輕鬆溫馨', '青少年',
            '第一幕：新學期開始 → 遇見重要的人 → 發現問題/挑戰\n第二幕：共同經歷 → 友情/愛情萌芽 → 衝突與誤會\n第三幕：和解 → 成舉 → 畢業/告別',
            '九月的陽光透過教室的窗戶灑進來，照亮了那個空著的座位。我從沒想過，那個座位會改變我的整個高中生活...',
            '{"主角":{"role":"學生","traits":"普通但有特點"},"摯友":{"role":"最好的朋友","traits":"性格互補"},"暗戀對象":{"role":"心動的人","traits":"有吸引力但有秘密"}}',
            '1. 校園生活的細節很重要\n2. 青春的煩惱要真實\n3. 不要回避成長的痛苦\n4. 結局可以是開放式的',
            'beginner', '🎓'],

        ['密室懸案', '經典的密室推理結構，適合懸疑推理類', 3, '懸疑推理', '緊張懸疑', '推理迷',
            '第一幕：發現犯罪 → 建立封閉環境 → 介紹嫌疑人\n第二幕：調查 → 發現線索 → 排除嫌疑人 → 新發現推翻舊結論\n第三幕：真相揭示 → 動機說明 → 正義實現',
            '門從裡面鎖上了。當他們終於破門而入時，發現房間裡只有一具屍體和一扇打開的窗戶。但窗戶外面，是三十層樓的高空...',
            '{"偵探":{"role":"主角","traits":"觀察力強、有個人缺陷"},"嫌疑人A":{"role":"看似無辜","traits":"有隱藏動機"},"嫌疑人B":{"role":"最大嫌疑人","traits":"有不在場證明"}}',
            '1. 所有線索必須在真相揭示前出現\n2. 讀者應該有機會自己推理\n3. 不要使用超自然手段解釋\n4. 動機比手法更重要',
            'intermediate', '🔍'],

        ['末日生存', '文明崩塌後的生存故事，適合緊張刺激類', 11, '末日生存', '緊張沉重', '成人',
            '第一幕：災難發生 → 秩序崩塌 → 主角求生\n第二幕：遇見其他倖存者 → 建立據點 → 面對人性考驗\n第三幕：最大的威脅 → 犧牲與選擇 → 新的希望或毀滅',
            '當最後一座城市熄滅了燈光，世界陷入了真正的黑暗。在這片廢墟之中，還有呼吸的人，都在尋找活下去的理由...',
            '{"主角":{"role":"倖存者","traits":"堅強但有創傷"},"盟友":{"role":"信任的人","traits":"有能力但有秘密"},"對手":{"role":"競爭者","traits":"為了生存不擇手段"}}',
            '1. 末日設定要有合理性\n2. 人性比怪物更可怕\n3. 物資短缺要體現在情節中\n4. 希望和絕望要交替出現',
            'advanced', '☢️'],

        ['甜蜜戀曲', '浪漫愛情故事的核心結構', 4, '浪漫愛情', '甜蜜溫馨', '成人',
            '第一幕：初遇 → 印象不佳 → 被迫相處\n第二幕：逐漸了解 → 心動時刻 → 表白/被表白\n第三幕：外部阻礙 → 誤會分離 → 和好 → 幸福結局',
            '如果我知道那天在咖啡館裡遇見的人會改變我的人生，我一定會穿得更好看一點。但命運就是這樣，在你最不經意的時候，安排最美的邂逅...',
            '{"主角A":{"role":"女主","traits":"獨立、有事業心"},"主角B":{"role":"男主","traits":"溫柔但有過去"},"情敵":{"role":"第三者","traits":"不壞但有執念"}}',
            '1. 愛情需要建立在相互了解上\n2. 衝突不要過於狗血\n3. 配角也要有血有肉\n4. 甜蜜和苦澀要平衡',
            'beginner', '💕'],

        ['武俠恩仇錄', '傳統武俠敘事結構', 9, '武俠江湖', '快意恩仇', '武俠愛好者',
            '第一幕：身世之謎 → 拜師學藝 → 初入江湖\n第二幕：結識朋友 → 發現真相 → 面對抉擇\n第三幕：最終對決 → 恩怨了結 → 歸隱或繼續行走',
            '江湖上都說，十年前那場滅門慘案已經沒有人記得了。但他們錯了。有些人，有些仇恨，是不會被時間沖淡的...',
            '{"主角":{"role":"復仇者","traits":"堅毅、重情義"},"紅顏知己":{"role":"亦敵亦友","traits":"武功高強、身份神秘"},"大反派":{"role":"滅門仇人","traits":"表面正義、實則陰險"}}',
            '1. 武功設定要有體系\n2. 江湖規矩要建立\n3. 情義比武功更重要\n4. 武俠的核心是「俠」',
            'intermediate', '🗡️'],

        ['賽博朋克偵探', '未來都市的偵探故事', 12, '賽博朋克', '陰暗壓抑', '成人',
            '第一幕：接到案件 → 進入陰暗面 → 發現陰謀\n第二幕：深入調查 → 科技與人性衝突 → 身份危機\n第三幕：真相大白 → 道德抉擇 → 改變或被改變',
            '2157年的新東京，霓虹燈永不熄滅。在這座城市最底層的街道上，一個改造了70%身體的私家偵探，接到了一個看似普通的失蹤案...',
            '{"偵探":{"role":"主角","traits":"改造人、有道德底線"},"AI夥伴":{"role":"助手","traits":"人工智慧、開始有自我意識"},"企業高層":{"role":"幕後黑手","traits":"表面光鮮、控制一切"}}',
            '1. 科技設定要合理且一致\n2. 探討人機界限\n3. 都市的陰暗面要具體\n4. 高科技低生活的反差',
            'advanced', '🤖'],

        ['美食暖心故事', '以美食為載體的溫情故事', 7, '都市生活', '溫馨治癒', '所有讀者',
            '第一幕：主角遇到困境 → 進入美食場景 → 嘗到特別的味道\n第二幕：美食背後的故事 → 人與人的連結 → 治癒過程\n第三幕：困境解決 → 新的開始 → 美食的意義',
            '凌晨兩點，城市已經睡了。但在街角那家小餐館裡，燈還亮著。老闆正在煮一鍋湯，那鍋湯的香味，能讓最疲憊的靈魂找到歸處...',
            '{"主角":{"role":"食客","traits":"有故事的人"},"廚師":{"role":"老闆","traits":"溫暖、有智慧"},"常客":{"role":"配角","traits":"各有各的故事"}}',
            '1. 美食描寫要具體誘人\n2. 每道菜都有故事\n3. 溫情不等於膚淺\n4. 生活的哲理要自然融入',
            'beginner', '🍜'],
    ];

    db.transaction(() => { for (const t of storyTemplates) insertTemplate.run(...t); })();
    console.log(`  ✓ ${storyTemplates.length} 個故事模板已初始化`);

    // ========== 寫作提示/每日靈感 ==========
    const insertPrompt = db.prepare(`INSERT INTO writing_prompts (prompt_type, content, genre, difficulty) VALUES (?,?,?,?)`);

    const writingPrompts = [
        // 開頭提示
        ['opening', '「如果你能回到過去，你最想改變的是什麼？」這個問題，她已經問了自己無數遍。', '通用', 'all'],
        ['opening', '那天早上，我發現鏡子裡的自己多了一根白頭髮。這本來沒什麼，但那根白頭髮的位置，和昨天死去的那個人一模一樣。', '懸疑', 'intermediate'],
        ['opening', '世界在這一天結束了。不是以爆炸，不是以冰封，而是以一種所有人都沒有想到的方式——安靜地，像一盞燈被關掉。', '末日', 'advanced'],
        ['opening', '她打開了那封遲到了十年的信。信上只有一個字：「跑。」', '懸疑', 'all'],
        ['opening', '在這個城市裡，有一家只在午夜開門的書店。書架上擺的不是書，而是故事——用玻璃瓶裝著的，會發光的故事。', '奇幻', 'beginner'],

        // 角色提示
        ['character', '一個能聽見別人內心聲音的人，卻選擇了裝聾作啞二十年。直到有一天，他聽見了一個聲音說：「我知道你能聽見我。」', '通用', 'all'],
        ['character', '一個從不流淚的人。不是因為堅強，而是因為小時候的一個承諾——「如果我哭了，世界就會下雨。」', '奇幻', 'intermediate'],
        ['character', '一個失去了所有記憶的人，口袋裡只有一張照片。照片上是他自己，但他完全不認識照片裡的那個人。', '懸疑', 'all'],
        ['character', '一個在AI公司工作了三十年的程式設計師，突然發現自己才是公司裡最後一個「真正的人類」。', '科幻', 'advanced'],

        // 衝突提示
        ['conflict', '兩個最好的朋友同時愛上了同一個人。而那個人，其實是一個AI。', '科幻', 'intermediate'],
        ['conflict', '主角發現自己活在一本小說裡，而作者正在寫最後一章。', '奇幻', 'advanced'],
        ['conflict', '一個醫生發現，治癒一種疾病的唯一方法，是犧牲另一個人的生命。而那個另一個人，是他的女兒。', '通用', 'advanced'],
        ['conflict', '城市裡的所有人都同時做了一個相同的夢。夢裡，他們被告知：「明天，你們中的一個人必須死。」', '懸疑', 'intermediate'],

        // 世界觀提示
        ['world', '在一個以音樂為貨幣的世界裡，窮人是沉默的，富人是喧囂的。而主角，是一個天生失聰的人。', '奇幻', 'advanced'],
        ['world', '這個世界的記憶是可以交易的。窮人賣掉記憶換取食物，富人購買記憶體驗不同的人生。', '科幻', 'intermediate'],
        ['world', '在一個沒有谎言的世界裡，突然出現了一個會說謊的人。他被視為先知，還是騙子？', '奇幻', 'all'],

        // 對話提示
        ['dialogue', '「你為什麼要救我？」「因為只有你知道那扇門後面是什麼。」', '通用', 'all'],
        ['dialogue', '「如果我告訴你真相，你不會相信的。」「試試看。」「這個世界，是我夢出來的。」', '奇幻', 'intermediate'],
        ['dialogue', '「你殺了人。」「我知道。」「你不後悔嗎？」「我後悔的不是殺了他，而是沒有早點殺他。」', '懸疑', 'advanced'],

        // 反轉提示
        ['twist', '主角花了整個故事追蹤的連環殺手，最後發現是自己的另一個人格。', '懸疑', 'advanced'],
        ['twist', '拯救世界的英雄，最後發現自己才是最大的威脅——他的存在本身就在消耗世界的能量。', '科幻', 'advanced'],
        ['twist', '主角一直以為自己是人類，最後發現自己是被製造出來的AI，而那些「記憶」都是被植入的。', '科幻', 'intermediate'],

        // 結局提示
        ['ending', '他終於到達了山頂。但那裡什麼都沒有，只有一面鏡子。鏡子裡，是他自己年輕時的臉。', '通用', 'all'],
        ['ending', '最後，她選擇了遺忘。不是因為恨，而是因為只有遺忘，才能讓那個人真正地自由。', '通用', 'intermediate'],
        ['ending', '門打開了。外面不是光明，也不是黑暗。外面是另一扇門。而那扇門上寫著：「歡迎回家。」', '奇幻', 'all'],
    ];

    db.transaction(() => { for (const p of writingPrompts) insertPrompt.run(...p); })();
    console.log(`  ✓ ${writingPrompts.length} 個寫作提示已初始化`);

    // ========== 默認用戶偏好 ==========
    const insertPref = db.prepare(`INSERT OR IGNORE INTO user_preferences (user_id) VALUES (?)`);
    db.transaction(() => { for (let i = 1; i <= 5; i++) insertPref.run(i); })();
    console.log('  ✓ 用戶偏好已初始化');

    // ========== 默認閱讀清單 ==========
    const insertList = db.prepare(`INSERT INTO reading_lists (user_id, name, description) VALUES (?, ?, ?)`);
    const insertListItem = db.prepare(`INSERT OR IGNORE INTO reading_list_items (list_id, story_id) VALUES (?, ?)`);
    
    db.prepare(`INSERT INTO reading_lists (user_id, name, description) VALUES (2, '我的收藏', '收藏的精彩故事')`).run();
    db.prepare(`INSERT INTO reading_lists (user_id, name, description) VALUES (3, '武俠精選', '最喜歡的武俠故事')`).run();
    
    // Add some items
    const list1 = db.prepare(`SELECT id FROM reading_lists WHERE user_id = 2`).get();
    if (list1) {
        db.transaction(() => {
            insertListItem.run(list1.id, 3);
            insertListItem.run(list1.id, 4);
            insertListItem.run(list1.id, 5);
        })();
    }
    console.log('  ✓ 閱讀清單已初始化');

    db.close();
    console.log('\n✅ 工具數據初始化完成！');
}

initToolsData();
