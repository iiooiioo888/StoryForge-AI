# StoryForge AI — 前端架構重構計畫

## 📊 現狀分析

| 檔案 | 大小 | 行數 | 問題 |
|------|------|------|------|
| `index.html` | 167KB | 2887 | 巨型單檔，所有 HTML + 大量 inline CSS |
| `app.js` | 154KB | 2395 | 91 個函數，全域作用域，零模組化 |
| `style.css` | 40KB | 1834 | 部分樣式仍在 HTML inline 中 |
| `workflow.html` | - | 219 | 獨立頁面，已分離 |
| `workflow.js` | 100KB | - | 獨立頁面，已分離 |

**核心問題：**
1. `index.html` 是 167KB 的巨型單檔，維護困難
2. `app.js` 91 個函數全部在全域作用域，命名衝突風險高
3. 所有頁面 HTML 寫在同一個檔案，改一個頁面要動整個檔案
4. CSS 分散在 inline `<style>` 和外部 `style.css` 兩處

## 🏗️ 重構目標

**以 vanilla JS + ES Modules 實現模組化架構，不需要建構工具（保持 Express static 直接服務）**

## 📁 新目錄結構

```
public/
├── index.html              ← 精簡的 shell（僅 nav + page containers）
├── css/
│   ├── variables.css       ← CSS 變數（:root 定義）
│   ├── base.css            ← reset, body, scrollbar, selection
│   ├── nav.css             ← 導航列樣式
│   ├── layout.css          ← panel, page, grid, flex 工具類
│   ├── components.css      ← card, button, form, modal, toast, avatar
│   ├── pages/
│   │   ├── home.css        ← 首頁樣式
│   │   ├── explore.css     ← 探索頁樣式
│   │   ├── story.css       ← 故事詳情頁樣式
│   │   ├── create.css      ← 創作頁樣式
│   │   ├── prompts.css     ← 影片提示詞頁樣式
│   │   ├── camera.css      ← 鏡頭語言頁樣式
│   │   ├── tools.css       ← 工具箱頁樣式
│   │   ├── dashboard.css   ← 儀表板頁樣式
│   │   └── auth.css        ← 登入/註冊頁樣式
│   └── style.css           ← @import 所有 CSS 的入口
├── js/
│   ├── app.js              ← 精簡的入口（init + 路由）
│   ├── api.js              ← API 請求封裝 (api(), auth headers)
│   ├── auth.js             ← 認證相關 (login, register, logout, checkAuth)
│   ├── router.js           ← 路由系統 (navigate, initPage)
│   ├── utils.js            ← 工具函數 (showToast, esc, animateNum, requireAuth)
│   ├── components.js       ← 共用 UI 元件 (renderStoryCard, renderModal, etc.)
│   ├── pages/
│   │   ├── home.js         ← 首頁邏輯
│   │   ├── explore.js      ← 探索頁邏輯
│   │   ├── story.js        ← 故事詳情頁
│   │   ├── create.js       ← 創作頁
│   │   ├── prompts.js      ← 影片提示詞頁
│   │   ├── camera.js       ← 鏡頭語言頁
│   │   ├── tools.js        ← 工具箱頁
│   │   └── dashboard.js    ← 儀表板頁
│   ├── templates/
│   │   ├── nav.html        ← 導航列 HTML 模板
│   │   ├── home.html       ← 首頁 HTML 模板
│   │   ├── explore.html    ← 探索頁 HTML 模板
│   │   ├── story.html      ← 故事詳情 HTML 模板
│   │   ├── create.html     ← 創作頁 HTML 模板
│   │   ├── prompts.html    ← 提示詞頁 HTML 模板
│   │   ├── camera.html     ← 鏡頭語言 HTML 模板
│   │   ├── tools.html      ← 工具箱 HTML 模板
│   │   ├── dashboard.html  ← 儀表板 HTML 模板
│   │   └── modals.html     ← 共用 Modal HTML 模板
│   ├── llm.js              ← LLM 串流相關（保留，已分離）
│   └── workflow.js         ← Workflow 編輯器（保留，已分離）
├── workflow.html           ← Workflow 頁面（保留不動）
└── css/workflow.css        ← Workflow 樣式（保留不動）
```

## 🔧 重構步驟

### Phase 1: CSS 拆分
1. 從 `index.html` 的 `<style>` 標籤提取 CSS 變數到 `css/variables.css`
2. 按組件/頁面拆分到對應 CSS 檔案
3. 建立 `css/style.css` 作為 @import 入口
4. 清空 index.html 的 `<style>` 標籤，改用 `<link>` 引入

### Phase 2: HTML 模板化
1. 建立精簡的 `index.html` shell（nav + page containers + modal shells）
2. 每個頁面的 HTML 拆到 `js/templates/*.html`
3. 路由切換時用 `fetch()` 載入對應模板並 insert 到容器

### Phase 3: JS 模組化
1. 從 `app.js` 提取 `api.js`, `auth.js`, `utils.js`, `components.js`
2. 將每個頁面的函數提取到 `js/pages/*.js`
3. `app.js` 精簡為入口點：初始化 + 路由
4. 使用 ES Modules (`<script type="module">`) 組織依賴

### Phase 4: 整合測試
1. 逐頁測試功能完整性
2. 確認 API 呼叫正常
3. 確認 Workflow 頁面不受影響

## ⚠️ 注意事項

1. **保持 backward compatibility** — API 端點不變
2. **保持 vanilla JS** — 不引入 React/Vue 等框架
3. **ES Modules** — 瀏覽器原生支援，不需要 bundler
4. **Workflow 隔離** — `workflow.html` + `workflow.js` 保持不動
5. **漸進式** — 一個 Phase 完成後可獨立部署測試
