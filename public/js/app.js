// ============================================
// StoryForge AI - Main Application (Enhanced)
// ============================================

let currentUser = null;
let currentPage = 'home';
let exploreSort = 'latest';
let exploreCategory = null;
let categories = [];
let templates = [];
let selectedPlatform = 'general';
let selectedTemplateId = null;

// ============================================
// Router
// ============================================
const router = {
    navigate(page, data) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const target = document.getElementById(`page-${page}`);
        if (target) {
            target.classList.add('active');
            currentPage = page;
            document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
            const navLink = document.querySelector(`.nav-links a[data-page="${page}"]`);
            if (navLink) navLink.classList.add('active');
            this.initPage(page, data);
            window.scrollTo(0, 0);
        }
    },
    initPage(page, data) {
        switch (page) {
            case 'home': loadHomeStats(); break;
            case 'explore': loadExplore(); break;
            case 'prompts': loadPromptsPage(); break;
            case 'camera': loadCameraPage(); break;
            case 'tools': loadToolsPage(); break;
            case 'dashboard': loadDashboard(); break;
            case 'story': loadStoryDetail(data); break;
            case 'editor': loadEditor(data); break;
            case 'admin': loadAdminDashboard(); break;
        }
    }
};

// ============================================
// API Helper
// ============================================
async function api(path, options = {}) {
    const config = { headers: { 'Content-Type': 'application/json' }, ...options };
    if (options.body && typeof options.body === 'object') config.body = JSON.stringify(options.body);
    const res = await fetch(`/api${path}`, config);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '請求失敗');
    return data;
}

// ============================================
// Toast
// ============================================
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    toast.innerHTML = `<span>${icons[type] || ''}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(100%)'; setTimeout(() => toast.remove(), 300); }, 3500);
}

// ============================================
// Auth
// ============================================
async function checkAuth() {
    try {
        const data = await api('/auth/me');
        currentUser = data.user;
        updateNavForUser();
    } catch (e) { currentUser = null; updateNavForGuest(); }
}

function updateNavForUser() {
    const actions = document.getElementById('navActions');
    const initials = (currentUser.display_name || currentUser.username).charAt(0).toUpperCase();
    actions.innerHTML = `
        <div class="nav-user" onclick="router.navigate('dashboard')">
            <div class="nav-user-avatar">${initials}</div>
            <div class="nav-user-info">
                <div class="nav-user-name">${esc(currentUser.display_name || currentUser.username)}</div>
                <div class="nav-user-credits">💎 ${currentUser.credits} 積分</div>
            </div>
        </div>
        <button class="btn btn-sm btn-ghost" onclick="handleLogout()">登出</button>
    `;
    document.getElementById('navDashboard').classList.remove('hidden');
    if (currentUser.role === 'admin') document.getElementById('navAdmin').classList.remove('hidden');
}

function updateNavForGuest() {
    document.getElementById('navActions').innerHTML = `
        <button class="btn btn-sm btn-ghost" onclick="router.navigate('login')">登入</button>
        <button class="btn btn-sm btn-primary" onclick="router.navigate('register')">免費註冊</button>
    `;
    document.getElementById('navDashboard').classList.add('hidden');
    document.getElementById('navAdmin').classList.add('hidden');
}

async function handleLogin() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errEl = document.getElementById('loginError');
    if (!username || !password) { errEl.textContent = '請填寫所有欄位'; errEl.classList.remove('hidden'); return; }
    try {
        const data = await api('/auth/login', { method: 'POST', body: { username, password } });
        currentUser = data.user; updateNavForUser(); showToast('登入成功！', 'success'); router.navigate('home');
    } catch (err) { errEl.textContent = err.message; errEl.classList.remove('hidden'); }
}

async function handleRegister() {
    const username = document.getElementById('regUsername').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const display_name = document.getElementById('regDisplayName').value.trim();
    const password = document.getElementById('regPassword').value;
    const errEl = document.getElementById('registerError');
    if (!username || !email || !password) { errEl.textContent = '請填寫所有必填欄位'; errEl.classList.remove('hidden'); return; }
    try {
        const data = await api('/auth/register', { method: 'POST', body: { username, email, password, display_name } });
        currentUser = data.user; updateNavForUser(); showToast('註冊成功！已獲得100免費積分 🎉', 'success'); router.navigate('home');
    } catch (err) { errEl.textContent = err.message; errEl.classList.remove('hidden'); }
}

async function handleLogout() {
    await api('/auth/logout', { method: 'POST' }); currentUser = null; updateNavForGuest(); showToast('已登出', 'info'); router.navigate('home');
}

function fillDemo(u, p) {
    document.getElementById('loginUsername').value = u;
    document.getElementById('loginPassword').value = p;
}

function requireAuth() {
    if (!currentUser) { document.getElementById('loginModal').classList.add('active'); return false; }
    return true;
}

function closeLoginModal() { document.getElementById('loginModal').classList.remove('active'); }
function closeEditorModal() { document.getElementById('editorModal').classList.remove('active'); }

// ============================================
// Home Stats
// ============================================
async function loadHomeStats() {
    try {
        const data = await api('/stories?limit=1');
        animateNum('statStories', data.total || 6);
    } catch (e) {}
    try {
        const data = await api('/stories/meta/categories');
        animateNum('statCategories', data.categories.length || 12);
    } catch (e) {}
}

function animateNum(id, target) {
    const el = document.getElementById(id); if (!el) return;
    let cur = 0; const step = Math.max(1, Math.floor(target / 25));
    const t = setInterval(() => { cur += step; if (cur >= target) { cur = target; clearInterval(t); } el.textContent = cur.toLocaleString(); }, 30);
}

// ============================================
// Explore
// ============================================
async function loadExplore() {
    const search = document.getElementById('exploreSearch')?.value || '';
    const grid = document.getElementById('exploreGrid');
    const empty = document.getElementById('exploreEmpty');
    const countEl = document.getElementById('exploreCount');

    try {
        let url = `/stories?sort=${exploreSort}&limit=30`;
        if (exploreCategory) url += `&category=${exploreCategory}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        const data = await api(url);

        if (categories.length === 0) {
            const catData = await api('/stories/meta/categories');
            categories = catData.categories;
            renderCategoryFilters();
        }

        if (data.stories.length === 0) {
            grid.innerHTML = ''; empty.classList.remove('hidden');
            if (countEl) countEl.textContent = '';
        } else {
            empty.classList.add('hidden');
            grid.innerHTML = data.stories.map(s => renderStoryCard(s)).join('');
            if (countEl) countEl.textContent = `共 ${data.total} 個故事`;
        }
    } catch (err) { showToast('載入失敗: ' + err.message, 'error'); }
}

function renderStoryCard(story) {
    const gradients = [
        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
        'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
        'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
    ];
    const bg = gradients[story.id % gradients.length];
    return `
    <div class="card story-card" onclick="router.navigate('story', ${story.id})">
        <div class="story-cover" style="background:${bg};">
            <div class="story-genre">${story.category_icon || '📖'} ${story.category_name || story.genre || '故事'}</div>
            <div style="position:absolute;bottom:12px;right:12px;font-size:2.5rem;opacity:0.3;">📖</div>
        </div>
        <div class="story-info">
            <div class="story-title">${esc(story.title)}</div>
            <div class="story-summary">${esc(story.summary || story.content?.substring(0, 120) || '')}</div>
            <div class="story-meta">
                <div class="flex items-center gap-1">
                    <div class="avatar avatar-sm">${(story.display_name || story.username || '?')[0]}</div>
                    <span>${esc(story.display_name || story.username)}</span>
                </div>
                <div class="story-stats">
                    <span>👁 ${formatNum(story.view_count)}</span>
                    <span>❤️ ${formatNum(story.like_count)}</span>
                </div>
            </div>
        </div>
    </div>`;
}

function renderCategoryFilters() {
    const c = document.getElementById('categoryFilters'); if (!c) return;
    c.innerHTML = `
        <button class="btn btn-sm ${!exploreCategory ? 'btn-primary' : 'btn-ghost'}" onclick="filterCategory(null)">全部</button>
        ${categories.map(cat => `<button class="btn btn-sm ${exploreCategory === cat.id ? 'btn-primary' : 'btn-ghost'}" onclick="filterCategory(${cat.id})">${cat.icon} ${cat.name}</button>`).join('')}
    `;
}

