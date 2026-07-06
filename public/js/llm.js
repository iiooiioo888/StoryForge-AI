// ============================================
// LLM AI Generation Functions
// ============================================

let llmConfigured = false;

async function checkLLMStatus() {
    try {
        const data = await api('/llm/status');
        llmConfigured = data.configured.length > 0;
        return data;
    } catch (e) {
        llmConfigured = false;
        return { providers: [], configured: [], default: 'openai' };
    }
}

async function saveLLMConfig(provider) {
    const keyInput = document.getElementById(`llmKey_${provider}`);
    const urlInput = document.getElementById(`llmUrl_${provider}`);
    const apiKey = keyInput?.value?.trim();
    const baseUrl = urlInput?.value?.trim();

    if (!apiKey && provider !== 'custom') {
        showToast('請輸入 API Key', 'warning');
        return;
    }

    try {
        await api('/llm/configure', { method: 'POST', body: { provider, apiKey, baseUrl } });
        showToast(`${provider} 配置已保存！`, 'success');
        checkLLMStatus();
        // Refresh the config page
        showDashTab('llm-config');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function showAITask(task) {
    const area = document.getElementById('aiTaskArea');
    if (!area) return;

    switch (task) {
        case 'full-story':
            area.innerHTML = `
                <div class="card">
                    <div class="card-header"><h3>📖 LLM 一鍵生成故事</h3><span class="tag tag-primary">35 積分</span></div>
                    <div class="card-body">
                        <div class="grid grid-2">
                            <div class="form-group"><label class="form-label">故事類型</label>
                                <select class="form-select" id="llmGenre">${categories.map(c => `<option value="${c.name}">${c.icon} ${c.name}</option>`).join('')}</select>
                            </div>
                            <div class="form-group"><label class="form-label">語調風格</label>
                                <select class="form-select" id="llmTone"><option>史詩壯闊</option><option>輕鬆幽默</option><option>黑暗沉重</option><option>溫馨治癒</option><option>緊張懸疑</option><option>浪漫細膩</option><option>快意恩仇</option><option>黑色幽默</option></select>
                            </div>
                        </div>
                        <div class="form-group"><label class="form-label">核心想法 *</label><textarea class="form-textarea" id="llmIdea" placeholder="描述你想講的故事，越具體越好..." style="min-height:100px;"></textarea></div>
                        <div class="grid grid-2">
                            <div class="form-group"><label class="form-label">主角名稱（可選）</label><input type="text" class="form-input" id="llmCharName" placeholder="留空讓AI命名"></div>
                            <div class="form-group"><label class="form-label">目標字數</label><select class="form-select" id="llmWordCount"><option value="1000">1000字</option><option value="2000" selected>2000字</option><option value="3000">3000字</option></select></div>
                        </div>
                        <button class="btn btn-primary btn-lg" style="width:100%;" onclick="llmGenerateFullStory()">🚀 LLM 生成故事</button>
                    </div>
                </div>
            `;
            break;

        case 'outline':
            area.innerHTML = `
                <div class="card">
                    <div class="card-header"><h3>📋 LLM 生成故事大綱</h3><span class="tag tag-primary">15 積分</span></div>
                    <div class="card-body">
                        <div class="grid grid-2">
                            <div class="form-group"><label class="form-label">故事類型</label><select class="form-select" id="llmOutlineGenre">${categories.map(c => `<option value="${c.name}">${c.icon} ${c.name}</option>`).join('')}</select></div>
                            <div class="form-group"><label class="form-label">章節數</label><select class="form-select" id="llmOutlineChapters"><option value="3">3章</option><option value="5" selected>5章</option><option value="8">8章</option></select></div>
                        </div>
                        <div class="form-group"><label class="form-label">核心想法 *</label><textarea class="form-textarea" id="llmOutlineIdea" placeholder="你的故事靈感..." style="min-height:80px;"></textarea></div>
                        <button class="btn btn-primary btn-lg" style="width:100%;" onclick="llmGenerateOutline()">📋 生成大綱</button>
                    </div>
                </div>
            `;
            break;

        case 'video-prompt':
            area.innerHTML = `
                <div class="card">
                    <div class="card-header"><h3>🎬 LLM 影片提示詞生成</h3><span class="tag tag-primary">25 積分（從故事）/ 10 積分（從描述）</span></div>
                    <div class="card-body">
                        <div class="tabs mb-2">
                            <button class="tab active" onclick="showVideoPromptTab('from-story',this)">從故事生成</button>
                            <button class="tab" onclick="showVideoPromptTab('from-desc',this)">從描述生成</button>
                        </div>
                        <div id="videoPromptFromStory">
                            <div class="form-group"><label class="form-label">選擇故事</label><select class="form-select" id="llmVpStoryId"><option value="">-- 選擇 --</option></select></div>
                            <div class="grid grid-2">
                                <div class="form-group"><label class="form-label">場景數</label><select class="form-select" id="llmVpSceneCount"><option value="3">3</option><option value="5" selected>5</option><option value="8">8</option></select></div>
                                <div class="form-group"><label class="form-label">平台</label><select class="form-select" id="llmVpPlatform"><option value="general">通用</option><option value="sora">Sora</option><option value="runway">Runway</option><option value="kling">Kling</option></select></div>
                            </div>
                            <button class="btn btn-primary btn-lg" style="width:100%;" onclick="llmGenerateVideoPrompts()">🎬 LLM 生成影片提示詞</button>
                        </div>
                        <div id="videoPromptFromDesc" class="hidden">
                            <div class="form-group"><label class="form-label">場景描述 *</label><textarea class="form-textarea" id="llmVpScene" placeholder="描述你想要的場景..." style="min-height:80px;"></textarea></div>
                            <div class="grid grid-3">
                                <div class="form-group"><label class="form-label">風格</label><select class="form-select" id="llmVpStyle"><option>cinematic</option><option>anime</option><option>photorealistic</option></select></div>
                                <div class="form-group"><label class="form-label">情緒</label><select class="form-select" id="llmVpMood"><option>epic</option><option>mysterious</option><option>serene</option><option>intense</option></select></div>
                                <div class="form-group"><label class="form-label">平台</label><select class="form-select" id="llmVpPlatformDesc"><option value="general">通用</option><option value="sora">Sora</option><option value="runway">Runway</option></select></div>
                            </div>
                            <button class="btn btn-primary btn-lg" style="width:100%;" onclick="llmGenerateVideoPromptSingle()">🎬 生成提示詞</button>
                        </div>
                    </div>
                </div>
            `;
            // Load user stories
            loadUserStoriesForSelect('llmVpStoryId');
            break;

        case 'characters':
            area.innerHTML = `
                <div class="card">
                    <div class="card-header"><h3>👥 LLM 角色生成</h3><span class="tag tag-primary">10 積分</span></div>
                    <div class="card-body">
                        <div class="grid grid-2">
                            <div class="form-group"><label class="form-label">故事類型</label><select class="form-select" id="llmCharGenre">${categories.map(c => `<option value="${c.name}">${c.icon} ${c.name}</option>`).join('')}</select></div>
                            <div class="form-group"><label class="form-label">角色數量</label><select class="form-select" id="llmCharCount"><option value="1">1個</option><option value="3" selected>3個</option><option value="5">5個</option></select></div>
                        </div>
                        <div class="form-group"><label class="form-label">核心設定</label><textarea class="form-textarea" id="llmCharSetting" placeholder="例如：在一個魔法學院裡..." style="min-height:60px;"></textarea></div>
                        <button class="btn btn-primary btn-lg" style="width:100%;" onclick="llmGenerateCharacters()">👥 生成角色</button>
                    </div>
                </div>
            `;
            break;

        case 'world':
            area.innerHTML = `
                <div class="card">
                    <div class="card-header"><h3>🌍 LLM 世界觀生成</h3><span class="tag tag-primary">15 積分</span></div>
                    <div class="card-body">
                        <div class="grid grid-2">
                            <div class="form-group"><label class="form-label">類型</label><select class="form-select" id="llmWorldGenre">${categories.map(c => `<option value="${c.name}">${c.icon} ${c.name}</option>`).join('')}</select></div>
                            <div class="form-group"><label class="form-label">風格</label><select class="form-select" id="llmWorldStyle"><option>史詩</option><option>黑暗</option><option>輕鬆</option><option>寫實</option></select></div>
                        </div>
                        <div class="form-group"><label class="form-label">核心概念</label><textarea class="form-textarea" id="llmWorldConcept" placeholder="例如：一個以音樂為貨幣的世界..." style="min-height:60px;"></textarea></div>
                        <button class="btn btn-primary btn-lg" style="width:100%;" onclick="llmGenerateWorld()">🌍 生成世界觀</button>
                    </div>
                </div>
            `;
            break;

        case 'rewrite':
            area.innerHTML = `
                <div class="card">
                    <div class="card-header"><h3>✨ LLM 改寫/潤色</h3><span class="tag tag-primary">15 積分</span></div>
                    <div class="card-body">
                        <div class="form-group"><label class="form-label">原始內容</label><textarea class="form-textarea" id="llmRewriteContent" placeholder="貼上你要改寫的內容..." style="min-height:150px;"></textarea></div>
                        <div class="grid grid-2">
                            <div class="form-group"><label class="form-label">改寫類型</label><select class="form-select" id="llmRewriteType"><option value="潤色">潤色（提升品質）</option><option value="擴寫">擴寫（增加細節）</option><option value="縮寫">縮寫（精簡內容）</option><option value="改風格">改風格</option></select></div>
                            <div class="form-group"><label class="form-label">目標風格</label><input type="text" class="form-input" id="llmRewriteStyle" placeholder="例如：更詩意、更口語化"></div>
                        </div>
                        <button class="btn btn-primary btn-lg" style="width:100%;" onclick="llmRewrite()">✨ 改寫</button>
                    </div>
                </div>
            `;
            break;

        case 'translate':
            area.innerHTML = `
                <div class="card">
                    <div class="card-header"><h3>🌐 LLM 翻譯</h3><span class="tag tag-primary">10 積分</span></div>
                    <div class="card-body">
                        <div class="form-group"><label class="form-label">原始內容</label><textarea class="form-textarea" id="llmTransContent" placeholder="貼上要翻譯的內容..." style="min-height:150px;"></textarea></div>
                        <div class="form-group"><label class="form-label">目標語言</label><select class="form-select" id="llmTransLang"><option>英文</option><option>日文</option><option>韓文</option><option>簡體中文</option><option>法文</option><option>西班牙文</option></select></div>
                        <button class="btn btn-primary btn-lg" style="width:100%;" onclick="llmTranslate()">🌐 翻譯</button>
                    </div>
                </div>
            `;
            break;

        case 'dialogue':
            area.innerHTML = `
                <div class="card">
                    <div class="card-header"><h3>💬 LLM 對話生成</h3><span class="tag tag-primary">10 積分</span></div>
                    <div class="card-body">
                        <div class="form-group"><label class="form-label">場景描述</label><textarea class="form-textarea" id="llmDialogueScene" placeholder="描述場景背景..." style="min-height:60px;"></textarea></div>
                        <div class="grid grid-2">
                            <div class="form-group"><label class="form-label">角色A</label><input type="text" class="form-input" id="llmDialogueCharA" placeholder="名字（性格）"></div>
                            <div class="form-group"><label class="form-label">角色B</label><input type="text" class="form-input" id="llmDialogueCharB" placeholder="名字（性格）"></div>
                        </div>
                        <div class="form-group"><label class="form-label">對話目的</label><input type="text" class="form-input" id="llmDialoguePurpose" placeholder="例如：揭示秘密、表達愛意"></div>
                        <button class="btn btn-primary btn-lg" style="width:100%;" onclick="llmGenerateDialogue()">💬 生成對話</button>
                    </div>
                </div>
            `;
            break;
    }
}

function showVideoPromptTab(tab, btn) {
    document.querySelectorAll('#aiTaskArea .tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('videoPromptFromStory').classList.toggle('hidden', tab !== 'from-story');
    document.getElementById('videoPromptFromDesc').classList.toggle('hidden', tab !== 'from-desc');
}

async function loadUserStoriesForSelect(selectId) {
    try {
        const data = await api('/stories/user/mine');
        const sel = document.getElementById(selectId);
        if (sel) {
            sel.innerHTML = '<option value="">-- 選擇故事 --</option>' +
                data.stories.map(s => `<option value="${s.id}">${s.title} (${s.word_count}字)</option>`).join('');
        }
    } catch (e) {}
}

function showLLMResult(content, model) {
    const resultDiv = document.getElementById('aiResult');
    const resultContent = document.getElementById('aiResultContent');
    const resultModel = document.getElementById('aiResultModel');
    resultDiv.classList.remove('hidden');
    resultModel.textContent = `🤖 ${model}`;
    resultContent.innerHTML = `<div style="white-space:pre-wrap;line-height:1.8;font-size:0.95rem;">${escapeHtml(content)}</div>
        <div class="flex gap-2 mt-2">
            <button class="btn btn-sm btn-primary" onclick="copyToClipboard(\`${content.replace(/`/g, '\\`').replace(/\\/g, '\\\\')}\`)">📋 複製</button>
            <button class="btn btn-sm btn-ghost" onclick="saveLLMContentAsStory()">📝 保存為故事</button>
        </div>
    `;
}

function showLLMLoading(message = 'AI 正在生成中，請稍候...') {
    const resultDiv = document.getElementById('aiResult');
    const resultContent = document.getElementById('aiResultContent');
    resultDiv.classList.remove('hidden');
    resultContent.innerHTML = `<div class="text-center p-4"><div class="spinner" style="margin:0 auto;"></div><p class="mt-2">${message}</p><p class="text-muted" style="font-size:0.85rem;">首次調用可能需要 10-30 秒</p></div>`;
}

// ==========================================
// LLM Generation Functions
// ==========================================

async function llmGenerateFullStory() {
    const idea = document.getElementById('llmIdea')?.value?.trim();
    if (!idea) { showToast('請輸入故事想法', 'warning'); return; }

    showLLMLoading('LLM 正在生成完整故事，通常需要 15-30 秒...');

    try {
        const data = await api('/llm/generate-full-story', { method: 'POST', body: {
            genre: document.getElementById('llmGenre')?.value,
            tone: document.getElementById('llmTone')?.value,
            idea,
            characterName: document.getElementById('llmCharName')?.value?.trim(),
            wordCount: parseInt(document.getElementById('llmWordCount')?.value) || 2000,
        }});

        currentUser.credits = data.credits_remaining;
        updateNavForUser();

        let resultHtml = '';
        if (data.outline && data.outline.title) {
            resultHtml += `<div class="mb-2"><h3 style="font-weight:700;">📋 故事大綱：${escapeHtml(data.outline.title)}</h3>`;
            if (data.outline.summary) resultHtml += `<p class="text-muted">${escapeHtml(data.outline.summary)}</p>`;
            resultHtml += `</div>`;
        }
        resultHtml += `<div style="white-space:pre-wrap;line-height:1.8;font-size:1rem;">${escapeHtml(data.content)}</div>`;
        resultHtml += `<div class="mt-2 text-muted">📊 ${data.word_count} 字 · 🤖 ${data.model} · 💎 剩餘 ${data.credits_remaining} 積分</div>`;
        resultHtml += `<div class="flex gap-2 mt-2">
            <button class="btn btn-primary" onclick="saveLLMContentAsStory()">📝 保存為故事</button>
            <button class="btn btn-ghost" onclick="copyToClipboard(\`${data.content.replace(/`/g, '\\`').replace(/\\/g, '\\\\')}\`)">📋 複製</button>
        </div>`;

        document.getElementById('aiResultContent').innerHTML = resultHtml;
        document.getElementById('aiResultModel').textContent = `🤖 ${data.model}`;
        showToast('故事生成成功！', 'success');
    } catch (err) {
        document.getElementById('aiResultContent').innerHTML = `<div class="text-center" style="color:var(--danger);padding:2rem;">❌ ${err.message}</div>`;
    }
}

