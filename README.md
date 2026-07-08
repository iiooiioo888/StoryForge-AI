<div align="center">

# 🎭 StoryForge AI

### AI 驅動的故事創作與影片提示詞生成平台

[![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-7-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com)
[![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)](https://expressjs.com)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

<p>結合 AI 技術的故事創作平台，支援故事生成、影片提示詞轉換，適用於 <b>Sora</b>、<b>Runway</b>、<b>Kling</b>、<b>Pika</b> 等主流 AI 影片生成工具。</p>

</div>

---

## ✨ 核心功能

### 📝 故事創作系統
- **手動創作** — 富文本編輯器，多章節、角色設定、世界觀構建
- **AI 輔助生成** — 輸入靈感，自動生成大綱、角色和正文（支援 SSE 串流）
- **AI 續寫助手** — 多種方向可選，從中斷處繼續創作
- **8 種故事類型** — 科幻、奇幻、愛情、懸疑、恐怖、歷史、賽博朋克、武俠

### 🎬 影片提示詞生成
- **5 大平台** — Sora、Runway Gen-3、Kling、Pika Labs、通用格式
- **14 種鏡頭類型 + 10 種運鏡動作** — 完整鏡頭語言庫
- **從故事批量生成** — 自動拆分場景，生成配套影片提示詞
- **Negative Prompt** — 依平台自動生成負面提示詞

### 🎥 鏡頭語言百科
- **26 種鏡頭運動** — 基礎/動態/複合/空中/特殊
- **10 種景別** — 大特寫 → 大遠景
- **10 種鏡頭角度** — 平視/仰拍/俯拍/鳥瞰/荷蘭角等
- **12 種轉場 + 12 種場景模板**
- **自定義組合器** — 景別 + 角度 + 運鏡一鍵生成

### 🛠️ 創作工具箱
- **名字生成器** — 角色名/地名/組織名，奇幻/科幻/武俠/現代風格
- **每日靈感** — 25+ 寫作提示
- **數據分析** — 閱讀量/互動率/字數分佈
- **導出工具** — TXT/JSON 格式

### 🔧 工作流編輯器
- **節點式流程** — 拖拽節點串聯世界設定、場景、鏡頭、燈光、渲染
- **預設範本** — Cinematic Scene / Full Production / Lighting & Render 三種範本
- **AI Prompt 生成** — 節點自動產出 Sora/Runway/Kling 專用提示詞

### 💰 積分系統
- **用量追蹤** — 記錄每次 AI 生成消耗
- **積分管理** — 用戶積分餘額、充值、消耗記錄

---

## 🏗️ 技術架構

```
┌─────────────────────────────────────────────────┐
│                    Frontend                       │
│     Vanilla JS SPA (ES Modules, 無框架依賴)        │
│  pages: home / workshop / library / prompts /    │
│         camera / credits / admin                  │
│  engine: story-engine / prompt-engine             │
├─────────────────────────────────────────────────┤
│                    Backend                        │
│              Node.js + Express                    │
│   Helmet · CORS · Compression · Rate Limiting     │
│   Winston Logger · Content Moderation · SSE       │
├──────────┬──────────┬──────────┬─────────────────┤
│ Auth API │Story API │Prompt API│ Camera/Tool API  │
│  (JWT)   │  (CRUD)  │(Template)│   (Generator)    │
├──────────┼──────────┼──────────┼─────────────────┤
│ LLM API  │Workflow  │ Credits  │   Admin API      │
│ (Stream) │  (CRUD)  │ (用量)   │   (管理後台)      │
├──────────┴──────────┴──────────┴─────────────────┤
│                  MongoDB (Mongoose)               │
│  36 個 Model | Schema 驗證 | 索引優化               │
└─────────────────────────────────────────────────┘
```

### 數據模型 (36 個 Mongoose Model)

| 模塊 | Model |
|------|-------|
| 用戶系統 | `User`, `UserPreference`, `Notification` |
| 故事管理 | `Story`, `Chapter`, `Character`, `WorldSetting` |
| 元數據 | `Category`, `Tag`, `StoryTag` |
| 影片提示詞 | `VideoPrompt`, `VideoPromptTemplate` |
| 鏡頭語言 | `CameraMovement`, `ShotSize`, `CameraAngle`, `ShotTransition`, `CameraLanguageTemplate` |
| 社交互動 | `Interaction`, `Comment` |
| 創作工具 | `StoryTemplate`, `WritingPrompt`, `ReadingList`, `ReadingListItem`, `StoryVersion` |
| 工作流 | `Workflow`, `WorkflowExecution` |
| 積分系統 | `Credit`, `CreditTransaction` |
| LLM | `LLMProvider`, `LLMUsage` |
| 系統 | `AIGenerationLog`, `SystemSetting`, `NameGeneratorHistory` |

---

## 🚀 快速開始

### 方式一：Docker（推薦）

```bash
# 克隆倉庫
git clone https://github.com/iiooiioo888/StoryForge-AI.git
cd StoryForge-AI

# 複製環境變數
cp .env.example .env

# 啟動（含 MongoDB）
npm run docker:up

# 查看日誌
npm run docker:logs

# 停止
npm run docker:down
```

服務啟動後：
- 🌐 **應用**: http://localhost:8888
- 💚 **健康檢查**: http://localhost:8888/api/health

### 方式二：本地開發

```bash
# 環境要求：Node.js >= 22, MongoDB 本地運行
npm install
cp .env.example .env

# 初始化資料庫（含示範資料）
npm run seed

# 啟動
npm run dev
```

### 方式三：Docker 開發模式（熱重載）

```bash
npm run docker:dev
```

### 默認帳號

| 帳號 | 密碼 | 角色 |
|------|------|------|
| `admin` | `admin123` | 👑 管理員 |
| `demo` | `demo123` | 👤 普通用戶 |

---

## ⚙️ 環境變數

| 變數 | 說明 | 預設值 |
|------|------|--------|
| `PORT` | 服務端口 | `3000` |
| `MONGODB_URI` | MongoDB 連接字串 | `mongodb://localhost:27017/storyforge` |
| `JWT_SECRET` | JWT 簽名密鑰 | *(必填)* |
| `SESSION_SECRET` | Session 密鑰 | *(必填)* |
| `CORS_ORIGIN` | 允許的跨域來源 | `http://localhost:3000` |
| `OPENAI_API_KEY` | OpenAI API Key | *(選填)* |
| `ANTHROPIC_API_KEY` | Anthropic API Key | *(選填)* |

---

## 📁 項目結構

```
StoryForge-AI/
├── server.js                    # 主服務器入口
├── Dockerfile                   # 多階段 Docker 構建
├── docker-compose.yml           # 生產環境 Docker 配置
├── docker-compose.dev.yml       # 開發環境 Docker 配置
├── .dockerignore                # Docker 忽略規則
├── database/
│   ├── connection.js            # MongoDB 連接模組
│   └── seed.js                  # 資料初始化 (含示範資料)
├── models/                      # 36 個 Mongoose Schema
├── middleware/
│   ├── auth.js                  # JWT 認證
│   ├── performance.js           # 壓縮/快取/安全標頭
│   ├── logger.js                # Winston 日誌
│   └── moderation.js            # 內容審核
├── routes/
│   ├── auth.mongo.js            # 用戶認證 API
│   ├── stories.mongo.js         # 故事 CRUD API
│   ├── prompts.mongo.js         # 影片提示詞 API
│   ├── camera.mongo.js          # 鏡頭語言 API
│   ├── tools.mongo.js           # 創作工具 API
│   ├── llm.mongo.js             # LLM 生成 API (含 SSE)
│   ├── workflows.mongo.js       # 工作流 API
│   ├── credits.mongo.js         # 積分系統 API
│   └── admin.mongo.js           # 管理後台 API
├── services/
│   ├── llm.js                   # LLM 多供應商服務
│   ├── streaming.js             # SSE 串流服務
│   └── moderation.js            # 內容審核服務
└── public/
    ├── index.html               # SPA 入口
    ├── landing.html             # 首頁
    ├── css/style.css            # 全局樣式
    └── js/
        ├── app.js               # 前端路由與初始化
        ├── api.js               # API 呼叫層
        ├── engine/
        │   ├── story-engine.js  # 故事生成引擎 (8 類型 × 8 子類型)
        │   └── prompt-engine.js # 提示詞生成引擎 (14 鏡頭 + 10 運鏡)
        └── pages/
            ├── home.js          # 首頁
            ├── workshop.js      # 故事工作台
            ├── library.js       # 故事庫
            ├── prompts.js       # 影片提示詞
            ├── camera.js        # 鏡頭百科
            ├── credits.js       # 積分系統
            └── admin.js         # 管理後台
```

---

## 🔌 API 端點

<details>
<summary>展開查看完整 API 列表</summary>

### 認證 `/api/auth`
| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | `/register` | 用戶註冊 |
| POST | `/login` | 用戶登入 |
| POST | `/logout` | 用戶登出 |
| GET | `/me` | 獲取當前用戶 |
| PUT | `/profile` | 更新個人資料 |
| GET | `/notifications` | 獲取通知 |

### 故事 `/api/stories`
| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/` | 故事列表 (分類/搜索/排序) |
| POST | `/` | 創建故事 |
| GET | `/:id` | 故事詳情 (含章節/角色/標籤) |
| PUT | `/:id` | 更新故事 |
| DELETE | `/:id` | 刪除故事 |
| POST | `/:id/interact` | 讚/收藏 |
| GET/POST | `/:id/comments` | 評論 |
| GET/POST | `/:id/chapters` | 章節管理 |
| GET/POST | `/:id/characters` | 角色管理 |

### 影片提示詞 `/api/prompts`
| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/templates` | 模板列表 |
| POST | `/generate` | 生成提示詞 |
| POST | `/from-story` | 從故事批量生成 |
| GET | `/my-prompts` | 我的提示詞 |

### 鏡頭語言 `/api/camera`
| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/movements` | 26 種鏡頭運動 |
| GET | `/shot-sizes` | 10 種景別 |
| GET | `/angles` | 10 種角度 |
| GET | `/transitions` | 12 種轉場 |
| GET | `/language-templates` | 場景模板 |
| POST | `/compose` | 自定義組合生成 |

### 創作工具 `/api/tools`
| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/story-templates` | 故事模板庫 |
| GET | `/writing-prompts` | 寫作提示 |
| GET/POST | `/reading-lists` | 閱讀清單 |
| POST | `/generate-names` | 名字生成器 |
| GET | `/stories/:id/analytics` | 數據分析 |
| POST | `/stories/:id/continue` | AI 續寫 |
| GET | `/stories/:id/export` | 導出 |

### LLM `/api/llm`
| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | `/stream` | SSE 串流生成 |
| GET | `/providers` | 可用 LLM 供應商 |
| GET | `/usage` | 使用量統計 |

### 工作流 `/api/workflows`
| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/` | 工作流列表 |
| POST | `/` | 創建工作流 |
| GET | `/:id` | 工作流詳情 |
| PUT | `/:id` | 更新工作流 |
| DELETE | `/:id` | 刪除工作流 |
| POST | `/:id/execute` | 執行工作流 |

### 積分 `/api/credits`
| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/balance` | 積分餘額 |
| GET | `/history` | 消耗記錄 |

### 管理 `/api/admin`
| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/dashboard` | 儀表盤統計 |
| GET/PUT | `/users` | 用戶管理 |
| GET/PUT | `/stories` | 內容管理 |
| GET/POST | `/categories` | 分類管理 |
| GET/PUT | `/settings` | 系統設定 |
| GET | `/ai-logs` | AI 生成日誌 |

</details>

---

## 🛡️ 安全特性

- **JWT 認證** — HttpOnly Cookie
- **bcrypt 密碼雜湊**
- **Helmet 安全標頭**
- **CORS 跨域控制**
- **Rate Limiting** — 防止 API 濫用
- **Content Moderation** — 內容審核中間件

---

## 📄 License

MIT License

---

<div align="center">

**Built with ❤️ by StoryForge AI**

</div>