function filterCategory(id) { exploreCategory = id; renderCategoryFilters(); loadExplore(); }
function setExploreSort(sort, btn) { exploreSort = sort; btn.parentElement.querySelectorAll('.btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); loadExplore(); }

// ============================================
// Story Detail (Enhanced with Comments, Chapters, Characters)
// ============================================
async function loadStoryDetail(storyId) {
    const c = document.getElementById('storyDetail');
    try {
        const data = await api(`/stories/${storyId}`);
        const { story, tags, chapters, characters, userInteractions } = data;

        // Fetch comments separately
        let comments = [];
        try {
            const commentData = await api(`/stories/${storyId}/comments`);
            comments = commentData.comments || [];
        } catch (e) {}

        c.innerHTML = `
            <button class="btn btn-ghost mb-2" onclick="router.navigate('explore')">← 返回探索</button>
            <article>
                <!-- Hero Banner -->
                <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:var(--radius-lg);padding:3rem 2rem;margin-bottom:2rem;color:white;text-align:center;">
                    <div style="font-size:0.9rem;opacity:0.8;margin-bottom:0.5rem;">${story.category_icon || '📖'} ${story.category_name || story.genre || ''}</div>
                    <h1 style="font-size:2.5rem;font-weight:900;margin-bottom:1rem;">${esc(story.title)}</h1>
                    <div class="story-meta-bar" style="justify-content:center;color:rgba(255,255,255,0.85);">
                        <span><div class="avatar avatar-sm" style="background:rgba(255,255,255,0.2);">${(story.display_name || story.username)[0]}</div> ${esc(story.display_name || story.username)}</span>
                        <span>📅 ${new Date(story.created_at).toLocaleDateString('zh-TW')}</span>
                        <span>📝 ${story.word_count} 字</span>
                        <span>👁 ${formatNum(story.view_count)} 閱讀</span>
                    </div>
                </div>

                <!-- Summary -->
                ${story.summary ? `<div class="card mb-3"><div class="card-body"><h3 style="font-size:1rem;font-weight:700;margin-bottom:0.5rem;">📌 故事簡介</h3><p style="color:var(--dark-light);line-height:1.8;">${esc(story.summary)}</p></div></div>` : ''}

                <!-- Actions -->
                <div class="flex gap-2 mb-3 flex-wrap">
                    <button class="btn btn-sm ${userInteractions.like ? 'btn-primary' : 'btn-ghost'}" onclick="interactStory(${story.id},'like')">❤️ ${story.like_count} 讚</button>
                    <button class="btn btn-sm ${userInteractions.bookmark ? 'btn-accent' : 'btn-ghost'}" onclick="interactStory(${story.id},'bookmark')">🔖 收藏</button>
                    <button class="btn btn-sm btn-ghost" onclick="generatePromptFromStory(${story.id})">🎬 生成影片提示詞</button>
                    <button class="btn btn-sm btn-ghost" onclick="shareStory(${story.id})">📤 分享</button>
                </div>

                <!-- Tags -->
                ${tags.length > 0 ? `<div class="flex gap-1 flex-wrap mb-3">${tags.map(t => `<span class="tag tag-primary">#${esc(t.name)}</span>`).join('')}</div>` : ''}

                <!-- Info Bar -->
                <div class="card mb-3">
                    <div class="card-body">
                        <div class="grid grid-4" style="gap:1rem;text-align:center;">
                            <div><div style="font-size:0.75rem;color:var(--gray);text-transform:uppercase;">類型</div><div style="font-weight:700;">${esc(story.genre || '-')}</div></div>
                            <div><div style="font-size:0.75rem;color:var(--gray);text-transform:uppercase;">語調</div><div style="font-weight:700;">${esc(story.tone || '-')}</div></div>
                            <div><div style="font-size:0.75rem;color:var(--gray);text-transform:uppercase;">讀者</div><div style="font-weight:700;">${esc(story.target_audience || '-')}</div></div>
                            <div><div style="font-size:0.75rem;color:var(--gray);text-transform:uppercase;">AI生成</div><div style="font-weight:700;">${story.is_ai_generated ? '🤖 是' : '✍️ 否'}</div></div>
                        </div>
                    </div>
                </div>

                <!-- Main Content -->
                <div class="card mb-3">
                    <div class="card-header"><h3>📖 故事正文</h3><span class="text-muted">${story.word_count} 字</span></div>
                    <div class="card-body"><div class="story-reader">${formatStoryContent(story.content)}</div></div>
                </div>

                <!-- Chapters -->
                ${chapters.length > 0 ? `
                <div class="card mb-3">
                    <div class="card-header"><h3>📑 章節列表</h3><span class="text-muted">${chapters.length} 章</span></div>
                    <div class="card-body">
                        ${chapters.map(ch => `
                            <div class="chapter-item">
                                <div class="chapter-number">${ch.chapter_number}</div>
                                <div class="chapter-info">
                                    <div class="chapter-title">${esc(ch.title)}</div>
                                    <div class="chapter-meta">${ch.word_count} 字 · ${new Date(ch.created_at).toLocaleDateString('zh-TW')}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>` : ''}

                <!-- Characters -->
                ${characters.length > 0 ? `
                <div class="card mb-3">
                    <div class="card-header"><h3>👥 角色設定</h3><span class="text-muted">${characters.length} 個角色</span></div>
                    <div class="card-body">
                        <div class="grid grid-2">
                        ${characters.map(ch => `
                            <div class="character-card">
                                <div class="character-avatar">${ch.name[0]}</div>
                                <div class="character-name">${esc(ch.name)}</div>
                                ${ch.role ? `<div class="character-role">${esc(ch.role)}</div>` : ''}
                                ${ch.description ? `<div class="character-detail"><strong>描述</strong><p>${esc(ch.description)}</p></div>` : ''}
                                ${ch.appearance ? `<div class="character-detail"><strong>外貌</strong><p>${esc(ch.appearance)}</p></div>` : ''}
                                ${ch.personality ? `<div class="character-detail"><strong>性格</strong><p>${esc(ch.personality)}</p></div>` : ''}
                                ${ch.backstory ? `<div class="character-detail"><strong>背景</strong><p>${esc(ch.backstory)}</p></div>` : ''}
                            </div>
                        `).join('')}
                        </div>
                    </div>
                </div>` : ''}

                <!-- Comments -->
                <div class="card">
                    <div class="card-header"><h3>💬 評論</h3><span class="text-muted">${comments.length} 條評論</span></div>
                    <div class="card-body">
                        ${currentUser ? `
                        <div class="comment-input-area">
                            <div class="avatar">${currentUser.display_name[0]}</div>
                            <div style="flex:1;">
                                <textarea class="form-textarea" id="commentInput" placeholder="寫下你的評論..." style="min-height:60px;"></textarea>
                                <button class="btn btn-primary btn-sm mt-1" onclick="postComment(${story.id})">發表評論</button>
                            </div>
                        </div>` : `<p class="text-muted text-center mb-2"><a href="#" onclick="router.navigate('login')">登入</a>後即可發表評論</p>`}
                        
                        <div id="commentsList">
                        ${comments.length === 0 ? '<div class="empty-state" style="padding:2rem;"><div class="empty-icon">💬</div><h3>暫無評論</h3><p>成為第一個評論的人吧！</p></div>' :
                        comments.map(cm => `
                            <div class="comment-item">
                                <div class="comment-header">
                                    <div class="avatar avatar-sm">${(cm.display_name || cm.username || '?')[0]}</div>
                                    <span class="comment-author">${esc(cm.display_name || cm.username)}</span>
                                    <span class="comment-time">${timeAgo(cm.created_at)}</span>
                                </div>
                                <div class="comment-content">${esc(cm.content)}</div>
                            </div>
                        `).join('')}
                        </div>
                    </div>
                </div>
            </article>
        `;
    } catch (err) {
        c.innerHTML = `<div class="empty-state"><div class="empty-icon">😢</div><h3>故事載入失敗</h3><p>${err.message}</p><button class="btn btn-primary mt-2" onclick="router.navigate('explore')">返回探索</button></div>`;
    }
}

function formatStoryContent(content) {
    if (!content) return '';
    return content.split('\n').filter(p => p.trim()).map(p => `<p>${esc(p)}</p>`).join('');
}

async function interactStory(id, action) {
    if (!requireAuth()) return;
    try { await api(`/stories/${id}/interact`, { method: 'POST', body: { action } }); loadStoryDetail(id); } catch (err) { showToast(err.message, 'error'); }
}

async function postComment(storyId) {
    const input = document.getElementById('commentInput');
    const content = input.value.trim();
    if (!content) { showToast('請輸入評論內容', 'warning'); return; }
    try {
        await api(`/stories/${storyId}/comments`, { method: 'POST', body: { content } });
        input.value = '';
        showToast('評論已發表', 'success');
        loadStoryDetail(storyId);
    } catch (err) { showToast(err.message, 'error'); }
}

function shareStory(id) {
    const url = `${window.location.origin}?story=${id}`;
    navigator.clipboard.writeText(url).then(() => showToast('連結已複製', 'success')).catch(() => showToast('複製失敗', 'error'));
}

// ============================================
// Prompts Page (Enhanced)
// ============================================
async function loadPromptsPage() {
    try {
        const data = await api('/prompts/templates');
        templates = data.templates;
        renderTemplateGrid();
    } catch (e) {}

    if (currentUser) {
        try {
            const data = await api('/stories/user/mine');
            const sel = document.getElementById('promptStorySelect');
            sel.innerHTML = '<option value="">-- 選擇故事 --</option>' + data.stories.map(s => `<option value="${s.id}">${esc(s.title)}</option>`).join('');
        } catch (e) {}
        loadPromptHistory();
    }
}

function selectPlatform(platform, btn) {
    selectedPlatform = platform;
    document.querySelectorAll('.platform-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderTemplateGrid();
}

function renderTemplateGrid() {
    const grid = document.getElementById('templateGrid');
    const filtered = templates.filter(t => t.platform === selectedPlatform || t.platform === 'general');
    document.getElementById('templateCount').textContent = `${filtered.length} 個模板`;
    grid.innerHTML = `<div class="template-card ${!selectedTemplateId ? 'active' : ''}" onclick="selectTemplate(null)"><div class="tpl-icon">✏️</div><div>自定義</div></div>` +
        filtered.map(t => `<div class="template-card ${selectedTemplateId === t.id ? 'active' : ''}" onclick="selectTemplate(${t.id})"><div class="tpl-icon">${getCategoryIcon(t.category)}</div><div>${t.name}</div></div>`).join('');
}

function getCategoryIcon(cat) {
    const icons = { '場景': '🎬', '角色': '👤', '動作': '⚔️', '風景': '🏔️', '對話': '💬', '氛圍': '🌫️', '轉場': '🔄', '開場': '🎬', '戰鬥': '💥', '美食': '🍜', '魔法': '✨', '太空': '🚀' };
    return icons[cat] || '📐';
}

function selectTemplate(id) {
    selectedTemplateId = id;
    renderTemplateGrid();
    if (id) {
        const t = templates.find(t => t.id === id);
        if (t) showToast(`已選擇: ${t.name}`, 'info');
    }
}

async function generatePrompt() {
    if (!requireAuth()) return;
    const scene = document.getElementById('promptScene').value.trim();
    if (!scene) { showToast('請輸入場景描述', 'warning'); return; }

    // Build camera language from quick selects
    const shotSize = document.getElementById('promptShotSize')?.value || '';
    const angle = document.getElementById('promptAngle')?.value || '';
    const movement = document.getElementById('promptMovement')?.value || '';
    const cameraLanguage = [shotSize, angle, movement].filter(Boolean).join('. ');

    const body = {
        platform: selectedPlatform,
        scene_description: scene,
        camera_movement: cameraLanguage || document.getElementById('promptCamera').value,
        lighting: document.getElementById('promptLighting').value,
        style: document.getElementById('promptStyle').value,
        mood: document.getElementById('promptMood').value,
        duration: document.getElementById('promptDuration').value,
        aspect_ratio: document.getElementById('promptAspect').value,
    };

    if (selectedTemplateId) {
        body.template_id = selectedTemplateId;
        body.parameters = { scene, camera_movement: body.camera_movement, lighting: body.lighting, style: body.style, mood: body.mood, duration: body.duration };
    }

    try {
        const data = await api('/prompts/generate', { method: 'POST', body });
        renderPromptResult(data.prompt);
        showToast('提示詞生成成功！', 'success');
        currentUser.credits = data.credits_remaining;
        updateNavForUser();
        loadPromptHistory();
    } catch (err) { showToast(err.message, 'error'); }
}

async function generateFromStory() {
    if (!requireAuth()) return;
    const storyId = document.getElementById('promptStorySelect').value;
    if (!storyId) { showToast('請選擇一個故事', 'warning'); return; }

    try {
        const data = await api('/prompts/from-story', {
            method: 'POST',
            body: { story_id: parseInt(storyId), platform: selectedPlatform, num_scenes: parseInt(document.getElementById('promptSceneCount').value) }
        });

        const container = document.getElementById('promptResults');
        container.innerHTML = `
            <div class="mb-2"><h3 style="font-weight:700;">📖 ${esc(data.story_title)}</h3><p class="text-muted">已生成 ${data.total_scenes} 個場景</p></div>
            ${data.prompts.map((p, i) => `
                <div class="prompt-card mb-2">
                    <div class="flex justify-between items-center mb-1">
                        <span class="prompt-platform ${selectedPlatform}">${selectedPlatform}</span>
                        <span style="font-size:0.8rem;color:var(--dark-light);">場景 ${p.scene_number}</span>
                    </div>
                    <div class="prompt-text">${esc(p.full_prompt)}<button class="copy-btn" onclick="copyText(this)">📋 複製</button></div>
                </div>
            `).join('')}
        `;
        showToast(`已生成 ${data.total_scenes} 個提示詞！`, 'success');
        currentUser.credits = data.credits_remaining;
        updateNavForUser();
        loadPromptHistory();
    } catch (err) { showToast(err.message, 'error'); }
}

function renderPromptResult(prompt) {
    document.getElementById('promptResults').innerHTML = `
        <div class="prompt-card">
            <div class="flex justify-between items-center mb-1">
                <span class="prompt-platform ${prompt.platform}">${prompt.platform}</span>
                <span style="font-size:0.8rem;color:var(--dark-light);">${prompt.aspect_ratio}</span>
            </div>
            <div class="prompt-text">${esc(prompt.full_prompt)}<button class="copy-btn" onclick="copyText(this)">📋 複製</button></div>
            ${prompt.negative_prompt ? `
            <div style="margin-top:0.75rem;">
                <div style="font-size:0.8rem;font-weight:600;color:var(--danger);margin-bottom:0.25rem;">Negative Prompt:</div>
                <div class="prompt-text" style="background:#2d1b1b;color:#fe929f;font-size:0.8rem;">${esc(prompt.negative_prompt)}<button class="copy-btn" onclick="copyText(this)">📋 複製</button></div>
            </div>` : ''}
        </div>
    `;
}

function clearPromptResults() {
    document.getElementById('promptResults').innerHTML = '<div class="empty-state"><div class="empty-icon">🎬</div><h3>等待生成</h3><p>填寫場景描述後點擊生成</p></div>';
}

async function loadPromptHistory() {
    if (!currentUser) return;
    try {
        const data = await api('/prompts/my-prompts?limit=10');
        const c = document.getElementById('promptHistory');
        if (data.prompts.length === 0) { c.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><h3>暫無歷史</h3></div>'; return; }
        c.innerHTML = data.prompts.map(p => `
            <div class="prompt-card mb-2" style="cursor:pointer;" onclick='renderPromptResult(${JSON.stringify(p).replace(/'/g,"\\'")})'>
                <div class="flex justify-between items-center">
                    <span class="prompt-platform ${p.platform}">${p.platform}</span>
                    <span style="font-size:0.75rem;color:var(--dark-light);">${timeAgo(p.created_at)}</span>
                </div>
                <p style="font-size:0.85rem;color:var(--dark-light);margin-top:0.5rem;" class="truncate">${esc(p.scene_description || p.full_prompt)}</p>
            </div>
        `).join('');
    } catch (e) {}
}

// ============================================
// Dashboard (Enhanced)
// ============================================
async function loadDashboard() {
    if (!requireAuth()) { router.navigate('login'); return; }
    // Update sidebar user info
    document.getElementById('dashAvatar').textContent = (currentUser.display_name || currentUser.username)[0];
    document.getElementById('dashName').textContent = currentUser.display_name || currentUser.username;
    document.getElementById('dashCredits').textContent = `💎 ${currentUser.credits} 積分`;
    showDashTab('overview');
}

async function showDashTab(tab) {
    const c = document.getElementById('dashboardContent');
    document.querySelectorAll('[data-dash]').forEach(a => a.classList.remove('active'));
    const l = document.querySelector(`[data-dash="${tab}"]`); if (l) l.classList.add('active');

    switch (tab) {
        case 'overview': {
            try {
                const sd = await api('/stories/user/mine');
                const pd = await api('/prompts/my-prompts?limit=5');
                const totalViews = sd.stories.reduce((a, s) => a + (s.view_count || 0), 0);
                const totalLikes = sd.stories.reduce((a, s) => a + (s.like_count || 0), 0);
                c.innerHTML = `
                    <div class="dashboard-header"><h1>👋 歡迎回來，${esc(currentUser.display_name || currentUser.username)}</h1><p>你的創作工作台</p></div>
                    <div class="stat-cards">
                        <div class="stat-card"><div class="stat-card-icon purple">📝</div><div class="stat-card-info"><h3>${sd.stories.length}</h3><p>我的故事</p></div></div>
                        <div class="stat-card"><div class="stat-card-icon green">🎬</div><div class="stat-card-info"><h3>${pd.total}</h3><p>影片提示詞</p></div></div>
                        <div class="stat-card"><div class="stat-card-icon orange">👁</div><div class="stat-card-info"><h3>${formatNum(totalViews)}</h3><p>總閱讀量</p></div></div>
                        <div class="stat-card"><div class="stat-card-icon blue">❤️</div><div class="stat-card-info"><h3>${formatNum(totalLikes)}</h3><p>總獲讚數</p></div></div>
                    </div>
                    <div class="grid grid-2">
                        <div class="card">
                            <div class="card-header"><h3>📝 我的故事</h3><button class="btn btn-sm btn-ghost" onclick="showDashTab('my-stories')">查看全部 →</button></div>
                            <div class="card-body">
                                ${sd.stories.length === 0 ? '<p class="text-muted">還沒有故事，<a href="#" onclick="showDashTab(\'create\')">開始創作</a></p>' :
                                sd.stories.slice(0, 5).map(s => `
                                    <div class="flex items-center gap-2 mb-2" style="cursor:pointer;padding:8px;border-radius:8px;transition:all 0.2s;" onmouseover="this.style.background='var(--light)'" onmouseout="this.style.background=''" onclick="router.navigate('story',${s.id})">
                                        <div style="width:8px;height:8px;border-radius:50%;background:${s.status === 'published' ? 'var(--success)' : 'var(--warning)'}"></div>
                                        <span class="flex-1 font-bold" style="font-size:0.9rem;">${esc(s.title)}</span>
                                        <span class="tag tag-${s.status === 'published' ? 'success' : 'warning'}" style="font-size:0.7rem;">${s.status === 'published' ? '已發布' : '草稿'}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        <div class="card">
                            <div class="card-header"><h3>🎬 最近提示詞</h3><button class="btn btn-sm btn-ghost" onclick="showDashTab('my-prompts')">查看全部 →</button></div>
                            <div class="card-body">
                                ${pd.prompts.length === 0 ? '<p class="text-muted">還沒有提示詞</p>' :
                                pd.prompts.slice(0, 5).map(p => `
                                    <div class="flex items-center gap-2 mb-2">
                                        <span class="prompt-platform ${p.platform}" style="font-size:0.7rem;">${p.platform}</span>
                                        <span class="flex-1 truncate" style="font-size:0.85rem;">${esc(p.scene_description || '')}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                    <div class="card mt-3">
                        <div class="card-header"><h3>💎 積分資訊</h3></div>
                        <div class="card-body">
                            <div class="grid grid-3" style="text-align:center;">
                                <div><div style="font-size:2rem;font-weight:800;color:var(--primary);">${currentUser.credits}</div><div class="text-muted">當前積分</div></div>
                                <div><div style="font-size:2rem;font-weight:800;color:var(--success);">10</div><div class="text-muted">每次生成消耗</div></div>
                                <div><div style="font-size:2rem;font-weight:800;color:var(--secondary);">${Math.floor(currentUser.credits / 10)}</div><div class="text-muted">剩餘生成次數</div></div>
                            </div>
                        </div>
                    </div>
                `;
            } catch (err) { c.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h3>載入失敗</h3><p>${err.message}</p></div>`; }
            break;
        }

        case 'my-stories': {
            try {
                const data = await api('/stories/user/mine');
                c.innerHTML = `
                    <div class="dashboard-header flex justify-between items-center">
                        <div><h1>📝 我的故事</h1><p>管理你創作的所有故事</p></div>
                        <button class="btn btn-primary" onclick="showDashTab('create')">✨ 創建新故事</button>
                    </div>
                    ${data.stories.length === 0 ? '<div class="empty-state"><div class="empty-icon">📝</div><h3>還沒有故事</h3><p>點擊上方按鈕開始創作</p></div>' : `
                    <div class="table-wrapper"><table>
                        <thead><tr><th>標題</th><th>分類</th><th>狀態</th><th>字數</th><th>瀏覽</th><th>讚</th><th>更新時間</th><th>操作</th></tr></thead>
                        <tbody>${data.stories.map(s => `<tr>
                            <td><a href="#" onclick="router.navigate('story',${s.id})" style="font-weight:600;">${esc(s.title)}</a></td>
                            <td>${s.category_icon || ''} ${s.category_name || '-'}</td>
                            <td><span class="tag tag-${s.status === 'published' ? 'success' : s.status === 'draft' ? 'warning' : 'danger'}">${s.status === 'published' ? '已發布' : s.status === 'draft' ? '草稿' : s.status}</span></td>
                            <td>${s.word_count}</td><td>${s.view_count}</td><td>${s.like_count}</td>
                            <td>${timeAgo(s.updated_at)}</td>
                            <td><div class="flex gap-1">
                                <button class="btn btn-sm btn-ghost" onclick="openStoryEditor(${s.id})" title="編輯">✏️</button>
                                <button class="btn btn-sm btn-ghost" onclick="deleteStory(${s.id})" style="color:var(--danger);" title="刪除">🗑️</button>
                            </div></td>
                        </tr>`).join('')}</tbody>
                    </table></div>`}
                `;
            } catch (err) { c.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h3>載入失敗</h3></div>`; }
            break;
        }

        case 'create': {
            if (categories.length === 0) { try { const d = await api('/stories/meta/categories'); categories = d.categories; } catch(e){} }
            c.innerHTML = `
                <div class="dashboard-header"><h1>✨ 創建新故事</h1><p>在這裡書寫你的故事</p></div>
                <div class="card">
                    <div class="card-body">
                        <div class="form-group"><label class="form-label">故事標題 *</label><input type="text" class="form-input" id="newStoryTitle" placeholder="給你的故事起個名字"></div>
                        <div class="grid grid-3">
                            <div class="form-group"><label class="form-label">分類</label><select class="form-select" id="newStoryCategory"><option value="">-- 選擇 --</option>${categories.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('')}</select></div>
                            <div class="form-group"><label class="form-label">類型</label><input type="text" class="form-input" id="newStoryGenre" placeholder="例如：科幻、奇幻"></div>
                            <div class="form-group"><label class="form-label">語調風格</label><select class="form-select" id="newStoryTone"><option value="">-- 選擇 --</option><option>史詩壯闊</option><option>輕鬆幽默</option><option>黑暗沉重</option><option>溫馨治癒</option><option>緊張懸疑</option><option>浪漫細膩</option><option>快意恩仇</option><option>黑色幽默</option></select></div>
                        </div>
                        <div class="grid grid-2">
                            <div class="form-group"><label class="form-label">目標讀者</label><input type="text" class="form-input" id="newStoryAudience" placeholder="例如：青少年、科幻愛好者"></div>
                            <div class="form-group"><label class="form-label">可見性</label><select class="form-select" id="newStoryVisibility"><option value="public">🌍 公開</option><option value="private">🔒 私人</option><option value="unlisted">🔗 不公開列出</option></select></div>
                        </div>
                        <div class="form-group"><label class="form-label">故事簡介</label><textarea class="form-textarea" id="newStorySummary" placeholder="簡要描述你的故事（會顯示在卡片上）" style="min-height:80px;"></textarea></div>
                        <div class="form-group"><label class="form-label">故事正文 *<span class="text-muted" style="font-weight:400;margin-left:8px;" id="wordCount">0 字</span></label><textarea class="form-textarea" id="newStoryContent" placeholder="在這裡書寫你的故事..." style="min-height:400px;font-size:1rem;line-height:1.8;" oninput="updateWordCount()"></textarea></div>
                        <div class="form-group"><label class="form-label">標籤（用逗號分隔）</label><input type="text" class="form-input" id="newStoryTags" placeholder="例如：冒險, 魔法, 友情"></div>
                        <div class="flex gap-2">
                            <button class="btn btn-primary btn-lg" onclick="saveStory('draft')">💾 保存草稿</button>
                            <button class="btn btn-success btn-lg" onclick="saveStory('published')">🚀 發布故事</button>
                        </div>
                    </div>
                </div>
            `;
            break;
        }

        case 'ai-generate': {
            if (categories.length === 0) { try { const d = await api('/stories/meta/categories'); categories = d.categories; } catch(e){} }
            c.innerHTML = `
                <div class="dashboard-header"><h1>🤖 AI輔助生成</h1><p>讓AI幫助你構思和生成故事</p></div>
                
                <div class="ai-step">
                    <div class="ai-step-number">1</div>
                    <div class="ai-step-content">
                        <div class="ai-step-title">設定故事參數</div>
                        <p class="text-muted mb-2">告訴AI你想寫什麼樣的故事</p>
                        <div class="grid grid-2">
                            <div class="form-group"><label class="form-label">故事類型</label>
                                <select class="form-select" id="aiGenre">${categories.map(c => `<option value="${c.name}">${c.icon} ${c.name}</option>`).join('')}</select>
                            </div>
                            <div class="form-group"><label class="form-label">語調風格</label>
                                <select class="form-select" id="aiTone"><option>史詩壯闊</option><option>輕鬆幽默</option><option>黑暗沉重</option><option>溫馨治癒</option><option>緊張懸疑</option><option>浪漫細膩</option></select>
                            </div>
                        </div>
                        <div class="form-group"><label class="form-label">核心想法 / 靈感</label><textarea class="form-textarea" id="aiIdea" placeholder="例如：一個能聽見他人內心聲音的女孩，在一次意外中失去了這個能力，卻發現真正的溝通不需要超能力..." style="min-height:100px;"></textarea></div>
                    </div>
                </div>

                <div class="ai-step">
                    <div class="ai-step-number">2</div>
                    <div class="ai-step-content">
                        <div class="ai-step-title">角色設定（可選）</div>
                        <p class="text-muted mb-2">描述主要角色，或留空讓AI發揮</p>
                        <div class="grid grid-2">
                            <div class="form-group"><label class="form-label">主角名稱</label><input type="text" class="form-input" id="aiCharName" placeholder="角色名"></div>
                            <div class="form-group"><label class="form-label">角色類型</label><select class="form-select" id="aiCharRole"><option>主角</option><option>反派</option><option>導師</option><option>夥伴</option></select></div>
                        </div>
                        <div class="form-group"><label class="form-label">角色描述</label><textarea class="form-textarea" id="aiCharDesc" placeholder="外貌、性格、背景..." style="min-height:60px;"></textarea></div>
                    </div>
                </div>

                <div class="ai-step">
                    <div class="ai-step-number">3</div>
                    <div class="ai-step-content">
                        <div class="ai-step-title">生成選項</div>
                        <div class="grid grid-3">
                            <div class="form-group"><label class="form-label">目標字數</label><select class="form-select" id="aiLength"><option value="500">短篇 (500字)</option><option value="1000" selected>中篇 (1000字)</option><option value="2000">長篇 (2000字)</option></select></div>
                            <div class="form-group"><label class="form-label">章節數</label><select class="form-select" id="aiChapters"><option value="1" selected>1章</option><option value="3">3章</option><option value="5">5章</option></select></div>
                            <div class="form-group"><label class="form-label">&nbsp;</label><button class="btn btn-primary" style="width:100%;" onclick="aiGenerateStory()">🚀 AI生成故事</button></div>
                        </div>
                        <div class="card mt-2" style="background:rgba(253,203,110,0.1);border:1px solid var(--warning);"><div class="card-body" style="padding:1rem;"><p style="font-size:0.85rem;">💡 <strong>提示：</strong>AI生成會消耗 10 積分。生成後你可以自由編輯和修改內容。目前積分：<strong style="color:var(--primary);">💎 ${currentUser.credits}</strong></p></div></div>
                    </div>
                </div>

                <div id="aiResult" class="hidden">
                    <div class="card">
                        <div class="card-header"><h3>✨ AI生成結果</h3><button class="btn btn-sm btn-ghost" onclick="document.getElementById('aiResult').classList.add('hidden')">隱藏</button></div>
                        <div class="card-body" id="aiResultContent"></div>
                    </div>
                </div>
            `;
            break;
        }

        case 'my-prompts': {
            try {
                const data = await api('/prompts/my-prompts?limit=50');
                c.innerHTML = `
                    <div class="dashboard-header"><h1>🎬 我的影片提示詞</h1><p>共 ${data.total} 條提示詞</p></div>
                    ${data.prompts.length === 0 ? '<div class="empty-state"><div class="empty-icon">🎬</div><h3>暫無提示詞</h3><p>前往<a href="#" onclick="router.navigate(\'prompts\')">提示詞生成器</a>開始創建</p></div>' : `
                    <div class="grid grid-2">${data.prompts.map(p => `
                        <div class="prompt-card">
                            <div class="flex justify-between items-center mb-1">
                                <span class="prompt-platform ${p.platform}">${p.platform}</span>
                                <div class="flex gap-1">
                                    <button class="btn btn-sm btn-ghost" onclick="toggleFavorite(${p.id})" style="color:${p.is_favorite ? 'var(--accent)' : 'var(--gray)'}">❤️</button>
                                    <button class="btn btn-sm btn-ghost" onclick="deletePrompt(${p.id})" style="color:var(--danger);">🗑️</button>
                                </div>
                            </div>
                            ${p.story_title ? `<p style="font-size:0.8rem;color:var(--primary);margin-bottom:0.5rem;">📖 ${esc(p.story_title)}</p>` : ''}
                            <div class="prompt-text" style="font-size:0.8rem;">${esc(p.full_prompt)}<button class="copy-btn" onclick="copyText(this)">📋</button></div>
                            <div style="font-size:0.75rem;color:var(--gray);margin-top:0.5rem;">${timeAgo(p.created_at)}</div>
                        </div>
                    `).join('')}</div>`}
                `;
            } catch (err) { c.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h3>載入失敗</h3></div>`; }
            break;
        }

        case 'profile': {
            c.innerHTML = `
                <div class="dashboard-header"><h1>👤 個人資料</h1><p>管理你的帳號資訊</p></div>
                <div class="grid grid-2">
                    <div class="card">
                        <div class="card-header"><h3>基本資訊</h3></div>
                        <div class="card-body">
                            <div class="form-group"><label class="form-label">顯示名稱</label><input type="text" class="form-input" id="profileName" value="${esc(currentUser.display_name || '')}"></div>
                            <div class="form-group"><label class="form-label">個人簡介</label><textarea class="form-textarea" id="profileBio" style="min-height:80px;">${esc(currentUser.bio || '')}</textarea></div>
                            <button class="btn btn-primary" onclick="updateProfile()">保存修改</button>
                        </div>
                    </div>
                    <div class="card">
                        <div class="card-header"><h3>帳號資訊</h3></div>
                        <div class="card-body">
                            <div class="mb-2"><strong>用戶名：</strong>${currentUser.username}</div>
                            <div class="mb-2"><strong>電子郵件：</strong>${currentUser.email}</div>
                            <div class="mb-2"><strong>角色：</strong><span class="tag tag-primary">${currentUser.role === 'admin' ? '👑 管理員' : '👤 用戶'}</span></div>
                            <div class="mb-2"><strong>積分：</strong><span style="color:var(--primary);font-weight:700;">💎 ${currentUser.credits}</span></div>
                            <div class="mb-2"><strong>註冊日期：</strong>${new Date(currentUser.created_at).toLocaleDateString('zh-TW')}</div>
                            ${currentUser.last_login ? `<div class="mb-2"><strong>上次登入：</strong>${timeAgo(currentUser.last_login)}</div>` : ''}
                        </div>
                    </div>
                </div>
            `;
            break;
        }

        case 'notifications': {
            try {
                const data = await api('/auth/notifications');
                const notifs = data.notifications || [];
                c.innerHTML = `
                    <div class="dashboard-header"><h1>🔔 通知</h1><p>${notifs.filter(n => !n.is_read).length} 條未讀</p></div>
                    ${notifs.length === 0 ? '<div class="empty-state"><div class="empty-icon">🔔</div><h3>暫無通知</h3></div>' :
                    notifs.map(n => `
                        <div class="notif-item ${n.is_read ? '' : 'unread'}">
                            <div class="notif-icon ${n.type}">${n.type === 'like' ? '❤️' : n.type === 'comment' ? '💬' : '🔔'}</div>
                            <div style="flex:1;">
                                <div style="font-weight:700;font-size:0.9rem;">${esc(n.title)}</div>
                                <div style="font-size:0.85rem;color:var(--dark-light);">${esc(n.message || '')}</div>
                                <div style="font-size:0.75rem;color:var(--gray);margin-top:4px;">${timeAgo(n.created_at)}</div>
                            </div>
                        </div>
                    `).join('')}
                `;
            } catch (e) {
                c.innerHTML = `<div class="dashboard-header"><h1>🔔 通知</h1></div><div class="empty-state"><div class="empty-icon">🔔</div><h3>暫無通知</h3></div>`;
            }
            break;
        }
    }
}