async function llmGenerateOutline() {
    const idea = document.getElementById('llmOutlineIdea')?.value?.trim();
    if (!idea) { showToast('請輸入故事想法', 'warning'); return; }

    showLLMLoading('LLM 正在生成故事大綱...');

    try {
        const data = await api('/llm/generate-outline', { method: 'POST', body: {
            genre: document.getElementById('llmOutlineGenre')?.value,
            idea,
            chapterCount: parseInt(document.getElementById('llmOutlineChapters')?.value) || 5,
        }});

        currentUser.credits = data.credits_remaining;
        updateNavForUser();

        const outline = data.outline;
        let html = `<h3 style="font-weight:700;margin-bottom:1rem;">📋 ${escapeHtml(outline.title || '故事大綱')}</h3>`;
        if (outline.summary) html += `<p class="mb-2">${escapeHtml(outline.summary)}</p>`;
        if (outline.chapters) {
            html += `<div class="mb-2"><strong>📑 章節：</strong></div>`;
            outline.chapters.forEach(ch => {
                html += `<div class="chapter-item"><div class="chapter-number">${ch.number || '?'}</div><div class="chapter-info"><div class="chapter-title">${escapeHtml(ch.title || '')}</div><div class="chapter-meta">${escapeHtml(ch.summary || '')}</div></div></div>`;
            });
        }
        if (outline.characters) {
            html += `<div class="mt-2 mb-2"><strong>👥 角色：</strong></div>`;
            html += `<div class="grid grid-2">${outline.characters.map(c => `<div class="character-card"><div class="character-avatar">${(c.name||'?')[0]}</div><div class="character-name">${escapeHtml(c.name||'')}</div><div class="character-role">${escapeHtml(c.role||'')}</div><div class="character-detail"><p>${escapeHtml(c.description||'')}</p></div></div>`).join('')}</div>`;
        }
        html += `<div class="mt-2 text-muted">🤖 ${data.model} · 💎 ${data.credits_remaining} 積分</div>`;
        html += `<button class="btn btn-primary mt-2" onclick="saveOutlineAsStory()">📝 用此大綱創建故事</button>`;

        document.getElementById('aiResultContent').innerHTML = html;
        document.getElementById('aiResultModel').textContent = `🤖 ${data.model}`;
        showToast('大綱生成成功！', 'success');
    } catch (err) {
        document.getElementById('aiResultContent').innerHTML = `<div class="text-center" style="color:var(--danger);">❌ ${err.message}</div>`;
    }
}

