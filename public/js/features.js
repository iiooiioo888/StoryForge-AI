/**
 * StoryForge AI - Feature Enhancements
 * Dark Mode, Auto-save, Keyboard Shortcuts
 */

// ============================================
// Dark Mode
// ============================================
function initTheme() {
    const saved = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    updateThemeToggle(saved);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    updateThemeToggle(next);
    showToast(next === 'dark' ? '已切換至暗黑模式 🌙' : '已切換至淺色模式 ☀️', 'info');
}

function updateThemeToggle(theme) {
    const btn = document.querySelector('.theme-toggle');
    if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
}

// ============================================
// Auto-save
// ============================================
let autoSaveTimer = null;
let autoSaveTarget = null;
let autoSaveEndpoint = null;

function setupAutoSave(options = {}) {
    const { targetId, endpoint, interval = 30000, getData } = options;
    autoSaveTarget = targetId;
    autoSaveEndpoint = endpoint;

    // Watch for content changes
    const target = document.getElementById(targetId);
    if (target) {
        target.addEventListener('input', () => {
            clearTimeout(autoSaveTimer);
            autoSaveTimer = setTimeout(() => {
                performAutoSave(getData);
            }, interval);
        });
    }
}

async function performAutoSave(getData) {
    const indicator = document.getElementById('autosaveIndicator');
    if (!indicator) return;

    indicator.className = 'autosave-indicator show saving';
    indicator.textContent = '💾 儲存中...';

    try {
        const data = getData ? getData() : null;
        if (data && autoSaveEndpoint) {
            await api(autoSaveEndpoint, { method: 'PUT', body: data });
        }
        indicator.className = 'autosave-indicator show saved';
        indicator.textContent = '✅ 已自動儲存';
        setTimeout(() => { indicator.className = 'autosave-indicator'; }, 2000);
    } catch (err) {
        indicator.className = 'autosave-indicator show error';
        indicator.textContent = '❌ 儲存失敗';
        setTimeout(() => { indicator.className = 'autosave-indicator'; }, 3000);
    }
}

// ============================================
// Keyboard Shortcuts
// ============================================
function initShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl+S / Cmd+S → Save
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            handleSaveShortcut();
            return;
        }

        // Ctrl+Enter → Generate (in AI task area)
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            handleGenerateShortcut();
            return;
        }

        // Ctrl+/ → Show shortcuts help
        if ((e.ctrlKey || e.metaKey) && e.key === '/') {
            e.preventDefault();
            showShortcutsHelp();
            return;
        }

        // Escape → Close modals
        if (e.key === 'Escape') {
            closeLoginModal();
            closeEditorModal();
            return;
        }

        // Ctrl+K → Focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            const search = document.getElementById('exploreSearch');
            if (search) { router.navigate('explore'); setTimeout(() => search.focus(), 200); }
            return;
        }

        // Ctrl+N → New story
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            if (currentUser) { router.navigate('dashboard'); setTimeout(() => showDashTab('create'), 200); }
            else { router.navigate('register'); }
            return;
        }

        // Ctrl+D → Toggle dark mode
        if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
            e.preventDefault();
            toggleTheme();
            return;
        }

        // Number keys for navigation (when not in input)
        if (!e.target.matches('input, textarea, select')) {
            switch (e.key) {
                case '1': router.navigate('home'); break;
                case '2': router.navigate('explore'); break;
                case '3': router.navigate('prompts'); break;
                case '4': router.navigate('camera'); break;
                case '5': router.navigate('tools'); break;
                case '6': if (currentUser) router.navigate('dashboard'); break;
            }
        }
    });
}

function handleSaveShortcut() {
    // Find active save button
    const saveBtn = document.querySelector('.btn-primary[onclick*="save"], .btn-success[onclick*="publish"]');
    if (saveBtn) {
        saveBtn.click();
        showToast('已儲存 (Ctrl+S)', 'success');
    }
}

function handleGenerateShortcut() {
    // Find active generate button
    const genBtn = document.querySelector('.btn-primary[onclick*="Generate"], .btn-primary[onclick*="generate"], .btn-primary[onclick*="Generate"]');
    if (genBtn) {
        genBtn.click();
    }
}

function showShortcutsHelp() {
    const hint = document.getElementById('shortcutHint');
    if (!hint) return;

    hint.innerHTML = `
        <div style="font-weight:700;margin-bottom:8px;">⌨️ 快捷鍵</div>
        <div><kbd>Ctrl</kbd>+<kbd>S</kbd> 儲存</div>
        <div><kbd>Ctrl</kbd>+<kbd>Enter</kbd> 生成</div>
        <div><kbd>Ctrl</kbd>+<kbd>K</kbd> 搜索</div>
        <div><kbd>Ctrl</kbd>+<kbd>N</kbd> 新故事</div>
        <div><kbd>Ctrl</kbd>+<kbd>D</kbd> 切換主題</div>
        <div><kbd>Esc</kbd> 關閉彈窗</div>
        <div><kbd>1</kbd>-<kbd>6</kbd> 快速導航</div>
        <div style="margin-top:8px;font-size:0.75rem;opacity:0.7;">按任意鍵關閉</div>
    `;
    hint.classList.add('show');

    const close = () => { hint.classList.remove('show'); document.removeEventListener('keydown', close); };
    setTimeout(() => document.addEventListener('keydown', close, { once: true }), 100);
}

// ============================================
// Health Check Display
// ============================================
async function checkHealth() {
    try {
        const data = await fetch('/api/health').then(r => r.json());
        return data;
    } catch (e) {
        return { status: 'error' };
    }
}

// ============================================
// SSE Streaming Helper
// ============================================
async function streamLLM(options, onChunk, onDone, onError) {
    const { prompt, systemPrompt, provider, tier, model, maxTokens, temperature } = options;

    try {
        const response = await fetch('/api/llm/stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, systemPrompt, provider, tier, model, maxTokens, temperature }),
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed.startsWith('data: ')) continue;
                const data = trimmed.slice(6);

                if (data === '[DONE]') {
                    if (onDone) onDone();
                    return;
                }

                try {
                    const parsed = JSON.parse(data);
                    if (parsed.error) {
                        if (onError) onError(parsed.error);
                        return;
                    }
                    if (parsed.content && onChunk) {
                        onChunk(parsed.content, parsed.model);
                    }
                } catch (e) {}
            }
        }
        if (onDone) onDone();
    } catch (err) {
        if (onError) onError(err.message);
    }
}

// ============================================
// Init
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initShortcuts();
});
