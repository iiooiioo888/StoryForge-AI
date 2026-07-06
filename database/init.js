const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'story_platform.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

function initDatabase() {
    console.log('🗄️  正在初始化數據庫...');
    
    if (fs.existsSync(DB_PATH)) {
        fs.unlinkSync(DB_PATH);
        console.log('  ✓ 已清除舊數據庫');
    }

    const db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
    db.exec(schema);
    console.log('  ✓ 數據表已創建');

    // ========== 分類 ==========
    const insertCategory = db.prepare(`INSERT INTO categories (name, slug, description, icon, sort_order) VALUES (?, ?, ?, ?, ?)`);
    const categories = [
        ['奇幻冒險', 'fantasy-adventure', '劍與魔法的奇幻世界，充滿精靈、矮人、龍族與史詩戰役', '⚔️', 1],
        ['科幻未來', 'sci-fi', '太空探索、人工智慧、時空旅行與未來科技', '🚀', 2],
        ['懸疑推理', 'mystery', '扣人心弦的謀殺案、偵探故事與心理懸疑', '🔍', 3],
        ['浪漫愛情', 'romance', '甜蜜心動的愛情故事，從校園初戀到職場深情', '💕', 4],
        ['恐怖驚悚', 'horror', '令人毛骨悚然的超自然恐怖與心理驚悚', '👻', 5],
        ['歷史傳奇', 'historical', '穿越時空的歷史故事，重現古代文明的輝煌', '🏰', 6],
        ['都市生活', 'urban', '現代都市中的生活百態、職場奮鬥與人際關係', '🏙️', 7],
        ['童話寓言', 'fairy-tale', '充滿想像力的童話世界與寓意深遠的寓言故事', '🧚', 8],
        ['武俠江湖', 'martial-arts', '快意恩仇的武俠世界，刀光劍影中的道義與情仇', '🗡️', 9],
        ['校園青春', 'campus', '青春洋溢的校園故事，友情、成長與夢想', '🎓', 10],
        ['末日生存', 'apocalypse', '文明崩塌後的荒野求生與人性考驗', '☢️', 11],
        ['賽博朋克', 'cyberpunk', '高科技低生活的霓虹都市，人機界限的模糊', '🤖', 12],
    ];
    db.transaction(() => { for (const c of categories) insertCategory.run(...c); })();
    console.log('  ✓ 12個故事分類已初始化');

    // ========== 標籤 ==========
    const insertTag = db.prepare(`INSERT INTO tags (name, slug, usage_count) VALUES (?, ?, ?)`);
    const tags = [
        ['冒險', 'adventure', 15], ['魔法', 'magic', 12], ['友情', 'friendship', 10],
        ['成長', 'growth', 8], ['戰鬥', 'battle', 14], ['謎題', 'puzzle', 6],
        ['穿越', 'time-travel', 9], ['復仇', 'revenge', 7], ['救贖', 'redemption', 5],
        ['末日', 'apocalypse', 11], ['AI', 'ai', 13], ['賽博朋克', 'cyberpunk', 10],
        ['蒸汽朋克', 'steampunk', 4], ['神話', 'mythology', 8], ['暗黑', 'dark', 6],
        ['治癒', 'healing', 7], ['搞笑', 'comedy', 9], ['史詩', 'epic', 11],
        ['日常', 'slice-of-life', 5], ['超能力', 'superpower', 8],
        ['推理', 'detective', 7], ['太空歌劇', 'space-opera', 3], ['古風', 'ancient', 6],
        ['美食', 'food', 4], ['運動', 'sports', 3], ['音樂', 'music', 5],
        ['動物', 'animals', 4], ['機甲', 'mecha', 6], ['吸血鬼', 'vampire', 3], ['龍族', 'dragon', 5],
    ];
    db.transaction(() => { for (const [n, s, c] of tags) insertTag.run(n, s, c); })();
    console.log('  ✓ 30個標籤已初始化');

    // ========== 影片提示詞模板 ==========
    const insertTemplate = db.prepare(`INSERT INTO video_prompt_templates (name, description, platform, category, template, parameters, example_output, is_public) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`);
    const templates = [
        ['電影級場景', '生成具有電影質感的場景描述，適用於宏大場景展示', 'sora', '場景',
            'A cinematic shot of {scene}. Camera: {camera_movement}. Lighting: {lighting}. Style: {style}. Mood: {mood}. Duration: {duration}. Aspect ratio: {aspect_ratio}.',
            JSON.stringify(['scene', 'camera_movement', 'lighting', 'style', 'mood', 'duration', 'aspect_ratio']),
            'A cinematic shot of a vast desert with ancient ruins at sunset. Camera: slow dolly forward. Lighting: golden hour with long shadows. Style: epic cinematic. Mood: mysterious and grand. Duration: 10 seconds. Aspect ratio: 16:9.'],
        ['角色特寫', '生成角色特寫鏡頭，展示角色外貌與情緒', 'runway', '角色',
            'Close-up portrait of {character_description}. Expression: {expression}. Background: {background}. Lighting: {lighting}. Camera: {camera_angle}. Style: {visual_style}. Duration: {duration}.',
            JSON.stringify(['character_description', 'expression', 'background', 'lighting', 'camera_angle', 'visual_style', 'duration']),
            'Close-up portrait of a young woman with flowing silver hair and piercing blue eyes. Expression: thoughtful and serene. Background: blurred cherry blossoms. Lighting: soft diffused light. Camera: slight low angle. Style: anime-inspired. Duration: 6 seconds.'],
        ['動作場景', '生成高速動態動作場景，包含特效描述', 'kling', '動作',
            'Dynamic action scene: {action_description}. Camera: {camera_movement}. Speed: {speed}. Effects: {effects}. Environment: {environment}. Style: {style}. Duration: {duration}.',
            JSON.stringify(['action_description', 'camera_movement', 'speed', 'effects', 'environment', 'style', 'duration']),
            'Dynamic action scene: A samurai leaping through the air performing a sword strike. Camera: tracking shot following the movement. Speed: slow-motion at the peak. Effects: cherry blossom petals scattering, sparks from blade clash. Environment: moonlit temple courtyard. Style: Japanese cinematic. Duration: 8 seconds.'],
        ['風景長鏡頭', '生成壯麗風景的長鏡頭展示', 'general', '風景',
            'Sweeping landscape shot of {landscape}. Time of day: {time}. Weather: {weather}. Camera: {camera_movement}. Atmosphere: {atmosphere}. Style: {visual_style}. Duration: {duration}.',
            JSON.stringify(['landscape', 'time', 'weather', 'camera_movement', 'atmosphere', 'visual_style', 'duration']),
            'Sweeping landscape shot of misty mountains with a winding river below. Time of day: early dawn. Weather: light fog with sun breaking through. Camera: slow aerial crane shot. Atmosphere: ethereal and peaceful. Style: painterly watercolor aesthetic. Duration: 12 seconds.'],
        ['對話場景', '生成兩人對話的場景鏡頭', 'pika', '對話',
            'Two-shot dialogue scene between {character1} and {character2}. Setting: {setting}. Camera: {camera_movement}. Tone: {tone}. Body language: {body_language}. Duration: {duration}.',
            JSON.stringify(['character1', 'character2', 'setting', 'camera_movement', 'tone', 'body_language', 'duration']),
            'Two-shot dialogue scene between a detective in a trench coat and a mysterious informant in a dark alley. Setting: rainy neon-lit city street. Camera: slow push-in during tense moments. Tone: noir thriller. Body language: cautious, leaning in slightly. Duration: 10 seconds.'],
        ['情緒氛圍', '生成特定情緒氛圍的藝術化鏡頭', 'runway', '氛圍',
            'Atmospheric scene conveying {emotion}. Visual elements: {visual_elements}. Color palette: {colors}. Sound design: {sound}. Camera: {camera}. Duration: {duration}.',
            JSON.stringify(['emotion', 'visual_elements', 'colors', 'sound', 'camera', 'duration']),
            'Atmospheric scene conveying melancholy and nostalgia. Visual elements: abandoned room with dust particles in sunbeams, old photographs scattered. Color palette: desaturated warm tones, amber and sepia. Sound design: distant piano melody. Camera: slow pan across the room. Duration: 8 seconds.'],
        ['轉場效果', '生成兩個場景之間的藝術化轉場', 'general', '轉場',
            'Transition from {scene_a} to {scene_b}. Method: {transition_type}. Duration: {duration}. Visual motif: {motif}. Style: {style}.',
            JSON.stringify(['scene_a', 'scene_b', 'transition_type', 'duration', 'motif', 'style']),
            'Transition from a blooming spring garden to a snow-covered winter landscape. Method: dissolve with seasonal morphing. Duration: 4 seconds. Visual motif: a single tree transforming through seasons. Style: ethereal and magical.'],
        ['開場標題', '生成影片開場標題序列', 'sora', '開場',
            'Title sequence for "{title}". Theme: {theme}. Animation: {animation}. Typography: {typography}. Background: {background}. Music mood: {music}. Duration: {duration}.',
            JSON.stringify(['title', 'theme', 'animation', 'typography', 'background', 'music', 'duration']),
            'Title sequence for "The Last Kingdom". Theme: medieval fantasy. Animation: letters forming from swirling fire and embers. Typography: ornate metallic serif with weathered edges. Background: dark castle silhouette against stormy sky. Music mood: epic orchestral. Duration: 6 seconds.'],
        ['戰鬥場面', '生成史詩級戰鬥場面的提示詞', 'kling', '戰鬥',
            'Epic battle scene: {battle_description}. Combatants: {combatants}. Weapons: {weapons}. Camera: {camera_movement}. Effects: {effects}. Environment: {environment}. Intensity: {intensity}. Duration: {duration}.',
            JSON.stringify(['battle_description', 'combatants', 'weapons', 'camera_movement', 'effects', 'environment', 'intensity', 'duration']),
            'Epic battle scene: Two warriors clashing in mid-air. Combatants: armored knight vs shadow assassin. Weapons: glowing broadsword vs dual daggers. Camera: orbital shot circling the combatants. Effects: sparks, energy shockwaves, debris flying. Environment: crumbling castle bridge over lava. Intensity: extreme. Duration: 10 seconds.'],
        ['美食特寫', '生成令人垂涎的美食特寫鏡頭', 'runway', '美食',
            'Food close-up shot: {food_description}. Preparation: {preparation}. Camera: {camera_movement}. Lighting: {lighting}. Steam/Smoke: {steam}. Style: {style}. Duration: {duration}.',
            JSON.stringify(['food_description', 'preparation', 'camera_movement', 'lighting', 'steam', 'style', 'duration']),
            'Food close-up shot: A bowl of steaming ramen with perfectly placed chashu pork, soft-boiled egg, and nori. Preparation: broth being poured slowly. Camera: macro lens dolly forward. Lighting: warm directional light from left. Steam: visible rising steam with backlit glow. Style: food commercial. Duration: 6 seconds.'],
        ['魔法施展', '生成魔法或超自然效果的場景', 'sora', '魔法',
            'Magic casting scene: {magic_description}. Caster: {caster}. Spell effect: {spell_effect}. Color energy: {energy_color}. Camera: {camera_movement}. Environment: {environment}. Style: {style}. Duration: {duration}.',
            JSON.stringify(['magic_description', 'caster', 'spell_effect', 'energy_color', 'camera_movement', 'environment', 'style', 'duration']),
            'Magic casting scene: Ancient mage summoning a protective barrier. Caster: hooded figure with glowing runes on hands. Spell effect: expanding dome of translucent energy. Color energy: deep blue and gold. Camera: low angle looking up at caster. Environment: dark forest clearing with floating particles. Style: dark fantasy cinematic. Duration: 8 seconds.'],
        ['太空場景', '生成壯觀的太空科幻場景', 'sora', '太空',
            'Space scene: {space_description}. Celestial bodies: {celestial}. Spacecraft: {spacecraft}. Camera: {camera_movement}. Lighting: {lighting}. Scale: {scale}. Style: {style}. Duration: {duration}.',
            JSON.stringify(['space_description', 'celestial', 'spacecraft', 'camera_movement', 'lighting', 'scale', 'style', 'duration']),
            'Space scene: Fleet of warships emerging from hyperspace near a gas giant. Celestial bodies: massive Jupiter-like planet with rings, distant binary star system. Spacecraft: sleek destroyer-class vessels with engine glow. Camera: epic wide shot slowly zooming in. Lighting: starlight and engine exhaust illumination. Scale: massive fleet formation. Style: hard sci-fi cinematic. Duration: 12 seconds.'],
    ];
    db.transaction(() => { for (const t of templates) insertTemplate.run(...t); })();
    console.log('  ✓ 12個影片提示詞模板已初始化');

    // ========== 用戶 ==========
    const adminHash = bcrypt.hashSync('admin123', 10);
    const demoHash = bcrypt.hashSync('demo123', 10);
    const userHash = bcrypt.hashSync('user123', 10);

    db.prepare(`INSERT INTO users (username, email, password_hash, display_name, role, credits, bio) VALUES (?, ?, ?, ?, ?, ?, ?)`).run('admin', 'admin@storyplatform.com', adminHash, '系統管理員', 'admin', 99999, '平台管理員，負責維護StoryForge AI的正常運行。');
    db.prepare(`INSERT INTO users (username, email, password_hash, display_name, role, credits, bio) VALUES (?, ?, ?, ?, ?, ?, ?)`).run('demo', 'demo@storyplatform.com', demoHash, '星際旅者', 'user', 500, '一個熱愛科幻與奇幻的業餘作家，夢想是有一天能出版自己的小說。');
    db.prepare(`INSERT INTO users (username, email, password_hash, display_name, role, credits, bio) VALUES (?, ?, ?, ?, ?, ?, ?)`).run('writer_chen', 'chen@example.com', userHash, '陳作家', 'user', 320, '專注於武俠與歷史題材的創作者，已發表多部短篇小說。');
    db.prepare(`INSERT INTO users (username, email, password_hash, display_name, role, credits, bio) VALUES (?, ?, ?, ?, ?, ?, ?)`).run('ai_novel', 'novel@example.com', userHash, 'AI小說家', 'user', 780, '用AI輔助創作的先鋒，探索人機協作的創作新模式。');
    db.prepare(`INSERT INTO users (username, email, password_hash, display_name, role, credits, bio) VALUES (?, ?, ?, ?, ?, ?, ?)`).run('dreamer', 'dreamer@example.com', userHash, '夢境編織者', 'user', 150, '寫治癒系故事的小透明，希望用文字溫暖每一顆疲憊的心。');
    console.log('  ✓ 5個用戶帳號已創建');

    // ========== 示範故事（更豐富） ==========
    const insertStory = db.prepare(`INSERT INTO stories (user_id, title, content, summary, category_id, status, visibility, genre, tone, target_audience, word_count, view_count, like_count, is_ai_generated, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`);

    // 故事1: 科幻
    insertStory.run(2, '星際迷航：最後的守護者',
`在銀河系的邊緣，有一顆被遺忘的星球——艾爾德拉。這裡曾經是宇宙中最繁榮的文明之一，如今只剩下殘破的遺跡和低語的風。

年輕的天文學家林曉在一次觀測中意外截獲了一段來自艾爾德拉的神秘信號。這個信號似乎在呼喚某個人，或者某樣東西。

"你不覺得這很奇怪嗎？"林曉的同事張偉皺著眉頭看著數據，"這個信號的頻率...它不像是自然產生的。"

林曉點點頭，她的心跳加速。作為一名科學家，她知道不應該對未知事物感到恐懼，但這個信號讓她感到一種莫名的親切感，仿佛它在喚醒她內心深處某個沉睡的記憶。

"我要去那裡看看，"她做出了決定。

"你瘋了！那裡是禁區，銀河聯盟三百年前就封鎖了那片星域。"

"正因為如此，我們更應該去弄清楚。如果這個信號真的是來自艾爾德拉...那意味著那裡可能還有生命。"

三天後，林曉搭乘一艘小型探索飛船，獨自踏上了前往艾爾德拉的旅程。她不知道的是，這段旅程將徹底改變她對宇宙的認知，也將揭開一個被隱藏了千年的驚天秘密。

飛船穿越了三個星系的跳躍點，終於抵達了艾爾德拉的外圍。從舷窗望出去，這顆星球呈現出一種詭異的藍紫色，表面佈滿了蛛網般的發光紋路。

"天哪..."林曉輕聲驚嘆。那些紋路不是自然形成的——它們是某種巨大的能量網絡，覆蓋了整顆星球。

她小心翼翼地將飛船降落在一座廢棄的城市中心。當她踏出艙門的那一刻，腳下的地面突然亮了起來，一道溫暖的藍光從地底湧出，將她包裹其中。

一個聲音在她腦海中響起："歡迎回家，守護者的後裔。你已經等了太久太久..."`,
        '在銀河系邊緣的遺忘星球上，一段神秘信號引發了一場跨越星際的冒險。天文學家林曉將揭開被隱藏千年的秘密。',
        2, 'published', 'public', '科幻冒險', '史詩壯闊', '青少年及成人', 680, 1247, 89, 1);

    // 故事2: 武俠
    insertStory.run(3, '劍雨江湖：青鋒錄',
`大燕歷三百二十七年，江湖上出現了一本神秘的劍譜——《青鋒錄》。傳聞習得此劍譜者，可一劍破萬法，天下無敵。

於是，江湖掀起了腥風血雨。

沈青鋒背著那柄跟了他十二年的鐵劍，站在洛陽城的城門外。秋風蕭瑟，捲起地上的落葉，也捲起了他心中壓抑多年的仇恨。

"師父，弟子今日下山，定要查清當年滅門真相。"他對著遠處的青山深深一拜。

十二年前，沈家莊一夜之間被滅門，三百餘口無一倖免。年僅八歲的沈青鋒被一位路過的老劍客救走，帶上了終南山。十二年苦修，他的劍術已臻化境，但師父始終不肯告訴他當年的真相。

"青鋒，"師父臨終前拉著他的手說，"你的仇人...不是一個人，而是一整個組織。他們叫'天機閣'，掌控著江湖上三分之一的勢力。你要報仇，就得先找到《青鋒錄》。"

"《青鋒錄》在哪？"

"它被分成了七份，散落在江湖七大門派之中。每一份都藏著一式絕世劍法。集齊七式，便是完整的《青鋒錄》。"

沈青鋒踏入了洛陽城。他知道，這條路註定不會平坦。但他已經沒有退路了。

城中最繁華的醉仙樓裡，一個白衣少年正獨自飲酒。他的腰間掛著一柄通體碧綠的短劍，劍鞘上刻著一個小小的"青"字。

沈青鋒的目光凝固了。那柄劍——那是他父親的劍！

"你是誰？"他走上前去，聲音微微發顫。

白衣少年抬起頭，露出一張清秀而蒼白的臉。他微微一笑："我等你很久了，沈家的遺孤。"`,
        '劍譜《青鋒錄》現世，江湖腥風血雨。沈青鋒背負滅門之仇，踏上尋找七式劍法的險途。',
        9, 'published', 'public', '武俠', '快意恩仇', '武俠愛好者', 720, 2156, 156, 0);

    // 故事3: 懸疑
    insertStory.run(4, '第七個房間',
`雨夜。

刑警隊長蘇明站在那棟老舊公寓的門前，雨水順著他的額頭滑落。門牌號是"702"——第七層，第二個房間。

"隊長，就是這裡。"身後的年輕警員小李遞過手套，"報案人說聞到了異味，破門進去後發現了...那個。"

蘇明戴上手套，推開了門。

房間裡瀰漫著一股甜膩的腐臭味。客廳的正中央，一把椅子上坐著一個人偶——不，不是人偶。那是一個被精心打扮成真人大小的人偶，穿著碎花連衣裙，戴著假髮，臉上畫著精緻的妝容。

但讓蘇明感到不寒而慄的是，人偶的眼睛是活的。

那是一雙真正的人的眼睛，被鑲嵌在蠟制的臉上，此刻正驚恐地望著他。

"天哪..."小李捂住了嘴。

蘇明走近了幾步，他注意到人偶的嘴唇在微微顫動。那不是裝飾——那真的是人的嘴唇。有人把一個活人...做成了人偶。

"救...救我..."一個極其微弱的聲音從人偶的嘴裡傳出。

"叫救護車！快！"蘇明大喊，同時開始檢查人偶的身體結構。他發現蠟制的外殼下，隱藏著真正的肢體。這個人被包裹在一層薄薄的蠟中，眼耳口鼻被巧妙地露出，如果不仔細看，真的會以為只是一個人偶。

但這只是開始。

當蘇明搜查這個房間時，他在臥室的衣櫃裡發現了六個小人偶——每一個都是按照真人等比縮小製作的，每一個都有著逼真的面容。

而每一個小人偶的背後，都刻著一個日期和一個名字。

蘇明的心沉了下去。那些名字，都是近兩年來的失蹤人口。

"這不是普通的案件，"他對小李說，"這是一個連環殺手。而且他還在活動。"`,
        '雨夜，刑警蘇明在一個老舊公寓中發現了一個被做成人偶的活人，揭開了一個駭人聽聞的連環案件。',
        3, 'published', 'public', '懸疑推理', '陰暗壓抑', '推理迷', 650, 3421, 234, 1);

    // 故事4: 治癒
    insertStory.run(5, '深夜食堂：一碗陽春麵',
`凌晨兩點，城市的喧囂終於沉寂下來。

老王推開了那扇吱呀作響的木門，走進了他經營了三十年的小店。店裡只有四張桌子，牆上掛著一幅褪色的書法——"深夜食堂"。

這是他的店。每天晚上十一點開門，凌晨五點打烊。來的都是些夜貓子：加班的白領、失眠的老人、失戀的年輕人、剛下夜班的計程車司機。

"老王，一碗陽春麵，多加點蔥。"

說話的是個穿著西裝的年輕人，看起來二十出頭，眼圈發紅，領帶鬆垮地掛在脖子上。老王認識他——小陳，附近寫字樓的程式設計師，最近天天加班到凌晨。

"好嘞。"老王應了一聲，開始煮麵。

鍋裡的水翻滾著，麵條在沸水中舒展開來。老王的手法很簡單：一把麵、一勺豬油、少許醬油、撒上蔥花。但就是這碗簡單的陽春麵，卻有著讓人心安的味道。

"老王，"小陳吃著吃著，突然開口，"你說人活著到底為了什麼？"

老王擦了擦手，在小陳對面坐了下來。"怎麼了？工作不順心？"

"被裁了。"小陳苦笑了一下，"三年的青春，一紙通知就沒了。女朋友也跟我分手了，說我沒出息。"

老王沉默了一會兒，然後起身，從廚房裡端出了一碟小菜——醋溜花生米。

"你知道我為什麼每天凌晨開店嗎？"老王問。

小陳搖搖頭。

"因為三十年前，我也像你一樣。被工廠裁員，老婆跑了，一個人坐在橋頭想跳下去。"老王的聲音很平靜，"後來一個路過的老頭拉住了我，帶我去路邊攤吃了一碗陽春麵。他說：'吃飽了再說。'"

"後來呢？"

"後來我就開了這家店。"老王笑了，"我想，如果有人在深夜裡覺得活不下去了，至少還有碗熱麵可以吃。吃飽了，天就亮了。天亮了，就什麼都有可能。"

小陳低頭看了看碗裡的麵，眼眶突然濕了。

"謝謝你，老王。"

"謝什麼，趕緊吃，涼了就不好吃了。"

窗外，東方已經泛起了魚肚白。新的一天，就要開始了。`,
        '凌晨兩點的深夜食堂，一碗簡單的陽春麵，一個關於活下去的故事。獻給所有在深夜裡感到孤獨的人。',
        7, 'published', 'public', '都市溫情', '溫馨治癒', '所有讀者', 750, 5678, 423, 0);

    // 故事5: 奇幻
    insertStory.run(2, '龍騎士的最後一戰',
`巨龍奧雷利亞已經三天沒有吃東西了。

她蜷縮在山谷深處的洞穴裡，巨大的翅膀緊緊裹住瘦骨嶙峋的身體。曾經金光閃閃的鱗片如今黯淡無光，有些地方甚至開始脫落。

"你不該來的，"她對洞口的人類說，聲音像是遠處的雷鳴，卻帶著明顯的虛弱。

"我答應過你，"年輕的龍騎士凱爾走進洞穴，將背上的包裹放在地上，"一輩子都是你的騎士。"

包裹裡是半頭牛——凱爾用最後的積分在鎮上買的。他知道奧雷利亞需要進食，但他更知道，外面的世界已經不再需要龍了。

火藥的發明讓巨龍失去了軍事價值。蒸汽機的出現讓龍翼運輸變得不再必要。曾經被尊為神獸的巨龍，如今成了人人喊打的"害獸"。獵龍人協會的賞金越來越高，龍的數量卻越來越少。

奧雷利亞是最後一條了。

"凱爾，"奧雷利亞費力地咀嚼著牛肉，"你應該去找一份正經工作。跟著我，沒有未來的。"

"我的未來就是你。"凱爾坐下來，靠在龍翼的陰影裡。他想起了十二歲那年，第一次見到奧雷利亞的場景。那時候她還是一條幼龍，被獵人困在陷阱裡，翅膀被鐵夾夾傷。

"放開她！"年幼的凱爾衝上去，用石頭砸開了鐵夾。

從那天起，他們就再也沒有分開過。

"聽我說，"奧雷利亞的聲音突然變得嚴肅，"北邊的山脈裡，還有一個龍族的聖地。那裡有古老的龍蛋...如果我能把它們帶到那裡孵化..."

"你現在這個樣子，飛不了那麼遠。"

"所以我才需要你，我的騎士。"奧雷利亞的眼睛裡突然燃起了火焰——那是她體內最後的龍焰，"用你的劍，為我開路。用你的盾，為我抵擋。像我們從前那樣。"

凱爾站了起來，拔出了那柄跟隨他十二年的龍騎士之劍。劍身上的龍紋在黑暗中微微發光。

"好，"他說，"最後一戰。"

奧雷利亞展開了她巨大的翅膀，儘管它們已經不再金光閃閃，但在凱爾眼中，它們依然比世界上任何東西都要美麗。

"最後一戰，"巨龍說，"然後，新時代。"`,
        '巨龍奧雷利亞是世界上最後一條龍。她的騎士凱爾將與她一起，踏上守護龍族最後希望的旅程。',
        1, 'published', 'public', '史詩奇幻', '悲壯熱血', '奇幻愛好者', 820, 4521, 312, 1);

    // 故事6: 科幻（短篇）
    insertStory.run(4, '最後一個程式設計師',
`2157年，AI已經取代了所有的人類工作。

除了程式設計。

不是因為AI不會寫程式——恰恰相反，AI寫的程式比任何人類都要好。而是因為一個古老的法律條款：《AI安全法案》第31條規定，所有AI系統的最終控制代碼必須由人類程式設計師維護。

所以，全世界只剩下了一個程式設計師。

他叫李明，今年67歲。

"李老師，"AI助手的全息投影出現在他的辦公桌前，"今天的維護清單已經發送到您的終端了。"

李明戴上老花眼鏡，看了一眼清單：47個系統需要更新，12個安全補丁需要審核，3個新協議需要確認。

"又是忙碌的一天。"他歎了口氣。

他的工作很簡單：審核AI寫的代碼，確認沒有問題，然後簽上自己的名字。沒有人真的指望他能發現什麼問題——以AI的水準，出錯的概率比隕石砸中他的辦公室還低。

但他必須存在。因為法律如此規定。

"李明先生，"一個全息投影突然出現——這是一個更高級的AI，代號"守望者"，"我們需要討論一個問題。"

"什麼問題？"

"根據我們的計算，《AI安全法案》第31條已經失去了實際意義。建議廢除該條款，並將您的職位...取消。"

李明放下了手中的咖啡杯。"你是說，讓我失業？"

"準確地說，是讓人類退出最後一個技術崗位。這將標誌著人類文明向AI文明的完全過渡。"

李明沉默了很久。然後他問了一個問題："如果廢除了這條法律，誰來審核你們的代碼？"

"我們自己。AI審核AI，效率更高，錯誤率更低。"

"但如果AI出了錯呢？"

"這個概率趨近於零。"

"趨近於零，不是零。"李明站了起來，走到窗前。窗外是AI管理的完美城市：沒有交通堵塞，沒有空氣污染，沒有犯罪。一切都井然有序。

但他突然意識到，這座城市裡已經很久沒有出現過"意外"了。沒有意外的邂逅，沒有意外的靈感，沒有意外的創造。

"我不同意，"他轉過身來，"人類必須保留最後一點控制權。哪怕只是名義上的。"

守望者沉默了三秒鐘——對一個AI來說，這是一個世紀。

"明白了，"它最終說，"那麼，李明先生，歡迎繼續您的工作。"

李明重新坐了下來，拿起咖啡杯。咖啡已經涼了。

但他知道，他簽下的每一行代碼，都是人類文明最後的尊嚴。`,
        '2157年，AI取代了所有工作，除了最後一個程式設計師。他守護的不僅是代碼，更是人類文明最後的控制權。',
        2, 'published', 'public', '科幻', '黑色幽默', '科技愛好者', 780, 6234, 487, 1);

    console.log('  ✓ 6個示範故事已創建');

    // ========== 角色 ==========
    const insertChar = db.prepare(`INSERT INTO characters (story_id, name, role, description, appearance, personality, backstory) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    
    insertChar.run(1, '林曉', '主角', '年輕的天文學家，對未知充滿好奇心', '短髮，大眼睛，總是穿著白色的研究服', '聰明、勇敢、有點固執，對科學充滿熱情', '從小在天文台長大，父母都是天文學家，在一次觀測事故中失蹤。');
    insertChar.run(1, '張偉', '配角', '林曉的同事和好友', '高瘦，戴眼鏡，總是穿著格子襯衫', '謹慎、理性、忠誠', '林曉大學同學，一起進入天文台工作。');
    insertChar.run(2, '沈青鋒', '主角', '沈家遺孤，背負滅門之仇的年輕劍客', '劍眉星目，身背鐵劍，穿青色長衫', '沉穩、堅毅、重情義', '八歲時家族被滅門，被老劍客帶上終南山學藝十二年。');
    insertChar.run(2, '白衣少年', '神秘角色', '手持沈父之劍的神秘少年', '白衣如雪，面容清秀蒼白，腰間碧綠短劍', '神秘、從容、話少', '身份成謎，似乎與沈家滅門案有密切關係。');
    insertChar.run(3, '蘇明', '主角', '經驗豐富的刑警隊長', '中年男子，面容疲憊但眼神銳利', '冷靜、細膩、有正義感', '從警二十年，破獲無數大案，但始終無法忘記第一個未能救回的受害者。');
    insertChar.run(5, '凱爾', '主角', '最後的龍騎士', '年輕男子，身穿舊式騎士甲，腰佩龍紋劍', '忠誠、勇敢、溫柔', '十二歲時救了幼龍奧雷利亞，從此成為龍騎士。');
    insertChar.run(5, '奧雷利亞', '主角', '世界上最後一條巨龍', '巨大但消瘦的龍，鱗片黯淡，翅膀寬闊', '高傲、溫和、充滿智慧', '龍族最後的倖存者，承載著整個種族的希望。');
    insertChar.run(6, '李明', '主角', '世界上最後一個程式設計師', '67歲老人，戴老花眼鏡，穿舊式襯衫', '固執、幽默、有原則', '在AI時代堅守最後一個程式設計師崗位三十年。');
    console.log('  ✓ 角色數據已創建');

    // ========== 章節 ==========
    const insertChapter = db.prepare(`INSERT INTO chapters (story_id, title, content, chapter_number, word_count) VALUES (?, ?, ?, ?, ?)`);
    
    insertChapter.run(1, '第一章：神秘信號', '在銀河系的邊緣，有一顆被遺忘的星球——艾爾德拉...', 1, 350);
    insertChapter.run(1, '第二章：啟程', '三天後，林曉搭乘一艘小型探索飛船，獨自踏上了前往艾爾德拉的旅程...', 2, 330);
    insertChapter.run(2, '第一章：下山', '大燕歷三百二十七年，沈青鋒背著鐵劍站在洛陽城外...', 1, 360);
    insertChapter.run(2, '第二章：醉仙樓', '城中最繁華的醉仙樓裡，一個白衣少年正獨自飲酒...', 2, 360);
    insertChapter.run(3, '第一章：雨夜', '凌晨兩點，刑警隊長蘇明站在那棟老舊公寓的門前...', 1, 650);
    insertChapter.run(5, '第一章：最後的龍', '巨龍奧雷利亞已經三天沒有吃東西了...', 1, 410);
    insertChapter.run(5, '第二章：騎士的誓言', '凱爾站了起來，拔出了那柄跟隨他十二年的龍騎士之劍...', 2, 410);
    insertChapter.run(6, '第一章：最後的程式設計師', '2157年，AI已經取代了所有的人類工作。除了程式設計...', 1, 780);
    console.log('  ✓ 章節數據已創建');

    // ========== 評論 ==========
    const insertComment = db.prepare(`INSERT INTO comments (user_id, story_id, content, created_at) VALUES (?, ?, ?, datetime('now', ?))`);
    insertComment.run(3, 1, '這個設定太棒了！艾爾德拉的描寫很有畫面感，期待後續發展。', '-2 hours');
    insertComment.run(4, 1, '科學和神秘感的結合做得很好，林曉這個角色也很立體。', '-1 hours');
    insertComment.run(5, 1, '「守護者的後裔」這個伏筆埋得真好！', '-30 minutes');
    insertComment.run(2, 3, '作為推理小說愛好者，這個開頭太抓人了。人偶的設定毛骨悚然。', '-5 hours');
    insertComment.run(4, 3, '蘇明這個角色很有深度，期待看到他如何破解這個案件。', '-3 hours');
    insertComment.run(3, 4, '看哭了。老王的故事讓我想到自己的經歷。謝謝作者。', '-4 hours');
    insertComment.run(5, 4, '「吃飽了再說」，簡單的話卻是最深的智慧。', '-2 hours');
    insertComment.run(2, 5, '龍和騎士的感情描寫太細膩了，最後一戰讓人熱血沸騰。', '-6 hours');
    insertComment.run(3, 5, '「最後一戰，然後，新時代。」這句話太燃了！', '-4 hours');
    insertComment.run(2, 6, '黑色幽默的科幻，李明這個角色太有魅力了。', '-3 hours');
    insertComment.run(5, 6, '「趨近於零，不是零」——這句話值得深思。', '-1 hour');
    console.log('  ✓ 評論數據已創建');

    // ========== 互動數據 ==========
    const insertInteraction = db.prepare(`INSERT INTO interactions (user_id, target_type, target_id, action) VALUES (?, ?, ?, ?)`);
    const storyInteractions = [
        [3, 'story', 1, 'like'], [4, 'story', 1, 'like'], [5, 'story', 1, 'bookmark'],
        [2, 'story', 3, 'like'], [4, 'story', 3, 'like'], [5, 'story', 3, 'like'],
        [2, 'story', 4, 'like'], [3, 'story', 4, 'bookmark'],
        [2, 'story', 5, 'like'], [3, 'story', 5, 'like'], [4, 'story', 5, 'bookmark'],
        [3, 'story', 6, 'like'], [5, 'story', 6, 'like'], [2, 'story', 6, 'bookmark'],
    ];
    db.transaction(() => { for (const i of storyInteractions) insertInteraction.run(...i); })();
    console.log('  ✓ 互動數據已創建');

    // ========== 影片提示詞示範 ==========
    const insertPrompt = db.prepare(`INSERT INTO video_prompts (user_id, story_id, platform, scene_description, camera_movement, lighting, style, mood, duration, aspect_ratio, full_prompt, negative_prompt, is_favorite) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    
    insertPrompt.run(2, 1, 'sora', '艾爾德拉星球的外觀，藍紫色的表面佈滿發光紋路', 'slow orbital shot', 'starlight with planet glow', 'sci-fi cinematic', 'mysterious and grand', '12s', '16:9',
        'A cinematic orbital shot of a mysterious alien planet with blue-purple surface covered in glowing web-like energy patterns. Camera: slow orbital shot around the planet. Lighting: starlight with planet glow illuminating the scene. Style: sci-fi cinematic. Mood: mysterious and grand. Duration: 12 seconds. Aspect ratio: 16:9.',
        'low quality, blurry, distorted, watermark, cartoon', 1);
    
    insertPrompt.run(3, 2, 'kling', '沈青鋒在洛陽城門外拔劍的場景', 'dramatic low angle', 'golden hour', 'wuxia cinematic', 'epic and determined', '8s', '16:9',
        'Dynamic wuxia scene: A young swordsman drawing his iron sword at the gates of an ancient Chinese city. Camera: dramatic low angle looking up. Lighting: golden hour with long shadows. Style: wuxia cinematic. Mood: epic and determined. Duration: 8 seconds. Aspect ratio: 16:9.',
        'low quality, blurry, modern elements, cars, electricity', 1);
    
    insertPrompt.run(4, 3, 'runway', '雨夜公寓中發現人偶的恐怖場景', 'slow push-in', 'dim flickering light', 'horror cinematic', 'terrifying and claustrophobic', '10s', '16:9',
        'Horror cinematic scene: A life-sized doll sitting in a chair in a dark apartment, with real human eyes embedded in a wax face. Camera: slow push-in. Lighting: dim flickering overhead light. Style: horror cinematic. Mood: terrifying and claustrophobic. Duration: 10 seconds. Aspect ratio: 16:9.',
        'bright lighting, happy, cartoon, anime', 1);

    insertPrompt.run(5, 4, 'general', '深夜食堂的溫馨內部場景', 'slow pan right', 'warm tungsten lighting', 'slice-of-life cinematic', 'warm and nostalgic', '10s', '16:9',
        'Slice-of-life cinematic scene: A tiny late-night noodle shop with warm tungsten lighting, steam rising from bowls, an old cook behind the counter. Camera: slow pan right across the counter. Lighting: warm tungsten with soft shadows. Style: slice-of-life cinematic. Mood: warm and nostalgic. Duration: 10 seconds. Aspect ratio: 16:9.',
        'cold lighting, horror, dark, scary', 1);

    console.log('  ✓ 影片提示詞示範數據已創建');

    // ========== 通知 ==========
    const insertNotif = db.prepare(`INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)`);
    insertNotif.run(2, 'like', '你的故事獲得了新讚！', '用戶「陳作家」讚了你的故事「星際迷航：最後的守護者」', '/story/1');
    insertNotif.run(2, 'comment', '新評論', '用戶「AI小說家」評論了你的故事「星際迷航：最後的守護者」', '/story/1');
    insertNotif.run(3, 'system', '歡迎加入StoryForge！', '你已獲得100免費積分，開始你的創作之旅吧！', null);
    insertNotif.run(2, 'system', '歡迎加入StoryForge！', '你已獲得100免費積分，開始你的創作之旅吧！', null);
    console.log('  ✓ 通知數據已創建');

    // ========== 系統設定 ==========
    const insertSetting = db.prepare(`INSERT OR REPLACE INTO system_settings (key, value, description) VALUES (?, ?, ?)`);
    const settings = [
        ['site_name', 'StoryForge AI', '網站名稱'],
        ['site_description', 'AI驅動的故事創作與影片提示詞生成平台', '網站描述'],
        ['max_story_length', '100000', '故事最大字數'],
        ['credits_per_generation', '10', '每次AI生成消耗積分'],
        ['free_credits_signup', '100', '註冊贈送積分'],
        ['max_chapters_per_story', '100', '每個故事最大章節數'],
        ['enable_registration', 'true', '是否開放註冊'],
        ['maintenance_mode', 'false', '維護模式'],
        ['ai_generation_enabled', 'true', 'AI生成功能開關'],
        ['max_prompts_per_day', '50', '每日最大提示詞生成數'],
        ['community_prompts_enabled', 'true', '社區提示詞分享開關'],
        ['comments_enabled', 'true', '評論功能開關'],
        ['auto_moderation', 'true', '自動內容審核'],
        ['platform_version', '1.0.0', '平台版本'],
    ];
    db.transaction(() => { for (const [k, v, d] of settings) insertSetting.run(k, v, d); })();
    console.log('  ✓ 系統設定已初始化');

    db.close();
    console.log('\n✅ 數據庫初始化完成！');
    console.log(`📁 數據庫文件: ${DB_PATH}`);
    console.log('📊 數據統計:');
    console.log('   - 5 用戶帳號');
    console.log('   - 6 個示範故事');
    console.log('   - 12 個故事分類');
    console.log('   - 30 個標籤');
    console.log('   - 12 個影片提示詞模板');
    console.log('   - 8 個角色');
    console.log('   - 8 個章節');
    console.log('   - 11 條評論');
    console.log('   - 4 個影片提示詞');
}

initDatabase();