async function llmGenerateVideoPrompts() {
    const storyId = document.getElementById('llmVpStoryId')?.value;
    if (!storyId) { showToast('請選擇一個故事', 'warning'); return; }

    showLLMLoading('LLM 正在分析故事並生成影片提示詞...');

    try {
        const data = await api('/llm/generate-video-prompts', { method: 'POST', body: {
            story_id: parseInt(storyId),
            sceneCount: parseInt(document.getElementById('llmVpSceneCount')?.value) || 5,
            platform: document.getElementById('llmVpPlatform')?.value || 'general',
        }});

        currentUser.credits = data.credits_remaining;
        updateNavForUser();

        let html = `<h3 style="font-weight:700;margin-bottom:1rem;">🎬 ${escapeHtml(data.story_title)} - 影片提示詞</h3>`;
        html += `<p class="text-muted mb-2">共 ${data.total_scenes} 個場景 · 🤖 ${data.model}</p>`;
        data.scenes.forEach(scene => {
            html += `<div class="prompt-card mb-2">
                <div class="flex justify-between items-center mb-1">
                    <span class="tag tag-primary">場景 ${scene.scene_number || '?'}</span>
                    <span style="font-size:0.85rem;font-weight:600;">${escapeHtml(scene.scene_name || '')}</span>
                </div>
                ${scene.camera ? `<div style="font-size:0.8rem;color:var(--gray);margin-bottom:0.5rem;">📷 ${scene.camera.shot_size || ''} · ${scene.camera.angle || ''} · ${scene.camera.movement || ''}</div>` : ''}
                <div class="prompt-text">${escapeHtml(scene.prompt_en || scene.visual_description || '')}<button class="copy-btn" onclick="copyText(this)">📋</button></div>
                ${scene.prompt_zh ? `<div style="font-size:0.85rem;color:var(--dark-light);margin-top:0.5rem;">${escapeHtml(scene.prompt_zh)}</div>` : ''}
            </div>`;
        });
        html += `<div class="text-muted mt-2">💎 剩餘 ${data.credits_remaining} 積分</div>`;

        document.getElementById('aiResultContent').innerHTML = html;
        document.getElementById('aiResultModel').textContent = `🤖 ${data.model}`;
        showToast(`${data.total_scenes} 個影片提示詞已生成！`, 'success');
    } catch (err) {
        document.getElementById('aiResultContent').innerHTML = `<div class="text-center" style="color:var(--danger);">❌ ${err.message}</div>`;
    }
}

