const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'story_platform.db');
const CAMERA_SCHEMA = path.join(__dirname, 'camera_schema.sql');

function initCameraData() {
    console.log('🎬 正在初始化鏡頭語言數據...');

    const db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // Execute camera schema
    const schema = fs.readFileSync(CAMERA_SCHEMA, 'utf8');
    db.exec(schema);
    console.log('  ✓ 鏡頭數據表已創建');

    // ========== 鏡頭運動 ==========
    const insertMovement = db.prepare(`INSERT INTO camera_movements (name_zh, name_en, category, description, technique, use_case, visual_effect, english_prompt, difficulty, icon, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);

    const movements = [
        // === 基礎運鏡 ===
        ['推鏡頭', 'Dolly In', 'basic', '攝影機沿軌道向主體靠近', '攝影機安裝在推軌或穩定器上，勻速向前移動', '強調角色情緒、揭示細節、建立緊張感', '主體逐漸變大，背景逐漸虛化，觀眾注意力被引導至主體', 'dolly in to {subject}', 1, '➡️', 1],
        ['拉鏡頭', 'Dolly Out', 'basic', '攝影機沿軌道遠離主體', '攝影機勻速向後移動，逐漸遠離主體', '揭示環境、展現孤獨感、結束場景', '主體逐漸變小，環境逐漸展現，營造史詩感或孤獨感', 'dolly out from {subject}', 1, '⬅️', 2],
        ['搖鏡頭（水平）', 'Pan', 'basic', '攝影機在固定位置水平旋轉', '攝影機固定於三腳架，水平左右旋轉', '追蹤移動主體、展示環境、對話切換', '畫面水平掃過，引導觀眾視線移動', 'pan {direction} to reveal {subject}', 1, '🔄', 3],
        ['搖鏡頭（垂直）', 'Tilt', 'basic', '攝影機在固定位置垂直旋轉', '攝影機固定於三腳架，垂直上下旋轉', '展示建築高度、角色仰望/俯視、揭示上方/下方元素', '畫面垂直掃過，營造仰望或俯瞰的感覺', 'tilt {direction} to reveal {subject}', 1, '↕️', 4],
        ['固定鏡頭', 'Static Shot', 'basic', '攝影機完全靜止不動', '攝影機固定在三腳架上，不進行任何移動', '穩定敘事、對話場景、強調畫面內動作', '畫面穩定不動，觀眾注意力集中在場景內的動作和表演上', 'static shot of {scene}', 1, '📷', 5],
        ['手持鏡頭', 'Handheld', 'basic', '攝影師手持攝影機拍攝', '攝影師手持或肩扛攝影機，允許自然晃動', '紀錄片風格、緊張場景、主觀視角', '畫面帶有自然晃動，增加真實感和臨場感', 'handheld camera following {subject}', 2, '✋', 6],

        // === 動態運鏡 ===
        ['跟蹤鏡頭', 'Tracking Shot', 'dynamic', '攝影機平行跟隨移動中的主體', '攝影機安裝在推軌、車輛或穩定器上，與主體保持平行移動', '追逐場景、行走對話、角色移動', '主體在畫面中保持相對固定位置，背景流動變化', 'tracking shot following {subject} moving {direction}', 2, '🏃', 7],
        ['弧形運鏡', 'Arc Shot', 'dynamic', '攝影機圍繞主體做弧形運動', '攝影機沿弧形軌道圍繞主體移動', '角色出場、情緒高潮、360度展示', '背景環繞變化，主體始終在畫面中心，營造動態感', 'arc shot orbiting around {subject}', 3, '🌀', 8],
        ['升降鏡頭', 'Crane Shot', 'dynamic', '攝影機做垂直升降運動', '使用搖臂或無人機實現垂直方向的移動', '場景開場、揭示全景、戲劇性視角轉換', '視角從低到高或從高到低變化，帶來空間感的轉變', 'crane shot {direction} from {start} to {end}', 3, '🏗️', 9],
        ['滑軌鏡頭', 'Slider Shot', 'dynamic', '攝影機在短軌道上水平滑動', '攝影機安裝在滑軌上，進行短距離水平移動', '產品展示、風景掃視、微妙的視角變化', '畫面平滑水平移動，增加精緻感和專業感', 'slider shot moving {direction} across {scene}', 2, '↔️', 10],
        ['旋轉鏡頭', 'Dutch Angle Roll', 'dynamic', '攝影機沿光軸旋轉', '攝影機圍繞鏡頭光軸進行旋轉', '迷失感、精神錯亂、夢境場景', '畫面傾斜旋轉，營造不安定和迷失感', 'dutch angle rotating {direction}', 3, '🔃', 11],
        ['變焦推拉', 'Zoom In/Out', 'basic', '通過變焦鏡頭改變焦距', '轉動變焦環改變鏡頭焦距', '強調細節、揭示全貌、戲劇性效果', '主體大小變化但透視關係不變，產生壓縮或擴展感', 'zoom {direction} on {subject}', 1, '🔍', 12],

        // === 複合運鏡 ===
        ['推拉結合', 'Dolly Zoom (Vertigo Effect)', 'complex', '同時推近和變焦拉遠（或反之）', '攝影機向前推進的同時鏡頭變焦拉遠', '角色頓悟、眩暈感、心理衝擊', '背景大小劇烈變化但主體大小不變，產生強烈的視覺扭曲感', 'dolly zoom vertigo effect on {subject}', 5, '😵', 13],
        ['穿越鏡頭', 'Through Shot', 'complex', '攝影機穿越物理障礙物', '攝影機穿過門窗、牆縫、樹枝等障礙物', '揭示場景、增加層次感、戲劇性出場', '前景遮擋物逐漸消失，新場景逐漸展現', 'camera moves through {obstacle} to reveal {scene}', 4, '🚪', 14],
        ['一鏡到底', 'Long Take / One-Take', 'complex', '無剪輯的連續長鏡頭', '攝影機不間斷地完成複雜的運鏡和場景轉換', '展示時間連續性、技術實力、沉浸式體驗', '無剪輯的連續畫面，觀眾完全沉浸在場景中', 'one continuous take following {subject} through {scene}', 5, '🎞️', 15],
        ['迴旋運鏡', 'Whip Pan', 'complex', '極速水平搖鏡，畫面模糊', '快速甩動攝影機，產生動態模糊效果', '場景轉換、時間跳轉、動作強調', '畫面快速甩動產生模糊，連接兩個不同場景或時間', 'whip pan from {scene_a} to {scene_b}', 3, '💨', 16],

        // === 空中運鏡 ===
        ['俯瞰鏡頭', 'Bird\'s Eye View', 'aerial', '從正上方垂直向下拍攝', '無人機或搖臂從正上方拍攝', '地圖感、上帝視角、展示地理位置', '從正上方俯瞰，地面呈平面化，產生宏觀感', 'birds eye view looking down at {scene}', 3, '🦅', 17],
        ['空中推進', 'Aerial Push', 'aerial', '空中向前推進', '無人機在空中向前飛行拍攝', '場景開場、環境建立、史詩級展示', '空中視角向前推進，逐漸揭示場景細節', 'aerial drone pushing forward over {landscape}', 3, '🚁', 18],
        ['空中環繞', 'Aerial Orbit', 'aerial', '無人機圍繞目標環繞飛行', '無人機圍繞建築或地標做環形飛行', '地標展示、建築全景、環境建立', '360度空中環繞，全方位展示目標', 'aerial orbit around {subject}', 4, '🛸', 19],
        ['俯衝鏡頭', 'Dive Shot', 'aerial', '從高空急速俯衝向下', '無人機或攝影機從高處快速向下俯衝', '衝擊力、緊急感、動作場景開場', '視角從高空急速下降，帶來強烈的速度感和衝擊力', 'dive shot descending rapidly toward {subject}', 4, '⬇️', 20],

        // === 特殊運鏡 ===
        ['子彈時間', 'Bullet Time', 'special', '時間減速的環繞鏡頭', '多台攝影機同時拍攝或高速攝影機環繞', '動作場景、關鍵時刻、慢動作特效', '時間彷彿凝固，攝影機環繞定格畫面', 'bullet time effect around frozen {subject}', 5, '⏱️', 21],
        ['主觀鏡頭', 'POV Shot', 'special', '角色第一人稱視角', '將攝影機固定在角色視角位置', '沉浸式體驗、恐怖場景、角色代入', '觀眾直接看到角色所看到的畫面', 'POV shot from {character} perspective looking at {scene}', 2, '👁️', 22],
        ['窺視鏡頭', 'Voyeur Shot', 'special', '通過遮擋物拍攝，模擬偷窺視角', '攝影機隱藏在遮擋物後方，通過縫隙拍攝', '懸疑場景、偷窺感、隱藏視角', '通過門縫、窗簾、樹葉等遮擋物拍攝，營造偷窺感', 'voyeur shot through {obstacle} peeping at {subject}', 3, '🕳️', 23],
        ['旋轉上升', 'Spiral Up', 'special', '攝影機螺旋式上升', '攝影機一邊旋轉一邊上升', '夢境結束、精神升華、超現實場景', '畫面螺旋上升，帶來超現實和夢幻感', 'spiral ascending shot rising above {scene}', 4, '🌀', 24],
        ['甩鏡', 'Whip Shot', 'special', '快速甩動攝影機', '極速甩動攝影機產生動態模糊', '轉場、動作強調、節奏變化', '畫面快速模糊過渡，連接不同場景', 'whip camera to {direction}', 2, '💨', 25],
        ['穩定器跟隨', 'Gimbal Follow', 'dynamic', '使用穩定器跟隨主體', '攝影師使用手持穩定器跟隨主體移動', 'Vlog風格、日常場景、流暢跟隨', '畫面流滑穩定，跟隨主體自然移動', 'gimbal following {subject} through {environment}', 2, '🎯', 26],
    ];

    db.transaction(() => { for (const m of movements) insertMovement.run(...m); })();
    console.log(`  ✓ ${movements.length} 個鏡頭運動已初始化`);

    // ========== 景別 ==========
    const insertSize = db.prepare(`INSERT INTO shot_sizes (name_zh, name_en, abbreviation, description, framing, emotional_impact, use_case, english_prompt, icon, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?)`);

    const sizes = [
        ['大特寫', 'Extreme Close-Up', 'ECU', '極近距離拍攝局部細節', '只展示眼睛、嘴唇、手指等極小區域', '極度親密、緊張、揭示隱藏細節', '眼神特寫、物品細節、關鍵線索', 'extreme close-up of {detail}', '🔍', 1],
        ['特寫', 'Close-Up', 'CU', '近距離拍攝面部或物品', '面部佔據大部分畫面，或展示單個物品', '情緒表達、角色內心、重要物品', '角色表情、情感爆發、物品展示', 'close-up of {subject}', '📸', 2],
        ['中近景', 'Medium Close-Up', 'MCU', '拍攝胸部以上', '展示胸部以上區域，包含面部和部分身體', '對話場景、情緒交流、角色互動', '對話、採訪、情感交流場景', 'medium close-up of {subject}', '📷', 3],
        ['中景', 'Medium Shot', 'MS', '拍攝腰部以上', '展示腰部以上區域，身體語言可見', '敘事性場景、日常對話、角色動作', '日常場景、對話、展示角色動作', 'medium shot of {subject}', '🖼️', 4],
        ['中遠景', 'Medium Long Shot', 'MLS', '拍攝膝蓋以上', '展示膝蓋以上區域，環境開始可見', '角色與環境的關係、社交場景', '展示角色與環境互動', 'medium long shot of {subject}', '🏞️', 5],
        ['遠景', 'Long Shot', 'LS', '拍攝完整人體及環境', '展示完整人體及周圍環境', '環境建立、角色位置、空間感', '環境建立鏡頭、展示角色處境', 'long shot of {subject} in {environment}', '🌄', 6],
        ['大遠景', 'Extreme Long Shot', 'ELS', '人物在環境中極小', '廣闊環境為主，人物極小或不可見', '渺小感、環境壓迫、史詩感', '環境建立、展示規模、史詩場景', 'extreme wide shot of {landscape}', '🏔️', 7],
        ['全景', 'Full Shot', 'FS', '展示完整人體', '從頭到腳完整展示人物', '角色出場、展示全身動作、舞蹈', '角色初次出場、動作場景、展示全身', 'full shot of {subject}', '🧍', 8],
        ['過肩鏡頭', 'Over-the-Shoulder', 'OTS', '從一個角色肩膀後方拍攝另一個角色', '前景角色的肩膀和後腦，背景是面對的角色', '對話感、對立感、關係建立', '對話場景、對峙場景、展示角色關係', 'over-the-shoulder shot from {char1} looking at {char2}', '👥', 9],
        ['雙人鏡頭', 'Two Shot', 'TS', '同時展示兩個角色', '兩個角色同時在畫面中', '關係展示、對話、互動', '展示兩個角色的關係和互動', 'two shot of {char1} and {char2}', '👫', 10],
    ];

    db.transaction(() => { for (const s of sizes) insertSize.run(...s); })();
    console.log(`  ✓ ${sizes.length} 個景別已初始化`);

    // ========== 角度 ==========
    const insertAngle = db.prepare(`INSERT INTO camera_angles (name_zh, name_en, description, psychological_effect, use_case, english_prompt, icon, sort_order) VALUES (?,?,?,?,?,?,?,?)`);

    const angles = [
        ['平視角度', 'Eye Level', '與角色視線等高的標準角度', '中立、客觀、觀眾與角色平等', '日常場景、標準敘事', 'eye level angle', '👁️', 1],
        ['仰拍角度', 'Low Angle', '從下方往上拍攝', '權威感、力量感、崇高感', '英雄出場、建築展示、反派壓迫', 'low angle looking up at {subject}', '⬆️', 2],
        ['俯拍角度', 'High Angle', '從上方往下拍攝', '渺小感、脆弱感、被觀察感', '角色脆弱時、展示處境、上帝視角', 'high angle looking down at {subject}', '⬇️', 3],
        ['鳥瞰角度', 'Bird\'s Eye', '從正上方垂直拍攝', '上帝視角、全知感、地圖感', '地理展示、犯罪現場、宏觀視角', 'birds eye view from directly above {scene}', '🦅', 4],
        ['蟻視角度', 'Worm\'s Eye', '從地面極低角度拍攝', '極度渺小、壓迫感、仰望感', '建築壓迫、角色無助、戲劇性', 'worms eye view from ground level', '🐛', 5],
        ['斜角（荷蘭角）', 'Dutch Angle', '攝影機傾斜拍攝', '不安感、失衡感、精神錯亂', '懸疑場景、夢境、精神狀態異常', 'dutch angle tilted {direction}', '📐', 6],
        ['過肩角度', 'Over Shoulder', '從角色肩膀後方拍攝', '代入感、對話感、偷窺感', '對話場景、展示角色關係', 'over the shoulder from {character}', '👤', 7],
        ['主觀角度', 'POV Angle', '角色第一人稱視角', '沉浸感、代入感、直接體驗', '恐怖場景、角色體驗、主觀敘事', 'POV angle from {character}', '👁️', 8],
        ['背面角度', 'Reverse Angle', '從角色背後拍攝', '神秘感、未知感、跟隨感', '角色背影、懸念建立、跟隨場景', 'reverse angle behind {subject}', '🔄', 9],
        ['側面角度', 'Profile Angle', '從側面拍攝角色', '輪廓感、沉思感、對比感', '角色沉思、對比構圖、剪影效果', 'profile angle of {subject}', '↔️', 10],
    ];

    db.transaction(() => { for (const a of angles) insertAngle.run(...a); })();
    console.log(`  ✓ ${angles.length} 個角度已初始化`);

    // ========== 轉場 ==========
    const insertTransition = db.prepare(`INSERT INTO shot_transitions (name_zh, name_en, description, technique, mood, english_prompt, icon, sort_order) VALUES (?,?,?,?,?,?,?,?)`);

    const transitions = [
        ['硬切', 'Hard Cut', '直接切換到下一個鏡頭', '兩個鏡頭直接銜接，無過渡效果', '快速、果斷、日常', 'hard cut to {next_scene}', '✂️', 1],
        ['溶解轉場', 'Dissolve', '兩個畫面疊化過渡', '前一個畫面淡出同時下一個畫面淡入', '時間流逝、回憶、柔和轉換', 'dissolve transition to {next_scene}', '🌊', 2],
        ['淡入', 'Fade In', '從黑色/白色逐漸顯現畫面', '畫面從純色逐漸顯現', '故事開始、場景開始、甦醒', 'fade in from black to reveal {scene}', '🌅', 3],
        ['淡出', 'Fade Out', '畫面逐漸變為黑色/白色', '畫面逐漸過渡到純色', '故事結束、場景結束、遺忘', 'fade out to black from {scene}', '🌇', 4],
        ['擦除轉場', 'Wipe', '一個畫面被另一個畫面擦除', '使用線性或圖形擦除效果', '場景切換、時間跳轉、風格化', 'wipe transition from {scene_a} to {scene_b}', '🧹', 5],
        ['模糊轉場', 'Blur Transition', '通過模糊過渡', '畫面模糊後清晰呈現新場景', '回憶、夢境、意識轉換', 'blur transition to {next_scene}', '🌫️', 6],
        ['閃白轉場', 'Flash/White Out', '畫面閃白後切換', '畫面瞬間過曝閃白', '頓悟、爆炸、強光、記憶閃回', 'white flash transition to {next_scene}', '⚡', 7],
        ['遮擋轉場', '遮擋物過渡', '通過前景遮擋物過渡', '主體經過遮擋物（柱子、牆壁）時切換', '自然轉場、空間連續性', 'object wipe transition passing {obstacle}', '🧱', 8],
        ['匹配剪輯', 'Match Cut', '利用相似構圖元素過渡', '兩個畫面中相似的形狀、動作或顏色連接', '創意連接、隱喻、平行敘事', 'match cut from {element_a} to {element_b}', '🎯', 9],
        ['跳切', 'Jump Cut', '同一場景內的時間跳躍', '同一角度但不同時間點的鏡頭直接銜接', '時間壓縮、緊張感、不安定', 'jump cut forward in time', '⏩', 10],
        ['黑場過渡', 'Iris', '圓形開合過渡', '畫面以圓形收縮或擴展方式過渡', '復古風格、聚焦、老電影', 'iris transition focusing on {subject}', '⭕', 11],
        ['滑動轉場', 'Slide', '畫面水平或垂直滑動', '一個畫面滑出同時另一個畫面滑入', '現代感、簡潔、PPT風格', 'slide transition {direction} to {next_scene}', '📱', 12],
    ];

    db.transaction(() => { for (const t of transitions) insertTransition.run(...t); })();
    console.log(`  ✓ ${transitions.length} 個轉場已初始化`);

    // ========== 鏡頭語言組合模板 ==========
    const insertTemplate = db.prepare(`INSERT INTO camera_language_templates (name, description, genre, full_description, english_prompt, example_scene) VALUES (?,?,?,?,?,?)`);

    const langTemplates = [
        ['英雄出場', '使用仰拍+推鏡+史詩景別建立角色權威', 'action',
            '大遠景建立環境 → 仰拍角度 + 緩慢推鏡至中景，角色背光出場',
            'Extreme wide shot establishing {environment}. Camera slowly dollies in with a low angle, rising to a medium shot as {character} emerges silhouetted against the light. Epic cinematic style. Dramatic backlighting.',
            '沙漠中，騎士從沙丘後方緩緩升起，鏡頭從大遠景推至中景'],

        ['懸疑揭示', '使用主觀視角+手持+窺視構圖製造不安', 'horror',
            '主觀POV鏡頭 + 手持晃動 + 通過門縫窺視 + 推鏡至特寫',
            'POV shot moving through dark corridor. Handheld camera with slight tremor. Camera peers through a crack in the door (voyeur framing). Slowly dollies in to extreme close-up of {detail}. Horror cinematic. Dim flickering light.',
            '在黑暗走廊中移動，通過門縫看到房間裡的恐怖場景'],

        ['浪漫相遇', '使用慢動作+淺景深+弧形運鏡營造夢幻感', 'romance',
            '慢動作 + 弧形環繞 + 淺景深特寫 + 柔光 + 溶解轉場',
            'Slow motion arc shot orbiting around {character1} and {character2} as they first meet. Shallow depth of field with bokeh. Soft diffused golden hour lighting. Dissolve transition to close-up of their eyes meeting. Dreamy romantic style.',
            '兩人初次相遇，時間彷彿停止，鏡頭環繞展示這一刻'],

        ['追逐場景', '使用跟蹤+快速剪輯+動態模糊增加緊張感', 'action',
            '跟蹤鏡頭 + 快速剪切 + 甩鏡 + 低角度 + 手持',
            'Fast-paced tracking shot following {character} sprinting through {environment}. Rapid whip pans between obstacles. Handheld camera energy. Low angle shots of feet pounding pavement. Intense action cinematography. Speed ramping.',
            '在城市街道中追逐，鏡頭緊跟角色穿梭於人群和障礙物之間'],

        ['回憶場景', '使用柔焦+暖色調+慢動作+溶解', 'drama',
            '柔焦效果 + 暖色調 + 慢動作 + 溶解轉場 + 懷舊風格',
            'Dissolve from present to memory. Soft focus with warm amber tones. Slow motion footage of {memory_scene}. Vintage film grain. Gentle piano melody. Nostalgic painterly style.',
            '從現實溶解到回憶畫面，暖色調柔焦呈現過去的美好時光'],

        ['太空漂浮', '使用失重感+緩慢運鏡+廣角+深空照明', 'sci-fi',
            '廣角鏡頭 + 緩慢旋轉 + 失重感 + 深空環境 + 科幻照明',
            'Wide angle shot of {astronaut} floating in zero gravity inside {space_station}. Camera slowly rotates in zero-G. Deep space visible through windows. Cool blue interior lighting with warm instrument glow. Sci-fi cinematic. Weightless movement.',
            '太空站內，太空人失重漂浮，鏡頭緩慢旋轉展示失重狀態'],

        ['武林對決', '使用低角度+慢動作+環繞+風塵效果', 'martial-arts',
            '低角度仰拍 + 慢動作拔劍 + 弧形環繞 + 風塵飛揚 + 戲劇側光',
            'Low angle shot of two warriors facing off. Slow motion draw of swords. Arc shot circling the combatants as wind blows dust and leaves. Dramatic side lighting creating long shadows. Wuxia cinematic style. Cherry blossoms falling.',
            '兩位劍客對峙，風吹起落葉，鏡頭環繞展示緊張對峙'],

        ['夢境進入', '使用旋轉+變焦推拉+超現實色彩', 'fantasy',
            '推拉結合（眩暈效果）+ 旋轉 + 色彩飽和度變化 + 超現實',
            'Dolly zoom vertigo effect as reality warps. Camera begins to spiral. Colors shift from desaturated to hyper-saturated. Environment morphs and distorts. Surreal dreamlike atmosphere. Fantasy style.',
            '現實開始扭曲，色彩變化，鏡頭產生眩暈效果進入夢境'],

        ['戰爭場面', '使用多角度快速切換+手持+空中俯瞰', 'action',
            '手持近距離 + 快速切換 + 空中俯瞰 + 慢動作 + 史詩感',
            'Chaotic handheld camera in the midst of battle. Rapid cuts between close-ups of soldiers and wide shots of the battlefield. Aerial drone shot revealing the scale of the conflict. Slow motion moments of impact. Epic war cinematography.',
            '混亂的戰場中，快速切換近景和遠景，無人機展示戰場規模'],

        ['孤獨行走', '使用遠景+跟蹤+風景長鏡頭+寧靜感', 'drama',
            '大遠景跟蹤 + 緩慢推進 + 空曠環境 + 自然光 + 寧靜',
            'Extreme long shot of {character} walking alone through vast {landscape}. Slow tracking shot following from behind. Natural lighting with long shadows. Serene and contemplative atmosphere. Minimal movement.',
            '廣闊的荒野中，一個孤獨的身影漸行漸遠'],

        ['時間流逝', '使用延時攝影+溶解+固定角度', 'drama',
            '固定鏡頭 + 延時效果 + 溶解轉場 + 光影變化',
            'Static locked-off shot of {location}. Time-lapse showing the passage of time — clouds racing, shadows moving, lights changing from day to night. Dissolve between seasons. Cinematic time passage.',
            '固定角度拍攝同一地點，延時展示日夜交替和季節變化'],

        ['對話張力', '使用過肩鏡頭+正反打+推鏡+景深變化', 'drama',
            '過肩鏡頭 + 正反打切換 + 緩慢推鏡 + 景深變化',
            'Over-the-shoulder shot alternating between {char1} and {char2}. Slow dolly in as tension builds. Shallow depth of field blurring the background. Tight framing on eyes during critical moment. Dramatic dialogue cinematography.',
            '對話場景中，過肩鏡頭正反打，隨緊張感加深鏡頭緩慢推近'],
    ];

    db.transaction(() => { for (const t of langTemplates) insertTemplate.run(...t); })();
    console.log(`  ✓ ${langTemplates.length} 個鏡頭語言組合模板已初始化`);

    db.close();
    console.log('\n✅ 鏡頭語言數據初始化完成！');
    console.log('📊 統計:');
    console.log(`   - ${movements.length} 個鏡頭運動（基礎/動態/複合/空中/特殊）`);
    console.log(`   - ${sizes.length} 個景別（大特寫→大遠景）`);
    console.log(`   - ${angles.length} 個鏡頭角度`);
    console.log(`   - ${transitions.length} 個轉場效果`);
    console.log(`   - ${langTemplates.length} 個鏡頭語言組合模板`);
}

initCameraData();
