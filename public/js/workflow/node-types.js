/**
 * StoryForge AI - 節點類型定義
 * 定義所有可用的節點類型、輸入輸出口、參數及分類
 */

// 分類中繼資料（供 palette.js 使用）
// 使用 var 以避免與可能存在的重複定義衝突
var CATEGORY_META = CATEGORY_META || {
    world:      { label: '🌍 World',      color: '#8b5cf6' },
    camera:     { label: '🎥 Camera',     color: '#3b82f6' },
    director:   { label: '🎬 Director',   color: '#f59e0b' },
    post:       { label: '✂️ Post',        color: '#10b981' },
    lighting:   { label: '💡 Lighting',   color: '#f97316' },
    output:     { label: '📦 Output',     color: '#ec4899' },
    ai:         { label: '🤖 AI',         color: '#06b6d4' },
};

// ==========================================
// 節點類型定義
// ==========================================
const NODE_TYPES = {

    // ─── World Anchor ───────────────────────
    "world-anchor": {
        type: "world-anchor",
        category: "world",
        displayName: "World Anchor",
        icon: "🌍",
        color: "#8b5cf6",
        description: "Define physics, environment & global lighting",
        inputs: [
            { name: "characterModel", label: "Character Model", type: "file", accept: ".glb,.gltf,.fbx", default: null },
            { name: "physicsRules", label: "Physics Rules", type: "group", fields: [
                { name: "gravity", label: "Gravity", type: "slider", min: 0, max: 20, step: 0.1, default: 9.8 },
                { name: "fluid", label: "Fluid Sim", type: "toggle", default: false },
                { name: "cloth", label: "Cloth Sim", type: "toggle", default: false },
            ]},
            { name: "environmentMap", label: "Environment Map", type: "file", accept: ".hdr,.exr,.jpg", default: null },
            { name: "globalLighting", label: "Global Lighting", type: "dropdown", options: ["HDRi", "Raytraced", "Baked", "Mixed"], default: "HDRi" },
        ],
        outputs: [
            { name: "worldDNA", label: "World DNA", type: "worldDNA" },
        ],
    },

    // ─── Scene Composer ─────────────────────
    "scene-composer": {
        type: "scene-composer",
        category: "world",
        displayName: "Scene Composer",
        icon: "🎬",
        color: "#8b5cf6",
        description: "Compose scene layout, depth & weather",
        inputs: [
            { name: "worldDNA", label: "World DNA", type: "worldDNA", default: null },
            { name: "cameraLayout", label: "Camera Layout", type: "dropdown", options: ["top", "side", "free"], default: "free" },
            { name: "depthRange", label: "Depth Range (m)", type: "slider", min: 1, max: 500, step: 1, default: 100 },
            { name: "weather", label: "Weather", type: "group", fields: [
                { name: "type", label: "Type", type: "dropdown", options: ["clear", "rain", "snow", "fog", "storm"], default: "clear" },
                { name: "intensity", label: "Intensity", type: "slider", min: 0, max: 1, step: 0.05, default: 0.5 },
                { name: "wind", label: "Wind (m/s)", type: "slider", min: 0, max: 50, step: 1, default: 0 },
            ]},
        ],
        outputs: [
            { name: "sceneBlueprint", label: "Scene Blueprint", type: "sceneBlueprint" },
        ],
    },

    // ─── Cinematic Camera ───────────────────
    "cinematic-camera": {
        type: "cinematic-camera",
        category: "camera",
        displayName: "Cinematic Camera",
        icon: "🎥",
        color: "#3b82f6",
        description: "Virtual cinema camera with real lens models",
        inputs: [
            { name: "sceneBlueprint", label: "Scene Blueprint", type: "sceneBlueprint", default: null },
            { name: "worldDNA", label: "World DNA", type: "worldDNA", default: null },
            { name: "lensModel", label: "Lens Model", type: "dropdown", options: ["ARRI", "RED", "Sony Venice", "Blackmagic"], default: "ARRI" },
            { name: "focalLength", label: "Focal Length (mm)", type: "slider", min: 8, max: 300, step: 1, default: 85 },
            { name: "fStop", label: "f-Stop", type: "slider", min: 1.2, max: 22, step: 0.1, default: 2.8 },
            { name: "iso", label: "ISO", type: "slider", min: 100, max: 12800, step: 100, default: 800 },
            { name: "frameRate", label: "Frame Rate", type: "dropdown", options: ["24", "25", "30", "48", "60", "120"], default: "24" },
        ],
        outputs: [
            { name: "cameraData", label: "Camera Data", type: "cameraData" },
        ],
    },

    // ─── Performance Director ───────────────
    "performance-director": {
        type: "performance-director",
        category: "director",
        displayName: "Performance Director",
        icon: "🎭",
        color: "#f59e0b",
        description: "Direct character performance & acting",
        inputs: [
            { name: "worldDNA", label: "World DNA", type: "worldDNA", default: null },
            { name: "sceneBlueprint", label: "Scene Blueprint", type: "sceneBlueprint", default: null },
            { name: "characterModels", label: "Character Models", type: "file", accept: ".glb,.gltf,.fbx", default: null },
            { name: "emotionCurve", label: "Emotion Curve", type: "dropdown", options: ["neutral", "rising-tension", "falling-calm", "volatile", "custom"], default: "neutral" },
            { name: "rainInteraction", label: "Rain Interaction", type: "toggle", default: false },
        ],
        outputs: [
            { name: "performanceData", label: "Performance Data", type: "performanceData" },
        ],
    },

    // ─── Match Cut ──────────────────────────
    "match-cut": {
        type: "match-cut",
        category: "post",
        displayName: "Match Cut",
        icon: "✂️",
        color: "#10b981",
        description: "Edit transitions & cut sequences",
        inputs: [
            { name: "sceneA", label: "Scene A", type: "sceneBlueprint", default: null },
            { name: "sceneB", label: "Scene B", type: "sceneBlueprint", default: null },
            { name: "transitionType", label: "Transition", type: "dropdown", options: ["hard-cut", "dissolve", "wipe", "morph", "whip-pan", "match-shape", "match-color"], default: "hard-cut" },
            { name: "duration", label: "Duration (s)", type: "slider", min: 0.1, max: 5, step: 0.1, default: 0.5 },
            { name: "matchBy", label: "Match By", type: "dropdown", options: ["shape", "color", "motion", "position", "auto"], default: "auto" },
        ],
        outputs: [
            { name: "editSequence", label: "Edit Sequence", type: "editSequence" },
        ],
    },

    // ─── Cine Sync ──────────────────────────
    "cine-sync": {
        type: "cine-sync",
        category: "post",
        displayName: "Cine Sync",
        icon: "🎵",
        color: "#10b981",
        description: "Synchronize audio & music to picture",
        inputs: [
            { name: "editSequence", label: "Edit Sequence", type: "editSequence", default: null },
            { name: "cameraData", label: "Camera Data", type: "cameraData", default: null },
            { name: "performanceData", label: "Performance Data", type: "performanceData", default: null },
            { name: "audioType", label: "Audio Type", type: "dropdown", options: ["atmos", "music", "dialogue", "sfx", "mixed"], default: "atmos" },
            { name: "tempo", label: "Tempo (BPM)", type: "slider", min: 40, max: 200, step: 1, default: 120 },
            { name: "syncMode", label: "Sync Mode", type: "dropdown", options: ["beat-sync", "cut-sync", "emotion-sync", "free"], default: "beat-sync" },
        ],
        outputs: [
            { name: "syncedOutput", label: "Synced Output", type: "syncedOutput" },
        ],
    },

    // ─── Lighting Rig ─────────────────────── (新節點)
    "lighting-rig": {
        type: "lighting-rig",
        category: "lighting",
        displayName: "Lighting Rig",
        icon: "💡",
        color: "#f97316",
        description: "Professional lighting setup & presets",
        inputs: [
            { name: "worldDNA", label: "World DNA", type: "worldDNA", default: null },
            { name: "sceneBlueprint", label: "Scene Blueprint", type: "sceneBlueprint", default: null },
            { name: "preset", label: "Preset", type: "dropdown", options: [
                "golden-hour", "blue-hour", "three-point", "rembrandt",
                "chiaroscuro", "neon-cyberpunk", "silhouette", "volumetric-fog",
                "candlelight", "harsh-noon", "moonlight", "custom"
            ], default: "three-point" },
            { name: "keyLight", label: "Key Light", type: "group", fields: [
                { name: "intensity", label: "Intensity", type: "slider", min: 0, max: 2, step: 0.05, default: 1.0 },
                { name: "colorTemperature", label: "Color Temp (K)", type: "slider", min: 1800, max: 10000, step: 100, default: 5600 },
                { name: "direction", label: "Direction", type: "dropdown", options: ["front", "45-left", "45-right", "side-left", "side-right", "back", "overhead"], default: "45-left" },
                { name: "softness", label: "Softness", type: "slider", min: 0, max: 1, step: 0.05, default: 0.5 },
            ]},
            { name: "fillLight", label: "Fill Light", type: "group", fields: [
                { name: "enabled", label: "Enabled", type: "toggle", default: true },
                { name: "ratio", label: "Key:Fill Ratio", type: "slider", min: 1, max: 8, step: 0.5, default: 2 },
            ]},
            { name: "rimLight", label: "Rim / Back Light", type: "group", fields: [
                { name: "enabled", label: "Enabled", type: "toggle", default: true },
                { name: "intensity", label: "Intensity", type: "slider", min: 0, max: 2, step: 0.05, default: 0.8 },
                { name: "color", label: "Color", type: "dropdown", options: ["white", "warm", "cool", "colored"], default: "white" },
            ]},
            { name: "mood", label: "Mood", type: "dropdown", options: [
                "warm", "cool", "dramatic", "soft", "harsh", "mysterious", "romantic", "tense"
            ], default: "warm" },
        ],
        outputs: [
            { name: "lightingData", label: "Lighting Data", type: "lightingData" },
        ],
    },

    // ─── Render Output ────────────────────── (新節點)
    "render-output": {
        type: "render-output",
        category: "output",
        displayName: "Render Output",
        icon: "📦",
        color: "#ec4899",
        description: "Export settings: resolution, format, quality",
        inputs: [
            { name: "cameraData", label: "Camera Data", type: "cameraData", default: null },
            { name: "lightingData", label: "Lighting Data", type: "lightingData", default: null },
            { name: "editSequence", label: "Edit Sequence", type: "editSequence", default: null },
            { name: "performanceData", label: "Performance Data", type: "performanceData", default: null },
            { name: "renderEngine", label: "Render Engine", type: "dropdown", options: [
                "cycles", "eevee", "octane", "redshift", "v-ray", "arnold", "realtime"
            ], default: "cycles" },
            { name: "resolution", label: "Resolution", type: "dropdown", options: [
                "720p", "1080p", "2K", "4K", "6K", "8K"
            ], default: "4K" },
            { name: "format", label: "Format", type: "dropdown", options: [
                "mp4", "mov", "exr-sequence", "png-sequence", "webm", "prores"
            ], default: "mp4" },
            { name: "quality", label: "Quality", type: "slider", min: 10, max: 100, step: 5, default: 90 },
            { name: "frameRate", label: "Frame Rate", type: "dropdown", options: ["24", "25", "30", "48", "60"], default: "24" },
            { name: "colorSpace", label: "Color Space", type: "dropdown", options: [
                "sRGB", "ACEScg", "Rec.709", "Rec.2020", "Linear"
            ], default: "sRGB" },
            { name: "denoise", label: "Denoise", type: "toggle", default: true },
            { name: "motionBlur", label: "Motion Blur", type: "toggle", default: false },
        ],
        outputs: [
            { name: "renderResult", label: "Render Result", type: "renderResult" },
        ],
    },

    // ─── Prompt Generator ─────────────────── (新節點)
    "prompt-generator": {
        type: "prompt-generator",
        category: "ai",
        displayName: "Prompt Generator",
        icon: "🤖",
        color: "#06b6d4",
        description: "AI prompt generation from workflow data",
        inputs: [
            { name: "worldDNA", label: "World DNA", type: "worldDNA", default: null },
            { name: "sceneBlueprint", label: "Scene Blueprint", type: "sceneBlueprint", default: null },
            { name: "cameraData", label: "Camera Data", type: "cameraData", default: null },
            { name: "lightingData", label: "Lighting Data", type: "lightingData", default: null },
            { name: "performanceData", label: "Performance Data", type: "performanceData", default: null },
            { name: "style", label: "Style", type: "dropdown", options: [
                "cinematic", "photorealistic", "anime", "watercolor",
                "oil-painting", "noir", "cyberpunk", "ghibli", "wes-anderson"
            ], default: "cinematic" },
            { name: "platform", label: "Target Platform", type: "dropdown", options: [
                "sora", "runway", "kling", "pika", "通用"
            ], default: "通用" },
            { name: "aspectRatio", label: "Aspect Ratio", type: "dropdown", options: [
                "16:9", "9:16", "1:1", "4:3", "21:9"
            ], default: "16:9" },
            { name: "duration", label: "Duration (s)", type: "slider", min: 2, max: 60, step: 1, default: 8 },
            { name: "customInstructions", label: "Custom Instructions", type: "text", default: "" },
            { name: "negativePrompt", label: "Negative Prompt", type: "text", default: "" },
        ],
        outputs: [
            { name: "generatedPrompt", label: "Generated Prompt", type: "promptText" },
        ],
    },
};