async function llmGenerateVideoPromptSingle() {
    const scene = document.getElementById('llmVpScene')?.value?.trim();
    if (!scene) { showToast('請輸入場景描述', 'warning'); return; }

    showLLMLoading('LLM 正在生成影片提示詞...');

    try {
        const data = await api('/llm/generate-video-prompt', { method: 'POST', body: {
            scene,
            style: document.getElementById('llmVpStyle')?.value,
            mood: document.getElementById('llmVpMood')?.value,
            platform: document.getElementById('llmVpPlatformDesc')?.value,
        }});

        currentUser.credits = data.credits_remaining;
        updateNavForUser();

        const p = data.prompt;
        let html = `<div class="prompt-card">
            <div class="prompt-text">${escapeHtml(p.prompt_en || '')}<button class="copy-btn" onclick="copyText(this)">📋</button></div>
            ${p.negative_prompt ? `<div style="margin-top:0.5rem;"><div style="font-size:0.8rem;color:var(--danger);">Negative:</div><div class="prompt-text" style="background:#2d1b1b;color:#fe929f;font-size:0.8rem;">${escapeHtml(p.negative_prompt)}<button class="copy-btn" onclick="copyText(this)">📋</button></div></div>` : ''}
            ${p.camera_breakdown ? `<div style="margin-top:0.75rem;font-size:0.85rem;"><strong>📷 鏡頭：</strong>${p.camera_breakdown.shot_size || ''} · ${p.camera_breakdown.angle || ''} · ${p.camera_breakdown.movement || ''}${p.camera_breakdown.rationale ? `<br><em>${escapeHtml(p.camera_breakdown.rationale)}</em>` : ''}</div>` : ''}
        </div>`;
        html += `<div class="text-muted mt-2">🤖 ${data.model} · 💎 ${data.credits_remaining} 積分</div>`;

        document.getElementById('aiResultContent').innerHTML = html;
        document.getElementById('aiResultModel').textContent = `🤖 ${data.model}`;
        showToast('提示詞已生成！', 'success');
    } catch (err) {
        document.getElementById('aiResultContent').innerHTML = `<div class="text-center" style="color:var(--danger);">❌ ${err.message}</div>`;
    }
}

