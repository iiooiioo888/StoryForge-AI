/**
 * StoryForge AI - 工作流模板庫
 * 5 個預設工作流模板，用戶可一鍵載入
 */

const WORKFLOW_TEMPLATES = [
    // ─── 模板1：基礎電影場景 ───────────────
    {
        id: 'tpl-basic-cinematic',
        name: '🎬 基礎電影場景',
        description: '最簡單的3節點鏈：世界設定 → 場景構圖 → 攝影機。適合快速建立場景概念。',
        category: 'basic',
        icon: '🎬',
        difficulty: '入門',
        tags: ['新手友好', '快速', '基礎'],
        nodes: [
            { id: 'tpl_wa1', type: 'world-anchor', x: 80, y: 200,
              params: { gravity: 9.8, globalLighting: 'HDRi', physicsRules: { gravity: 9.8, fluid: false, cloth: false } } },
            { id: 'tpl_sc1', type: 'scene-composer', x: 380, y: 150,
              params: { cameraLayout: 'free', depthRange: 100, weather: { type: 'clear', intensity: 0.5, wind: 0 } } },
            { id: 'tpl_cc1', type: 'cinematic-camera', x: 680, y: 200,
              params: { lensModel: 'ARRI', focalLength: 50, fStop: 2.8, iso: 800, frameRate: '24' } },
        ],
        connections: [
            { id: 'tpl_c1', fromNode: 'tpl_wa1', fromOutput: 'worldDNA', toNode: 'tpl_sc1', toInput: 'worldDNA' },
            { id: 'tpl_c2', fromNode: 'tpl_sc1', fromOutput: 'sceneBlueprint', toNode: 'tpl_cc1', toInput: 'sceneBlueprint' },
        ],
    },

    // ─── 模板2：黃金時刻燈光 ───────────────
    {
        id: 'tpl-golden-hour',
        name: '🌅 黃金時刻燈光',
        description: '專注燈光設定的工作流：世界設定 → 場景構圖 → 燈光佈置 → 攝影機。強調光影氛圍。',
        category: 'lighting',
        icon: '🌅',
        difficulty: '進階',
        tags: ['燈光', '氛圍', '黃金時刻'],
        nodes: [
            { id: 'tpl_wa1', type: 'world-anchor', x: 80, y: 250,
              params: { gravity: 9.8, globalLighting: 'HDRi', physicsRules: { gravity: 9.8, fluid: false, cloth: false } } },
            { id: 'tpl_sc1', type: 'scene-composer', x: 380, y: 150,
              params: { cameraLayout: 'free', depthRange: 150, weather: { type: 'clear', intensity: 0.3, wind: 2 } } },
            { id: 'tpl_lr1', type: 'lighting-rig', x: 380, y: 350,
              params: { preset: 'golden-hour', mood: 'warm',
                keyLight: { intensity: 1.2, colorTemperature: 3500, direction: '45-left', softness: 0.7 },
                fillLight: { enabled: true, ratio: 3 },
                rimLight: { enabled: true, intensity: 0.6, color: 'warm' } } },
            { id: 'tpl_cc1', type: 'cinematic-camera', x: 700, y: 250,
              params: { lensModel: 'ARRI', focalLength: 85, fStop: 1.8, iso: 400, frameRate: '24' } },
        ],
        connections: [
            { id: 'tpl_c1', fromNode: 'tpl_wa1', fromOutput: 'worldDNA', toNode: 'tpl_sc1', toInput: 'worldDNA' },
            { id: 'tpl_c2', fromNode: 'tpl_sc1', fromOutput: 'sceneBlueprint', toNode: 'tpl_cc1', toInput: 'sceneBlueprint' },
            { id: 'tpl_c3', fromNode: 'tpl_wa1', fromOutput: 'worldDNA', toNode: 'tpl_lr1', toInput: 'worldDNA' },
            { id: 'tpl_c4', fromNode: 'tpl_sc1', fromOutput: 'sceneBlueprint', toNode: 'tpl_lr1', toInput: 'sceneBlueprint' },
            { id: 'tpl_c5', fromNode: 'tpl_lr1', fromOutput: 'lightingData', toNode: 'tpl_cc1', toInput: 'sceneBlueprint' },
        ],
    },

    // ─── 模板3：完整製作管線 ───────────────
    {
        id: 'tpl-full-production',
        name: '🎭 完整製作管線',
        description: '5節點全管線：世界 → 場景 → 攝影機 → 表演指導 → 聲畫同步。從概念到成片。',
        category: 'production',
        icon: '🎭',
        difficulty: '進階',
        tags: ['全管線', '製作', '專業'],
        nodes: [
            { id: 'tpl_wa1', type: 'world-anchor', x: 80, y: 300,
              params: { gravity: 9.8, globalLighting: 'Raytraced', physicsRules: { gravity: 9.8, fluid: true, cloth: true } } },
            { id: 'tpl_sc1', type: 'scene-composer', x: 360, y: 180,
              params: { cameraLayout: 'free', depthRange: 200, weather: { type: 'rain', intensity: 0.7, wind: 15 } } },
            { id: 'tpl_cc1', type: 'cinematic-camera', x: 360, y: 420,
              params: { lensModel: 'ARRI', focalLength: 35, fStop: 1.4, iso: 1600, frameRate: '24' } },
            { id: 'tpl_pd1', type: 'performance-director', x: 660, y: 300,
              params: { emotionCurve: 'rising-tension', rainInteraction: true } },
            { id: 'tpl_cs1', type: 'cine-sync', x: 960, y: 300,
              params: { audioType: 'mixed', tempo: 120, syncMode: 'emotion-sync' } },
        ],
        connections: [
            { id: 'tpl_c1', fromNode: 'tpl_wa1', fromOutput: 'worldDNA', toNode: 'tpl_sc1', toInput: 'worldDNA' },
            { id: 'tpl_c2', fromNode: 'tpl_sc1', fromOutput: 'sceneBlueprint', toNode: 'tpl_cc1', toInput: 'sceneBlueprint' },
            { id: 'tpl_c3', fromNode: 'tpl_wa1', fromOutput: 'worldDNA', toNode: 'tpl_cc1', toInput: 'worldDNA' },
            { id: 'tpl_c4', fromNode: 'tpl_sc1', fromOutput: 'sceneBlueprint', toNode: 'tpl_pd1', toInput: 'sceneBlueprint' },
            { id: 'tpl_c5', fromNode: 'tpl_wa1', fromOutput: 'worldDNA', toNode: 'tpl_pd1', toInput: 'worldDNA' },
            { id: 'tpl_c6', fromNode: 'tpl_cc1', fromOutput: 'cameraData', toNode: 'tpl_cs1', toInput: 'cameraData' },
            { id: 'tpl_c7', fromNode: 'tpl_pd1', fromOutput: 'performanceData', toNode: 'tpl_cs1', toInput: 'performanceData' },
        ],
    },

    // ─── 模板4：AI 提示詞生成 ───────────────
    {
        id: 'tpl-ai-prompt',
        name: '🤖 AI 提示詞生成',
        description: '將工作流數據轉換為 AI 影片生成提示詞。世界+場景+燈光+攝影機 → Prompt → 匯出。',
        category: 'ai',
        icon: '🤖',
        difficulty: '進階',
        tags: ['AI', '提示詞', 'Sora', 'Runway'],
        nodes: [
            { id: 'tpl_wa1', type: 'world-anchor', x: 80, y: 150,
              params: { gravity: 9.8, globalLighting: 'HDRi', physicsRules: { gravity: 9.8, fluid: false, cloth: false } } },
            { id: 'tpl_sc1', type: 'scene-composer', x: 80, y: 380,
              params: { cameraLayout: 'free', depthRange: 120, weather: { type: 'clear', intensity: 0.5, wind: 0 } } },
            { id: 'tpl_lr1', type: 'lighting-rig', x: 380, y: 150,
              params: { preset: 'three-point', mood: 'dramatic',
                keyLight: { intensity: 1.0, colorTemperature: 5600, direction: '45-left', softness: 0.5 },
                fillLight: { enabled: true, ratio: 2 },
                rimLight: { enabled: true, intensity: 0.8, color: 'cool' } } },
            { id: 'tpl_cc1', type: 'cinematic-camera', x: 380, y: 380,
              params: { lensModel: 'ARRI', focalLength: 50, fStop: 2.0, iso: 800, frameRate: '24' } },
            { id: 'tpl_pg1', type: 'prompt-generator', x: 700, y: 250,
              params: { style: 'cinematic', platform: 'sora', aspectRatio: '16:9', duration: 8,
                customInstructions: 'Focus on environmental details and character silhouettes',
                negativePrompt: 'low quality, blurry, distorted, deformed' } },
            { id: 'tpl_ro1', type: 'render-output', x: 1000, y: 250,
              params: { renderEngine: 'realtime', resolution: '4K', format: 'mp4', quality: 95, frameRate: '24',
                colorSpace: 'sRGB', denoise: true, motionBlur: false } },
        ],
        connections: [
            { id: 'tpl_c1', fromNode: 'tpl_wa1', fromOutput: 'worldDNA', toNode: 'tpl_sc1', toInput: 'worldDNA' },
            { id: 'tpl_c2', fromNode: 'tpl_wa1', fromOutput: 'worldDNA', toNode: 'tpl_lr1', toInput: 'worldDNA' },
            { id: 'tpl_c3', fromNode: 'tpl_sc1', fromOutput: 'sceneBlueprint', toNode: 'tpl_lr1', toInput: 'sceneBlueprint' },
            { id: 'tpl_c4', fromNode: 'tpl_sc1', fromOutput: 'sceneBlueprint', toNode: 'tpl_cc1', toInput: 'sceneBlueprint' },
            { id: 'tpl_c5', fromNode: 'tpl_wa1', fromOutput: 'worldDNA', toNode: 'tpl_pg1', toInput: 'worldDNA' },
            { id: 'tpl_c6', fromNode: 'tpl_sc1', fromOutput: 'sceneBlueprint', toNode: 'tpl_pg1', toInput: 'sceneBlueprint' },
            { id: 'tpl_c7', fromNode: 'tpl_cc1', fromOutput: 'cameraData', toNode: 'tpl_pg1', toInput: 'cameraData' },
            { id: 'tpl_c8', fromNode: 'tpl_lr1', fromOutput: 'lightingData', toNode: 'tpl_pg1', toInput: 'lightingData' },
            { id: 'tpl_c9', fromNode: 'tpl_cc1', fromOutput: 'cameraData', toNode: 'tpl_ro1', toInput: 'cameraData' },
            { id: 'tpl_c10', fromNode: 'tpl_lr1', fromOutput: 'lightingData', toNode: 'tpl_ro1', toInput: 'lightingData' },
            { id: 'tpl_c11', fromNode: 'tpl_pg1', fromOutput: 'generatedPrompt', toNode: 'tpl_ro1', toInput: 'editSequence' },
        ],
    },

    // ─── 模板5：完整影視工作流 ───────────────
    {
        id: 'tpl-complete-film',
        name: '🎪 完整影視工作流',
        description: '包含所有節點類型的完整工作流：9個節點，從世界建構到最終匯出。適合大型製作。',
        category: 'advanced',
        icon: '🎪',
        difficulty: '專家',
        tags: ['完整', '專家', '大型製作', '全節點'],
        nodes: [
            { id: 'tpl_wa1', type: 'world-anchor', x: 60, y: 350,
              params: { gravity: 9.8, globalLighting: 'Raytraced', physicsRules: { gravity: 9.8, fluid: true, cloth: true } } },
            { id: 'tpl_sc1', type: 'scene-composer', x: 340, y: 200,
              params: { cameraLayout: 'free', depthRange: 300, weather: { type: 'fog', intensity: 0.6, wind: 8 } } },
            { id: 'tpl_cc1', type: 'cinematic-camera', x: 340, y: 500,
              params: { lensModel: 'ARRI', focalLength: 24, fStop: 1.2, iso: 3200, frameRate: '24' } },
            { id: 'tpl_lr1', type: 'lighting-rig', x: 620, y: 200,
              params: { preset: 'volumetric-fog', mood: 'mysterious',
                keyLight: { intensity: 0.8, colorTemperature: 4000, direction: 'side-left', softness: 0.9 },
                fillLight: { enabled: true, ratio: 4 },
                rimLight: { enabled: true, intensity: 1.0, color: 'cool' } } },
            { id: 'tpl_pd1', type: 'performance-director', x: 620, y: 500,
              params: { emotionCurve: 'volatile', rainInteraction: false } },
            { id: 'tpl_mc1', type: 'match-cut', x: 900, y: 350,
              params: { transitionType: 'dissolve', duration: 1.0, matchBy: 'motion' } },
            { id: 'tpl_cs1', type: 'cine-sync', x: 900, y: 550,
              params: { audioType: 'mixed', tempo: 90, syncMode: 'cut-sync' } },
            { id: 'tpl_pg1', type: 'prompt-generator', x: 1180, y: 200,
              params: { style: 'noir', platform: 'runway', aspectRatio: '21:9', duration: 12,
                customInstructions: 'Dark noir atmosphere with volumetric fog and dramatic shadows',
                negativePrompt: 'cartoon, anime, bright colors, cheerful' } },
            { id: 'tpl_ro1', type: 'render-output', x: 1180, y: 450,
              params: { renderEngine: 'cycles', resolution: '4K', format: 'prores', quality: 100, frameRate: '24',
                colorSpace: 'ACEScg', denoise: true, motionBlur: true } },
        ],
        connections: [
            { id: 'tpl_c1',  fromNode: 'tpl_wa1', fromOutput: 'worldDNA',       toNode: 'tpl_sc1', toInput: 'worldDNA' },
            { id: 'tpl_c2',  fromNode: 'tpl_sc1', fromOutput: 'sceneBlueprint', toNode: 'tpl_cc1', toInput: 'sceneBlueprint' },
            { id: 'tpl_c3',  fromNode: 'tpl_wa1', fromOutput: 'worldDNA',       toNode: 'tpl_cc1', toInput: 'worldDNA' },
            { id: 'tpl_c4',  fromNode: 'tpl_wa1', fromOutput: 'worldDNA',       toNode: 'tpl_lr1', toInput: 'worldDNA' },
            { id: 'tpl_c5',  fromNode: 'tpl_sc1', fromOutput: 'sceneBlueprint', toNode: 'tpl_lr1', toInput: 'sceneBlueprint' },
            { id: 'tpl_c6',  fromNode: 'tpl_sc1', fromOutput: 'sceneBlueprint', toNode: 'tpl_pd1', toInput: 'sceneBlueprint' },
            { id: 'tpl_c7',  fromNode: 'tpl_wa1', fromOutput: 'worldDNA',       toNode: 'tpl_pd1', toInput: 'worldDNA' },
            { id: 'tpl_c8',  fromNode: 'tpl_cc1', fromOutput: 'cameraData',     toNode: 'tpl_mc1', toInput: 'sceneA' },
            { id: 'tpl_c9',  fromNode: 'tpl_lr1', fromOutput: 'lightingData',   toNode: 'tpl_mc1', toInput: 'sceneB' },
            { id: 'tpl_c10', fromNode: 'tpl_mc1', fromOutput: 'editSequence',   toNode: 'tpl_cs1', toInput: 'editSequence' },
            { id: 'tpl_c11', fromNode: 'tpl_cc1', fromOutput: 'cameraData',     toNode: 'tpl_cs1', toInput: 'cameraData' },
            { id: 'tpl_c12', fromNode: 'tpl_pd1', fromOutput: 'performanceData',toNode: 'tpl_cs1', toInput: 'performanceData' },
            { id: 'tpl_c13', fromNode: 'tpl_wa1', fromOutput: 'worldDNA',       toNode: 'tpl_pg1', toInput: 'worldDNA' },
            { id: 'tpl_c14', fromNode: 'tpl_sc1', fromOutput: 'sceneBlueprint', toNode: 'tpl_pg1', toInput: 'sceneBlueprint' },
            { id: 'tpl_c15', fromNode: 'tpl_cc1', fromOutput: 'cameraData',     toNode: 'tpl_pg1', toInput: 'cameraData' },
            { id: 'tpl_c16', fromNode: 'tpl_lr1', fromOutput: 'lightingData',   toNode: 'tpl_pg1', toInput: 'lightingData' },
            { id: 'tpl_c17', fromNode: 'tpl_cc1', fromOutput: 'cameraData',     toNode: 'tpl_ro1', toInput: 'cameraData' },
            { id: 'tpl_c18', fromNode: 'tpl_lr1', fromOutput: 'lightingData',   toNode: 'tpl_ro1', toInput: 'lightingData' },
            { id: 'tpl_c19', fromNode: 'tpl_pg1', fromOutput: 'generatedPrompt',toNode: 'tpl_ro1', toInput: 'editSequence' },
        ],
    },
];

