/* ===== StoryForge AI — Visual Node Editor (workflow.js) ===== */
'use strict';

/* ──────────────────────────────────────────────────────────────
   NODE TYPE DEFINITIONS
   ────────────────────────────────────────────────────────────── */
const NODE_TYPES = {
    'world-anchor': {
        type: 'world-anchor', category: 'world', displayName: 'World Anchor',
        icon: '🌍', color: '#8b5cf6',
        description: 'Define physics, environment & global lighting',
        inputs: [
            { name: 'characterModel', label: 'Character Model', type: 'file', accept: '.glb,.gltf,.fbx', default: null },
            { name: 'physicsRules', label: 'Physics Rules', type: 'group', fields: [
                { name: 'gravity', label: 'Gravity', type: 'slider', min: 0, max: 20, step: 0.1, default: 9.8 },
                { name: 'fluid', label: 'Fluid Sim', type: 'toggle', default: false },
                { name: 'cloth', label: 'Cloth Sim', type: 'toggle', default: false },
            ]},
            { name: 'environmentMap', label: 'Environment Map', type: 'file', accept: '.hdr,.exr,.jpg', default: null },
            { name: 'globalLighting', label: 'Global Lighting', type: 'dropdown', options: ['HDRi','Raytraced','Baked','Mixed'], default: 'HDRi' },
        ],
        outputs: [{ name: 'worldDNA', label: 'World DNA', type: 'worldDNA' }],
    },
    'scene-composer': {
        type: 'scene-composer', category: 'world', displayName: 'Scene Composer',
        icon: '🎬', color: '#8b5cf6',
        description: 'Compose scene layout, depth & weather',
        inputs: [
            { name: 'worldDNA', label: 'World DNA', type: 'worldDNA', default: null },
            { name: 'cameraLayout', label: 'Camera Layout', type: 'dropdown', options: ['top','side','free'], default: 'free' },
            { name: 'depthRange', label: 'Depth Range (m)', type: 'slider', min: 1, max: 500, step: 1, default: 100 },
            { name: 'weather', label: 'Weather', type: 'group', fields: [
                { name: 'type', label: 'Type', type: 'dropdown', options: ['clear','rain','snow','fog','storm'], default: 'clear' },
                { name: 'intensity', label: 'Intensity', type: 'slider', min: 0, max: 1, step: 0.05, default: 0.5 },
                { name: 'wind', label: 'Wind (m/s)', type: 'slider', min: 0, max: 50, step: 1, default: 0 },
            ]},
        ],
        outputs: [{ name: 'sceneBlueprint', label: 'Scene Blueprint', type: 'sceneBlueprint' }],
    },
    'cinematic-camera': {
        type: 'cinematic-camera', category: 'camera', displayName: 'Cinematic Camera',
        icon: '🎥', color: '#3b82f6',
        description: 'Virtual cinema camera with real lens models',
        inputs: [
            { name: 'sceneBlueprint', label: 'Scene Blueprint', type: 'sceneBlueprint', default: null },
            { name: 'worldDNA', label: 'World DNA', type: 'worldDNA', default: null },
            { name: 'lensModel', label: 'Lens Model', type: 'dropdown', options: ['ARRI','RED','CANON','SONY','IMAX'], default: 'ARRI' },
            { name: 'focalLength', label: 'Focal Length (mm)', type: 'slider', min: 18, max: 300, step: 1, default: 50 },
            { name: 'shutterAngle', label: 'Shutter Angle (°)', type: 'slider', min: 1, max: 360, step: 1, default: 180 },
            { name: 'fStop', label: 'f-stop', type: 'slider', min: 1.4, max: 22, step: 0.1, default: 2.8 },
            { name: 'iso', label: 'ISO', type: 'slider', min: 100, max: 12800, step: 100, default: 800 },
            { name: 'motionPath', label: 'Motion Path', type: 'json', default: '[]' },
            { name: 'frameRate', label: 'Frame Rate', type: 'dropdown', options: ['24','30','60'], default: '24' },
        ],
        outputs: [{ name: 'cameraData', label: 'Camera Data', type: 'cameraData' }],
    },
    'performance-director': {
        type: 'performance-director', category: 'director', displayName: 'Performance Director',
        icon: '🎭', color: '#f59e0b',
        description: 'Direct character performances & timeline',
        inputs: [
            { name: 'worldDNA', label: 'World DNA', type: 'worldDNA', default: null },
            { name: 'timeline', label: 'Timeline', type: 'json', default: '[]' },
            { name: 'rainInteraction', label: 'Rain Interaction', type: 'toggle', default: false },
        ],
        outputs: [{ name: 'performanceData', label: 'Performance Data', type: 'performanceData' }],
    },
    'match-cut': {
        type: 'match-cut', category: 'post', displayName: 'Match Cut',
        icon: '✂️', color: '#10b981',
        description: 'Intelligent shot matching & transitions',
        inputs: [
            { name: 'cameraDataArray', label: 'Camera Data Array', type: 'cameraData[]', default: null },
            { name: 'cutStyle', label: 'Cut Style', type: 'dropdown', options: ['hard','dissolve','wipe','morph','jump'], default: 'hard' },
            { name: 'transitionDuration', label: 'Transition Duration (s)', type: 'slider', min: 0, max: 5, step: 0.1, default: 0.5 },
        ],
        outputs: [{ name: 'editSequence', label: 'Edit Sequence', type: 'editSequence' }],
    },
    'cine-sync': {
        type: 'cine-sync', category: 'post', displayName: 'CineSync',
        icon: '🔊', color: '#10b981',
        description: 'Audio sync, mix & spatial sound design',
        inputs: [
            { name: 'performanceData', label: 'Performance Data', type: 'performanceData', default: null },
            { name: 'cameraData', label: 'Camera Data', type: 'cameraData', default: null },
            { name: 'sceneBlueprint', label: 'Scene Blueprint', type: 'sceneBlueprint', default: null },
            { name: 'audioType', label: 'Audio Type', type: 'dropdown', options: ['stereo','surround51','atmos','binaural'], default: 'stereo' },
        ],
        outputs: [{ name: 'audioData', label: 'Audio Data', type: 'audioData' }],
    },
};

const CATEGORY_META = {
    world:   { label: '🌍 World Building', color: '#8b5cf6' },
    camera:  { label: '🎥 Camera',        color: '#3b82f6' },
    director:{ label: '🎬 Director',       color: '#f59e0b' },
    post:    { label: '🎞️ Post-Production', color: '#10b981' },
};

/* ──────────────────────────────────────────────────────────────
   UTILITY
   ────────────────────────────────────────────────────────────── */
function uid() { return 'n_' + Math.random().toString(36).slice(2, 10); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function dist(x1, y1, x2, y2) { return Math.hypot(x2 - x1, y2 - y1); }

function showToast(msg, type = '') {
    const c = document.getElementById('toast-container');
    if (!c) return;
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 2500);
}

/* ──────────────────────────────────────────────────────────────
   DYNAMIC CSS INJECTION
   ────────────────────────────────────────────────────────────── */
function injectDynamicStyles() {
    if (document.getElementById('wf-dynamic-css')) return;
    const style = document.createElement('style');
    style.id = 'wf-dynamic-css';
    style.textContent = `
        /* Context Menu */
        .wf-context-menu {
            position: fixed; z-index: 10000; background: #1a1d27;
            border: 1px solid #2a2e3a; border-radius: 8px;
            padding: 4px 0; min-width: 180px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.5);
            font-family: Inter, sans-serif; font-size: 12px; color: #e2e8f0;
        }
        .wf-context-menu .ctx-item {
            padding: 6px 14px; cursor: pointer; display: flex; align-items: center; gap: 8px;
            transition: background 0.1s;
        }
        .wf-context-menu .ctx-item:hover { background: #2a2e3a; }
        .wf-context-menu .ctx-item .ctx-icon { width: 18px; text-align: center; }
        .wf-context-menu .ctx-item .ctx-shortcut { margin-left: auto; color: #64748b; font-size: 10px; }
        .wf-context-menu .ctx-sep { height: 1px; background: #2a2e3a; margin: 4px 0; }
        .wf-context-menu .ctx-submenu { position: relative; }
        .wf-context-menu .ctx-submenu .ctx-sub-list {
            display: none; position: absolute; left: 100%; top: -4px;
            background: #1a1d27; border: 1px solid #2a2e3a; border-radius: 8px;
            padding: 4px 0; min-width: 180px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        }
        .wf-context-menu .ctx-submenu:hover .ctx-sub-list { display: block; }
        .wf-context-menu .ctx-submenu .ctx-item::after { content: '▸'; margin-left: auto; color: #64748b; }
        .wf-context-menu .ctx-submenu:hover .ctx-item::after { color: #8b5cf6; }

        /* Progress bar */
        .wf-progress-bar {
            position: absolute; top: 0; left: 0; right: 0; height: 3px;
            background: #1a1d27; z-index: 100; overflow: hidden;
        }
        .wf-progress-bar .wf-progress-fill {
            height: 100%; background: linear-gradient(90deg, #3b82f6, #8b5cf6);
            transition: width 0.3s ease; width: 0%;
        }
        .wf-progress-bar .wf-progress-fill.indeterminate {
            width: 30%; animation: wf-indeterminate 1.2s ease-in-out infinite;
        }
        @keyframes wf-indeterminate {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(400%); }
        }

        /* Keyboard shortcuts modal */
        .wf-shortcuts-modal {
            position: fixed; inset: 0; z-index: 10000; display: flex;
            align-items: center; justify-content: center;
            background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
        }
        .wf-shortcuts-modal .modal-box {
            background: #1a1d27; border: 1px solid #2a2e3a; border-radius: 12px;
            padding: 24px 32px; min-width: 420px; max-height: 80vh; overflow-y: auto;
            box-shadow: 0 16px 64px rgba(0,0,0,0.5);
        }
        .wf-shortcuts-modal .modal-title {
            font-size: 16px; font-weight: 600; color: #e2e8f0; margin-bottom: 16px;
            display: flex; align-items: center; gap: 8px;
        }
        .wf-shortcuts-modal .shortcut-row {
            display: flex; justify-content: space-between; align-items: center;
            padding: 6px 0; border-bottom: 1px solid #1e2130;
        }
        .wf-shortcuts-modal .shortcut-label { color: #9ca3af; font-size: 12px; }
        .wf-shortcuts-modal .shortcut-key {
            background: #2a2e3a; padding: 2px 8px; border-radius: 4px;
            font-size: 11px; font-family: monospace; color: #e2e8f0;
        }

        /* Workflow list dropdown */
        .wf-workflow-select {
            background: #0f1117; border: 1px solid #2a2e3a; border-radius: 6px;
            color: #e2e8f0; font-size: 11px; padding: 4px 8px; max-width: 160px;
            outline: none; cursor: pointer;
        }
        .wf-workflow-select:focus { border-color: #8b5cf6; }

        /* Node output preview */
        .wf-node-preview {
            margin-top: 4px; padding: 4px 6px; background: rgba(255,255,255,0.03);
            border-radius: 4px; font-size: 9px; color: #64748b; max-height: 48px;
            overflow: hidden; text-overflow: ellipsis; line-height: 1.3;
            border: 1px solid rgba(255,255,255,0.05);
        }

        /* Minimap viewport drag cursor */
        #minimap-canvas { cursor: crosshair; }

        /* Connection label pill */
        .wf-conn-label-canvas { pointer-events: none; }
    `;
    document.head.appendChild(style);
}