async function llmGenerateCharacters() {
    showLLMLoading('LLM 正在創建角色...');

    try {
        const data = await api('/llm/generate-characters', { method: 'POST', body: {
            genre: document.getElementById('llmCharGenre')?.value,
            count: parseInt(document.getElementById('llmCharCount')?.value) || 3,
            setting: document.getElementById('llmCharSetting')?.value?.trim(),
        }});

        currentUser.credits = data.credits_remaining;
        updateNavForUser();

        let html = `<div class="grid grid-2">${data.characters.map(c => `
            <div class="character-card">
                <div class="character-avatar">${(c.name||'?')[0]}</div>
                <div class="character-name">${escapeHtml(c.name||'')}</div>
                <div class="character-role">${escapeHtml(c.role||'')} ${c.age ? `· ${c.age}` : ''}</div>
                ${c.appearance ? `<div class="character-detail"><strong>外貌</strong><p>${escapeHtml(c.appearance)}</p></div>` : ''}
                ${c.personality ? `<div class="character-detail"><strong>性格</strong><p>${escapeHtml(c.personality)}</p></div>` : ''}
                ${c.backstory ? `<div class="character-detail"><strong>背景</strong><p>${escapeHtml(c.backstory)}</p></div>` : ''}
                ${c.motivation ? `<div class="character-detail"><strong>動機</strong><p>${escapeHtml(c.motivation)}</p></div>` : ''}
                ${c.dialogue_style ? `<div class="character-detail"><strong>說話風格</strong><p>${escapeHtml(c.dialogue_style)}</p></div>` : ''}
            </div>
        `).join('')}</div>`;
        html += `<div class="text-muted mt-2">🤖 ${data.model} · 💎 ${data.credits_remaining} 積分</div>`;

        document.getElementById('aiResultContent').innerHTML = html;
        document.getElementById('aiResultModel').textContent = `🤖 ${data.model}`;
        showToast(`${data.characters.length} 個角色已生成！`, 'success');
    } catch (err) {
        document.getElementById('aiResultContent').innerHTML = `<div class="text-center" style="color:var(--danger);">❌ ${err.message}</div>`;
    }
}

