-- ============================================
-- 故事模板（快速開始創作）
-- ============================================
CREATE TABLE IF NOT EXISTS story_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    category_id INTEGER,
    genre TEXT,
    tone TEXT,
    target_audience TEXT,
    outline TEXT NOT NULL,         -- 故事大綱模板
    opening TEXT,                  -- 開頭範例
    character_template TEXT,       -- 角色設定模板 (JSON)
    world_template TEXT,           -- 世界觀模板
    writing_tips TEXT,             -- 寫作提示
    difficulty TEXT DEFAULT 'beginner' CHECK(difficulty IN ('beginner', 'intermediate', 'advanced')),
    icon TEXT,
    usage_count INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- ============================================
-- 每日靈感/寫作提示
-- ============================================
CREATE TABLE IF NOT EXISTS writing_prompts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prompt_type TEXT NOT NULL CHECK(prompt_type IN ('opening', 'character', 'conflict', 'world', 'dialogue', 'twist', 'ending')),
    content TEXT NOT NULL,         -- 提示內容
    genre TEXT,                    -- 適用類型
    difficulty TEXT DEFAULT 'all',
    used_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 閱讀清單
-- ============================================
CREATE TABLE IF NOT EXISTS reading_lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL DEFAULT '我的閱讀清單',
    description TEXT,
    is_public BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS reading_list_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    list_id INTEGER NOT NULL,
    story_id INTEGER NOT NULL,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (list_id) REFERENCES reading_lists(id) ON DELETE CASCADE,
    FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
    UNIQUE(list_id, story_id)
);

-- ============================================
-- 故事版本歷史
-- ============================================
CREATE TABLE IF NOT EXISTS story_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    story_id INTEGER NOT NULL,
    version_number INTEGER NOT NULL,
    title TEXT,
    content TEXT NOT NULL,
    summary TEXT,
    change_note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE
);

-- ============================================
-- 用戶偏好設定
-- ============================================
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id INTEGER PRIMARY KEY,
    theme TEXT DEFAULT 'light' CHECK(theme IN ('light', 'dark', 'auto')),
    font_size TEXT DEFAULT 'medium' CHECK(font_size IN ('small', 'medium', 'large')),
    editor_font TEXT DEFAULT 'sans' CHECK(editor_font IN ('sans', 'serif', 'mono')),
    language TEXT DEFAULT 'zh-TW',
    email_notifications BOOLEAN DEFAULT 1,
    auto_save BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================
-- 名字生成器歷史
-- ============================================
CREATE TABLE IF NOT EXISTS name_generator_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name_type TEXT NOT NULL CHECK(name_type IN ('character', 'place', 'organization', 'item', 'creature')),
    genre TEXT,
    generated_names TEXT NOT NULL, -- JSON array
    parameters TEXT,               -- JSON of input parameters
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_reading_list_items_list ON reading_list_items(list_id);
CREATE INDEX IF NOT EXISTS idx_story_versions_story ON story_versions(story_id);
CREATE INDEX IF NOT EXISTS idx_writing_prompts_type ON writing_prompts(prompt_type);