/* ──────────────────────────────────────────────────────────────
   CLASSES
   ────────────────────────────────────────────────────────────── */

class Port {
    constructor(node, def, dir, index) {
        this.node = node;
        this.name = def.name;
        this.label = def.label || def.name;
        this.type = def.type;
        this.dir = dir;         // 'input' | 'output'
        this.index = index;
        this.default = def.default ?? null;
    }
    get canvasPos() {
        const n = this.node;
        const headerH = 34;
        const portSpacing = 22;
        const startY = headerH + 14;
        const x = this.dir === 'input' ? n.x : n.x + n.width;
        const y = n.y + startY + this.index * portSpacing;
        return { x, y };
    }
}

class WorkflowNode {
    constructor(type, x, y, id) {
        const def = NODE_TYPES[type];
        this.id = id || uid();
        this.type = type;
        this.def = def;
        this.x = x;
        this.y = y;
        this.width = 220;
        this.height = 0; // computed
        this.selected = false;
        this.execState = null; // null | 'running' | 'success' | 'error'
        this.execStartTime = null;
        this.execElapsed = null;
        this.outputData = null;
        // Build params from defaults
        this.params = {};
        for (const inp of def.inputs) {
            if (inp.type === 'group') {
                this.params[inp.name] = {};
                for (const f of inp.fields) this.params[inp.name][f.name] = f.default;
            } else {
                this.params[inp.name] = inp.default;
            }
        }
        // Ports
        this.inputs = def.inputs.map((d, i) => new Port(this, d, 'input', i));
        this.outputs = def.outputs.map((d, i) => new Port(this, d, 'output', i));
        this._computeHeight();
    }
    _computeHeight() {
        const maxPorts = Math.max(this.inputs.length, this.outputs.length);
        this.height = 34 + 8 + maxPorts * 22 + 28 + 8;
    }
    contains(px, py) {
        return px >= this.x && px <= this.x + this.width &&
               py >= this.y && py <= this.y + this.height;
    }
    headerContains(px, py) {
        return px >= this.x && px <= this.x + this.width &&
               py >= this.y && py <= this.y + 34;
    }
    getPortAt(px, py, dir) {
        const ports = dir === 'input' ? this.inputs : this.outputs;
        for (const p of ports) {
            const pos = p.canvasPos;
            if (dist(px, py, pos.x, pos.y) <= 10) return p;
        }
        return null;
    }
    serialize() {
        return { id: this.id, type: this.type, x: this.x, y: this.y, params: JSON.parse(JSON.stringify(this.params)) };
    }
}

class NodeConnection {
    constructor(fromNode, fromOutput, toNode, toInput, id) {
        this.id = id || uid();
        this.fromNode = fromNode;
        this.fromOutput = fromOutput;
        this.toNode = toNode;
        this.toInput = toInput;
        this.selected = false;
    }
    serialize() {
        return { id: this.id, fromNode: this.fromNode.id, fromOutput: this.fromOutput.name, toNode: this.toNode.id, toInput: this.toInput.name };
    }
}

/* ──────────────────────────────────────────────────────────────
   NODE EDITOR (Main Controller)
   ────────────────────────────────────────────────────────────── */

class NodeEditor {
    constructor(canvas, minimapCanvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.minimap = minimapCanvas;
        this.mmCtx = minimapCanvas.getContext('2d');

        this.nodes = [];
        this.connections = [];
        this.selectedNodes = [];
        this.selectedConnection = null;

        // View transform
        this.panX = 0;
        this.panY = 0;
        this.zoom = 1;

        // Interaction state
        this.dragging = false;
        this.dragNode = null;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        this.panning = false;
        this.panStartX = 0;
        this.panStartY = 0;
        this.spaceDown = false;
        this.connecting = false;
        this.connectFromPort = null;
        this.connectMouseX = 0;
        this.connectMouseY = 0;
        this.selecting = false;
        this.selRect = null;
        this.marquee = null;

        // Clipboard
        this.clipboard = null;

        // Undo / redo
        this.undoStack = [];
        this.redoStack = [];
        this._undoSaveState();

        // Workflow meta
        this.workflowId = null;
        this.workflowName = 'Untitled Workflow';

        // Dirty rendering
        this._dirty = true;
        this._animating = false; // true when exec animation runs
        this._lastRenderTime = 0;

        // Minimap interaction
        this._mmDragging = false;
        this._mmScale = 1;
        this._mmOffX = 0;
        this._mmOffY = 0;
        this._mmBounds = null;

        // Connection label cache
        this._connLabels = new Map();

        // Offscreen canvas for grid
        this._gridCanvas = null;
        this._gridDirty = true;
        this._lastPanX = 0;
        this._lastPanY = 0;
        this._lastZoom = 0;

        // Execution state
        this._executing = false;
        this._execProgress = 0;
        this._execTotal = 0;

        // Inject CSS
        injectDynamicStyles();

        this._bindEvents();
        this._resize();
        this._createProgressBar();
        this._startLoop();

        // Mark dirty on state changes
        this._origAddNode = this.addNode;
    }

    /* ── Coordinate helpers ── */
    screenToWorld(sx, sy) {
        return { x: (sx - this.panX) / this.zoom, y: (sy - this.panY) / this.zoom };
    }
    worldToScreen(wx, wy) {
        return { x: wx * this.zoom + this.panX, y: wy * this.zoom + this.panY };
    }

    markDirty() {
        this._dirty = true;
        this._gridDirty = true;
    }

    /* ── Resize ── */
    _resize() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.viewW = rect.width;
        this.viewH = rect.height;

        // Minimap
        const mmRect = this.minimap.parentElement.getBoundingClientRect();
        this.minimap.width = mmRect.width * dpr;
        this.minimap.height = mmRect.height * dpr;
        this.minimap.style.width = mmRect.width + 'px';
        this.minimap.style.height = mmRect.height + 'px';
        this.mmCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.mmW = mmRect.width;
        this.mmH = mmRect.height;