async function llmGenerateWorld() {
    const concept = document.getElementById('llmWorldConcept')?.value?.trim();
    if (!concept) { showToast('請輸入核心概念', 'warning'); return; }

    showLLMLoading('LLM 正在構建世界觀...');

    try {
        const data = await api('/llm/generate-world', { method: 'POST', body: {
            genre: document.getElementById('llmWorldGenre')?.value,
            style: document.getElementById('llmWorldStyle')?.value,
            concept,
        }});

        currentUser.credits = data.credits_remaining;
        updateNavForUser();

        const w = data.world;
        let html = `<h3 style="font-weight:700;margin-bottom:1rem;">🌍 ${escapeHtml(w.name || '世界觀')}</h3>`;
        if (w.era) html += `<p><strong>時代：</strong>${escapeHtml(w.era)}</p>`;
        if (w.geography) {
            html += `<div class="mt-2"><strong>🗺️ 地理：</strong><p>${escapeHtml(w.geography.overview || '')}</p></div>`;
            if (w.geography.locations) {
                html += `<div class="grid grid-2 mt-1">${w.geography.locations.map(l => `<div class="card"><div class="card-body"><strong>${escapeHtml(l.name)}</strong><p style="font-size:0.85rem;">${escapeHtml(l.description)}</p></div></div>`).join('')}</div>`;
            }
        }
        if (w.power_system) {
            html += `<div class="mt-2"><strong>⚡ 力量體系：${escapeHtml(w.power_system.type || '')}</strong>`;
            if (w.power_system.rules) html += `<ul>${w.power_system.rules.map(r => `<li>${escapeHtml(r)}</li>`).join('')}</ul>`;
            html += `</div>`;
        }
        if (w.atmosphere) html += `<div class="mt-2"><strong>🎭 氛圍：</strong>${escapeHtml(w.atmosphere)}</div>`;
        html += `<div class="text-muted mt-2">🤖 ${data.model} · 💎 ${data.credits_remaining} 積分</div>`;

        document.getElementById('aiResultContent').innerHTML = html;
        document.getElementById('aiResultModel').textContent = `🤖 ${data.model}`;
        showToast('世界觀已生成！', 'success');
    } catch (err) {
        document.getElementById('aiResultContent').innerHTML = `<div class="text-center" style="color:var(--danger);">❌ ${err.message}</div>`;
    }
}