function updateWordCount() {
    const content = document.getElementById('newStoryContent')?.value || '';
    const el = document.getElementById('wordCount');
    if (el) el.textContent = `${content.length} 字`;
}

// ============================================
// Story CRUD (Enhanced)
// ============================================
async function saveStory(status) {
    if (!requireAuth()) return;
    const title = document.getElementById('newStoryTitle').value.trim();
    const content = document.getElementById('newStoryContent').value.trim();
    if (!title || !content) { showToast('標題和內容為必填', 'warning'); return; }

    try {
        const data = await api('/stories', { method: 'POST', body: {
            title, content,
            summary: document.getElementById('newStorySummary').value.trim(),
            category_id: document.getElementById('newStoryCategory').value || null,
            genre: document.getElementById('newStoryGenre').value.trim(),
            tone: document.getElementById('newStoryTone').value,
            target_audience: document.getElementById('newStoryAudience').value.trim(),
            visibility: document.getElementById('newStoryVisibility').value,
            status,
            tags: document.getElementById('newStoryTags').value.split(',').map(t => t.trim()).filter(Boolean),
        }});
        showToast(status === 'published' ? '故事已發布！🎉' : '草稿已保存', 'success');
        showDashTab('my-stories');
    } catch (err) { showToast(err.message, 'error'); }
}

async function deleteStory(id) {
    if (!confirm('確定要刪除這個故事嗎？此操作不可恢復。')) return;
    try { await api(`/stories/${id}`, { method: 'DELETE' }); showToast('故事已刪除', 'success'); showDashTab('my-stories'); } catch (err) { showToast(err.message, 'error'); }
}

function openStoryEditor(id) { router.navigate('editor', id); }