// ==========================================
// 模板庫 UI 管理
// ==========================================

/**
 * 打開模板庫對話框
 */
function openTemplateLibrary(editor) {
    // 防止重複開啟
    if (document.getElementById('template-library-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'template-library-modal';
    modal.className = 'tpl-modal-overlay';
    modal.innerHTML = `
        <div class="tpl-modal">
            <div class="tpl-modal-header">
                <h2>📋 工作流模板庫</h2>
                <p class="tpl-subtitle">選擇一個預設模板快速開始，或從空白開始</p>
                <button class="tpl-modal-close" id="tpl-close-btn">&times;</button>
            </div>
            <div class="tpl-modal-body">
                <div class="tpl-filter-bar">
                    <button class="tpl-filter-btn active" data-filter="all">全部</button>
                    <button class="tpl-filter-btn" data-filter="basic">基礎</button>
                    <button class="tpl-filter-btn" data-filter="lighting">燈光</button>
                    <button class="tpl-filter-btn" data-filter="production">製作</button>
                    <button class="tpl-filter-btn" data-filter="ai">AI</button>
                    <button class="tpl-filter-btn" data-filter="advanced">進階</button>
                </div>
                <div class="tpl-grid" id="tpl-grid">
                    ${WORKFLOW_TEMPLATES.map(tpl => `
                        <div class="tpl-card" data-template-id="${tpl.id}" data-category="${tpl.category}">
                            <div class="tpl-card-icon">${tpl.icon}</div>
                            <div class="tpl-card-body">
                                <h3 class="tpl-card-name">${tpl.name}</h3>
                                <p class="tpl-card-desc">${tpl.description}</p>
                                <div class="tpl-card-meta">
                                    <span class="tpl-card-difficulty">${tpl.difficulty}</span>
                                    <span class="tpl-card-nodes">${tpl.nodes.length} 節點</span>
                                    <span class="tpl-card-conns">${tpl.connections.length} 連線</span>
                                </div>
                                <div class="tpl-card-tags">
                                    ${tpl.tags.map(tag => `<span class="tpl-tag">${tag}</span>`).join('')}
                                </div>
                            </div>
                            <button class="tpl-card-use-btn">載入模板</button>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="tpl-modal-footer">
                <button class="tpl-btn-secondary" id="tpl-blank-btn">📄 從空白開始</button>
                <button class="tpl-btn-primary" id="tpl-close-footer">關閉</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // 注入動畫樣式
    if (!document.getElementById('tpl-modal-styles')) {
        const style = document.createElement('style');
        style.id = 'tpl-modal-styles';
        style.textContent = `
            .tpl-modal-overlay {
                position: fixed; inset: 0; z-index: 9999;
                background: rgba(0,0,0,0.6); backdrop-filter: blur(8px);
                display: flex; align-items: center; justify-content: center;
                animation: tpl-fade-in 0.2s ease-out;
            }
            @keyframes tpl-fade-in { from { opacity: 0; } to { opacity: 1; } }
            @keyframes tpl-slide-up { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

            .tpl-modal {
                background: #1a1d27; border: 1px solid #2a2e3a; border-radius: 16px;
                width: 90vw; max-width: 860px; max-height: 85vh;
                display: flex; flex-direction: column;
                box-shadow: 0 24px 64px rgba(0,0,0,0.5);
                animation: tpl-slide-up 0.3s ease-out;
                font-family: 'Inter', 'Noto Sans TC', sans-serif;
            }
            .tpl-modal-header {
                padding: 24px 28px 16px; position: relative;
                border-bottom: 1px solid #2a2e3a;
            }
            .tpl-modal-header h2 { font-size: 20px; font-weight: 700; color: #e5e7eb; margin: 0; }
            .tpl-subtitle { font-size: 13px; color: #9ca3af; margin: 4px 0 0; }
            .tpl-modal-close {
                position: absolute; top: 16px; right: 20px;
                background: none; border: none; color: #6b7280; font-size: 24px;
                cursor: pointer; padding: 4px 8px; border-radius: 6px; transition: all 0.15s;
            }
            .tpl-modal-close:hover { background: #2a2e3a; color: #e5e7eb; }

            .tpl-modal-body { padding: 16px 28px; overflow-y: auto; flex: 1; }
            .tpl-filter-bar { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
            .tpl-filter-btn {
                padding: 6px 14px; border-radius: 20px; border: 1px solid #2a2e3a;
                background: transparent; color: #9ca3af; font-size: 12px; font-weight: 500;
                cursor: pointer; transition: all 0.15s; font-family: inherit;
            }
            .tpl-filter-btn:hover { border-color: #3b82f6; color: #e5e7eb; }
            .tpl-filter-btn.active { background: #3b82f6; border-color: #3b82f6; color: #fff; }

            .tpl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
            .tpl-card {
                background: #222632; border: 1px solid #2a2e3a; border-radius: 12px;
                padding: 20px; cursor: pointer; transition: all 0.2s;
                display: flex; flex-direction: column; gap: 12px;
            }
            .tpl-card:hover { border-color: #3b82f6; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(59,130,246,0.15); }
            .tpl-card-icon { font-size: 36px; }
            .tpl-card-name { font-size: 15px; font-weight: 600; color: #e5e7eb; margin: 0; }
            .tpl-card-desc { font-size: 12px; color: #9ca3af; line-height: 1.5; margin: 0; }
            .tpl-card-meta { display: flex; gap: 10px; flex-wrap: wrap; }
            .tpl-card-meta span {
                font-size: 11px; padding: 2px 8px; border-radius: 4px;
                background: rgba(59,130,246,0.1); color: #60a5fa; font-weight: 500;
            }
            .tpl-card-tags { display: flex; gap: 6px; flex-wrap: wrap; }
            .tpl-tag {
                font-size: 10px; padding: 2px 6px; border-radius: 4px;
                background: rgba(255,255,255,0.05); color: #6b7280;
            }
            .tpl-card-use-btn {
                padding: 8px 16px; border-radius: 8px; border: none;
                background: #3b82f6; color: #fff; font-size: 12px; font-weight: 600;
                cursor: pointer; transition: all 0.15s; font-family: inherit;
                align-self: stretch; text-align: center;
            }
            .tpl-card-use-btn:hover { background: #2563eb; }

            .tpl-modal-footer {
                padding: 16px 28px; border-top: 1px solid #2a2e3a;
                display: flex; justify-content: space-between; align-items: center;
            }
            .tpl-btn-primary, .tpl-btn-secondary {
                padding: 8px 20px; border-radius: 8px; font-size: 13px; font-weight: 500;
                cursor: pointer; transition: all 0.15s; font-family: inherit;
            }
            .tpl-btn-primary { background: #3b82f6; border: none; color: #fff; }
            .tpl-btn-primary:hover { background: #2563eb; }
            .tpl-btn-secondary { background: transparent; border: 1px solid #2a2e3a; color: #9ca3af; }
            .tpl-btn-secondary:hover { border-color: #3b82f6; color: #e5e7eb; }
        `;
        document.head.appendChild(style);
    }

    // ── 事件綁定 ──
    const closeModal = () => modal.remove();
    document.getElementById('tpl-close-btn').addEventListener('click', closeModal);
    document.getElementById('tpl-close-footer').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    // 篩選按鈕
    modal.querySelectorAll('.tpl-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            modal.querySelectorAll('.tpl-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filter = btn.dataset.filter;
            modal.querySelectorAll('.tpl-card').forEach(card => {
                card.style.display = (filter === 'all' || card.dataset.category === filter) ? '' : 'none';
            });
        });
    });

    // 載入模板按鈕
    modal.querySelectorAll('.tpl-card-use-btn').forEach((btn, i) => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const tplId = btn.closest('.tpl-card').dataset.templateId;
            const tpl = WORKFLOW_TEMPLATES.find(t => t.id === tplId);
            if (tpl) {
                loadTemplate(editor, tpl);
                closeModal();
                showToast(`✅ 已載入模板：${tpl.name}`, 'success');
            }
        });
    });

    // 從空白開始
    document.getElementById('tpl-blank-btn').addEventListener('click', () => {
        editor.newWorkflow();
        closeModal();
        showToast('📄 已建立空白工作流', 'success');
    });
}