async function llmRewrite() {
    const content = document.getElementById('llmRewriteContent')?.value?.trim();
    if (!content) { showToast('請輸入要改寫的內容', 'warning'); return; }

    showLLMLoading('LLM 正在改寫...');

    try {
        const data = await api('/llm/rewrite', { method: 'POST', body: {
            content,
            type: document.getElementById('llmRewriteType')?.value,
            style: document.getElementById('llmRewriteStyle')?.value?.trim(),
        }});

        currentUser.credits = data.credits_remaining;
        updateNavForUser();

        document.getElementById('aiResultContent').innerHTML = `
            <div style="white-space:pre-wrap;line-height:1.8;">${escapeHtml(data.content)}</div>
            <div class="text-muted mt-2">${data.word_count} 字 · 🤖 ${data.model} · 💎 ${data.credits_remaining} 積分</div>
            <div class="flex gap-2 mt-2">
                <button class="btn btn-primary" onclick="saveLLMContentAsStory()">📝 保存為故事</button>
                <button class="btn btn-ghost" onclick="copyToClipboard(\`${data.content.replace(/`/g, '\\`')}\`)">📋 複製</button>
            </div>
        `;
        document.getElementById('aiResultModel').textContent = `🤖 ${data.model}`;
        showToast('改寫完成！', 'success');
    } catch (err) {
        document.getElementById('aiResultContent').innerHTML = `<div class="text-center" style="color:var(--danger);">❌ ${err.message}</div>`;
    }
}

