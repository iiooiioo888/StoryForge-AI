<div align="center">

# 🎭 StoryForge AI

### AI 驅動的故事創作與影片提示詞生成平台

[![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)](https://expressjs.com)
[![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite&logoColor=white)](https://sqlite.org)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

<p>一個全功能的故事創作平台，結合 AI 技術生成故事內容，並將故事轉化為專業級影片提示詞，適用於 <b>Sora</b>、<b>Runway</b>、<b>Kling</b>、<b>Pika</b> 等主流 AI 影片生成工具。</p>

<br>

<img src="https://via.placeholder.com/800x400/667eea/ffffff?text=StoryForge+AI+Dashboard" alt="Dashboard Preview" width="80%">

</div>

---

## ✨ 核心功能

### 📝 故事創作系統
- **手動創作** — 富文本編輯器，支援多章節、角色設定、世界觀構建
- **AI 輔助生成** — 輸入靈感，AI 自動生成故事大綱、角色和正文
- **AI 續寫助手** — 從故事中斷處繼續創作，多種方向可選
- **8 種故事模板** — 英雄之旅、校園青春、密室懸案、末日生存、甜蜜戀曲、武俠恩仇錄、賽博朋克偵探、美食暖心

### 🎬 影片提示詞生成
- **5 大平台支援** — Sora (OpenAI)、Runway Gen-3、Kling (快手)、Pika Labs、通用格式
- **12 種專業模板** — 電影級場景、角色特寫、動作場景、風景長鏡頭、對話場景、戰鬥場面、魔法施展、太空場景等
- **從故事批量生成** — 自動拆分故事場景，生成配套影片提示詞
- **Negative Prompt** — 自動生成對應平台的負面提示詞

### 🎥 鏡頭語言百科
- **26 種鏡頭運動** — 基礎/動態/複合/空中/特殊，含難度等級
- **10 種景別** — 大特寫(ECU) → 大遠景(ELS)，含構圖說明和情感影響
- **10 種鏡頭角度** — 平視/仰拍/俯拍/鳥瞰/荷蘭角等，含心理效果分析
- **12 種轉場效果** — 硬切/溶解/淡入淡出/匹配剪輯等
- **12 種場景模板** — 英雄出場、懸疑揭示、浪漫相遇、追逐場景等預設組合
- **自定義組合器** — 選擇景別 + 角度 + 運鏡，一鍵生成專業提示詞

### 🛠️ 創作工具箱
- **🔤 名字生成器** — 角色名/地名/組織名/物品名，奇幻/科幻/武俠/現代四種風格
- **💡 每日靈感** — 25+ 寫作提示，涵蓋開頭/角色/衝突/世界觀/對話/反轉/結局
- **📊 數據分析** — 閱讀量/互動率/章節字數分佈/版本歷史
- **📥 導出工具** — TXT/JSON 格式匯出
- **🔖 閱讀清單** — 個人收藏管理
- **⚙️ 個人設定** — 主題/字體/通知偏好

### 👥 社區與管理
- **用戶系統** — 註冊/登入/個人資料/積分系統
- **互動系統** — 評論/點讚/收藏/分享
- **管理後台** — 儀表盤/用戶管理/內容審核/分類管理/模板管理/系統設定/AI日誌

---

## 🏗️ 技術架構

```
┌─────────────────────────────────────────────────┐
│                    Frontend                       │
│         原生 HTML/CSS/JS SPA (無框架依賴)          │
├─────────────────────────────────────────────────┤
│                    Backend                        │
│              Node.js + Express                    │
├──────────┬──────────┬──────────┬─────────────────┤
│ Auth API │Story API │Prompt API│ Camera/Tool API  │
│  (JWT)   │  (CRUD)  │(Template)│   (Generator)    │
├──────────┴──────────┴──────────┴─────────────────┤
│                  SQLite (WAL)                     │
│  20+ 數據表 | 外鍵約束 | 索引優化                    │
└─────────────────────────────────────────────────┘
```

### 數據庫結構 (20+ 數據表)

| 模塊 | 數據表 |
|------|--------|
| 用戶系統 | `users`, `user_preferences`, `notifications` |
| 故事管理 | `stories`, `chapters`, `characters`, `world_settings` |
| 元數據 | `categories`, `tags`, `story_tags` |
| 影片提示詞 | `video_prompts`, `video_prompt_templates` |
| 鏡頭語言 | `camera_movements`, `shot_sizes`, `camera_angles`, `shot_transitions`, `camera_language_templates` |
| 社交互動 | `interactions`, `comments` |
| 創作工具 | `story_templates`, `writing_prompts`, `reading_lists`, `reading_list_items`, `story_versions` |
| 系統 | `ai_generation_logs`, `system_settings`, `name_generator_history` |

---

## 🚀 快速開始

### 環境要求

- **Node.js** >= 18.x
- **npm** >= 9.x

### 安裝

```bash
# 克隆倉庫
git clone https://github.com/iiooiioo888/StoryForge-AI.git
cd StoryForge-AI

# 安裝依賴
npm install

# 初始化數據庫（含示範數據）
npm run init-db

# 初始化鏡頭語言數據
node database/camera_init.js

# 初始化工具數據
node database/tools_init.js

# 啟動服務
npm start
```

### 訪問

| 頁面 | 地址 |
|------|------|
| 🏠 首頁 | http://localhost:3000 |
| 📊 管理後台 | http://localhost:3000 (以 admin 帳號登入) |

### 默認帳號

| 帳號 | 密碼 | 角色 |
|------|------|------|
| `admin` | `admin123` | 👑 管理員 |
| `demo` | `demo123` | 👤 普通用戶 |

---

## 📁 項目結構

```
StoryForge-AI/
├── server.js                  # 主服務器入口
├── package.json               # 項目配置
├── database/
│   ├── schema.sql             # 核心數據庫 Schema
│   ├── init.js                # 核心數據初始化
│   ├── camera_schema.sql      # 鏡頭語言 Schema
│   ├── camera_init.js         # 鏡頭語言數據初始化
│   ├── tools_schema.sql       # 工具數據 Schema
│   └── tools_init.js          # 工具數據初始化
├── middleware/
│   └── auth.js                # JWT 認證中間件
├── routes/
│   ├── auth.js                # 用戶認證 API
│   ├── stories.js             # 故事 CRUD API
│   ├── prompts.js             # 影片提示詞 API
│   ├── camera.js              # 鏡頭語言 API
│   ├── tools.js               # 創作工具 API
│   └── admin.js               # 管理後台 API
└── public/
    ├── index.html             # SPA 入口 (所有頁面)
    ├── css/
    │   └── style.css          # 全局樣式 (響應式)
    └── js/
        └── app.js             # 前端應用邏輯
```

---

## 🔌 API 端點

### 認證 (`/api/auth`)
| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | `/register` | 用戶註冊 |
| POST | `/login` | 用戶登入 |
| POST | `/logout` | 用戶登出 |
| GET | `/me` | 獲取當前用戶 |
| PUT | `/profile` | 更新個人資料 |
| GET | `/notifications` | 獲取通知 |

### 故事 (`/api/stories`)
| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/` | 故事列表（支援分類/搜索/排序） |
| POST | `/` | 創建故事 |
| GET | `/:id` | 故事詳情（含章節/角色/標籤） |
| PUT | `/:id` | 更新故事 |
| DELETE | `/:id` | 刪除故事 |
| POST | `/:id/interact` | 讚/收藏 |
| GET/POST | `/:id/comments` | 評論 |
| GET/POST | `/:id/chapters` | 章節管理 |
| GET/POST | `/:id/characters` | 角色管理 |

### 影片提示詞 (`/api/prompts`)
| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/templates` | 模板列表 |
| POST | `/generate` | 生成提示詞 |
| POST | `/from-story` | 從故事批量生成 |
| GET | `/my-prompts` | 我的提示詞 |

### 鏡頭語言 (`/api/camera`)
| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/movements` | 26 種鏡頭運動 |
| GET | `/shot-sizes` | 10 種景別 |
| GET | `/angles` | 10 種角度 |
| GET | `/transitions` | 12 種轉場 |
| GET | `/language-templates` | 場景模板 |
| POST | `/compose` | 自定義組合生成 |

### 創作工具 (`/api/tools`)
| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/story-templates` | 故事模板庫 |
| GET | `/writing-prompts` | 寫作提示 |
| GET/POST | `/reading-lists` | 閱讀清單 |
| POST | `/generate-names` | 名字生成器 |
| GET | `/stories/:id/analytics` | 數據分析 |
| POST | `/stories/:id/continue` | AI 續寫 |
| GET | `/stories/:id/export` | 導出 (TXT/JSON) |
| GET/PUT | `/preferences` | 個人設定 |

### 管理 (`/api/admin`)
| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/dashboard` | 儀表盤統計 |
| GET/PUT | `/users` | 用戶管理 |
| GET/PUT | `/stories` | 內容管理 |
| GET/POST | `/categories` | 分類管理 |
| GET/PUT | `/settings` | 系統設定 |
| GET | `/ai-logs` | AI 生成日誌 |

---

## 🎨 頁面一覽

| 頁面 | 路由 | 功能 |
|------|------|------|
| 🏠 首頁 | `home` | Hero 展示、功能介紹、數據統計、CTA |
| 📖 探索 | `explore` | 故事瀏覽、分類篩選、搜索、排序 |
| 🎬 提示詞 | `prompts` | 影片提示詞生成器、模板選擇、歷史記錄 |
| 🎥 鏡頭語言 | `camera` | 運鏡百科、景別、角度、轉場、組合器 |
| 🛠️ 工具箱 | `tools` | 8 大創作工具入口 |
| 👤 工作台 | `dashboard` | 概覽/故事管理/創建/AI生成/提示詞/設定 |
| 📖 故事詳情 | `story` | 閱讀體驗、章節、角色、評論 |
| ✏️ 編輯器 | `editor` | 內容/章節/角色/設定 四標籤編輯 |
| ⚙️ 管理後台 | `admin` | 儀表盤/用戶/內容/分類/模板/設定/日誌 |

---

## 📊 數據統計 (初始化後)

| 類型 | 數量 |
|------|------|
| 用戶帳號 | 5 |
| 示範故事 | 6 篇完整短篇 |
| 故事分類 | 12 |
| 標籤 | 30 |
| 提示詞模板 | 12 |
| 鏡頭運動 | 26 |
| 景別 | 10 |
| 角度 | 10 |
| 轉場 | 12 |
| 場景模板 | 12 |
| 故事模板 | 8 |
| 寫作提示 | 25+ |
| 角色 | 8 |
| 章節 | 8 |
| 評論 | 11 |

---

## 🛡️ 安全特性

- **JWT 認證** — HttpOnly Cookie，7 天有效期
- **密碼加密** — bcrypt 雜湊存儲
- **權限控制** — 用戶/管理員分級權限
- **SQL 注入防護** — 參數化查詢
- **XSS 防護** — 輸出轉義
- **CORS 配置** — 跨域請求控制

---

## 📄 License

MIT License

---

<div align="center">

**Built with ❤️ by StoryForge AI**

[⬆ 回到頂部](#-storyforge-ai)

</div>