/**
 * 將模板載入到編輯器
 */
function loadTemplate(editor, template) {
    // 清空現有節點和連線
    editor.nodes = [];
    editor.connections = [];
    editor.selectedNodes = [];
    editor.selectedConnection = null;

    // 設定工作流名稱
    editor.workflowName = template.name;
    const nameInput = document.getElementById('workflowName');
    if (nameInput) nameInput.value = template.name;

    // 載入節點
    for (const nodeData of template.nodes) {
        const node = new WorkflowNode(nodeData.type, nodeData.x, nodeData.y, nodeData.id);
        // 套用參數
        if (nodeData.params) {
            Object.assign(node.params, nodeData.params);
            // 對 group 類型參數做深層合併
            for (const inputDef of node.def.inputs) {
                if (inputDef.type === 'group' && nodeData.params[inputDef.name]) {
                    node.params[inputDef.name] = { ...inputDef.fields.reduce((acc, f) => ({ ...acc, [f.name]: f.default }), {}), ...nodeData.params[inputDef.name] };
                }
            }
        }
        editor.nodes.push(node);
    }

    // 載入連線
    for (const connData of template.connections) {
        const fromNode = editor.nodes.find(n => n.id === connData.fromNode);
        const toNode = editor.nodes.find(n => n.id === connData.toNode);
        if (!fromNode || !toNode) continue;

        const fromOutput = fromNode.outputs.find(o => o.name === connData.fromOutput);
        const toInput = toNode.inputs.find(i => i.name === connData.toInput);
        if (!fromOutput || !toInput) continue;

        const conn = new NodeConnection(fromNode, fromOutput, toNode, toInput, connData.id);
        editor.connections.push(conn);
    }

    // 自動排版 & 畫面適配
    editor.markDirty();
    if (typeof editor.fitView === 'function') {
        editor.fitView();
    }

    // 儲存 undo 狀態
    editor._undoSaveState();
}