async function llmTranslate() {
    const content = document.getElementById('llmTransContent')?.value?.trim();
    if (!content) { showToast('請輸入要翻譯的內容', 'warning'); return; }

    showLLMLoading('LLM 正在翻譯...');

    try {
        const data = await api('/llm/translate', { method: 'POST', body: {
            content,
            targetLang: document.getElementById('llmTransLang')?.value,
        }});

        currentUser.credits = data.credits_remaining;
        updateNavForUser();

        document.getElementById('aiResultContent').innerHTML = `
            <div style="white-space:pre-wrap;line-height:1.8;">${escapeHtml(data.translation)}</div>
            <div class="text-muted mt-2">🤖 ${data.model} · 💎 ${data.credits_remaining} 積分</div>
            <button class="btn btn-ghost mt-2" onclick="copyToClipboard(\`${data.translation.replace(/`/g, '\\`')}\`)">📋 複製</button>
        `;
        document.getElementById('aiResultModel').textContent = `🤖 ${data.model}`;
        showToast('翻譯完成！', 'success');
    } catch (err) {
        document.getElementById('aiResultContent').innerHTML = `<div class="text-center" style="color:var(--danger);">❌ ${err.message}</div>`;
    }
}

async function llmGenerateDialogue() {
    const scene = document.getElementById('llmDialogueScene')?.value?.trim();
    if (!scene) { showToast('請輸入場景描述', 'warning'); return; }

    showLLMLoading('LLM 正在生成對話...');

    try {
        const data = await api('/llm/generate-dialogue', { method: 'POST', body: {
            scene,
            characters: [
                { name: document.getElementById('llmDialogueCharA')?.value || '角色A', personality: '' },
                { name: document.getElementById('llmDialogueCharB')?.value || '角色B', personality: '' },
            ],
            purpose: document.getElementById('llmDialoguePurpose')?.value?.trim(),
        }});

        currentUser.credits = data.credits_remaining;
        updateNavForUser();

        document.getElementById('aiResultContent').innerHTML = `
            <div style="white-space:pre-wrap;line-height:1.8;">${escapeHtml(data.dialogue)}</div>
            <div class="text-muted mt-2">🤖 ${data.model} · 💎 ${data.credits_remaining} 積分</div>
            <div class="flex gap-2 mt-2">
                <button class="btn btn-primary" onclick="saveLLMContentAsStory()">📝 保存為故事</button>
                <button class="btn btn-ghost" onclick="copyToClipboard(\`${data.dialogue.replace(/`/g, '\\`')}\`)">📋 複製</button>
            </div>
        `;
        document.getElementById('aiResultModel').textContent = `🤖 ${data.model}`;
        showToast('對話已生成！', 'success');
    } catch (err) {
        document.getElementById('aiResultContent').innerHTML = `<div class="text-center" style="color:var(--danger);">❌ ${err.message}</div>`;
    }
}

async function saveLLMContentAsStory() {
    const content = document.querySelector('#aiResultContent .prompt-text, #aiResultContent div[style*="white-space"]')?.textContent || '';
    if (!content) { showToast('沒有可保存的內容', 'warning'); return; }

    const title = prompt('故事標題：', 'AI 生成的故事');
    if (!title) return;

    try {
        await api('/stories', { method: 'POST', body: {
            title,
            content: content.trim(),
            status: 'draft',
            is_ai_generated: true,
        }});
        showToast('已保存為草稿！', 'success');
        showDashTab('my-stories');
    } catch (err) { showToast(err.message, 'error'); }
}

async function saveOutlineAsStory() {
    const title = document.querySelector('#aiResultContent h3')?.textContent || 'AI 生成的故事';
    const outlineText = document.querySelector('#aiResultContent')?.textContent || '';

    try {
        await api('/stories', { method: 'POST', body: {
            title: title.replace('📋 ', ''),
            content: outlineText,
            status: 'draft',
            is_ai_generated: true,
        }});
        showToast('大綱已保存為草稿！', 'success');
        showDashTab('my-stories');
    } catch (err) { showToast(err.message, 'error'); }
}