// ============================================
// Story Editor
// ============================================
async function loadEditor(storyId) {
    const c = document.getElementById('editorContent');
    try {
        const data = await api(`/stories/${storyId}`);
        const { story, tags, chapters, characters } = data;
        if (story.user_id !== currentUser?.id && currentUser?.role !== 'admin') {
            c.innerHTML = '<div class="empty-state"><div class="empty-icon">🔒</div><h3>無權編輯此故事</h3></div>';
            return;
        }

        c.innerHTML = `
            <div class="flex justify-between items-center mb-3">
                <div><button class="btn btn-ghost" onclick="showDashTab('my-stories')">← 返回</button></div>
                <h1 style="font-size:1.5rem;font-weight:800;">✏️ 編輯：${esc(story.title)}</h1>
                <div class="flex gap-2">
                    <button class="btn btn-primary" onclick="updateStory(${story.id})">💾 保存</button>
                    ${story.status === 'draft' ? `<button class="btn btn-success" onclick="publishStory(${story.id})">🚀 發布</button>` : ''}
                </div>
            </div>

            <!-- Tabs -->
            <div class="tabs">
                <button class="tab active" onclick="showEditorTab('edit-content',this)">📝 內容</button>
                <button class="tab" onclick="showEditorTab('edit-chapters',this)">📑 章節 (${chapters.length})</button>
                <button class="tab" onclick="showEditorTab('edit-characters',this)">👥 角色 (${characters.length})</button>
                <button class="tab" onclick="showEditorTab('edit-settings',this)">⚙️ 設定</button>
            </div>

            <!-- Content Tab -->
            <div id="edit-content" class="tab-content active">
                <div class="card"><div class="card-body">
                    <div class="form-group"><label class="form-label">標題</label><input type="text" class="form-input" id="editTitle" value="${esc(story.title)}"></div>
                    <div class="form-group"><label class="form-label">簡介</label><textarea class="form-textarea" id="editSummary" style="min-height:80px;">${esc(story.summary || '')}</textarea></div>
                    <div class="form-group"><label class="form-label">正文</label><textarea class="form-textarea" id="editContent" style="min-height:500px;font-size:1rem;line-height:1.8;">${esc(story.content)}</textarea></div>
                </div></div>
            </div>

            <!-- Chapters Tab -->
            <div id="edit-chapters" class="tab-content">
                <div class="flex justify-between items-center mb-2">
                    <h3>章節列表</h3>
                    <button class="btn btn-primary btn-sm" onclick="showAddChapter(${story.id})">+ 新增章節</button>
                </div>
                <div id="chaptersList">
                    ${chapters.length === 0 ? '<p class="text-muted">暫無章節。你可以為長篇故事添加章節結構。</p>' :
                    chapters.map(ch => `
                        <div class="chapter-item">
                            <div class="chapter-number">${ch.chapter_number}</div>
                            <div class="chapter-info">
                                <div class="chapter-title">${esc(ch.title)}</div>
                                <div class="chapter-meta">${ch.word_count} 字</div>
                            </div>
                            <div class="flex gap-1">
                                <button class="btn btn-sm btn-ghost" onclick="editChapter(${ch.id},${story.id})">✏️</button>
                                <button class="btn btn-sm btn-ghost" onclick="deleteChapter(${ch.id},${story.id})" style="color:var(--danger);">🗑️</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Characters Tab -->
            <div id="edit-characters" class="tab-content">
                <div class="flex justify-between items-center mb-2">
                    <h3>角色列表</h3>
                    <button class="btn btn-primary btn-sm" onclick="showAddCharacter(${story.id})">+ 新增角色</button>
                </div>
                <div class="grid grid-2" id="charactersList">
                    ${characters.length === 0 ? '<p class="text-muted">暫無角色設定。</p>' :
                    characters.map(ch => `
                        <div class="character-card">
                            <div class="flex justify-between">
                                <div class="character-avatar">${ch.name[0]}</div>
                                <div class="flex gap-1">
                                    <button class="btn btn-sm btn-ghost" onclick="editChar(${ch.id},${story.id})">✏️</button>
                                    <button class="btn btn-sm btn-ghost" onclick="deleteChar(${ch.id},${story.id})" style="color:var(--danger);">🗑️</button>
                                </div>
                            </div>
                            <div class="character-name">${esc(ch.name)}</div>
                            ${ch.role ? `<div class="character-role">${esc(ch.role)}</div>` : ''}
                            ${ch.description ? `<div class="character-detail"><strong>描述</strong><p>${esc(ch.description)}</p></div>` : ''}
                            ${ch.personality ? `<div class="character-detail"><strong>性格</strong><p>${esc(ch.personality)}</p></div>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Settings Tab -->
            <div id="edit-settings" class="tab-content">
                <div class="card"><div class="card-body">
                    <div class="grid grid-2">
                        <div class="form-group"><label class="form-label">分類</label><select class="form-select" id="editCategory"><option value="">--</option>${categories.map(c => `<option value="${c.id}" ${story.category_id === c.id ? 'selected' : ''}>${c.icon} ${c.name}</option>`).join('')}</select></div>
                        <div class="form-group"><label class="form-label">類型</label><input type="text" class="form-input" id="editGenre" value="${esc(story.genre || '')}"></div>
                    </div>
                    <div class="grid grid-2">
                        <div class="form-group"><label class="form-label">語調</label><input type="text" class="form-input" id="editTone" value="${esc(story.tone || '')}"></div>
                        <div class="form-group"><label class="form-label">可見性</label><select class="form-select" id="editVisibility"><option value="public" ${story.visibility==='public'?'selected':''}>公開</option><option value="private" ${story.visibility==='private'?'selected':''}>私人</option><option value="unlisted" ${story.visibility==='unlisted'?'selected':''}>不公開列出</option></select></div>
                    </div>
                    <div class="form-group"><label class="form-label">標籤</label><input type="text" class="form-input" id="editTags" value="${tags.map(t => t.name).join(', ')}"></div>
                </div></div>
            </div>
        `;
    } catch (err) { c.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h3>載入失敗</h3><p>${err.message}</p></div>`; }
}

function showEditorTab(tabId, btn) {
    document.querySelectorAll('#page-editor .tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('#page-editor .tab-content').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(tabId).classList.add('active');
}

async function updateStory(id) {
    try {
        await api(`/stories/${id}`, { method: 'PUT', body: {
            title: document.getElementById('editTitle').value,
            content: document.getElementById('editContent').value,
            summary: document.getElementById('editSummary').value,
            category_id: document.getElementById('editCategory').value || null,
            genre: document.getElementById('editGenre').value,
            tone: document.getElementById('editTone').value,
            visibility: document.getElementById('editVisibility').value,
        }});
        showToast('故事已保存', 'success');
    } catch (err) { showToast(err.message, 'error'); }
}

async function publishStory(id) {
    try {
        await updateStory(id);
        await api(`/stories/${id}`, { method: 'PUT', body: { status: 'published' } });
        showToast('故事已發布！🎉', 'success');
        router.navigate('story', id);
    } catch (err) { showToast(err.message, 'error'); }
}

// Chapter management
function showAddChapter(storyId) {
    const modal = document.getElementById('editorModal');
    document.getElementById('editorModalTitle').textContent = '新增章節';
    document.getElementById('editorModalBody').innerHTML = `
        <div class="form-group"><label class="form-label">章節標題</label><input type="text" class="form-input" id="newChTitle" placeholder="例如：第一章：命運的開始"></div>
        <div class="form-group"><label class="form-label">章節內容</label><textarea class="form-textarea" id="newChContent" placeholder="章節正文..." style="min-height:300px;"></textarea></div>
    `;
    document.getElementById('editorModalSave').onclick = async () => {
        try {
            const content = document.getElementById('newChContent').value;
            await api(`/stories/${storyId}/chapters`, { method: 'POST', body: {
                title: document.getElementById('newChTitle').value,
                content,
                chapter_number: 1 // Will be auto-calculated on server
            }});
            closeEditorModal();
            showToast('章節已添加', 'success');
            loadEditor(storyId);
        } catch (err) { showToast(err.message, 'error'); }
    };
    modal.classList.add('active');
}

function editChapter(chId, storyId) {
    showToast('章節編輯功能載入中...', 'info');
}

async function deleteChapter(chId, storyId) {
    if (!confirm('確定刪除此章節？')) return;
    try { await api(`/stories/${storyId}/chapters/${chId}`, { method: 'DELETE' }); showToast('已刪除', 'success'); loadEditor(storyId); } catch (err) { showToast(err.message, 'error'); }
}

// Character management
function showAddCharacter(storyId) {
    const modal = document.getElementById('editorModal');
    document.getElementById('editorModalTitle').textContent = '新增角色';
    document.getElementById('editorModalBody').innerHTML = `
        <div class="grid grid-2">
            <div class="form-group"><label class="form-label">角色名稱</label><input type="text" class="form-input" id="newCharName"></div>
            <div class="form-group"><label class="form-label">角色定位</label><select class="form-select" id="newCharRole"><option>主角</option><option>反派</option><option>配角</option><option>導師</option><option>夥伴</option><option>路人</option></select></div>
        </div>
        <div class="form-group"><label class="form-label">描述</label><textarea class="form-textarea" id="newCharDesc" placeholder="角色簡介" style="min-height:60px;"></textarea></div>
        <div class="form-group"><label class="form-label">外貌</label><textarea class="form-textarea" id="newCharAppearance" placeholder="角色外貌描述" style="min-height:60px;"></textarea></div>
        <div class="form-group"><label class="form-label">性格</label><textarea class="form-textarea" id="newCharPersonality" placeholder="角色性格特點" style="min-height:60px;"></textarea></div>
        <div class="form-group"><label class="form-label">背景故事</label><textarea class="form-textarea" id="newCharBackstory" placeholder="角色的過去和動機" style="min-height:60px;"></textarea></div>
    `;
    document.getElementById('editorModalSave').onclick = async () => {
        try {
            await api(`/stories/${storyId}/characters`, { method: 'POST', body: {
                name: document.getElementById('newCharName').value,
                role: document.getElementById('newCharRole').value,
                description: document.getElementById('newCharDesc').value,
                appearance: document.getElementById('newCharAppearance').value,
                personality: document.getElementById('newCharPersonality').value,
                backstory: document.getElementById('newCharBackstory').value,
            }});
            closeEditorModal(); showToast('角色已添加', 'success'); loadEditor(storyId);
        } catch (err) { showToast(err.message, 'error'); }
    };
    modal.classList.add('active');
}

function editChar(chId, storyId) { showToast('角色編輯載入中...', 'info'); }

async function deleteChar(chId, storyId) {
    if (!confirm('確定刪除此角色？')) return;
    try { await api(`/stories/${storyId}/characters/${chId}`, { method: 'DELETE' }); showToast('已刪除', 'success'); loadEditor(storyId); } catch (err) { showToast(err.message, 'error'); }
}

// ============================================
// AI Story Generation
// ============================================
async function aiGenerateStory() {
    if (!requireAuth()) return;
    const idea = document.getElementById('aiIdea').value.trim();
    if (!idea) { showToast('請輸入故事想法', 'warning'); return; }

    const genre = document.getElementById('aiGenre').value;
    const tone = document.getElementById('aiTone').value;
    const charName = document.getElementById('aiCharName').value.trim();
    const charRole = document.getElementById('aiCharRole').value;
    const charDesc = document.getElementById('aiCharDesc').value.trim();
    const length = document.getElementById('aiLength').value;
    const chapters = document.getElementById('aiChapters').value;

    // Build a rich prompt for story generation
    const resultDiv = document.getElementById('aiResult');
    const resultContent = document.getElementById('aiResultContent');
    resultDiv.classList.remove('hidden');
    resultContent.innerHTML = '<div class="text-center p-4"><div class="spinner" style="margin:0 auto;"></div><p class="mt-2">AI正在生成故事，請稍候...</p></div>';

    // Simulate AI generation with a well-crafted story based on inputs
    await new Promise(r => setTimeout(r, 1500));

    // Generate story based on inputs
    const storyTemplates = {
        '奇幻冒險': {
            titles: ['迷霧森林的秘密', '最後的魔法師', '龍騎士傳說'],
            openings: ['在大陸的最北端，有一片被永恆迷霧籠罩的森林...', '當最後一道魔法光芒熄滅的時候，世界陷入了前所未有的黑暗...', '古老的預言曾經說過：當龍與人再次並肩之時...']
        },
        '科幻未來': {
            titles: ['量子之夢', '星際信標', '人工黎明'],
            openings: ['2157年，人類終於破解了量子意識的奧秘...', '在距離地球47光年的空間站上，最後的守望者正在...', '當第一個AI流下眼淚的時候，沒有人知道這意味著什麼...']
        },
        '懸疑推理': {
            titles: ['第七封印', '鏡中人', '消失的第十三小時'],
            openings: ['雨夜，一封沒有署名的信被塞進了門縫...', '鏡子裡的那個人，為什麼在笑？', '時鐘敲了十三下，然後一切都改變了...']
        },
    };

    const tpl = storyTemplates[genre] || storyTemplates['奇幻冒險'];
    const titleIdx = Math.floor(Math.random() * tpl.titles.length);
    const generatedTitle = charName ? `${tpl.titles[titleIdx]}：${charName}的傳奇` : tpl.titles[titleIdx];
    const opening = tpl.openings[titleIdx];

    // Build character intro
    let charIntro = '';
    if (charName) {
        charIntro = `\n\n${charName}——一個${charDesc || '充滿謎團的人物'}。作為${charRole}，${charName}將在這個故事中扮演關鍵角色。`;
    }

    const generatedContent = `${opening}${charIntro}\n\n這是一個關於${idea.substring(0, 50)}的故事。\n\n在${genre}的世界裡，每一個選擇都可能改變命運的走向。而${charName || '我們的主角'}即將面對的，是一場前所未有的挑戰...\n\n「準備好了嗎？」一個聲音在黑暗中響起。\n\n${charName || '他'}深吸一口氣，握緊了手中的武器。無論前方等待著什麼，${charName ? '她' : '他'}都不會退縮。\n\n因為有些事情，比恐懼更重要。\n\n—— 這是一個未完成的故事，等待你繼續書寫。`;

    resultContent.innerHTML = `
        <div class="mb-3">
            <div class="form-group"><label class="form-label">生成的標題</label><input type="text" class="form-input" id="aiGenTitle" value="${esc(generatedTitle)}"></div>
            <div class="form-group"><label class="form-label">生成的內容</label><textarea class="form-textarea" id="aiGenContent" style="min-height:300px;font-size:1rem;line-height:1.8;">${esc(generatedContent)}</textarea></div>
            <div class="flex gap-2">
                <button class="btn btn-primary btn-lg" onclick="saveAiStory('draft')">💾 保存為草稿</button>
                <button class="btn btn-success btn-lg" onclick="saveAiStory('published')">🚀 直接發布</button>
            </div>
        </div>
    `;
}

async function saveAiStory(status) {
    try {
        await api('/stories', { method: 'POST', body: {
            title: document.getElementById('aiGenTitle').value,
            content: document.getElementById('aiGenContent').value,
            status,
            is_ai_generated: true,
        }});
        showToast(status === 'published' ? 'AI生成的故事已發布！' : '已保存為草稿', 'success');
        showDashTab('my-stories');
    } catch (err) { showToast(err.message, 'error'); }
}

// ============================================
// Prompt Actions
// ============================================
async function toggleFavorite(id) { try { await api(`/prompts/${id}/favorite`, { method: 'POST' }); showDashTab('my-prompts'); } catch (err) { showToast(err.message, 'error'); } }
async function deletePrompt(id) { if (!confirm('確定刪除此提示詞？')) return; try { await api(`/prompts/${id}`, { method: 'DELETE' }); showToast('已刪除', 'success'); showDashTab('my-prompts'); } catch (err) { showToast(err.message, 'error'); } }
async function generatePromptFromStory(storyId) { if (!requireAuth()) return; router.navigate('prompts'); setTimeout(() => { document.getElementById('promptStorySelect').value = storyId; generateFromStory(); }, 300); }

// ============================================
// Profile
// ============================================
async function updateProfile() {
    try {
        await api('/auth/profile', { method: 'PUT', body: { display_name: document.getElementById('profileName').value, bio: document.getElementById('profileBio').value }});
        currentUser.display_name = document.getElementById('profileName').value;
        updateNavForUser(); showToast('個人資料已更新', 'success');
    } catch (err) { showToast(err.message, 'error'); }
}

// ============================================
// Admin (Enhanced with more tabs)
// ============================================
async function loadAdminDashboard() {
    if (!currentUser || currentUser.role !== 'admin') { showToast('需要管理員權限', 'error'); router.navigate('home'); return; }
    showAdminTab('admin-overview');
}

async function showAdminTab(tab) {
    const c = document.getElementById('adminContent');
    document.querySelectorAll('[data-admin]').forEach(a => a.classList.remove('active'));
    const l = document.querySelector(`[data-admin="${tab}"]`); if (l) l.classList.add('active');

    switch (tab) {
        case 'admin-overview': {
            try {
                const d = await api('/admin/dashboard');
                c.innerHTML = `
                    <div class="dashboard-header"><h1>📊 管理儀表盤</h1><p>平台數據總覽</p></div>
                    <div class="stat-cards">
                        <div class="stat-card"><div class="stat-card-icon purple">👥</div><div class="stat-card-info"><h3>${d.users.total}</h3><p>總用戶 (今日+${d.users.new_today})</p></div></div>
                        <div class="stat-card"><div class="stat-card-icon green">📝</div><div class="stat-card-info"><h3>${d.stories.total}</h3><p>總故事 (今日+${d.stories.new_today})</p></div></div>
                        <div class="stat-card"><div class="stat-card-icon orange">🎬</div><div class="stat-card-info"><h3>${d.prompts.total}</h3><p>影片提示詞</p></div></div>
                        <div class="stat-card"><div class="stat-card-icon blue">👁</div><div class="stat-card-info"><h3>${formatNum(d.engagement.total_views)}</h3><p>總瀏覽量</p></div></div>
                    </div>
                    <div class="grid grid-3">
                        <div class="card">
                            <div class="card-header"><h3>📈 今日數據</h3></div>
                            <div class="card-body">
                                <div class="flex justify-between mb-1"><span>新用戶</span><strong>${d.users.new_today}</strong></div>
                                <div class="flex justify-between mb-1"><span>新故事</span><strong>${d.stories.new_today}</strong></div>
                                <div class="flex justify-between mb-1"><span>新提示詞</span><strong>${d.prompts.today}</strong></div>
                                <div class="flex justify-between mb-1"><span>AI生成</span><strong>${d.ai_usage.today_generations}</strong></div>
                            </div>
                        </div>
                        <div class="card">
                            <div class="card-header"><h3>📊 內容狀態</h3></div>
                            <div class="card-body">
                                <div class="flex justify-between mb-1"><span>已發布</span><span class="tag tag-success">${d.stories.published}</span></div>
                                <div class="flex justify-between mb-1"><span>草稿</span><span class="tag tag-warning">${d.stories.drafts}</span></div>
                                <div class="flex justify-between mb-1"><span>被舉報</span><span class="tag tag-danger">${d.stories.flagged}</span></div>
                                <div class="flex justify-between mb-1"><span>總積分消耗</span><strong>${d.ai_usage.total_credits_used}</strong></div>
                            </div>
                        </div>
                        <div class="card">
                            <div class="card-header"><h3>🔥 熱門分類</h3></div>
                            <div class="card-body">
                                ${d.popular_categories.slice(0, 5).map(cat => `<div class="flex justify-between mb-1"><span>${cat.icon} ${cat.name}</span><strong>${cat.story_count}</strong></div>`).join('')}
                            </div>
                        </div>
                    </div>
                    <div class="grid grid-2 mt-3">
                        <div class="card">
                            <div class="card-header"><h3>👤 最近註冊</h3></div>
                            <div class="card-body">${d.recent_users.map(u => `<div class="flex items-center gap-2 mb-1"><div class="avatar avatar-sm">${u.display_name[0]}</div><span class="flex-1">${esc(u.display_name)}</span><span class="text-muted" style="font-size:0.8rem;">${timeAgo(u.created_at)}</span></div>`).join('')}</div>
                        </div>
                        <div class="card">
                            <div class="card-header"><h3>📝 最近故事</h3></div>
                            <div class="card-body">${d.recent_stories.map(s => `<div class="flex items-center gap-2 mb-1"><span class="tag tag-${s.status === 'published' ? 'success' : 'warning'}" style="font-size:0.7rem;">${s.status}</span><span class="flex-1 truncate">${esc(s.title)}</span><span class="text-muted" style="font-size:0.8rem;">${s.username}</span></div>`).join('')}</div>
                        </div>
                    </div>
                `;
            } catch (err) { c.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h3>載入失敗</h3></div>`; }
            break;
        }

        case 'admin-users': {
            try {
                const d = await api('/admin/users');
                c.innerHTML = `
                    <div class="dashboard-header"><h1>👥 用戶管理</h1><p>共 ${d.total} 個用戶</p></div>
                    <div class="table-wrapper"><table>
                        <thead><tr><th>ID</th><th>用戶</th><th>郵件</th><th>角色</th><th>狀態</th><th>積分</th><th>故事</th><th>註冊</th><th>操作</th></tr></thead>
                        <tbody>${d.users.map(u => `<tr>
                            <td>${u.id}</td>
                            <td><strong>${esc(u.display_name)}</strong><br><span class="text-muted" style="font-size:0.8rem;">@${u.username}</span></td>
                            <td>${u.email}</td>
                            <td><span class="tag tag-primary">${u.role === 'admin' ? '👑 管理員' : '👤 用戶'}</span></td>
                            <td><span class="tag tag-${u.status === 'active' ? 'success' : 'danger'}">${u.status}</span></td>
                            <td>${u.credits}</td><td>${u.story_count}</td>
                            <td>${timeAgo(u.created_at)}</td>
                            <td><select class="form-select" style="width:auto;padding:4px 8px;font-size:0.8rem;" onchange="adminUpdateUser(${u.id},{status:this.value})"><option value="active" ${u.status==='active'?'selected':''}>啟用</option><option value="banned" ${u.status==='banned'?'selected':''}>封禁</option><option value="suspended" ${u.status==='suspended'?'selected':''}>停權</option></select></td>
                        </tr>`).join('')}</tbody>
                    </table></div>
                `;
            } catch (err) { c.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h3>載入失敗</h3></div>`; }
            break;
        }

        case 'admin-stories': {
            try {
                const d = await api('/admin/stories');
                c.innerHTML = `
                    <div class="dashboard-header"><h1>📝 內容管理</h1><p>共 ${d.total} 個故事</p></div>
                    <div class="table-wrapper"><table>
                        <thead><tr><th>ID</th><th>標題</th><th>作者</th><th>分類</th><th>狀態</th><th>字數</th><th>瀏覽</th><th>時間</th><th>操作</th></tr></thead>
                        <tbody>${d.stories.map(s => `<tr>
                            <td>${s.id}</td><td><strong>${esc(s.title)}</strong></td><td>${esc(s.username)}</td><td>${s.category_name || '-'}</td>
                            <td><span class="tag tag-${s.status === 'published' ? 'success' : s.status === 'flagged' ? 'danger' : 'warning'}">${s.status}</span></td>
                            <td>${s.word_count}</td><td>${s.view_count}</td><td>${timeAgo(s.created_at)}</td>
                            <td><select class="form-select" style="width:auto;padding:4px 8px;font-size:0.8rem;" onchange="adminUpdateStory(${s.id},this.value)"><option value="published" ${s.status==='published'?'selected':''}>發布</option><option value="draft" ${s.status==='draft'?'selected':''}>草稿</option><option value="flagged" ${s.status==='flagged'?'selected':''}>舉報</option><option value="archived" ${s.status==='archived'?'selected':''}>封存</option></select></td>
                        </tr>`).join('')}</tbody>
                    </table></div>
                `;
            } catch (err) { c.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h3>載入失敗</h3></div>`; }
            break;
        }

        case 'admin-categories': {
            try {
                const d = await api('/admin/categories');
                c.innerHTML = `
                    <div class="dashboard-header flex justify-between items-center"><div><h1>🏷️ 分類管理</h1><p>${d.categories.length} 個分類</p></div><button class="btn btn-primary" onclick="document.getElementById('addCatForm').classList.toggle('hidden')">+ 新增分類</button></div>
                    <div id="addCatForm" class="hidden card mb-3"><div class="card-body">
                        <div class="grid grid-2"><div class="form-group"><label class="form-label">名稱</label><input type="text" class="form-input" id="newCatName"></div><div class="form-group"><label class="form-label">Slug</label><input type="text" class="form-input" id="newCatSlug"></div></div>
                        <div class="grid grid-2"><div class="form-group"><label class="form-label">圖標</label><input type="text" class="form-input" id="newCatIcon" placeholder="Emoji"></div><div class="form-group"><label class="form-label">排序</label><input type="number" class="form-input" id="newCatSort" value="0"></div></div>
                        <div class="form-group"><label class="form-label">描述</label><textarea class="form-textarea" id="newCatDesc" style="min-height:60px;"></textarea></div>
                        <button class="btn btn-primary" onclick="addCategory()">保存</button>
                    </div></div>
                    <div class="table-wrapper"><table>
                        <thead><tr><th>ID</th><th>圖標</th><th>名稱</th><th>Slug</th><th>描述</th><th>故事數</th><th>排序</th></tr></thead>
                        <tbody>${d.categories.map(c => `<tr><td>${c.id}</td><td style="font-size:1.5rem;">${c.icon}</td><td><strong>${esc(c.name)}</strong></td><td><code>${c.slug}</code></td><td class="truncate" style="max-width:200px;">${esc(c.description || '')}</td><td>${c.story_count}</td><td>${c.sort_order}</td></tr>`).join('')}</tbody>
                    </table></div>
                `;
            } catch (err) { c.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h3>載入失敗</h3></div>`; }
            break;
        }

        case 'admin-templates': {
            try {
                const d = await api('/prompts/templates');
                c.innerHTML = `
                    <div class="dashboard-header"><h1>📐 提示詞模板管理</h1><p>${d.templates.length} 個模板</p></div>
                    <div class="table-wrapper"><table>
                        <thead><tr><th>ID</th><th>名稱</th><th>平台</th><th>分類</th><th>使用次數</th><th>參數</th></tr></thead>
                        <tbody>${d.templates.map(t => `<tr>
                            <td>${t.id}</td><td><strong>${esc(t.name)}</strong><br><span class="text-muted" style="font-size:0.8rem;">${esc(t.description || '')}</span></td>
                            <td><span class="prompt-platform ${t.platform}">${t.platform}</span></td>
                            <td>${t.category}</td><td>${t.usage_count}</td>
                            <td><span class="text-muted" style="font-size:0.8rem;">${JSON.parse(t.parameters || '[]').join(', ')}</span></td>
                        </tr>`).join('')}</tbody>
                    </table></div>
                `;
            } catch (err) { c.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h3>載入失敗</h3></div>`; }
            break;
        }

        case 'admin-settings': {
            try {
                const d = await api('/admin/settings');
                c.innerHTML = `
                    <div class="dashboard-header"><h1>⚙️ 系統設定</h1><p>平台全局配置</p></div>
                    <div class="card"><div class="card-body">
                        ${d.settings.map(s => `<div class="form-group"><label class="form-label">${s.description || s.key}</label><div class="flex gap-2"><input type="text" class="form-input" id="setting_${s.key}" value="${esc(s.value)}"><code style="font-size:0.8rem;color:var(--gray);align-self:center;white-space:nowrap;">${s.key}</code></div></div>`).join('')}
                        <button class="btn btn-primary btn-lg" onclick="saveSettings()">💾 保存設定</button>
                    </div></div>
                `;
            } catch (err) { c.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h3>載入失敗</h3></div>`; }
            break;
        }

        case 'admin-logs': {
            try {
                const d = await api('/admin/ai-logs');
                c.innerHTML = `
                    <div class="dashboard-header"><h1>📋 AI生成日誌</h1><p>${d.total} 條記錄</p></div>
                    <div class="table-wrapper"><table>
                        <thead><tr><th>ID</th><th>用戶</th><th>類型</th><th>模型</th><th>積分</th><th>耗時</th><th>狀態</th><th>時間</th></tr></thead>
                        <tbody>${d.logs.map(l => `<tr>
                            <td>${l.id}</td><td>${l.username}</td>
                            <td><span class="tag tag-primary">${l.generation_type}</span></td>
                            <td>${l.model_used || '-'}</td><td>${l.credits_cost}</td>
                            <td>${l.processing_time_ms ? l.processing_time_ms + 'ms' : '-'}</td>
                            <td><span class="tag tag-${l.status === 'success' ? 'success' : 'danger'}">${l.status}</span></td>
                            <td>${timeAgo(l.created_at)}</td>
                        </tr>`).join('')}</tbody>
                    </table></div>
                `;
            } catch (err) { c.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h3>載入失敗</h3></div>`; }
            break;
        }

        case 'admin-comments': {
            c.innerHTML = `
                <div class="dashboard-header"><h1>💬 評論管理</h1></div>
                <p class="text-muted">評論管理功能載入中...可在內容管理中切換故事狀態來管理評論。</p>
            `;
            break;
        }
    }
}

async function adminUpdateUser(id, data) { try { await api(`/admin/users/${id}`, { method: 'PUT', body: data }); showToast('用戶已更新', 'success'); } catch (err) { showToast(err.message, 'error'); } }
async function adminUpdateStory(id, status) { try { await api(`/admin/stories/${id}`, { method: 'PUT', body: { status } }); showToast('狀態已更新', 'success'); } catch (err) { showToast(err.message, 'error'); } }
async function addCategory() { try { await api('/admin/categories', { method: 'POST', body: { name: document.getElementById('newCatName').value, slug: document.getElementById('newCatSlug').value, icon: document.getElementById('newCatIcon').value, sort_order: parseInt(document.getElementById('newCatSort').value)||0, description: document.getElementById('newCatDesc').value }}); showToast('分類已添加', 'success'); showAdminTab('admin-categories'); } catch (err) { showToast(err.message, 'error'); } }
async function saveSettings() { try { const s = {}; document.querySelectorAll('[id^="setting_"]').forEach(el => { s[el.id.replace('setting_','')] = el.value; }); await api('/admin/settings', { method: 'PUT', body: { settings: s } }); showToast('設定已保存', 'success'); } catch (err) { showToast(err.message, 'error'); } }

// ============================================
// Utilities
// ============================================
function esc(text) { if (!text) return ''; const d = document.createElement('div'); d.textContent = text; return d.innerHTML; }
function formatNum(n) { if (!n) return '0'; if (n >= 10000) return (n / 10000).toFixed(1) + '萬'; if (n >= 1000) return (n / 1000).toFixed(1) + 'k'; return n.toString(); }
function timeAgo(dateStr) {
    if (!dateStr) return '';
    const now = new Date(); const date = new Date(dateStr); const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return '剛剛'; if (diff < 3600) return `${Math.floor(diff/60)}分鐘前`; if (diff < 86400) return `${Math.floor(diff/3600)}小時前`; if (diff < 604800) return `${Math.floor(diff/86400)}天前`;
    return date.toLocaleDateString('zh-TW');
}

function copyText(btn) {
    const text = btn.parentElement.textContent.replace('📋 複製', '').replace('📋', '').trim();
    navigator.clipboard.writeText(text).then(() => showToast('已複製', 'success')).catch(() => {
        const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); showToast('已複製', 'success');
    });
}

function toggleMobileMenu() { document.getElementById('navLinks').classList.toggle('open'); }
window.addEventListener('scroll', () => { document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 10); });

// ============================================
// Tools Page
// ============================================
async function loadToolsPage() {
    showToolTab('templates');
}

async function showToolTab(tab) {
    const c = document.getElementById('toolContent');
    if (!c) return;

    switch (tab) {
        case 'templates': {
            try {
                const data = await api('/tools/story-templates');
                c.innerHTML = `
                    <h2 style="font-size:1.5rem;font-weight:800;margin-bottom:0.5rem;">📖 故事模板庫</h2>
                    <p class="text-muted mb-3">選擇一個模板快速開始創作，每個模板都包含完整的故事結構、角色設定和寫作提示</p>
                    <div class="grid grid-2">
                    ${data.templates.map(t => `
                        <div class="card">
                            <div class="card-body">
                                <div class="flex justify-between items-center mb-1">
                                    <span style="font-size:2rem;">${t.icon}</span>
                                    <div>
                                        <span class="tag tag-${t.difficulty === 'beginner' ? 'success' : t.difficulty === 'intermediate' ? 'warning' : 'danger'}">${t.difficulty === 'beginner' ? '入門' : t.difficulty === 'intermediate' ? '進階' : '高級'}</span>
                                        <span class="tag tag-primary">${t.category_name || t.genre}</span>
                                    </div>
                                </div>
                                <h3 style="font-size:1.2rem;font-weight:700;margin-bottom:0.25rem;">${t.name}</h3>
                                <p style="font-size:0.9rem;color:var(--dark-light);margin-bottom:1rem;">${t.description}</p>
                                <div class="mb-2">
                                    <div style="font-size:0.8rem;font-weight:700;color:var(--primary);margin-bottom:0.5rem;">📋 故事大綱</div>
                                    <div style="font-size:0.85rem;background:var(--light);padding:1rem;border-radius:8px;white-space:pre-wrap;line-height:1.6;">${t.outline}</div>
                                </div>
                                ${t.opening ? `<div class="mb-2"><div style="font-size:0.8rem;font-weight:700;color:var(--primary);margin-bottom:0.5rem;">✍️ 開頭範例</div><p style="font-size:0.85rem;font-style:italic;color:var(--dark-light);">"${t.opening}"</p></div>` : ''}
                                ${t.character_template ? `<div class="mb-2"><div style="font-size:0.8rem;font-weight:700;color:var(--primary);margin-bottom:0.5rem;">👥 角色模板</div><div style="font-size:0.85rem;background:var(--light);padding:1rem;border-radius:8px;">${Object.entries(JSON.parse(t.character_template)).map(([name, info]) => `<div class="mb-1"><strong>${name}：</strong>${info.role}（${info.traits}）</div>`).join('')}</div></div>` : ''}
                                ${t.writing_tips ? `<div class="mb-2"><div style="font-size:0.8rem;font-weight:700;color:var(--primary);margin-bottom:0.5rem;">💡 寫作提示</div><div style="font-size:0.85rem;white-space:pre-wrap;line-height:1.6;">${t.writing_tips}</div></div>` : ''}
                                <button class="btn btn-primary mt-1" onclick="useStoryTemplate(${t.id})">📝 使用此模板開始創作</button>
                            </div>
                        </div>
                    `).join('')}
                    </div>
                `;
            } catch (err) { c.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h3>載入失敗</h3></div>`; }
            break;
        }

        case 'prompts': {
            try {
                const data = await api('/tools/writing-prompts/random?count=10');
                const typeIcons = { opening: '📝', character: '👤', conflict: '⚔️', world: '🌍', dialogue: '💬', twist: '🔄', ending: '🏁' };
                const typeNames = { opening: '開頭', character: '角色', conflict: '衝突', world: '世界觀', dialogue: '對話', twist: '反轉', ending: '結局' };
                c.innerHTML = `
                    <div class="flex justify-between items-center mb-3">
                        <div><h2 style="font-size:1.5rem;font-weight:800;">💡 每日靈感</h2><p class="text-muted">隨機寫作提示，激發你的創作靈感</p></div>
                        <button class="btn btn-primary" onclick="showToolTab('prompts')">🔄 換一批</button>
                    </div>
                    <div class="grid grid-2">
                    ${data.prompts.map(p => `
                        <div class="card">
                            <div class="card-body">
                                <div class="flex justify-between items-center mb-1">
                                    <span class="tag tag-primary">${typeIcons[p.prompt_type] || '💡'} ${typeNames[p.prompt_type] || p.prompt_type}</span>
                                    ${p.genre && p.genre !== '通用' ? `<span class="tag tag-success">${p.genre}</span>` : ''}
                                </div>
                                <p style="font-size:1rem;line-height:1.7;margin-top:0.75rem;">${p.content}</p>
                                <button class="btn btn-sm btn-ghost mt-1" onclick="copyToClipboard('${p.content.replace(/'/g, "\\'")}')">📋 複製提示</button>
                            </div>
                        </div>
                    `).join('')}
                    </div>
                    <div class="mt-3">
                        <h3 style="font-weight:700;margin-bottom:1rem;">按類型篩選</h3>
                        <div class="flex gap-1 flex-wrap">
                            ${Object.entries(typeNames).map(([k, v]) => `<button class="btn btn-sm btn-ghost" onclick="filterWritingPrompts('${k}')">${typeIcons[k]} ${v}</button>`).join('')}
                        </div>
                    </div>
                `;
            } catch (err) { c.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h3>載入失敗</h3></div>`; }
            break;
        }

        case 'names': {
            c.innerHTML = `
                <h2 style="font-size:1.5rem;font-weight:800;margin-bottom:0.5rem;">🔤 名字生成器</h2>
                <p class="text-muted mb-3">為角色、地點、組織和物品生成名字</p>
                <div class="grid grid-2" style="gap:2rem;">
                    <div class="card">
                        <div class="card-header"><h3>⚙️ 生成設定</h3></div>
                        <div class="card-body">
                            <div class="form-group">
                                <label class="form-label">名字類型</label>
                                <select class="form-select" id="nameType">
                                    <option value="character">👤 角色名</option>
                                    <option value="place">📍 地名</option>
                                    <option value="organization">🏛️ 組織名</option>
                                    <option value="item">⚔️ 物品名</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">風格/類型</label>
                                <select class="form-select" id="nameGenre">
                                    <option value="fantasy">⚔️ 奇幻</option>
                                    <option value="sci-fi">🚀 科幻</option>
                                    <option value="martial">🗡️ 武俠</option>
                                    <option value="modern">🏙️ 現代</option>
                                </select>
                            </div>
                            <div class="form-group" id="nameGenderGroup">
                                <label class="form-label">性別（角色名）</label>
                                <select class="form-select" id="nameGender">
                                    <option value="male">男性</option>
                                    <option value="female">女性</option>
                                    <option value="neutral">中性</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">生成數量</label>
                                <select class="form-select" id="nameCount">
                                    <option value="5">5個</option>
                                    <option value="8" selected>8個</option>
                                    <option value="12">12個</option>
                                </select>
                            </div>
                            <button class="btn btn-primary btn-lg" style="width:100%;" onclick="generateNames()">✨ 生成名字</button>
                        </div>
                    </div>
                    <div class="card">
                        <div class="card-header"><h3>📋 生成結果</h3><button class="btn btn-sm btn-ghost" onclick="document.getElementById('nameResults').innerHTML='<div class=\'empty-state\'><div class=\'empty-icon\'>🔤</div><h3>等待生成</h3></div>'">清除</button></div>
                        <div class="card-body" id="nameResults">
                            <div class="empty-state"><div class="empty-icon">🔤</div><h3>等待生成</h3><p>設定參數後點擊生成</p></div>
                        </div>
                    </div>
                </div>
            `;
            break;
        }

        case 'continue': {
            if (!requireAuth()) return;
            try {
                const data = await api('/stories/user/mine');
                c.innerHTML = `
                    <h2 style="font-size:1.5rem;font-weight:800;margin-bottom:0.5rem;">🤖 AI續寫助手</h2>
                    <p class="text-muted mb-3">選擇一個故事，AI將從結尾處繼續創作</p>
                    <div class="card">
                        <div class="card-body">
                            <div class="form-group">
                                <label class="form-label">選擇故事</label>
                                <select class="form-select" id="continueStoryId">
                                    <option value="">-- 選擇故事 --</option>
                                    ${data.stories.map(s => `<option value="${s.id}">${esc(s.title)} (${s.word_count}字)</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">續寫方向</label>
                                <select class="form-select" id="continueDirection">
                                    <option value="auto">自動（根據故事類型）</option>
                                    <option value="tension">增加緊張感</option>
                                    <option value="romance">加入感情線</option>
                                    <option value="mystery">加入懸念</option>
                                    <option value="action">加入動作場景</option>
                                </select>
                            </div>
                            <button class="btn btn-primary btn-lg" style="width:100%;" onclick="aiContinueStory()">🤖 AI續寫</button>
                        </div>
                    </div>
                    <div id="continueResult" class="mt-3"></div>
                `;
            } catch (err) { c.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h3>載入失敗</h3></div>`; }
            break;
        }

        case 'reading-list': {
            if (!requireAuth()) return;
            try {
                const data = await api('/tools/reading-lists');
                c.innerHTML = `
                    <div class="flex justify-between items-center mb-3">
                        <div><h2 style="font-size:1.5rem;font-weight:800;">🔖 閱讀清單</h2><p class="text-muted">管理你收藏的故事</p></div>
                        <button class="btn btn-primary" onclick="createReadingList()">+ 新建清單</button>
                    </div>
                    ${data.lists.length === 0 ? '<div class="empty-state"><div class="empty-icon">🔖</div><h3>暫無閱讀清單</h3><p>創建一個清單來收藏你喜歡的故事</p></div>' : 
                    `<div class="grid grid-2">
                    ${data.lists.map(l => `
                        <div class="card" style="cursor:pointer;" onclick="loadReadingList(${l.id})">
                            <div class="card-body">
                                <h3 style="font-weight:700;">📚 ${esc(l.name)}</h3>
                                ${l.description ? `<p style="font-size:0.85rem;color:var(--dark-light);">${esc(l.description)}</p>` : ''}
                                <div class="flex justify-between items-center mt-1">
                                    <span class="tag tag-primary">${l.item_count} 個故事</span>
                                    <span style="font-size:0.8rem;color:var(--gray);">${timeAgo(l.created_at)}</span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                    </div>`}
                    <div id="readingListDetail" class="mt-3"></div>
                `;
            } catch (err) { c.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h3>載入失敗</h3></div>`; }
            break;
        }

        case 'analytics': {
            if (!requireAuth()) return;
            try {
                const data = await api('/stories/user/mine');
                c.innerHTML = `
                    <h2 style="font-size:1.5rem;font-weight:800;margin-bottom:0.5rem;">📊 故事數據分析</h2>
                    <p class="text-muted mb-3">查看你的故事的詳細數據</p>
                    <div class="form-group">
                        <label class="form-label">選擇故事</label>
                        <select class="form-select" id="analyticsStoryId" onchange="loadStoryAnalytics()">
                            <option value="">-- 選擇故事 --</option>
                            ${data.stories.map(s => `<option value="${s.id}">${esc(s.title)}</option>`).join('')}
                        </select>
                    </div>
                    <div id="analyticsResult"></div>
                `;
            } catch (err) { c.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h3>載入失敗</h3></div>`; }
            break;
        }

        case 'export': {
            if (!requireAuth()) return;
            try {
                const data = await api('/stories/user/mine');
                c.innerHTML = `
                    <h2 style="font-size:1.5rem;font-weight:800;margin-bottom:0.5rem;">📥 導出工具</h2>
                    <p class="text-muted mb-3">將你的故事匯出為不同格式</p>
                    <div class="card">
                        <div class="card-body">
                            <div class="form-group">
                                <label class="form-label">選擇故事</label>
                                <select class="form-select" id="exportStoryId">
                                    <option value="">-- 選擇故事 --</option>
                                    ${data.stories.map(s => `<option value="${s.id}">${esc(s.title)}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">匯出格式</label>
                                <div class="grid grid-2">
                                    <div class="card" style="cursor:pointer;" onclick="exportStory('txt')">
                                        <div class="card-body text-center">
                                            <div style="font-size:2rem;">📄</div>
                                            <div style="font-weight:700;">TXT 純文字</div>
                                            <div style="font-size:0.8rem;color:var(--gray);">適合閱讀和分享</div>
                                        </div>
                                    </div>
                                    <div class="card" style="cursor:pointer;" onclick="exportStory('json')">
                                        <div class="card-body text-center">
                                            <div style="font-size:2rem;">📋</div>
                                            <div style="font-weight:700;">JSON 數據</div>
                                            <div style="font-size:0.8rem;color:var(--gray);">包含結構化數據</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            } catch (err) { c.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h3>載入失敗</h3></div>`; }
            break;
        }

        case 'preferences': {
            if (!requireAuth()) return;
            try {
                const data = await api('/tools/preferences');
                const p = data.preferences;
                c.innerHTML = `
                    <h2 style="font-size:1.5rem;font-weight:800;margin-bottom:0.5rem;">⚙️ 個人設定</h2>
                    <p class="text-muted mb-3">自定義你的創作環境</p>
                    <div class="grid grid-2">
                        <div class="card">
                            <div class="card-header"><h3>🎨 外觀設定</h3></div>
                            <div class="card-body">
                                <div class="form-group">
                                    <label class="form-label">主題</label>
                                    <select class="form-select" id="prefTheme">
                                        <option value="light" ${p.theme==='light'?'selected':''}>☀️ 淺色模式</option>
                                        <option value="dark" ${p.theme==='dark'?'selected':''}>🌙 暗黑模式</option>
                                        <option value="auto" ${p.theme==='auto'?'selected':''}>🔄 跟隨系統</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">字體大小</label>
                                    <select class="form-select" id="prefFontSize">
                                        <option value="small" ${p.font_size==='small'?'selected':''}>小</option>
                                        <option value="medium" ${p.font_size==='medium'?'selected':''}>中</option>
                                        <option value="large" ${p.font_size==='large'?'selected':''}>大</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">編輯器字體</label>
                                    <select class="form-select" id="prefEditorFont">
                                        <option value="sans" ${p.editor_font==='sans'?'selected':''}>無襯線體</option>
                                        <option value="serif" ${p.editor_font==='serif'?'selected':''}>襯線體</option>
                                        <option value="mono" ${p.editor_font==='mono'?'selected':''}>等寬字體</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div class="card">
                            <div class="card-header"><h3>🔔 通知設定</h3></div>
                            <div class="card-body">
                                <div class="form-group">
                                    <label class="form-label">
                                        <input type="checkbox" id="prefEmailNotif" ${p.email_notifications?'checked':''}> 電子郵件通知
                                    </label>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">
                                        <input type="checkbox" id="prefAutoSave" ${p.auto_save?'checked':''}> 自動儲存
                                    </label>
                                </div>
                                <button class="btn btn-primary" onclick="savePreferences()">保存設定</button>
                            </div>
                        </div>
                    </div>
                `;
            } catch (err) { c.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h3>載入失敗</h3></div>`; }
            break;
        }
    }
}

// Tool functions
async function useStoryTemplate(id) {
    if (!requireAuth()) return;
    try {
        const data = await api(`/tools/story-templates/${id}`);
        const t = data.template;
        router.navigate('dashboard');
        setTimeout(() => {
            showDashTab('create');
            setTimeout(() => {
                if (document.getElementById('newStoryTitle')) document.getElementById('newStoryTitle').value = '';
                if (document.getElementById('newStoryGenre')) document.getElementById('newStoryGenre').value = t.genre || '';
                if (document.getElementById('newStoryTone')) document.getElementById('newStoryTone').value = t.tone || '';
                if (document.getElementById('newStoryAudience')) document.getElementById('newStoryAudience').value = t.target_audience || '';
                if (document.getElementById('newStoryContent')) document.getElementById('newStoryContent').value = t.opening || '';
                showToast(`已載入模板：${t.name}`, 'success');
            }, 200);
        }, 200);
    } catch (err) { showToast(err.message, 'error'); }
}

async function filterWritingPrompts(type) {
    try {
        const data = await api(`/tools/writing-prompts?type=${type}&limit=10`);
        const typeIcons = { opening: '📝', character: '👤', conflict: '⚔️', world: '🌍', dialogue: '💬', twist: '🔄', ending: '🏁' };
        const typeNames = { opening: '開頭', character: '角色', conflict: '衝突', world: '世界觀', dialogue: '對話', twist: '反轉', ending: '結局' };
        const container = document.querySelector('#toolContent .grid');
        if (container) {
            container.innerHTML = data.prompts.map(p => `
                <div class="card">
                    <div class="card-body">
                        <span class="tag tag-primary">${typeIcons[p.prompt_type] || '💡'} ${typeNames[p.prompt_type] || p.prompt_type}</span>
                        <p style="font-size:1rem;line-height:1.7;margin-top:0.75rem;">${p.content}</p>
                    </div>
                </div>
            `).join('');
        }
    } catch (err) { showToast(err.message, 'error'); }
}

async function generateNames() {
    const nameType = document.getElementById('nameType').value;
    const genre = document.getElementById('nameGenre').value;
    const gender = document.getElementById('nameGender')?.value;
    const count = parseInt(document.getElementById('nameCount').value);

    try {
        const data = await api('/tools/generate-names', { method: 'POST', body: { name_type: nameType, genre, gender, count } });
        const typeEmoji = { character: '👤', place: '📍', organization: '🏛️', item: '⚔️' };
        document.getElementById('nameResults').innerHTML = `
            <div class="mb-2">
                <span class="tag tag-primary">${typeEmoji[nameType]} ${nameType}</span>
                <span class="tag tag-success">${genre}</span>
            </div>
            <div class="grid grid-2" style="gap:0.5rem;">
            ${data.names.map(n => `
                <div class="flex items-center justify-between" style="padding:10px 14px;background:var(--light);border-radius:8px;">
                    <span style="font-weight:600;">${n}</span>
                    <button class="btn btn-sm btn-ghost" onclick="copyToClipboard('${n}')">📋</button>
                </div>
            `).join('')}
            </div>
            <button class="btn btn-sm btn-ghost mt-2" onclick="generateNames()">🔄 重新生成</button>
        `;
    } catch (err) { showToast(err.message, 'error'); }
}

async function aiContinueStory() {
    const storyId = document.getElementById('continueStoryId').value;
    if (!storyId) { showToast('請選擇一個故事', 'warning'); return; }

    const resultDiv = document.getElementById('continueResult');
    resultDiv.innerHTML = '<div class="card"><div class="card-body text-center"><div class="spinner" style="margin:0 auto;"></div><p class="mt-2">AI正在續寫...</p></div></div>';

    try {
        const data = await api(`/tools/stories/${storyId}/continue`, { method: 'POST', body: { direction: document.getElementById('continueDirection').value } });
        resultDiv.innerHTML = `
            <div class="card">
                <div class="card-header"><h3>✨ 續寫結果</h3></div>
                <div class="card-body">
                    <div style="font-size:0.85rem;color:var(--gray);margin-bottom:0.75rem;">上下文（故事最後部分）：</div>
                    <div style="font-size:0.9rem;color:var(--dark-light);font-style:italic;margin-bottom:1rem;padding:1rem;background:var(--light);border-radius:8px;">${esc(data.context)}...</div>
                    <div style="font-size:0.85rem;color:var(--gray);margin-bottom:0.75rem;">AI續寫：</div>
                    <div style="font-size:1rem;line-height:1.8;">${esc(data.continuation)}</div>
                    <div class="flex gap-2 mt-2">
                        <button class="btn btn-primary" onclick="appendContinuation(${storyId})">📝 添加到故事末尾</button>
                        <button class="btn btn-ghost" onclick="copyToClipboard('${data.continuation.replace(/'/g, "\\'")}')">📋 複製</button>
                        <button class="btn btn-ghost" onclick="aiContinueStory()">🔄 重新生成</button>
                    </div>
                </div>
            </div>
        `;
    } catch (err) { resultDiv.innerHTML = `<div class="card"><div class="card-body text-center" style="color:var(--danger);">❌ ${err.message}</div></div>`; }
}

async function appendContinuation(storyId) {
    try {
        const storyData = await api(`/stories/${storyId}`);
        const continuation = document.querySelector('#continueResult .card-body > div:last-of-type')?.textContent || '';
        const newContent = storyData.story.content + continuation;
        await api(`/stories/${storyId}`, { method: 'PUT', body: { content: newContent } });
        showToast('續寫已添加到故事末尾！', 'success');
    } catch (err) { showToast(err.message, 'error'); }
}

async function loadReadingList(listId) {
    try {
        const data = await api(`/tools/reading-lists/${listId}`);
        document.getElementById('readingListDetail').innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3>📚 ${esc(data.list.name)}</h3>
                    <button class="btn btn-sm btn-ghost" onclick="document.getElementById('readingListDetail').innerHTML=''">✕</button>
                </div>
                <div class="card-body">
                    ${data.items.length === 0 ? '<p class="text-muted">清單中暫無故事</p>' :
                    data.items.map(item => `
                        <div class="flex items-center gap-2 mb-2" style="cursor:pointer;" onclick="router.navigate('story',${item.story_id})">
                            <div style="font-size:1.5rem;">${item.category_icon || '📖'}</div>
                            <div style="flex:1;">
                                <div style="font-weight:700;">${esc(item.title)}</div>
                                <div style="font-size:0.8rem;color:var(--gray);">${esc(item.display_name || item.username)} · ${item.word_count}字 · 👁${item.view_count} · ❤️${item.like_count}</div>
                            </div>
                            <button class="btn btn-sm btn-ghost" onclick="event.stopPropagation();removeFromReadingList(${listId},${item.story_id})" style="color:var(--danger);">🗑️</button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    } catch (err) { showToast(err.message, 'error'); }
}

async function createReadingList() {
    const name = prompt('輸入閱讀清單名稱：');
    if (!name) return;
    try {
        await api('/tools/reading-lists', { method: 'POST', body: { name } });
        showToast('閱讀清單已創建', 'success');
        showToolTab('reading-list');
    } catch (err) { showToast(err.message, 'error'); }
}

async function removeFromReadingList(listId, storyId) {
    try {
        await api(`/tools/reading-lists/${listId}/items/${storyId}`, { method: 'DELETE' });
        showToast('已移除', 'success');
        loadReadingList(listId);
    } catch (err) { showToast(err.message, 'error'); }
}

async function loadStoryAnalytics() {
    const storyId = document.getElementById('analyticsStoryId').value;
    if (!storyId) return;
    try {
        const data = await api(`/tools/stories/${storyId}/analytics`);
        const s = data.stats;
        document.getElementById('analyticsResult').innerHTML = `
            <div class="stat-cards">
                <div class="stat-card"><div class="stat-card-icon purple">👁</div><div class="stat-card-info"><h3>${formatNum(s.views)}</h3><p>總瀏覽</p></div></div>
                <div class="stat-card"><div class="stat-card-icon green">❤️</div><div class="stat-card-info"><h3>${formatNum(s.likes)}</h3><p>總讚數</p></div></div>
                <div class="stat-card"><div class="stat-card-icon orange">💬</div><div class="stat-card-info"><h3>${s.comments}</h3><p>評論數</p></div></div>
                <div class="stat-card"><div class="stat-card-icon blue">🔖</div><div class="stat-card-info"><h3>${s.bookmarks}</h3><p>收藏數</p></div></div>
            </div>
            <div class="grid grid-2 mt-3">
                <div class="card">
                    <div class="card-header"><h3>📈 互動指標</h3></div>
                    <div class="card-body">
                        <div class="flex justify-between mb-1"><span>互動率</span><strong style="color:${s.engagement_rate > 5 ? 'var(--success)' : 'var(--warning)'};">${s.engagement_rate}%</strong></div>
                        <div class="flex justify-between mb-1"><span>點讚率</span><strong>${s.like_rate}%</strong></div>
                        <div class="flex justify-between mb-1"><span>字數</span><strong>${s.word_count}</strong></div>
                        <div class="flex justify-between mb-1"><span>章節數</span><strong>${s.chapter_count}</strong></div>
                        <div class="flex justify-between mb-1"><span>角色數</span><strong>${s.character_count}</strong></div>
                        <div class="flex justify-between mb-1"><span>狀態</span><span class="tag tag-success">${data.status}</span></div>
                        <div class="flex justify-between mb-1"><span>AI生成</span><span>${data.is_ai_generated ? '🤖 是' : '✍️ 否'}</span></div>
                    </div>
                </div>
                <div class="card">
                    <div class="card-header"><h3>📑 章節字數分佈</h3></div>
                    <div class="card-body">
                        ${data.chapter_stats.length === 0 ? '<p class="text-muted">暫無章節數據</p>' :
                        `<div class="bar-chart">
                            ${data.chapter_stats.map(ch => {
                                const maxWC = Math.max(...data.chapter_stats.map(c => c.word_count));
                                const height = maxWC > 0 ? (ch.word_count / maxWC * 100) : 10;
                                return `<div class="bar" style="height:${Math.max(5, height)}%;"><div class="bar-value">${ch.word_count}</div><div class="bar-label">Ch.${ch.chapter_number}</div></div>`;
                            }).join('')}
                        </div>`}
                    </div>
                </div>
            </div>
            <div class="card mt-3">
                <div class="card-header"><h3>📋 版本歷史</h3><button class="btn btn-sm btn-primary" onclick="saveVersion(${storyId})">保存當前版本</button></div>
                <div class="card-body" id="versionHistory"><p class="text-muted">載入中...</p></div>
            </div>
        `;
        loadVersionHistory(storyId);
    } catch (err) { document.getElementById('analyticsResult').innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h3>載入失敗</h3></div>`; }
}

async function loadVersionHistory(storyId) {
    try {
        const data = await api(`/tools/stories/${storyId}/versions`);
        const container = document.getElementById('versionHistory');
        if (!container) return;
        if (data.versions.length === 0) {
            container.innerHTML = '<p class="text-muted">暫無版本記錄。點擊「保存當前版本」創建第一個版本。</p>';
            return;
        }
        container.innerHTML = data.versions.map(v => `
            <div class="flex items-center justify-between mb-1" style="padding:8px 0;border-bottom:1px solid var(--gray-light);">
                <div>
                    <strong>v${v.version_number}</strong>
                    <span class="text-muted" style="margin-left:8px;">${esc(v.change_note || '')}</span>
                </div>
                <div class="flex items-center gap-2">
                    <span style="font-size:0.8rem;color:var(--gray);">${timeAgo(v.created_at)}</span>
                    <button class="btn btn-sm btn-ghost" onclick="restoreVersion(${storyId},${v.id})">恢復</button>
                </div>
            </div>
        `).join('');
    } catch (e) {}
}

async function saveVersion(storyId) {
    const note = prompt('版本說明（可選）：');
    try {
        await api(`/tools/stories/${storyId}/versions`, { method: 'POST', body: { change_note: note || '' } });
        showToast('版本已保存', 'success');
        loadVersionHistory(storyId);
    } catch (err) { showToast(err.message, 'error'); }
}

async function restoreVersion(storyId, versionId) {
    if (!confirm('確定要恢復到此版本嗎？當前內容會先備份。')) return;
    try {
        await api(`/tools/stories/${storyId}/versions/${versionId}/restore`, { method: 'POST' });
        showToast('版本已恢復', 'success');
    } catch (err) { showToast(err.message, 'error'); }
}

function exportStory(format) {
    const storyId = document.getElementById('exportStoryId').value;
    if (!storyId) { showToast('請選擇一個故事', 'warning'); return; }
    window.open(`/api/tools/stories/${storyId}/export?format=${format}`, '_blank');
    showToast('正在導出...', 'info');
}

async function savePreferences() {
    try {
        await api('/tools/preferences', { method: 'PUT', body: {
            theme: document.getElementById('prefTheme').value,
            font_size: document.getElementById('prefFontSize').value,
            editor_font: document.getElementById('prefEditorFont').value,
            email_notifications: document.getElementById('prefEmailNotif').checked,
            auto_save: document.getElementById('prefAutoSave').checked,
        }});
        showToast('設定已保存', 'success');
    } catch (err) { showToast(err.message, 'error'); }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => showToast('已複製', 'success')).catch(() => {
        const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); showToast('已複製', 'success');
    });
}

// ============================================
// Camera Language Page
// ============================================
let cameraData = { movements: [], sizes: [], angles: [], transitions: [], templates: [] };
let composeSelection = { shot_size_id: null, angle_id: null, movement_id: null };

async function loadCameraPage() {
    try {
        const [movRes, sizeRes, angleRes, transRes, tplRes] = await Promise.all([
            api('/camera/movements'),
            api('/camera/shot-sizes'),
            api('/camera/angles'),
            api('/camera/transitions'),
            api('/camera/language-templates')
        ]);
        cameraData.movements = movRes.movements;
        cameraData.sizes = sizeRes.sizes;
        cameraData.angles = angleRes.angles;
        cameraData.transitions = transRes.transitions;
        cameraData.templates = tplRes.templates;
    } catch (e) {}
    showCameraTab('cam-movements', document.querySelector('#cameraTabs .tab.active'));
}

function showCameraTab(tabId, btn) {
    document.querySelectorAll('#cameraTabs .tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    const c = document.getElementById('cameraContent');

    switch (tabId) {
        case 'cam-movements': {
            const categories = {
                'basic': { name: '基礎運鏡', icon: '📷', desc: '最常用的基礎鏡頭運動' },
                'dynamic': { name: '動態運鏡', icon: '🏃', desc: '帶有移動和追蹤的動態鏡頭' },
                'complex': { name: '複合運鏡', icon: '🌀', desc: '多種運動組合的複雜鏡頭' },
                'aerial': { name: '空中運鏡', icon: '🚁', desc: '無人機和空中拍攝鏡頭' },
                'special': { name: '特殊運鏡', icon: '✨', desc: '特殊效果和創意鏡頭' },
            };
            let html = '';
            for (const [cat, info] of Object.entries(categories)) {
                const items = cameraData.movements.filter(m => m.category === cat);
                if (items.length === 0) continue;
                html += `
                <div class="mb-3">
                    <h2 style="font-size:1.5rem;font-weight:800;margin-bottom:0.5rem;">${info.icon} ${info.name}</h2>
                    <p class="text-muted mb-2">${info.desc}</p>
                    <div class="grid grid-3">
                    ${items.map(m => `
                        <div class="card" style="cursor:pointer;" onclick="showMovementDetail(${m.id})">
                            <div class="card-body">
                                <div class="flex justify-between items-center mb-1">
                                    <span style="font-size:1.5rem;">${m.icon}</span>
                                    <span class="tag tag-primary" style="font-size:0.7rem;">難度 ${'⭐'.repeat(m.difficulty)}</span>
                                </div>
                                <h3 style="font-size:1.1rem;font-weight:700;margin-bottom:0.25rem;">${m.name_zh}</h3>
                                <p style="font-size:0.8rem;color:var(--primary);font-weight:600;margin-bottom:0.5rem;">${m.name_en}</p>
                                <p style="font-size:0.85rem;color:var(--dark-light);line-height:1.5;">${m.description}</p>
                                <div style="margin-top:0.75rem;">
                                    <div style="font-size:0.75rem;color:var(--gray);text-transform:uppercase;letter-spacing:0.5px;">適用場景</div>
                                    <p style="font-size:0.8rem;color:var(--dark-light);">${m.use_case}</p>
                                </div>
                                <div style="margin-top:0.5rem;">
                                    <div style="font-size:0.75rem;color:var(--gray);text-transform:uppercase;letter-spacing:0.5px;">英文提示詞</div>
                                    <div class="prompt-text" style="font-size:0.75rem;padding:0.75rem;margin-top:4px;">${m.english_prompt}<button class="copy-btn" onclick="event.stopPropagation();copyText(this)">📋</button></div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                    </div>
                </div>`;
            }
            c.innerHTML = html;
            break;
        }

        case 'cam-sizes': {
            c.innerHTML = `
                <h2 style="font-size:1.5rem;font-weight:800;margin-bottom:1rem;">📐 景別（Shot Size）</h2>
                <p class="text-muted mb-3">景別決定觀眾與主體的距離感，直接影響情緒和敘事效果</p>
                <div class="grid grid-2">
                ${cameraData.sizes.map(s => `
                    <div class="card">
                        <div class="card-body">
                            <div class="flex gap-2 items-start">
                                <span style="font-size:2rem;">${s.icon}</span>
                                <div style="flex:1;">
                                    <h3 style="font-weight:700;">${s.name_zh} <span style="color:var(--primary);font-size:0.9rem;">(${s.name_en})</span></h3>
                                    ${s.abbreviation ? `<span class="tag tag-primary" style="font-size:0.7rem;">${s.abbreviation}</span>` : ''}
                                    <p style="font-size:0.9rem;color:var(--dark-light);margin-top:0.5rem;line-height:1.6;">${s.description}</p>
                                    <div class="grid grid-2" style="margin-top:0.75rem;gap:0.75rem;">
                                        <div><div style="font-size:0.75rem;color:var(--gray);font-weight:600;">構圖說明</div><p style="font-size:0.85rem;">${s.framing}</p></div>
                                        <div><div style="font-size:0.75rem;color:var(--gray);font-weight:600;">情感影響</div><p style="font-size:0.85rem;">${s.emotional_impact}</p></div>
                                    </div>
                                    <div style="margin-top:0.5rem;">
                                        <div style="font-size:0.75rem;color:var(--gray);font-weight:600;">英文提示詞</div>
                                        <div class="prompt-text" style="font-size:0.8rem;padding:0.75rem;margin-top:4px;">${s.english_prompt}<button class="copy-btn" onclick="copyText(this)">📋</button></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
                </div>
            `;
            break;
        }

        case 'cam-angles': {
            c.innerHTML = `
                <h2 style="font-size:1.5rem;font-weight:800;margin-bottom:1rem;">📐 鏡頭角度（Camera Angle）</h2>
                <p class="text-muted mb-3">鏡頭角度影響觀眾對角色的心理感知，是鏡頭語言的核心元素</p>
                <div class="grid grid-2">
                ${cameraData.angles.map(a => `
                    <div class="card">
                        <div class="card-body">
                            <div class="flex gap-2 items-start">
                                <span style="font-size:2rem;">${a.icon}</span>
                                <div style="flex:1;">
                                    <h3 style="font-weight:700;">${a.name_zh} <span style="color:var(--primary);font-size:0.9rem;">(${a.name_en})</span></h3>
                                    <p style="font-size:0.9rem;color:var(--dark-light);margin-top:0.5rem;">${a.description}</p>
                                    <div class="grid grid-2" style="margin-top:0.75rem;gap:0.75rem;">
                                        <div><div style="font-size:0.75rem;color:var(--gray);font-weight:600;">🧠 心理效果</div><p style="font-size:0.85rem;">${a.psychological_effect}</p></div>
                                        <div><div style="font-size:0.75rem;color:var(--gray);font-weight:600;">🎬 適用場景</div><p style="font-size:0.85rem;">${a.use_case}</p></div>
                                    </div>
                                    <div style="margin-top:0.5rem;">
                                        <div style="font-size:0.75rem;color:var(--gray);font-weight:600;">英文提示詞</div>
                                        <div class="prompt-text" style="font-size:0.8rem;padding:0.75rem;margin-top:4px;">${a.english_prompt}<button class="copy-btn" onclick="copyText(this)">📋</button></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
                </div>
            `;
            break;
        }

        case 'cam-transitions': {
            c.innerHTML = `
                <h2 style="font-size:1.5rem;font-weight:800;margin-bottom:1rem;">🔄 轉場效果（Transitions）</h2>
                <p class="text-muted mb-3">轉場連接不同鏡頭，是影片節奏和敘事流暢性的關鍵</p>
                <div class="grid grid-3">
                ${cameraData.transitions.map(t => `
                    <div class="card">
                        <div class="card-body">
                            <span style="font-size:1.5rem;">${t.icon}</span>
                            <h3 style="font-weight:700;margin-top:0.5rem;">${t.name_zh}</h3>
                            <p style="font-size:0.85rem;color:var(--primary);">${t.name_en}</p>
                            <p style="font-size:0.85rem;color:var(--dark-light);margin-top:0.5rem;">${t.description}</p>
                            <div style="margin-top:0.5rem;"><div style="font-size:0.75rem;color:var(--gray);">技術</div><p style="font-size:0.85rem;">${t.technique}</p></div>
                            <div style="margin-top:0.5rem;"><div style="font-size:0.75rem;color:var(--gray);">適合情緒</div><p style="font-size:0.85rem;">${t.mood}</p></div>
                            <div class="prompt-text" style="font-size:0.75rem;padding:0.75rem;margin-top:0.5rem;">${t.english_prompt}<button class="copy-btn" onclick="copyText(this)">📋</button></div>
                        </div>
                    </div>
                `).join('')}
                </div>
            `;
            break;
        }

        case 'cam-compose': {
            c.innerHTML = `
                <h2 style="font-size:1.5rem;font-weight:800;margin-bottom:1rem;">🔧 自定義鏡頭語言組合</h2>
                <p class="text-muted mb-3">選擇景別、角度、運鏡方式，自動組合成專業的鏡頭語言提示詞</p>
                <div class="grid grid-2" style="gap:2rem;">
                    <div>
                        <div class="card mb-3">
                            <div class="card-header"><h3>📐 選擇景別</h3></div>
                            <div class="card-body">
                                <div class="grid grid-2" style="gap:0.5rem;">
                                    ${cameraData.sizes.map(s => `
                                        <div class="template-card" data-type="size" data-id="${s.id}" onclick="toggleComposeSelect('size',${s.id},this)">
                                            <div style="font-size:1.2rem;">${s.icon}</div>
                                            <div style="font-size:0.8rem;font-weight:700;">${s.name_zh}</div>
                                            <div style="font-size:0.7rem;color:var(--gray);">${s.name_en}</div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                        <div class="card mb-3">
                            <div class="card-header"><h3>📐 選擇角度</h3></div>
                            <div class="card-body">
                                <div class="grid grid-2" style="gap:0.5rem;">
                                    ${cameraData.angles.map(a => `
                                        <div class="template-card" data-type="angle" data-id="${a.id}" onclick="toggleComposeSelect('angle',${a.id},this)">
                                            <div style="font-size:1.2rem;">${a.icon}</div>
                                            <div style="font-size:0.8rem;font-weight:700;">${a.name_zh}</div>
                                            <div style="font-size:0.7rem;color:var(--gray);">${a.name_en}</div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                        <div class="card">
                            <div class="card-header"><h3>🎥 選擇運鏡</h3></div>
                            <div class="card-body">
                                <div class="grid grid-3" style="gap:0.5rem;">
                                    ${cameraData.movements.map(m => `
                                        <div class="template-card" data-type="movement" data-id="${m.id}" onclick="toggleComposeSelect('movement',${m.id},this)">
                                            <div style="font-size:1.2rem;">${m.icon}</div>
                                            <div style="font-size:0.75rem;font-weight:700;">${m.name_zh}</div>
                                            <div style="font-size:0.65rem;color:var(--gray);">${m.name_en}</div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <div class="card mb-3">
                            <div class="card-header"><h3>📝 場景描述</h3></div>
                            <div class="card-body">
                                <div class="form-group">
                                    <textarea class="form-textarea" id="composeScene" placeholder="描述場景內容，例如：一位身穿盔甲的騎士站在山頂，風吹動他的披風..."></textarea>
                                </div>
                                <div class="grid grid-2">
                                    <div class="form-group">
                                        <label class="form-label">視覺風格</label>
                                        <select class="form-select" id="composeStyle">
                                            <option value="cinematic">🎬 電影級</option>
                                            <option value="anime">🎌 動漫</option>
                                            <option value="photorealistic">📸 寫實</option>
                                            <option value="dark fantasy">🌑 暗黑奇幻</option>
                                            <option value="cyberpunk">🤖 賽博朋克</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label">情緒</label>
                                        <select class="form-select" id="composeMood">
                                            <option value="epic">⚡ 史詩</option>
                                            <option value="mysterious">🔮 神秘</option>
                                            <option value="serene">🕊️ 寧靜</option>
                                            <option value="intense">💥 緊張</option>
                                            <option value="melancholic">🌧️ 憂鬱</option>
                                        </select>
                                    </div>
                                </div>
                                <button class="btn btn-primary btn-lg" style="width:100%;" onclick="composeCameraLanguage()">✨ 組合生成提示詞</button>
                            </div>
                        </div>
                        <div class="card">
                            <div class="card-header"><h3>📋 生成結果</h3></div>
                            <div class="card-body" id="composeResult">
                                <div class="empty-state" style="padding:2rem;">
                                    <div class="empty-icon">🎬</div>
                                    <h3>選擇鏡頭元素後生成</h3>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            break;
        }

        case 'cam-templates': {
            const genres = [...new Set(cameraData.templates.map(t => t.genre))];
            c.innerHTML = `
                <h2 style="font-size:1.5rem;font-weight:800;margin-bottom:1rem;">🎬 場景鏡頭語言模板</h2>
                <p class="text-muted mb-3">針對不同場景類型預設的專業鏡頭語言組合</p>
                <div class="flex gap-1 flex-wrap mb-3">
                    <button class="btn btn-sm btn-primary" onclick="filterCameraTemplates(null,this)">全部</button>
                    ${genres.map(g => `<button class="btn btn-sm btn-ghost" onclick="filterCameraTemplates('${g}',this)">${g}</button>`).join('')}
                </div>
                <div class="grid grid-2" id="cameraTemplatesGrid">
                ${cameraData.templates.map(t => `
                    <div class="card" data-genre="${t.genre}">
                        <div class="card-body">
                            <div class="flex justify-between items-center mb-1">
                                <h3 style="font-weight:700;">${t.name}</h3>
                                <span class="tag tag-primary">${t.genre}</span>
                            </div>
                            <p style="font-size:0.9rem;color:var(--dark-light);margin-bottom:0.75rem;">${t.description}</p>
                            <div style="font-size:0.8rem;margin-bottom:0.5rem;">
                                <strong>鏡頭設計：</strong>${t.full_description}
                            </div>
                            <div class="prompt-text" style="font-size:0.8rem;">${t.english_prompt}<button class="copy-btn" onclick="copyText(this)">📋</button></div>
                            ${t.example_scene ? `<div style="margin-top:0.75rem;font-size:0.8rem;color:var(--gray);"><strong>示例：</strong>${t.example_scene}</div>` : ''}
                        </div>
                    </div>
                `).join('')}
                </div>
            `;
            break;
        }
    }
}

function toggleComposeSelect(type, id, el) {
    const key = type + '_id';
    if (composeSelection[key] === id) {
        composeSelection[key] = null;
        el.classList.remove('active');
    } else {
        // Remove active from siblings
        document.querySelectorAll(`[data-type="${type}"]`).forEach(e => e.classList.remove('active'));
        composeSelection[key] = id;
        el.classList.add('active');
    }
}

async function composeCameraLanguage() {
    const scene = document.getElementById('composeScene').value.trim();
    const style = document.getElementById('composeStyle').value;
    const mood = document.getElementById('composeMood').value;

    if (!composeSelection.shot_size_id && !composeSelection.angle_id && !composeSelection.movement_id) {
        showToast('請至少選擇一個鏡頭元素', 'warning');
        return;
    }

    try {
        const data = await api('/camera/compose', {
            method: 'POST',
            body: { ...composeSelection, scene_description: scene, style, mood }
        });

        document.getElementById('composeResult').innerHTML = `
            <div class="mb-2">
                <div style="font-size:0.85rem;color:var(--gray);margin-bottom:0.5rem;">鏡頭組合：${data.zh_description || '自定義'}</div>
                <div class="prompt-text" style="font-size:0.85rem;">${data.full_prompt}<button class="copy-btn" onclick="copyText(this)">📋 複製</button></div>
            </div>
            <button class="btn btn-sm btn-ghost" onclick="useInPromptGenerator('${data.full_prompt.replace(/'/g, "\\'")}')">📝 用於提示詞生成器</button>
        `;
    } catch (err) { showToast(err.message, 'error'); }
}

function useInPromptGenerator(prompt) {
    router.navigate('prompts');
    setTimeout(() => {
        document.getElementById('promptScene').value = prompt;
    }, 300);
}

function filterCameraTemplates(genre, btn) {
    document.querySelectorAll('#page-camera .btn-sm').forEach(b => b.classList.remove('btn-primary'));
    btn.classList.add('btn-primary');
    document.querySelectorAll('#cameraTemplatesGrid .card').forEach(card => {
        if (!genre || card.dataset.genre === genre) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
}

function showMovementDetail(id) {
    const m = cameraData.movements.find(m => m.id === id);
    if (!m) return;
    // Just highlight the card - detailed info is already shown
}

// ============================================
// Init
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    // Check for story URL param
    const urlParams = new URLSearchParams(window.location.search);
    const storyId = urlParams.get('story');
    if (storyId) { router.navigate('story', parseInt(storyId)); }
    else { router.navigate('home'); }
});