        // Rebuild offscreen grid canvas
        this._gridCanvas = document.createElement('canvas');
        this._gridCanvas.width = this.canvas.width;
        this._gridCanvas.height = this.canvas.height;
        this._gridDirty = true;
        this.markDirty();
    }

    _createProgressBar() {
        const container = this.canvas.parentElement;
        const bar = document.createElement('div');
        bar.className = 'wf-progress-bar';
        bar.id = 'wf-progress-bar';
        bar.style.display = 'none';
        bar.innerHTML = '<div class="wf-progress-fill" id="wf-progress-fill"></div>';
        container.appendChild(bar);
    }

    /* ── Event binding ── */
    _bindEvents() {
        window.addEventListener('resize', () => { this._resize(); this.markDirty(); });

        this.canvas.addEventListener('mousedown', e => this._onMouseDown(e));
        this.canvas.addEventListener('mousemove', e => this._onMouseMove(e));
        this.canvas.addEventListener('mouseup', e => this._onMouseUp(e));
        this.canvas.addEventListener('wheel', e => this._onWheel(e), { passive: false });
        this.canvas.addEventListener('dblclick', e => this._onDblClick(e));
        this.canvas.addEventListener('contextmenu', e => this._onContextMenu(e));

        window.addEventListener('keydown', e => this._onKeyDown(e));
        window.addEventListener('keyup', e => this._onKeyUp(e));

        // Minimap interaction
        this.minimap.addEventListener('mousedown', e => this._onMinimapMouseDown(e));
        this.minimap.addEventListener('mousemove', e => this._onMinimapMouseMove(e));
        this.minimap.addEventListener('mouseup', e => this._onMinimapMouseUp(e));

        // Palette drag-and-drop
        this._initPaletteDrag();

        // Click outside to close context menu
        document.addEventListener('click', () => this._closeContextMenu());
    }

    /* ── Context Menu ── */
    _onContextMenu(e) {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const wp = this.screenToWorld(sx, sy);

        // Check if right-clicking a node
        let hitNode = null;
        for (let i = this.nodes.length - 1; i >= 0; i--) {
            if (this.nodes[i].contains(wp.x, wp.y)) {
                hitNode = this.nodes[i];
                break;
            }
        }

        this._closeContextMenu();
        const menu = document.createElement('div');
        menu.className = 'wf-context-menu';
        menu.id = 'wf-context-menu';

        if (hitNode) {
            // Node-specific context menu
            if (!hitNode.selected) {
                this._deselectAll();
                hitNode.selected = true;
                this.selectedNodes = [hitNode];
                this._updateInspector();
            }
            menu.innerHTML = `
                <div class="ctx-item" data-action="execute-node"><span class="ctx-icon">▶</span>Execute Node</div>
                <div class="ctx-item" data-action="duplicate"><span class="ctx-icon">📋</span>Duplicate<span class="ctx-shortcut">Ctrl+D</span></div>
                <div class="ctx-sep"></div>
                <div class="ctx-item" data-action="copy"><span class="ctx-icon">📄</span>Copy<span class="ctx-shortcut">Ctrl+C</span></div>
                <div class="ctx-sep"></div>
                <div class="ctx-item" data-action="delete"><span class="ctx-icon">🗑️</span>Delete<span class="ctx-shortcut">Del</span></div>
            `;
        } else {
            // Canvas context menu
            let submenuItems = '';
            for (const [type, def] of Object.entries(NODE_TYPES)) {
                submenuItems += `<div class="ctx-item" data-action="add-node" data-type="${type}"><span class="ctx-icon">${def.icon}</span>${def.displayName}</div>`;
            }
            const canPaste = this.clipboard !== null;
            menu.innerHTML = `
                <div class="ctx-submenu">
                    <div class="ctx-item"><span class="ctx-icon">➕</span>Add Node</div>
                    <div class="ctx-sub-list">${submenuItems}</div>
                </div>
                <div class="ctx-sep"></div>
                <div class="ctx-item" data-action="select-all"><span class="ctx-icon">☑</span>Select All<span class="ctx-shortcut">Ctrl+A</span></div>
                <div class="ctx-item" data-action="paste" ${canPaste ? '' : 'style="opacity:0.4;pointer-events:none"'}><span class="ctx-icon">📌</span>Paste<span class="ctx-shortcut">Ctrl+V</span></div>
                <div class="ctx-sep"></div>
                <div class="ctx-item" data-action="delete-selected" ${this.selectedNodes.length ? '' : 'style="opacity:0.4;pointer-events:none"'}><span class="ctx-icon">🗑️</span>Delete Selected<span class="ctx-shortcut">Del</span></div>
                <div class="ctx-item" data-action="auto-layout"><span class="ctx-icon">📐</span>Auto Layout</div>
                <div class="ctx-item" data-action="fit-view"><span class="ctx-icon">🔍</span>Fit View<span class="ctx-shortcut">Home</span></div>
            `;
        }

        // Position
        menu.style.left = e.clientX + 'px';
        menu.style.top = e.clientY + 'px';
        document.body.appendChild(menu);

        // Keep in viewport
        const mRect = menu.getBoundingClientRect();
        if (mRect.right > window.innerWidth) menu.style.left = (e.clientX - mRect.width) + 'px';
        if (mRect.bottom > window.innerHeight) menu.style.top = (e.clientY - mRect.height) + 'px';

        // Action handlers
        menu.addEventListener('click', ev => {
            const item = ev.target.closest('.ctx-item');
            if (!item) return;
            const action = item.dataset.action;
            const wp2 = this.screenToWorld(sx, sy);
            switch (action) {
                case 'add-node':
                    this.addNode(item.dataset.type, wp2.x - 110, wp2.y - 20);
                    break;
                case 'select-all':
                    this._selectAll();
                    break;
                case 'delete':
                case 'delete-selected':
                    this._deleteSelected();
                    break;
                case 'copy':
                    this._copySelected();
                    break;
                case 'paste':
                    this._pasteAt(wp2.x, wp2.y);
                    break;
                case 'duplicate':
                    this._duplicateSelected();
                    break;
                case 'execute-node':
                    if (hitNode) this._executeSingleNode(hitNode);
                    break;
                case 'auto-layout':
                    this._autoLayout();
                    break;
                case 'fit-view':
                    this.fitView();
                    break;
            }
            this._closeContextMenu();
        });
    }

    _closeContextMenu() {
        const m = document.getElementById('wf-context-menu');
        if (m) m.remove();
    }

    /* ── Mouse events ── */
    _onMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const wp = this.screenToWorld(sx, sy);

        // Middle mouse or space+left → pan
        if (e.button === 1 || (e.button === 0 && this.spaceDown)) {
            this.panning = true;
            this.panStartX = e.clientX - this.panX;
            this.panStartY = e.clientY - this.panY;
            this.canvas.classList.add('grabbing');
            return;
        }

        if (e.button !== 0) return;

        // Check port click (output port → start connection)
        for (const node of this.nodes) {
            const outPort = node.getPortAt(wp.x, wp.y, 'output');
            if (outPort) {
                this.connecting = true;
                this.connectFromPort = outPort;
                this.connectMouseX = wp.x;
                this.connectMouseY = wp.y;
                this.canvas.classList.add('connecting');
                return;
            }
            const inPort = node.getPortAt(wp.x, wp.y, 'input');
            if (inPort) {
                // If already connected, detach and start re-connecting
                const existing = this.connections.find(c => c.toInput === inPort);
                if (existing) {
                    this.connecting = true;
                    this.connectFromPort = existing.fromOutput;
                    this.connectMouseX = wp.x;
                    this.connectMouseY = wp.y;
                    this._removeConnection(existing);
                    this.canvas.classList.add('connecting');
                    return;
                }
            }
        }

        // Check node header drag
        for (let i = this.nodes.length - 1; i >= 0; i--) {
            const node = this.nodes[i];
            if (node.contains(wp.x, wp.y)) {
                // Select
                if (!e.shiftKey && !this.selectedNodes.includes(node)) {
                    this._deselectAll();
                }
                node.selected = true;
                if (!this.selectedNodes.includes(node)) this.selectedNodes.push(node);
                this._updateInspector();
                this.markDirty();

                if (node.headerContains(wp.x, wp.y) || node.contains(wp.x, wp.y)) {
                    this.dragging = true;
                    this.dragNode = node;
                    this.dragOffsetX = wp.x - node.x;
                    this.dragOffsetY = wp.y - node.y;
                }
                return;
            }
        }

        // Click on empty canvas → deselect or marquee select
        if (!e.shiftKey) this._deselectAll();
        this.marquee = { x1: wp.x, y1: wp.y, x2: wp.x, y2: wp.y };
        this.selecting = true;
        this.markDirty();
    }

    _onMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const wp = this.screenToWorld(sx, sy);

        // Status bar position
        const posEl = document.getElementById('statusPos');
        if (posEl) posEl.textContent = `${Math.round(wp.x)}, ${Math.round(wp.y)}`;

        if (this.panning) {
            this.panX = e.clientX - this.panStartX;
            this.panY = e.clientY - this.panStartY;
            this.markDirty();
            return;
        }

        if (this.dragging && this.dragNode) {
            const nx = wp.x - this.dragOffsetX;
            const ny = wp.y - this.dragOffsetY;
            const dx = nx - this.dragNode.x;
            const dy = ny - this.dragNode.y;
            for (const n of this.selectedNodes) {
                n.x += dx;
                n.y += dy;
            }
            this.markDirty();
            return;
        }

        if (this.connecting) {
            this.connectMouseX = wp.x;
            this.connectMouseY = wp.y;
            this.markDirty();
            return;
        }

        if (this.selecting && this.marquee) {
            this.marquee.x2 = wp.x;
            this.marquee.y2 = wp.y;
            this.markDirty();
        }
    }

    _onMouseUp(e) {
        if (this.panning) {
            this.panning = false;
            this.canvas.classList.remove('grabbing');
            return;
        }

        if (this.dragging) {
            this.dragging = false;
            this.dragNode = null;
            this._undoSaveState();
            return;
        }

        if (this.connecting) {
            this.connecting = false;
            this.canvas.classList.remove('connecting');
            const rect = this.canvas.getBoundingClientRect();
            const sx = e.clientX - rect.left;
            const sy = e.clientY - rect.top;
            const wp = this.screenToWorld(sx, sy);

            // Find input port under mouse
            for (const node of this.nodes) {
                const inPort = node.getPortAt(wp.x, wp.y, 'input');
                if (inPort && this.connectFromPort && inPort.node !== this.connectFromPort.node) {
                    // Prevent duplicate connections to same input
                    const existing = this.connections.find(c => c.toInput === inPort);
                    if (existing) this._removeConnection(existing);
                    // Prevent circular
                    if (!this._wouldCreateCycle(this.connectFromPort.node, inPort.node)) {
                        const conn = new NodeConnection(this.connectFromPort.node, this.connectFromPort, inPort.node, inPort);
                        this.connections.push(conn);
                        this._undoSaveState();
                    } else {
                        showToast('Connection would create a cycle', 'error');
                    }
                    break;
                }
            }
            this.connectFromPort = null;
            this.markDirty();
            return;
        }

        if (this.selecting && this.marquee) {
            const m = this.marquee;
            const x1 = Math.min(m.x1, m.x2), x2 = Math.max(m.x1, m.x2);
            const y1 = Math.min(m.y1, m.y2), y2 = Math.max(m.y1, m.y2);
            for (const n of this.nodes) {
                if (n.x + n.width > x1 && n.x < x2 && n.y + n.height > y1 && n.y < y2) {
                    n.selected = true;
                    if (!this.selectedNodes.includes(n)) this.selectedNodes.push(n);
                }
            }
            this.marquee = null;
            this.selecting = false;
            this._updateInspector();
            this.markDirty();
        }
    }

    _onWheel(e) {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const oldZoom = this.zoom;
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        this.zoom = clamp(this.zoom * delta, 0.15, 4);
        // Zoom toward cursor
        this.panX = mx - (mx - this.panX) * (this.zoom / oldZoom);
        this.panY = my - (my - this.panY) * (this.zoom / oldZoom);
        const zoomEl = document.getElementById('zoomDisplay');
        if (zoomEl) zoomEl.textContent = Math.round(this.zoom * 100) + '%';
        this.markDirty();
    }

    _onDblClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const wp = this.screenToWorld(sx, sy);
        for (let i = this.nodes.length - 1; i >= 0; i--) {
            if (this.nodes[i].contains(wp.x, wp.y)) {
                this._deselectAll();
                this.nodes[i].selected = true;
                this.selectedNodes = [this.nodes[i]];
                this._updateInspector();
                // Focus the name field
                setTimeout(() => {
                    const first = document.querySelector('#inspector-fields .prop-input, #inspector-fields .prop-select');
                    if (first) first.focus();
                }, 50);
                return;
            }
        }
    }

    _onKeyDown(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

        if (e.code === 'Space') { this.spaceDown = true; e.preventDefault(); }

        // Delete
        if (e.code === 'Delete' || e.code === 'Backspace') {
            this._deleteSelected();
        }
        // Ctrl+Z
        if (e.ctrlKey && e.code === 'KeyZ' && !e.shiftKey) { e.preventDefault(); this._undo(); }
        // Ctrl+Y or Ctrl+Shift+Z
        if ((e.ctrlKey && e.code === 'KeyY') || (e.ctrlKey && e.shiftKey && e.code === 'KeyZ')) { e.preventDefault(); this._redo(); }
        // Ctrl+S
        if (e.ctrlKey && e.code === 'KeyS') { e.preventDefault(); this.saveWorkflow(); }
        // Ctrl+A
        if (e.ctrlKey && e.code === 'KeyA') { e.preventDefault(); this._selectAll(); }
        // Ctrl+C - Copy
        if (e.ctrlKey && e.code === 'KeyC') { e.preventDefault(); this._copySelected(); }
        // Ctrl+V - Paste
        if (e.ctrlKey && e.code === 'KeyV') { e.preventDefault(); this._pasteAt(this.viewW / 2, this.viewH / 2); }
        // Ctrl+D - Duplicate
        if (e.ctrlKey && e.code === 'KeyD') { e.preventDefault(); this._duplicateSelected(); }
        // Home - Fit view
        if (e.code === 'Home') { this.fitView(); }
        // ? - Shortcuts
        if (e.code === 'Slash' && e.shiftKey) { this._showShortcutsModal(); }
        // Escape
        if (e.code === 'Escape') {
            this._closeContextMenu();
            this._closeShortcutsModal();
            this._deselectAll();
        }
    }

    _onKeyUp(e) {
        if (e.code === 'Space') this.spaceDown = false;
    }

    /* ── Minimap interaction ── */
    _onMinimapMouseDown(e) {
        this._mmDragging = true;
        this._minimapPanTo(e);
    }
    _onMinimapMouseMove(e) {
        if (!this._mmDragging) return;
        this._minimapPanTo(e);
    }
    _onMinimapMouseUp() {
        this._mmDragging = false;
    }

    _minimapPanTo(e) {
        if (!this._mmBounds) return;
        const rect = this.minimap.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const b = this._mmBounds;
        // Convert minimap coords back to world coords
        const wx = (mx - b.offX) / b.scale + b.minX;
        const wy = (my - b.offY) / b.scale + b.minY;
        // Center viewport on that point
        this.panX = this.viewW / 2 - wx * this.zoom;
        this.panY = this.viewH / 2 - wy * this.zoom;
        this.markDirty();
    }

    /* ── Clipboard ── */
    _copySelected() {
        if (this.selectedNodes.length === 0) return;
        this.clipboard = this.selectedNodes.map(n => n.serialize());
        showToast(`Copied ${this.clipboard.length} node(s)`, 'success');
    }

    _pasteAt(cx, cy) {
        if (!this.clipboard || this.clipboard.length === 0) return;
        // Calculate center of clipboard nodes
        const avgX = this.clipboard.reduce((s, n) => s + n.x, 0) / this.clipboard.length;
        const avgY = this.clipboard.reduce((s, n) => s + n.y, 0) / this.clipboard.length;
        const wp = this.screenToWorld(cx, cy);
        const dx = wp.x - avgX;
        const dy = wp.y - avgY;

        this._deselectAll();
        const idMap = {};
        for (const nd of this.clipboard) {
            const newId = uid();
            idMap[nd.id] = newId;
            const node = this.addNode(nd.type, nd.x + dx, nd.y + dy, newId);
            Object.assign(node.params, JSON.parse(JSON.stringify(nd.params)));
            node.selected = true;
            this.selectedNodes.push(node);
        }
        this._updateInspector();
        showToast(`Pasted ${this.clipboard.length} node(s)`, 'success');
    }

    _duplicateSelected() {
        if (this.selectedNodes.length === 0) return;
        this.clipboard = this.selectedNodes.map(n => n.serialize());
        this._pasteAt(this.viewW / 2 + 30, this.viewH / 2 + 30);
    }

    /* ── Palette drag-and-drop ── */
    _initPaletteDrag() {
        const items = document.querySelectorAll('.palette-item');
        const ghost = document.getElementById('dragGhost');
        items.forEach(item => {
            item.addEventListener('dragstart', e => {
                e.dataTransfer.setData('text/plain', item.dataset.type);
                if (ghost) {
                    ghost.textContent = item.querySelector('.name').textContent;
                    ghost.style.display = 'block';
                    e.dataTransfer.setDragImage(ghost, 40, 16);
                    setTimeout(() => ghost.style.display = 'none', 0);
                }
            });
        });
        this.canvas.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
        this.canvas.addEventListener('drop', e => {
            e.preventDefault();
            const type = e.dataTransfer.getData('text/plain');
            if (!NODE_TYPES[type]) return;
            const rect = this.canvas.getBoundingClientRect();
            const sx = e.clientX - rect.left;
            const sy = e.clientY - rect.top;
            const wp = this.screenToWorld(sx, sy);
            this.addNode(type, wp.x - 110, wp.y - 20);
        });
    }

    /* ── Node management ── */
    addNode(type, x, y, id) {
        const node = new WorkflowNode(type, x, y, id);
        this.nodes.push(node);
        this._deselectAll();
        node.selected = true;
        this.selectedNodes = [node];
        this._updateInspector();
        this._undoSaveState();
        this._updateStatus();
        this.markDirty();
        return node;
    }

    _deleteSelected() {
        if (this.selectedConnection) {
            this._removeConnection(this.selectedConnection);
            this.selectedConnection = null;
            this._undoSaveState();
            this.markDirty();
            return;
        }
        if (this.selectedNodes.length === 0) return;
        const ids = new Set(this.selectedNodes.map(n => n.id));
        this.connections = this.connections.filter(c => {
            if (ids.has(c.fromNode.id) || ids.has(c.toNode.id)) return false;
            return true;
        });
        this.nodes = this.nodes.filter(n => !ids.has(n.id));
        this.selectedNodes = [];
        this._updateInspector();
        this._undoSaveState();
        this._updateStatus();
        this.markDirty();
    }

    _removeConnection(conn) {
        this.connections = this.connections.filter(c => c !== conn);
        this.markDirty();
    }

    _deselectAll() {
        this.nodes.forEach(n => n.selected = false);
        this.selectedNodes = [];
        this.selectedConnection = null;
        this._updateInspector();
        this.markDirty();
    }

    _selectAll() {
        this.nodes.forEach(n => n.selected = true);
        this.selectedNodes = [...this.nodes];
        this._updateInspector();
        this.markDirty();
    }

    _wouldCreateCycle(from, to) {
        // BFS from 'to' to see if we can reach 'from'
        const visited = new Set();
        const queue = [to];
        while (queue.length) {
            const cur = queue.shift();
            if (cur === from) return true;
            if (visited.has(cur.id)) continue;
            visited.add(cur.id);
            for (const c of this.connections) {
                if (c.fromNode === cur) queue.push(c.toNode);
            }
        }
        return false;
    }

    /* ── Undo / Redo ── */
    _getStateSnapshot() {
        return JSON.stringify({
            nodes: this.nodes.map(n => n.serialize()),
            connections: this.connections.map(c => c.serialize()),
        });
    }
    _undoSaveState() {
        this.undoStack.push(this._getStateSnapshot());
        if (this.undoStack.length > 50) this.undoStack.shift();
        this.redoStack = [];
    }
    _restoreState(json) {
        const state = JSON.parse(json);
        this.nodes = [];
        this.connections = [];
        this.selectedNodes = [];
        this.selectedConnection = null;
        for (const nd of state.nodes) {
            this.addNode(nd.type, nd.x, nd.y, nd.id);
            const node = this.nodes[this.nodes.length - 1];
            Object.assign(node.params, nd.params);
            node.selected = false;
        }
        this.selectedNodes = [];
        for (const cd of state.connections) {
            const from = this.nodes.find(n => n.id === cd.fromNode);
            const to = this.nodes.find(n => n.id === cd.toNode);
            if (!from || !to) continue;
            const outP = from.outputs.find(p => p.name === cd.fromOutput);
            const inP = to.inputs.find(p => p.name === cd.toInput);
            if (outP && inP) this.connections.push(new NodeConnection(from, outP, to, inP, cd.id));
        }
        this._updateInspector();
        this._updateStatus();
        this.markDirty();
    }
    _undo() {
        if (this.undoStack.length <= 1) return;
        this.redoStack.push(this.undoStack.pop());
        this._restoreState(this.undoStack[this.undoStack.length - 1]);
        showToast('Undo');
    }
    _redo() {
        if (this.redoStack.length === 0) return;
        const state = this.redoStack.pop();
        this.undoStack.push(state);
        this._restoreState(state);
        showToast('Redo');
    }

    /* ── Inspector ── */
    _updateInspector() {
        const header = document.getElementById('inspector-header');
        const empty = document.getElementById('inspector-empty');
        const fields = document.getElementById('inspector-fields');
        if (!header || !empty || !fields) return;

        if (this.selectedNodes.length !== 1) {
            header.style.display = 'none';
            empty.style.display = 'flex';
            fields.style.display = 'none';
            return;
        }

        const node = this.selectedNodes[0];
        const def = node.def;
        header.style.display = 'flex';
        empty.style.display = 'none';
        fields.style.display = 'block';

        const inspIcon = document.getElementById('inspIcon');
        const inspName = document.getElementById('inspName');
        const inspType = document.getElementById('inspType');
        if (inspIcon) {
            inspIcon.textContent = def.icon;
            inspIcon.style.background = def.color + '22';
            inspIcon.style.color = def.color;
        }
        if (inspName) inspName.textContent = def.displayName;
        if (inspType) inspType.textContent = def.type + ' · ' + def.category;

        // Build fields
        fields.innerHTML = '';

        // Inputs group
        const inpGroup = document.createElement('div');
        inpGroup.className = 'prop-group';
        inpGroup.innerHTML = '<div class="prop-group-title">Inputs</div>';
        for (const inp of def.inputs) {
            if (inp.type === 'group') {
                for (const f of inp.fields) {
                    inpGroup.appendChild(this._buildField(node, inp.name + '.' + f.name, f, node.params[inp.name]?.[f.name]));
                }
            } else {
                inpGroup.appendChild(this._buildField(node, inp.name, inp, node.params[inp.name]));
            }
        }
        fields.appendChild(inpGroup);

        // Outputs group
        const outGroup = document.createElement('div');
        outGroup.className = 'prop-group';
        outGroup.innerHTML = '<div class="prop-group-title">Outputs</div>';
        for (const out of def.outputs) {
            const div = document.createElement('div');
            div.className = 'prop-field';
            const connected = this.connections.some(c => c.fromNode === node && c.fromOutput.name === out.name);
            div.innerHTML = `
                <div class="prop-label">${out.label} <span class="prop-hint">${out.type}</span></div>
                <div style="font-size:11px;color:var(--text-dim);padding:4px 0;">${connected ? '✅ Connected' : '○ Not connected'}</div>
            `;
            outGroup.appendChild(div);
        }
        fields.appendChild(outGroup);

        // Exec status with elapsed time
        if (node.execState) {
            const st = document.createElement('div');
            st.className = 'exec-status ' + node.execState;
            if (node.execState === 'running') {
                const elapsed = node.execStartTime ? ((Date.now() - node.execStartTime) / 1000).toFixed(1) : '0.0';
                st.innerHTML = `<span class="spinner"></span> Running... (${elapsed}s)`;
            } else if (node.execState === 'success') {
                const timeStr = node.execElapsed ? ` (${(node.execElapsed / 1000).toFixed(1)}s)` : '';
                st.innerHTML = `✓ Completed${timeStr}`;
            } else {
                st.innerHTML = '✗ Error';
            }
            fields.appendChild(st);
        }

        // Output preview
        if (node.outputData) {
            const pre = document.createElement('div');
            pre.className = 'output-preview';
            pre.textContent = typeof node.outputData === 'string' ? node.outputData : JSON.stringify(node.outputData, null, 2);
            fields.appendChild(pre);
        }
    }

    _buildField(node, path, def, value) {
        const div = document.createElement('div');
        div.className = 'prop-field';
        const connected = this.connections.some(c => c.toNode === node && c.toInput.name === def.name);

        const label = document.createElement('div');
        label.className = 'prop-label';
        label.innerHTML = `<span>${def.label || def.name}</span><span class="prop-hint">${def.type}</span>`;
        if (connected) label.innerHTML += '<span class="prop-connected-badge">🔗 linked</span>';
        div.appendChild(label);

        let input;
        const update = (v) => {
            const parts = path.split('.');
            if (parts.length === 2) {
                if (!node.params[parts[0]]) node.params[parts[0]] = {};
                node.params[parts[0]][parts[1]] = v;
            } else {
                node.params[path] = v;
            }
            this.markDirty();
        };

        if (connected) {
            input = document.createElement('input');
            input.className = 'prop-input connected';
            input.value = value ?? '(connected)';
            input.disabled = true;
            div.appendChild(input);
            return div;
        }

        switch (def.type) {
            case 'slider': {
                const row = document.createElement('div');
                row.className = 'prop-slider-row';
                input = document.createElement('input');
                input.type = 'range'; input.className = 'prop-slider';
                input.min = def.min; input.max = def.max; input.step = def.step;
                input.value = value ?? def.default;
                const valSpan = document.createElement('span');
                valSpan.className = 'prop-slider-value';
                valSpan.textContent = input.value;
                input.addEventListener('input', () => { valSpan.textContent = input.value; update(parseFloat(input.value)); });
                row.appendChild(input);
                row.appendChild(valSpan);
                div.appendChild(row);
                break;
            }
            case 'dropdown': {
                input = document.createElement('select');
                input.className = 'prop-select';
                for (const opt of def.options) {
                    const o = document.createElement('option');
                    o.value = opt; o.textContent = opt;
                    if (opt === value) o.selected = true;
                    input.appendChild(o);
                }
                input.addEventListener('change', () => update(input.value));
                div.appendChild(input);
                break;
            }
            case 'toggle': {
                input = document.createElement('select');
                input.className = 'prop-select';
                ['false','true'].forEach(v => {
                    const o = document.createElement('option');
                    o.value = v; o.textContent = v === 'true' ? 'Yes' : 'No';
                    if ((value ?? false) === (v === 'true')) o.selected = true;
                    input.appendChild(o);
                });
                input.addEventListener('change', () => update(input.value === 'true'));
                div.appendChild(input);
                break;
            }
            case 'number': {
                input = document.createElement('input');
                input.className = 'prop-input'; input.type = 'number';
                input.value = value ?? def.default ?? 0;
                if (def.min != null) input.min = def.min;
                if (def.max != null) input.max = def.max;
                input.addEventListener('change', () => update(parseFloat(input.value)));
                div.appendChild(input);
                break;
            }
            case 'color': {
                const row = document.createElement('div');
                row.className = 'prop-color-row';
                const swatch = document.createElement('div');
                swatch.className = 'prop-color-swatch';
                swatch.style.background = value || '#ffffff';
                const hidden = document.createElement('input');
                hidden.type = 'color'; hidden.className = 'prop-color-input';
                hidden.value = value || '#ffffff';
                swatch.addEventListener('click', () => hidden.click());
                hidden.addEventListener('input', () => { swatch.style.background = hidden.value; update(hidden.value); });
                row.appendChild(swatch);
                row.appendChild(hidden);
                const hexInput = document.createElement('input');
                hexInput.className = 'prop-input'; hexInput.value = value || '#ffffff';
                hexInput.style.flex = '1';
                hexInput.addEventListener('change', () => { swatch.style.background = hexInput.value; hidden.value = hexInput.value; update(hexInput.value); });
                row.appendChild(hexInput);
                div.appendChild(row);
                break;
            }
            case 'json': {
                input = document.createElement('textarea');
                input.className = 'prop-textarea';
                input.value = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
                input.rows = 3;
                input.addEventListener('change', () => {
                    try { update(JSON.parse(input.value)); input.style.borderColor = ''; }
                    catch { input.style.borderColor = 'var(--danger)'; }
                });
                div.appendChild(input);
                break;
            }
            case 'file': {
                const row = document.createElement('div');
                row.style.display = 'flex'; row.style.gap = '6px';
                input = document.createElement('input');
                input.className = 'prop-input'; input.type = 'text';
                input.value = value || ''; input.placeholder = def.accept || 'Select file...';
                input.style.flex = '1';
                input.addEventListener('change', () => update(input.value));
                const btn = document.createElement('button');
                btn.className = 'toolbar-btn'; btn.textContent = '📁'; btn.style.padding = '6px 8px';
                btn.addEventListener('click', () => {
                    const fi = document.createElement('input'); fi.type = 'file';
                    if (def.accept) fi.accept = def.accept;
                    fi.onchange = () => { if (fi.files[0]) { input.value = fi.files[0].name; update(fi.files[0].name); } };
                    fi.click();
                });
                row.appendChild(input);
                row.appendChild(btn);
                div.appendChild(row);
                break;
            }
            default: {
                input = document.createElement('input');
                input.className = 'prop-input'; input.type = 'text';
                input.value = value ?? '';
                input.addEventListener('change', () => update(input.value));
                div.appendChild(input);
            }
        }
        return div;
    }

    /* ── Status bar ── */
    _updateStatus() {
        const nEl = document.getElementById('statusNodes');
        const cEl = document.getElementById('statusConns');
        if (nEl) nEl.textContent = 'Nodes: ' + this.nodes.length;
        if (cEl) cEl.textContent = 'Connections: ' + this.connections.length;
    }

    /* ── API ── */
    async loadWorkflow(id) {
        try {
            const res = await fetch('/api/workflows/' + id);
            if (!res.ok) throw new Error('Not found');
            const data = await res.json();
            this.workflowId = id;
            this.workflowName = data.name || 'Untitled';
            const nameEl = document.getElementById('workflowName');
            if (nameEl) nameEl.value = this.workflowName;
            if (data.nodes) {
                this.nodes = []; this.connections = [];
                for (const nd of data.nodes) this.addNode(nd.type, nd.x, nd.y, nd.id);
                for (const nd of data.nodes) {
                    const node = this.nodes.find(n => n.id === nd.id);
                    if (node && nd.params) Object.assign(node.params, nd.params);
                }
                if (data.connections) {
                    for (const cd of data.connections) {
                        const from = this.nodes.find(n => n.id === cd.fromNode);
                        const to = this.nodes.find(n => n.id === cd.toNode);
                        if (!from || !to) continue;
                        const outP = from.outputs.find(p => p.name === cd.fromOutput);
                        const inP = to.inputs.find(p => p.name === cd.toInput);
                        if (outP && inP) this.connections.push(new NodeConnection(from, outP, to, inP, cd.id));
                    }
                }
            }
            this._deselectAll();
            this._undoSaveState();
            this._updateStatus();
            this.markDirty();
            showToast('Workflow loaded', 'success');
        } catch (err) {
            showToast('Load failed: ' + err.message, 'error');
        }
    }

    async saveWorkflow() {
        const nameEl = document.getElementById('workflowName');
        const name = nameEl ? nameEl.value : this.workflowName;
        const payload = {
            name,
            nodes: this.nodes.map(n => n.serialize()),
            connections: this.connections.map(c => c.serialize()),
        };
        try {
            const url = this.workflowId ? '/api/workflows/' + this.workflowId : '/api/workflows';
            const method = this.workflowId ? 'PUT' : 'POST';
            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!res.ok) throw new Error('Save failed');
            const data = await res.json();
            if (data._id || data.id) this.workflowId = data._id || data.id;
            showToast('Workflow saved ✓', 'success');
            this._refreshWorkflowList();
        } catch (err) {
            showToast('Save failed: ' + err.message, 'error');
        }
    }

    async listWorkflows() {
        try {
            const res = await fetch('/api/workflows');
            if (!res.ok) return [];
            return await res.json();
        } catch {
            return [];
        }
    }

    async _refreshWorkflowList() {
        const sel = document.getElementById('wf-workflow-select');
        if (!sel) return;
        const workflows = await this.listWorkflows();
        const currentVal = this.workflowId || '';
        sel.innerHTML = '<option value="">— Select Workflow —</option>';
        for (const wf of workflows) {
            const opt = document.createElement('option');
            const wfId = wf._id || wf.id;
            opt.value = wfId;
            opt.textContent = wf.name || 'Untitled';
            if (wfId === currentVal) opt.selected = true;
            sel.appendChild(opt);
        }
    }

    newWorkflow() {
        this.nodes = [];
        this.connections = [];
        this.selectedNodes = [];
        this.selectedConnection = null;
        this.workflowId = null;
        this.workflowName = 'Untitled Workflow';
        const nameEl = document.getElementById('workflowName');
        if (nameEl) nameEl.value = this.workflowName;
        this._deselectAll();
        this._undoSaveState();
        this._updateStatus();
        this.markDirty();
        showToast('New workflow created', 'success');
    }

    /* ── Execution ── */
    async executeWorkflow() {
        if (this.nodes.length === 0) { showToast('Nothing to execute', 'error'); return; }
        if (this._executing) return;

        // Reset exec states
        this.nodes.forEach(n => { n.execState = null; n.outputData = null; n.execStartTime = null; n.execElapsed = null; });
        this._updateInspector();

        // Topological sort
        const sorted = this._topoSort();
        if (!sorted) { showToast('Cycle detected — cannot execute', 'error'); return; }

        this._executing = true;
        this._execTotal = sorted.length;
        this._execProgress = 0;
        this._showProgress(0);
        this._animating = true;

        for (const node of sorted) {
            node.execState = 'running';
            node.execStartTime = Date.now();
            this._updateInspector();
            this._focusNode(node);
            this._updateProgress();

            try {
                const res = await fetch('/api/workflows/execute-node', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: node.type, params: node.params, inputs: this._gatherInputs(node) }),
                });
                if (res.ok) {
                    const data = await res.json();
                    node.execState = 'success';
                    node.outputData = data.outputs || data;
                } else {
                    node.execState = 'error';
                    node.outputData = { error: 'HTTP ' + res.status };
                }
            } catch {
                // Offline simulation
                await new Promise(r => setTimeout(r, 400 + Math.random() * 600));
                node.execState = 'success';
                node.outputData = { simulated: true, type: node.type, timestamp: Date.now() };
            }
            node.execElapsed = Date.now() - node.execStartTime;
            this._execProgress++;
            this._updateInspector();
        }

        this._executing = false;
        this._hideProgress();
        // Keep animating for a few seconds to show completion dots
        setTimeout(() => { this._animating = false; }, 3000);
        showToast('Execution complete ✓', 'success');
    }

    async _executeSingleNode(node) {
        if (this._executing) return;
        node.execState = 'running';
        node.execStartTime = Date.now();
        node.outputData = null;
        this._updateInspector();
        this.markDirty();

        try {
            const res = await fetch('/api/workflows/execute-node', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: node.type, params: node.params, inputs: this._gatherInputs(node) }),
            });
            if (res.ok) {
                const data = await res.json();
                node.execState = 'success';
                node.outputData = data.outputs || data;
            } else {
                node.execState = 'error';
                node.outputData = { error: 'HTTP ' + res.status };
            }
        } catch {
            await new Promise(r => setTimeout(r, 400 + Math.random() * 600));
            node.execState = 'success';
            node.outputData = { simulated: true, type: node.type, timestamp: Date.now() };
        }
        node.execElapsed = Date.now() - node.execStartTime;
        this._updateInspector();
        this.markDirty();
    }

    _showProgress() {
        const bar = document.getElementById('wf-progress-bar');
        if (bar) bar.style.display = 'block';
    }
    _updateProgress() {
        const fill = document.getElementById('wf-progress-fill');
        if (fill) {
            const pct = this._execTotal > 0 ? (this._execProgress / this._execTotal * 100) : 0;
            fill.style.width = pct + '%';
            fill.classList.remove('indeterminate');
        }
    }
    _hideProgress() {
        const bar = document.getElementById('wf-progress-bar');
        const fill = document.getElementById('wf-progress-fill');
        if (fill) fill.style.width = '100%';
        setTimeout(() => { if (bar) bar.style.display = 'none'; }, 500);
    }

    _topoSort() {
        const inDeg = new Map();
        this.nodes.forEach(n => inDeg.set(n.id, 0));
        for (const c of this.connections) inDeg.set(c.toNode.id, (inDeg.get(c.toNode.id) || 0) + 1);
        const queue = this.nodes.filter(n => inDeg.get(n.id) === 0);
        const result = [];
        while (queue.length) {
            const n = queue.shift();
            result.push(n);
            for (const c of this.connections) {
                if (c.fromNode === n) {
                    const deg = inDeg.get(c.toNode.id) - 1;
                    inDeg.set(c.toNode.id, deg);
                    if (deg === 0) queue.push(c.toNode);
                }
            }
        }
        return result.length === this.nodes.length ? result : null;
    }

    _gatherInputs(node) {
        const inputs = {};
        for (const c of this.connections) {
            if (c.toNode === node) {
                inputs[c.toInput.name] = c.fromNode.outputData || { ref: c.fromNode.id };
            }
        }
        return inputs;
    }

    _focusNode(node) {
        const cx = node.x + node.width / 2;
        const cy = node.y + node.height / 2;
        this.panX = this.viewW / 2 - cx * this.zoom;
        this.panY = this.viewH / 2 - cy * this.zoom;
        this.markDirty();
    }

    /* ── Auto Layout ── */
    _autoLayout() {
        if (this.nodes.length === 0) return;

        // Build adjacency
        const children = new Map();
        const parents = new Map();
        this.nodes.forEach(n => { children.set(n.id, []); parents.set(n.id, []); });
        for (const c of this.connections) {
            children.get(c.fromNode.id).push(c.toNode.id);
            parents.get(c.toNode.id).push(c.fromNode.id);
        }

        // Assign layers via longest-path
        const layers = new Map();
        const visited = new Set();

        function getLayer(nodeId) {
            if (layers.has(nodeId)) return layers.get(nodeId);
            const pars = parents.get(nodeId);
            if (!pars || pars.length === 0) { layers.set(nodeId, 0); return 0; }
            let maxP = 0;
            for (const pid of pars) {
                maxP = Math.max(maxP, getLayer(pid) + 1);
            }
            layers.set(nodeId, maxP);
            return maxP;
        }

        for (const n of this.nodes) getLayer(n.id);

        // Group by layer
        const layerGroups = new Map();
        for (const n of this.nodes) {
            const l = layers.get(n.id);
            if (!layerGroups.has(l)) layerGroups.set(l, []);
            layerGroups.get(l).push(n);
        }

        // Position
        const hSpacing = 300;
        const vSpacing = 120;
        const maxLayer = Math.max(...layerGroups.keys(), 0);

        for (const [layer, group] of layerGroups) {
            const x = layer * hSpacing + 50;
            const totalHeight = group.length * vSpacing;
            const startY = -totalHeight / 2 + 50;
            for (let i = 0; i < group.length; i++) {
                group[i].x = x;
                group[i].y = startY + i * vSpacing;
            }
        }

        this.fitView();
        this._undoSaveState();
        showToast('Auto-layout applied', 'success');
    }

    /* ── Keyboard Shortcuts Modal ── */
    _showShortcutsModal() {
        this._closeShortcutsModal();
        const modal = document.createElement('div');
        modal.className = 'wf-shortcuts-modal';
        modal.id = 'wf-shortcuts-modal';
        const shortcuts = [
            ['Space + Drag', 'Pan canvas'],
            ['Scroll Wheel', 'Zoom in/out'],
            ['Delete / Backspace', 'Delete selected'],
            ['Ctrl + Z', 'Undo'],
            ['Ctrl + Y / Ctrl + Shift + Z', 'Redo'],
            ['Ctrl + S', 'Save workflow'],
            ['Ctrl + A', 'Select all nodes'],
            ['Ctrl + C', 'Copy selected nodes'],
            ['Ctrl + V', 'Paste copied nodes'],
            ['Ctrl + D', 'Duplicate selected nodes'],
            ['Home', 'Fit view to nodes'],
            ['?', 'Show this help'],
            ['Escape', 'Deselect / Close dialogs'],
            ['Shift + Click', 'Add to selection'],
            ['Right-Click', 'Context menu'],
        ];
        let rows = '';
        for (const [key, desc] of shortcuts) {
            rows += `<div class="shortcut-row"><span class="shortcut-label">${desc}</span><span class="shortcut-key">${key}</span></div>`;
        }
        modal.innerHTML = `
            <div class="modal-box">
                <div class="modal-title">⌨️ Keyboard Shortcuts</div>
                ${rows}
                <div style="text-align:center;margin-top:16px;">
                    <button id="wf-shortcuts-close" style="background:#2a2e3a;border:none;color:#e2e8f0;padding:6px 20px;border-radius:6px;cursor:pointer;font-size:12px;">Close</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        document.getElementById('wf-shortcuts-close').addEventListener('click', () => this._closeShortcutsModal());
        modal.addEventListener('click', (e) => { if (e.target === modal) this._closeShortcutsModal(); });
    }

    _closeShortcutsModal() {
        const m = document.getElementById('wf-shortcuts-modal');
        if (m) m.remove();
    }

    /* ── Render loop ── */
    _startLoop() {
        const loop = (time) => {
            // Always render when dirty or when animating (exec flow dots)
            if (this._dirty || this._animating) {
                this._render(time);
                this._dirty = false;
            }
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    _render(time) {
        const ctx = this.ctx;
        const w = this.viewW;
        const h = this.viewH;
        ctx.clearRect(0, 0, w, h);

        ctx.save();
        ctx.translate(this.panX, this.panY);
        ctx.scale(this.zoom, this.zoom);

        this._drawGrid(ctx);
        this._drawConnections(ctx, time);
        this._drawNodes(ctx, time);
        this._drawConnectingWire(ctx);
        this._drawMarquee(ctx);

        ctx.restore();

        this._renderMinimap();
    }

    _drawGrid(ctx) {
        const step = 20;
        const bigStep = 100;
        const x1 = -this.panX / this.zoom;
        const y1 = -this.panY / this.zoom;
        const x2 = (this.viewW - this.panX) / this.zoom;
        const y2 = (this.viewH - this.panY) / this.zoom;

        const startX = Math.floor(x1 / step) * step;
        const startY = Math.floor(y1 / step) * step;

        ctx.fillStyle = '#1e2130';
        for (let x = startX; x < x2; x += step) {
            for (let y = startY; y < y2; y += step) {
                const big = (x % bigStep === 0) && (y % bigStep === 0);
                ctx.beginPath();
                ctx.arc(x, y, big ? 1.5 : 0.8, 0, Math.PI * 2);
                ctx.fillStyle = big ? '#2a2e42' : '#1a1d2e';
                ctx.fill();
            }
        }
    }

    _drawConnections(ctx, time) {
        for (const conn of this.connections) {
            const from = conn.fromOutput.canvasPos;
            const to = conn.toInput.canvasPos;
            const selected = conn === this.selectedConnection || this.selectedNodes.includes(conn.fromNode) || this.selectedNodes.includes(conn.toNode);

            const dx = Math.abs(to.x - from.x) * 0.5;
            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.bezierCurveTo(from.x + dx, from.y, to.x - dx, to.y, to.x, to.y);

            // Gradient
            const grad = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
            grad.addColorStop(0, conn.fromNode.def.color);
            grad.addColorStop(1, conn.toInput.node.def.color);
            ctx.strokeStyle = grad;
            ctx.lineWidth = selected ? 3 : 2;
            ctx.globalAlpha = selected ? 1 : 0.6;
            ctx.stroke();
            ctx.globalAlpha = 1;

            // Animated flow dots
            const isRunning = conn.fromNode.execState === 'success' || conn.fromNode.execState === 'running';
            if (isRunning || this._animating) {
                const now = time || Date.now();
                const numDots = conn.fromNode.execState === 'running' ? 3 : 1;
                for (let d = 0; d < numDots; d++) {
                    const t = ((now % 2000) / 2000 + d / numDots) % 1;
                    const pt = this._bezierPoint(from, to, dx, t);
                    ctx.beginPath();
                    ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
                    ctx.fillStyle = conn.fromNode.execState === 'running' ? '#3b82f6' : '#10b981';
                    ctx.globalAlpha = 0.8;
                    ctx.fill();
                    ctx.globalAlpha = 1;
                }
            }

            // Connection label at midpoint
            if (this.zoom >= 0.4) {
                this._drawConnectionLabel(ctx, conn, from, to, dx);
            }
        }
    }

    _drawConnectionLabel(ctx, conn, from, to, dx) {
        const label = conn.fromOutput.type;
        const t = 0.5;
        const pt = this._bezierPoint(from, to, dx, t);

        ctx.font = '500 9px Inter, sans-serif';
        const textW = ctx.measureText(label).width;
        const padX = 6;
        const padY = 4;
        const pillW = textW + padX * 2;
        const pillH = 14;

        // Background pill
        ctx.fillStyle = 'rgba(15, 17, 23, 0.85)';
        ctx.beginPath();
        this._roundRect(ctx, pt.x - pillW / 2, pt.y - pillH / 2, pillW, pillH, 7);
        ctx.fill();

        // Border
        ctx.strokeStyle = conn.fromNode.def.color + '66';
        ctx.lineWidth = 1;
        ctx.beginPath();
        this._roundRect(ctx, pt.x - pillW / 2, pt.y - pillH / 2, pillW, pillH, 7);
        ctx.stroke();

        // Text
        ctx.fillStyle = conn.fromNode.def.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, pt.x, pt.y);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
    }

    _bezierPoint(from, to, dx, t) {
        const x = Math.pow(1-t,3)*from.x + 3*Math.pow(1-t,2)*t*(from.x+dx) + 3*(1-t)*t*t*(to.x-dx) + Math.pow(t,3)*to.x;
        const y = Math.pow(1-t,3)*from.y + 3*Math.pow(1-t,2)*t*from.y + 3*(1-t)*t*t*to.y + Math.pow(t,3)*to.y;
        return { x, y };
    }

    _drawNodes(ctx, time) {
        for (const node of this.nodes) {
            this._drawNode(ctx, node, time);
        }
    }

    _drawNode(ctx, node, time) {
        const { x, y, width: w, height: h, def, selected, execState } = node;
        const headerH = 34;
        const r = 10;

        // Shadow
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = selected ? 20 : 10;
        ctx.shadowOffsetY = 4;

        // Body background
        ctx.beginPath();
        this._roundRect(ctx, x, y, w, h, r);
        ctx.fillStyle = '#1a1d27';
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        // Header
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.arcTo(x + w, y, x + w, y + r, r);
        ctx.lineTo(x + w, y + headerH);
        ctx.lineTo(x, y + headerH);
        ctx.lineTo(x, y + r);
        ctx.arcTo(x, y, x + r, y, r);
        ctx.closePath();
        ctx.fillStyle = def.color;
        ctx.globalAlpha = 0.85;
        ctx.fill();
        ctx.globalAlpha = 1;

        // Header text
        ctx.fillStyle = '#fff';
        ctx.font = '600 12px Inter, sans-serif';
        ctx.fillText(def.icon + '  ' + def.displayName, x + 10, y + 22);

        // Border
        ctx.beginPath();
        this._roundRect(ctx, x, y, w, h, r);
        ctx.strokeStyle = selected ? def.color : '#2a2e3a';
        ctx.lineWidth = selected ? 2 : 1;
        ctx.stroke();

        // Exec glow
        if (execState === 'running') {
            ctx.beginPath();
            this._roundRect(ctx, x - 2, y - 2, w + 4, h + 4, r + 2);
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 2;
            const now = time || Date.now();
            ctx.globalAlpha = 0.5 + 0.5 * Math.sin(now / 200);
            ctx.stroke();
            ctx.globalAlpha = 1;

            // Elapsed time badge
            if (node.execStartTime) {
                const elapsed = ((Date.now() - node.execStartTime) / 1000).toFixed(1);
                const badge = elapsed + 's';
                ctx.font = '500 9px Inter, sans-serif';
                const bw = ctx.measureText(badge).width + 8;
                ctx.fillStyle = '#3b82f6';
                ctx.beginPath();
                this._roundRect(ctx, x + w - bw - 4, y + h + 4, bw, 14, 4);
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.textAlign = 'center';
                ctx.fillText(badge, x + w - bw / 2 - 4, y + h + 14);
                ctx.textAlign = 'left';
            }
        } else if (execState === 'success') {
            ctx.beginPath();
            this._roundRect(ctx, x - 2, y - 2, w + 4, h + 4, r + 2);
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Completion time badge
            if (node.execElapsed != null) {
                const badge = (node.execElapsed / 1000).toFixed(1) + 's';
                ctx.font = '500 9px Inter, sans-serif';
                const bw = ctx.measureText(badge).width + 8;
                ctx.fillStyle = '#10b981';
                ctx.beginPath();
                this._roundRect(ctx, x + w - bw - 4, y + h + 4, bw, 14, 4);
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.textAlign = 'center';
                ctx.fillText(badge, x + w - bw / 2 - 4, y + h + 14);
                ctx.textAlign = 'left';
            }
        } else if (execState === 'error') {
            ctx.beginPath();
            this._roundRect(ctx, x - 2, y - 2, w + 4, h + 4, r + 2);
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Output data preview on node body
        if (node.outputData && node.execState === 'success') {
            this._drawNodeOutputPreview(ctx, node);
        }

        // Ports
        const portSpacing = 22;
        const startY = headerH + 14;

        // Input ports
        ctx.font = '500 10px Inter, sans-serif';
        for (let i = 0; i < node.inputs.length; i++) {
            const port = node.inputs[i];
            const py = y + startY + i * portSpacing;
            const px = x;
            // Port circle
            ctx.beginPath();
            ctx.arc(px, py, 6, 0, Math.PI * 2);
            ctx.fillStyle = '#0f1117';
            ctx.fill();
            ctx.strokeStyle = def.color;
            ctx.lineWidth = 1.5;
            ctx.stroke();
            // Dot inside if connected
            if (this.connections.some(c => c.toInput === port)) {
                ctx.beginPath();
                ctx.arc(px, py, 3, 0, Math.PI * 2);
                ctx.fillStyle = def.color;
                ctx.fill();
            }
            // Label
            ctx.fillStyle = '#9ca3af';
            ctx.textAlign = 'left';
            ctx.fillText(port.label, px + 12, py + 4);
        }

        // Output ports
        for (let i = 0; i < node.outputs.length; i++) {
            const port = node.outputs[i];
            const py = y + startY + i * portSpacing;
            const px = x + w;
            ctx.beginPath();
            ctx.arc(px, py, 6, 0, Math.PI * 2);
            ctx.fillStyle = '#0f1117';
            ctx.fill();
            ctx.strokeStyle = def.color;
            ctx.lineWidth = 1.5;
            ctx.stroke();
            if (this.connections.some(c => c.fromOutput === port)) {
                ctx.beginPath();
                ctx.arc(px, py, 3, 0, Math.PI * 2);
                ctx.fillStyle = def.color;
                ctx.fill();
            }
            ctx.fillStyle = '#9ca3af';
            ctx.textAlign = 'right';
            ctx.fillText(port.label, px - 12, py + 4);
        }
        ctx.textAlign = 'left';

        // Parameter preview area
        this._drawParamPreview(ctx, node);
    }

    _drawParamPreview(ctx, node) {
        const headerH = 34;
        const portSpacing = 22;
        const maxPorts = Math.max(node.inputs.length, node.outputs.length);
        const paramY = node.y + headerH + 8 + maxPorts * portSpacing + 6;
        const paramH = 18;
        const { x, width: w } = node;

        // Only draw if there's room
        if (paramY + paramH > node.y + node.height - 4) return;

        ctx.save();
        ctx.beginPath();
        ctx.rect(x + 4, paramY, w - 8, paramH);
        ctx.clip();

        ctx.font = '400 9px Inter, sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.textAlign = 'left';

        let paramText = '';
        switch (node.type) {
            case 'world-anchor':
                paramText = `g: ${node.params.physicsRules?.gravity ?? 9.8}  •  ${node.params.globalLighting ?? 'HDRi'}`;
                break;
            case 'scene-composer':
                paramText = `${node.params.cameraLayout ?? 'free'}  •  ${node.params.weather?.type ?? 'clear'}`;
                break;
            case 'cinematic-camera':
                paramText = `${node.params.lensModel ?? 'ARRI'}  •  ${node.params.focalLength ?? 50}mm  •  f/${node.params.fStop ?? 2.8}`;
                break;
            case 'performance-director': {
                let tl = node.params.timeline;
                let count = 0;
                if (typeof tl === 'string') { try { tl = JSON.parse(tl); } catch {} }
                if (Array.isArray(tl)) count = tl.length;
                paramText = `${count} timeline entries`;
                break;
            }
            case 'match-cut':
                paramText = `${node.params.cutStyle ?? 'hard'}  •  ${node.params.transitionDuration ?? 0.5}s`;
                break;
            case 'cine-sync':
                paramText = `${node.params.audioType ?? 'stereo'}`;
                break;
        }

        if (paramText) {
            ctx.fillText(paramText, x + 8, paramY + 12);
        }

        ctx.restore();
    }

    _drawNodeOutputPreview(ctx, node) {
        const data = node.outputData;
        if (!data) return;

        const previewH = 36;
        const headerH = 34;
        const portSpacing = 22;
        const maxPorts = Math.max(node.inputs.length, node.outputs.length);
        const previewY = node.y + headerH + 8 + maxPorts * portSpacing;

        // Only draw if there's room
        if (previewY + previewH > node.y + node.height - 4) return;

        ctx.save();
        ctx.beginPath();
        ctx.rect(node.x + 4, previewY, node.width - 8, previewH);
        ctx.clip();

        // Background
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        ctx.fillRect(node.x + 4, previewY, node.width - 8, previewH);
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        ctx.strokeRect(node.x + 4, previewY, node.width - 8, previewH);

        // Mini preview text
        ctx.font = '400 8px monospace';
        ctx.fillStyle = '#64748b';
        ctx.textAlign = 'left';

        const lines = this._formatPreviewData(data);
        for (let i = 0; i < Math.min(lines.length, 3); i++) {
            ctx.fillText(lines[i], node.x + 8, previewY + 10 + i * 10);
        }

        ctx.restore();
    }

    _formatPreviewData(data) {
        if (typeof data === 'string') return [data.slice(0, 30)];
        if (Array.isArray(data)) return ['[Array: ' + data.length + ' items]'];
        if (typeof data === 'object' && data !== null) {
            const keys = Object.keys(data).slice(0, 3);
            return keys.map(k => {
                const v = typeof data[k] === 'object' ? '{…}' : String(data[k]).slice(0, 20);
                return k + ': ' + v;
            });
        }
        return [String(data)];
    }

    _roundRect(ctx, x, y, w, h, r) {
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.arcTo(x + w, y, x + w, y + r, r);
        ctx.lineTo(x + w, y + h - r);
        ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
        ctx.lineTo(x + r, y + h);
        ctx.arcTo(x, y + h, x, y + h - r, r);
        ctx.lineTo(x, y + r);
        ctx.arcTo(x, y, x + r, y, r);
        ctx.closePath();
    }

    _drawConnectingWire(ctx) {
        if (!this.connecting || !this.connectFromPort) return;
        const from = this.connectFromPort.canvasPos;
        const to = { x: this.connectMouseX, y: this.connectMouseY };
        const dx = Math.abs(to.x - from.x) * 0.5;

        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.bezierCurveTo(from.x + dx, from.y, to.x - dx, to.y, to.x, to.y);
        ctx.strokeStyle = this.connectFromPort.node.def.color;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Endpoint circle
        ctx.beginPath();
        ctx.arc(to.x, to.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = this.connectFromPort.node.def.color;
        ctx.fill();
    }

    _drawMarquee(ctx) {
        if (!this.marquee) return;
        const m = this.marquee;
        const x = Math.min(m.x1, m.x2), y = Math.min(m.y1, m.y2);
        const w = Math.abs(m.x2 - m.x1), h = Math.abs(m.y2 - m.y1);
        ctx.strokeStyle = 'rgba(59,130,246,0.5)';
        ctx.fillStyle = 'rgba(59,130,246,0.08)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
        ctx.setLineDash([]);
    }

    /* ── Minimap ── */
    _renderMinimap() {
        const ctx = this.mmCtx;
        const w = this.mmW;
        const h = this.mmH;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#0f1117';
        ctx.fillRect(0, 0, w, h);

        if (this.nodes.length === 0) { this._mmBounds = null; return; }

        // Compute bounds
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const n of this.nodes) {
            minX = Math.min(minX, n.x);
            minY = Math.min(minY, n.y);
            maxX = Math.max(maxX, n.x + n.width);
            maxY = Math.max(maxY, n.y + n.height);
        }
        const pad = 50;
        minX -= pad; minY -= pad; maxX += pad; maxY += pad;
        const scaleX = w / (maxX - minX);
        const scaleY = h / (maxY - minY);
        const scale = Math.min(scaleX, scaleY);
        const offX = (w - (maxX - minX) * scale) / 2;
        const offY = (h - (maxY - minY) * scale) / 2;

        // Store for interaction
        this._mmBounds = { minX, minY, maxX, maxY, scale, offX, offY };
        this._mmScale = scale;
        this._mmOffX = offX;
        this._mmOffY = offY;

        // Draw connections
        ctx.lineWidth = 1;
        for (const conn of this.connections) {
            const from = conn.fromOutput.canvasPos;
            const to = conn.toInput.canvasPos;
            ctx.beginPath();
            ctx.moveTo((from.x - minX) * scale + offX, (from.y - minY) * scale + offY);
            ctx.lineTo((to.x - minX) * scale + offX, (to.y - minY) * scale + offY);
            ctx.strokeStyle = 'rgba(255,255,255,0.15)';
            ctx.stroke();
        }

        // Draw nodes with category colors
        for (const n of this.nodes) {
            const nx = (n.x - minX) * scale + offX;
            const ny = (n.y - minY) * scale + offY;
            const nw = n.width * scale;
            const nh = n.height * scale;
            const baseColor = n.def.color;
            ctx.fillStyle = n.selected ? baseColor : baseColor + '88';
            ctx.fillRect(nx, ny, Math.max(nw, 3), Math.max(nh, 3));

            // Exec state overlay
            if (n.execState === 'running') {
                ctx.fillStyle = 'rgba(59,130,246,0.4)';
                ctx.fillRect(nx, ny, Math.max(nw, 3), Math.max(nh, 3));
            } else if (n.execState === 'error') {
                ctx.fillStyle = 'rgba(239,68,68,0.4)';
                ctx.fillRect(nx, ny, Math.max(nw, 3), Math.max(nh, 3));
            }
        }

        // Viewport rectangle
        const vx1 = (-this.panX / this.zoom - minX) * scale + offX;
        const vy1 = (-this.panY / this.zoom - minY) * scale + offY;
        const vw = (this.viewW / this.zoom) * scale;
        const vh = (this.viewH / this.zoom) * scale;
        ctx.fillStyle = 'rgba(59,130,246,0.08)';
        ctx.fillRect(vx1, vy1, vw, vh);
        ctx.strokeStyle = 'rgba(59,130,246,0.7)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(vx1, vy1, vw, vh);
    }

    /* ── Zoom controls ── */
    zoomIn() {
        this.zoom = clamp(this.zoom * 1.2, 0.15, 4);
        const el = document.getElementById('zoomDisplay');
        if (el) el.textContent = Math.round(this.zoom * 100) + '%';
        this.markDirty();
    }
    zoomOut() {
        this.zoom = clamp(this.zoom / 1.2, 0.15, 4);
        const el = document.getElementById('zoomDisplay');
        if (el) el.textContent = Math.round(this.zoom * 100) + '%';
        this.markDirty();
    }
    fitView() {
        if (this.nodes.length === 0) return;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const n of this.nodes) {
            minX = Math.min(minX, n.x); minY = Math.min(minY, n.y);
            maxX = Math.max(maxX, n.x + n.width); maxY = Math.max(maxY, n.y + n.height);
        }
        const pad = 80;
        const contentW = maxX - minX + pad * 2;
        const contentH = maxY - minY + pad * 2;
        this.zoom = clamp(Math.min(this.viewW / contentW, this.viewH / contentH), 0.15, 2);
        this.panX = (this.viewW - contentW * this.zoom) / 2 - (minX - pad) * this.zoom;
        this.panY = (this.viewH - contentH * this.zoom) / 2 - (minY - pad) * this.zoom;
        const el = document.getElementById('zoomDisplay');
        if (el) el.textContent = Math.round(this.zoom * 100) + '%';
        this.markDirty();
    }

    /* ── Demo Workflow ── */
    loadDemoWorkflow() {
        this.nodes = [];
        this.connections = [];
        this.selectedNodes = [];
        this.selectedConnection = null;
        this.workflowId = null;
        this.workflowName = 'Demo Pipeline';
        const nameEl = document.getElementById('workflowName');
        if (nameEl) nameEl.value = this.workflowName;

        // Create 3 nodes: world-anchor → scene-composer → cinematic-camera
        const n1 = this.addNode('world-anchor', 80, 100);
        n1.params.physicsRules = { gravity: 9.8, fluid: false, cloth: false };
        n1.params.globalLighting = 'HDRi';

        const n2 = this.addNode('scene-composer', 380, 80);
        n2.params.cameraLayout = 'free';
        n2.params.weather = { type: 'clear', intensity: 0.5, wind: 0 };

        const n3 = this.addNode('cinematic-camera', 680, 100);
        n3.params.lensModel = 'ARRI';
        n3.params.focalLength = 50;
        n3.params.fStop = 2.8;

        // Connect world-anchor → scene-composer (worldDNA)
        const out1 = n1.outputs.find(p => p.name === 'worldDNA');
        const in2a = n2.inputs.find(p => p.name === 'worldDNA');
        if (out1 && in2a) this.connections.push(new NodeConnection(n1, out1, n2, in2a));

        // Connect scene-composer → cinematic-camera (sceneBlueprint)
        const out2 = n2.outputs.find(p => p.name === 'sceneBlueprint');
        const in3a = n3.inputs.find(p => p.name === 'sceneBlueprint');
        if (out2 && in3a) this.connections.push(new NodeConnection(n2, out2, n3, in3a));

        // Also connect world-anchor → cinematic-camera (worldDNA)
        const in3b = n3.inputs.find(p => p.name === 'worldDNA');
        if (out1 && in3b) this.connections.push(new NodeConnection(n1, out1, n3, in3b));

        this._deselectAll();
        this._undoSaveState();
        this._updateStatus();
        this.fitView();
        showToast('Demo pipeline loaded', 'success');
    }
}

/* ──────────────────────────────────────────────────────────────
   PALETTE BUILDING
   ────────────────────────────────────────────────────────────── */

function buildPalette() {
    const list = document.getElementById('palette-list');
    if (!list) return;
    const categories = {};
    for (const [type, def] of Object.entries(NODE_TYPES)) {
        if (!categories[def.category]) categories[def.category] = [];
        categories[def.category].push({ type, ...def });
    }
    for (const [cat, nodes] of Object.entries(categories)) {
        const meta = CATEGORY_META[cat];
        const div = document.createElement('div');
        div.className = 'palette-category';
        div.dataset.category = cat;
        div.innerHTML = `<div class="palette-category-header"><span class="cat-dot" style="background:${meta.color}"></span>${meta.label}</div>`;
        for (const n of nodes) {
            const item = document.createElement('div');
            item.className = 'palette-item cat-' + cat;
            item.draggable = true;
            item.dataset.type = n.type;
            item.innerHTML = `
                <div class="node-icon">${n.icon}</div>
                <div class="node-info">
                    <div class="name">${n.displayName}</div>
                    <div class="desc">${n.description}</div>
                </div>
            `;
            div.appendChild(item);
        }
        list.appendChild(div);
    }
}

function initPaletteSearch() {
    const input = document.getElementById('paletteFilter');
    if (!input) return;
    input.addEventListener('input', () => {
        const q = input.value.toLowerCase();
        document.querySelectorAll('.palette-item').forEach(item => {
            const name = item.querySelector('.name').textContent.toLowerCase();
            const desc = item.querySelector('.desc').textContent.toLowerCase();
            item.style.display = (name.includes(q) || desc.includes(q)) ? '' : 'none';
        });
        document.querySelectorAll('.palette-category').forEach(cat => {
            const visible = cat.querySelectorAll('.palette-item[style=""], .palette-item:not([style])');
            cat.style.display = visible.length > 0 || !q ? '' : 'none';
        });
    });
}

/* ──────────────────────────────────────────────────────────────
   TOOLBAR ENHANCEMENTS
   ────────────────────────────────────────────────────────────── */

function initToolbarEnhancements(editor) {
    // Workflow list dropdown
    const toolbar = document.getElementById('toolbar');
    if (toolbar) {
        // Workflow selector
        const wfGroup = document.createElement('div');
        wfGroup.className = 'toolbar-group';
        wfGroup.style.cssText = 'display:flex;align-items:center;gap:6px;margin-left:8px;';

        const sel = document.createElement('select');
        sel.className = 'wf-workflow-select';
        sel.id = 'wf-workflow-select';
        sel.innerHTML = '<option value="">— Select Workflow —</option>';
        sel.addEventListener('change', () => {
            if (sel.value) editor.loadWorkflow(sel.value);
        });
        wfGroup.appendChild(sel);

        const newBtn = document.createElement('button');
        newBtn.className = 'toolbar-btn';
        newBtn.title = 'New Workflow';
        newBtn.textContent = '📄';
        newBtn.style.cssText = 'padding:4px 8px;font-size:12px;';
        newBtn.addEventListener('click', () => editor.newWorkflow());
        wfGroup.appendChild(newBtn);

        const refreshBtn = document.createElement('button');
        refreshBtn.className = 'toolbar-btn';
        refreshBtn.title = 'Refresh Workflow List';
        refreshBtn.textContent = '🔄';
        refreshBtn.style.cssText = 'padding:4px 8px;font-size:12px;';
        refreshBtn.addEventListener('click', () => editor._refreshWorkflowList());
        wfGroup.appendChild(refreshBtn);

        // Auto-layout button
        const layoutBtn = document.createElement('button');
        layoutBtn.className = 'toolbar-btn';
        layoutBtn.title = 'Auto Layout';
        layoutBtn.textContent = '📐';
        layoutBtn.style.cssText = 'padding:4px 8px;font-size:12px;';
        layoutBtn.addEventListener('click', () => editor._autoLayout());
        wfGroup.appendChild(layoutBtn);

        // Shortcuts button
        const helpBtn = document.createElement('button');
        helpBtn.className = 'toolbar-btn';
        helpBtn.title = 'Keyboard Shortcuts (?)';
        helpBtn.textContent = '⌨️';
        helpBtn.style.cssText = 'padding:4px 8px;font-size:12px;';
        helpBtn.addEventListener('click', () => editor._showShortcutsModal());
        wfGroup.appendChild(helpBtn);

        // Insert after the first toolbar group or at end
        const mainToolbar = document.getElementById('toolbar');
        if (mainToolbar) {
            mainToolbar.appendChild(wfGroup);
        } else {
            toolbar.appendChild(wfGroup);
        }

        // Load workflow list
        editor._refreshWorkflowList();
    }
}

/* ──────────────────────────────────────────────────────────────
   INIT
   ────────────────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
    buildPalette();
    initPaletteSearch();

    const canvas = document.getElementById('node-canvas');
    const minimap = document.getElementById('minimap-canvas');
    if (!canvas || !minimap) return;

    const editor = new NodeEditor(canvas, minimap);

    // Expose for debugging
    window.__editor = editor;

    // Toolbar buttons
    const bindBtn = (id, fn) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', fn);
    };
    bindBtn('btnUndo', () => editor._undo());
    bindBtn('btnRedo', () => editor._redo());
    bindBtn('btnZoomIn', () => editor.zoomIn());
    bindBtn('btnZoomOut', () => editor.zoomOut());
    bindBtn('btnFitView', () => editor.fitView());
    bindBtn('btnSave', () => editor.saveWorkflow());
    bindBtn('btnExecute', () => editor.executeWorkflow());
    bindBtn('inspector-close', () => editor._deselectAll());

    // Workflow name
    const nameEl = document.getElementById('workflowName');
    if (nameEl) {
        nameEl.addEventListener('change', e => {
            editor.workflowName = e.target.value;
        });
    }

    // Initialize toolbar enhancements (workflow list, auto-layout, shortcuts)
    initToolbarEnhancements(editor);

    // Load workflow from URL param
    const params = new URLSearchParams(window.location.search);
    const wfId = params.get('id');
    if (wfId) {
        editor.loadWorkflow(wfId);
    } else {
        editor.loadDemoWorkflow();
    }

    // Center view
    editor.panX = editor.viewW / 2;
    editor.panY = editor.viewH / 2;
    editor.markDirty();
});
