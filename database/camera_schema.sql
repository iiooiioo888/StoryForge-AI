-- ============================================
-- 鏡頭運動（Camera Movements）
-- ============================================
CREATE TABLE IF NOT EXISTS camera_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name_zh TEXT NOT NULL,
    name_en TEXT NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('basic', 'dynamic', 'complex', 'aerial', 'special')),
    description TEXT,
    technique TEXT,        -- 技術說明
    use_case TEXT,         -- 適用場景
    visual_effect TEXT,    -- 視覺效果描述
    english_prompt TEXT,   -- 英文提示詞模板
    difficulty INTEGER DEFAULT 1 CHECK(difficulty BETWEEN 1 AND 5),
    icon TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 鏡頭景別（Shot Sizes）
-- ============================================
CREATE TABLE IF NOT EXISTS shot_sizes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name_zh TEXT NOT NULL,
    name_en TEXT NOT NULL,
    abbreviation TEXT,     -- ECU, CU, MS, LS 等
    description TEXT,
    framing TEXT,          -- 構圖說明
    emotional_impact TEXT, -- 情感影響
    use_case TEXT,
    english_prompt TEXT,
    icon TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 鏡頭角度（Camera Angles）
-- ============================================
CREATE TABLE IF NOT EXISTS camera_angles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name_zh TEXT NOT NULL,
    name_en TEXT NOT NULL,
    description TEXT,
    psychological_effect TEXT, -- 心理效果
    use_case TEXT,
    english_prompt TEXT,
    icon TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 鏡頭轉場（Transitions）
-- ============================================
CREATE TABLE IF NOT EXISTS shot_transitions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name_zh TEXT NOT NULL,
    name_en TEXT NOT NULL,
    description TEXT,
    technique TEXT,
    mood TEXT,             -- 適合的情緒
    english_prompt TEXT,
    icon TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 鏡頭語言組合模板
-- ============================================
CREATE TABLE IF NOT EXISTS camera_language_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    genre TEXT,            -- 適用類型：action, drama, horror, romance, sci-fi 等
    shot_size_id INTEGER,
    angle_id INTEGER,
    movement_id INTEGER,
    transition_id INTEGER,
    full_description TEXT, -- 完整的鏡頭語言描述
    english_prompt TEXT,   -- 完整英文提示詞
    example_scene TEXT,    -- 示例場景
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shot_size_id) REFERENCES shot_sizes(id),
    FOREIGN KEY (angle_id) REFERENCES camera_angles(id),
    FOREIGN KEY (movement_id) REFERENCES camera_movements(id),
    FOREIGN KEY (transition_id) REFERENCES shot_transitions(id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_camera_movements_category ON camera_movements(category);
CREATE INDEX IF NOT EXISTS idx_camera_language_genre ON camera_language_templates(genre);
