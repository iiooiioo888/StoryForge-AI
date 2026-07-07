/**
 * StoryForge AI - MongoDB Models
 * 完整的數據模型定義
 */
const mongoose = require('mongoose');
const { Schema } = mongoose;

// ========== camelCase → snake_case 轉換 ==========
function camelToSnake(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function transformToSnake(doc, ret) {
    const result = {};
    for (const [key, value] of Object.entries(ret)) {
        if (key === '__v') continue;
        const snakeKey = key === '_id' ? 'id' : camelToSnake(key);
        // Convert ObjectId to string
        const val = (key === '_id' && value && value.toString) ? value.toString() : value;
        // Handle ObjectId refs (check before _id since ObjectId has _id=self)
        if (val && typeof val === 'object' && val.constructor && val.constructor.name === 'ObjectId') {
            result[snakeKey] = val.toString();
        } else if (val && typeof val === 'object' && !Array.isArray(val) && val._id) {
            // Nested populated doc — recurse but also add flattened keys
            const nested = transformToSnake(null, val);
            result[snakeKey] = nested;
            // Flatten common user fields for convenience
            for (const [nk, nv] of Object.entries(nested)) {
                if (['id', 'username', 'display_name', 'avatar_url', 'role'].includes(nk)) {
                    result[nk] = nv;
                }
            }
        } else if (Array.isArray(val)) {
            result[snakeKey] = val.map(v => {
                if (v && typeof v === 'object' && v.constructor && v.constructor.name === 'ObjectId') return v.toString();
                if (v && typeof v === 'object' && v._id) return transformToSnake(null, v);
                return v;
            });
        } else {
            result[snakeKey] = val;
        }
    }
    return result;
}

const snakeTransform = {
    transform: (doc, ret) => transformToSnake(doc, ret),
};

// ==========================================
// 用戶
// ==========================================
const UserSchema = new Schema({
    username:   { type: String, required: true, unique: true, trim: true },
    email:      { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    displayName:{ type: String, default: '' },
    avatarUrl:  { type: String, default: '/assets/default-avatar.png' },
    role:       { type: String, enum: ['user', 'admin', 'moderator'], default: 'user' },
    status:     { type: String, enum: ['active', 'banned', 'suspended'], default: 'active' },
    credits:    { type: Number, default: 100 },
    bio:        { type: String, default: '' },
    lastLogin:  { type: Date },
}, { timestamps: true, toJSON: snakeTransform });

// ==========================================
// 故事
// ==========================================
const StorySchema = new Schema({
    userId:         { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title:          { type: String, required: true },
    content:        { type: String, required: true },
    summary:        { type: String, default: '' },
    categoryId:     { type: Schema.Types.ObjectId, ref: 'Category', index: true },
    coverImage:     { type: String },
    status:         { type: String, enum: ['draft', 'published', 'archived', 'flagged'], default: 'draft', index: true },
    visibility:     { type: String, enum: ['public', 'private', 'unlisted'], default: 'public' },
    genre:          { type: String, default: '' },
    tone:           { type: String, default: '' },
    targetAudience: { type: String, default: '' },
    wordCount:      { type: Number, default: 0 },
    viewCount:      { type: Number, default: 0 },
    likeCount:      { type: Number, default: 0 },
    bookmarkCount:  { type: Number, default: 0 },
    tags:           [{ type: Schema.Types.ObjectId, ref: 'Tag' }],
    isAiGenerated:  { type: Boolean, default: false },
    promptUsed:     { type: String },
    publishedAt:    { type: Date },
}, { timestamps: true, toJSON: snakeTransform });

StorySchema.index({ createdAt: -1 });
StorySchema.index({ status: 1, viewCount: -1 });

// ==========================================
// 章節
// ==========================================
const ChapterSchema = new Schema({
    storyId:       { type: Schema.Types.ObjectId, ref: 'Story', required: true, index: true },
    title:         { type: String, required: true },
    content:       { type: String, required: true },
    chapterNumber: { type: Number, required: true },
    wordCount:     { type: Number, default: 0 },
}, { timestamps: true, toJSON: snakeTransform });

// ==========================================
// 角色
// ==========================================
const CharacterSchema = new Schema({
    storyId:     { type: Schema.Types.ObjectId, ref: 'Story', required: true, index: true },
    name:        { type: String, required: true },
    role:        { type: String, default: '' },
    description: { type: String, default: '' },
    appearance:  { type: String, default: '' },
    personality: { type: String, default: '' },
    backstory:   { type: String, default: '' },
    avatarPrompt:{ type: String, default: '' },
}, { timestamps: true, toJSON: snakeTransform });

// ==========================================
// 分類
// ==========================================
const CategorySchema = new Schema({
    name:        { type: String, required: true, unique: true },
    slug:        { type: String, required: true, unique: true },
    description: { type: String, default: '' },
    icon:        { type: String, default: '' },
    sortOrder:   { type: Number, default: 0 },
}, { timestamps: true, toJSON: snakeTransform });

// ==========================================
// 標籤
// ==========================================
const TagSchema = new Schema({
    name:       { type: String, required: true, unique: true },
    slug:       { type: String, required: true, unique: true },
    usageCount: { type: Number, default: 0 },
}, { toJSON: snakeTransform });

// ==========================================
// 影片提示詞模板
// ==========================================
const VideoPromptTemplateSchema = new Schema({
    name:        { type: String, required: true },
    description: { type: String, default: '' },
    platform:    { type: String, enum: ['sora', 'runway', 'pika', 'kling', 'general'], required: true },
    category:    { type: String, default: '' },
    template:    { type: String, required: true },
    parameters:  [{ type: String }],
    exampleOutput: { type: String },
    isPublic:    { type: Boolean, default: true },
    userId:      { type: Schema.Types.ObjectId, ref: 'User' },
    usageCount:  { type: Number, default: 0 },
    rating:      { type: Number, default: 0 },
}, { timestamps: true, toJSON: snakeTransform });

// ==========================================
// 生成的影片提示詞
// ==========================================
const VideoPromptSchema = new Schema({
    userId:          { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    storyId:         { type: Schema.Types.ObjectId, ref: 'Story', index: true },
    templateId:      { type: Schema.Types.ObjectId, ref: 'VideoPromptTemplate' },
    platform:        { type: String, required: true },
    sceneDescription:{ type: String, default: '' },
    sceneName:       { type: String, default: '' },
    cameraMovement:  { type: String, default: '' },
    cameraAngle:     { type: String, default: '' },
    shotSize:        { type: String, default: '' },
    lighting:        { type: String, default: '' },
    style:           { type: String, default: '' },
    mood:            { type: String, default: '' },
    duration:        { type: String, default: '8s' },
    aspectRatio:     { type: String, default: '16:9' },
    fullPrompt:      { type: String, required: true },
    negativePrompt:  { type: String, default: '' },
    isFavorite:      { type: Boolean, default: false },
    rating:          { type: Number },
    notes:           { type: String, default: '' },
}, { timestamps: true, toJSON: snakeTransform });

// ==========================================
// 鏡頭語言
// ==========================================
const CameraMovementSchema = new Schema({
    nameZh:      { type: String, required: true },
    nameEn:      { type: String, required: true },
    category:    { type: String, enum: ['basic', 'dynamic', 'complex', 'aerial', 'special'], required: true },
    description: { type: String },
    technique:   { type: String },
    useCase:     { type: String },
    visualEffect:{ type: String },
    englishPrompt: { type: String },
    difficulty:  { type: Number, min: 1, max: 5, default: 1 },
    icon:        { type: String },
    sortOrder:   { type: Number, default: 0 },
}, { toJSON: snakeTransform });

const ShotSizeSchema = new Schema({
    nameZh:         { type: String, required: true },
    nameEn:         { type: String, required: true },
    abbreviation:   { type: String },
    description:    { type: String },
    framing:        { type: String },
    emotionalImpact:{ type: String },
    useCase:        { type: String },
    englishPrompt:  { type: String },
    icon:           { type: String },
    sortOrder:      { type: Number, default: 0 },
}, { toJSON: snakeTransform });

const CameraAngleSchema = new Schema({
    nameZh:             { type: String, required: true },
    nameEn:             { type: String, required: true },
    description:        { type: String },
    psychologicalEffect:{ type: String },
    useCase:            { type: String },
    englishPrompt:      { type: String },
    icon:               { type: String },
    sortOrder:          { type: Number, default: 0 },
}, { toJSON: snakeTransform });

const ShotTransitionSchema = new Schema({
    nameZh:         { type: String, required: true },
    nameEn:         { type: String, required: true },
    description:    { type: String },
    technique:      { type: String },
    mood:           { type: String },
    englishPrompt:  { type: String },
    icon:           { type: String },
    sortOrder:      { type: Number, default: 0 },
}, { toJSON: snakeTransform });

const CameraLanguageTemplateSchema = new Schema({
    name:           { type: String, required: true },
    description:    { type: String },
    genre:          { type: String },
    shotSizeId:     { type: Schema.Types.ObjectId, ref: 'ShotSize' },
    angleId:        { type: Schema.Types.ObjectId, ref: 'CameraAngle' },
    movementId:     { type: Schema.Types.ObjectId, ref: 'CameraMovement' },
    transitionId:   { type: Schema.Types.ObjectId, ref: 'ShotTransition' },
    fullDescription:{ type: String },
    englishPrompt:  { type: String },
    exampleScene:   { type: String },
}, { toJSON: snakeTransform });

// ==========================================
// 燈光預設
// ==========================================
const LightingPresetSchema = new Schema({
    nameZh:         { type: String, required: true },
    nameEn:         { type: String, required: true },
    category:       { type: String, enum: ['natural', 'studio', 'dramatic', 'creative', 'practical', 'cinematic', 'special'], required: true },
    description:    { type: String },
    technique:      { type: String },
    colorTemperature: { type: String },
    direction:      { type: String },
    intensity:      { type: String },
    timeOfDay:      { type: String },
    mood:           { type: String },
    useCase:        { type: String },
    englishPrompt:  { type: String },
    icon:           { type: String },
    sortOrder:      { type: Number, default: 0 },
}, { toJSON: snakeTransform });

// ==========================================
// 視覺風格
// ==========================================
const VisualStyleSchema = new Schema({
    nameZh:             { type: String, required: true },
    nameEn:             { type: String, required: true },
    category:           { type: String, enum: ['cinematic', 'artistic', 'anime', 'documentary', 'commercial', 'experimental', 'photography', 'film', 'painting', 'digital'], required: true },
    description:        { type: String },
    colorProfile:       { type: String },
    textureDescription: { type: String },
    characteristics:    { type: String },
    era:                { type: String },
    referenceWork:      { type: String },
    mood:               { type: String },
    useCase:            { type: String },
    englishPrompt:      { type: String },
    negativePrompt:     { type: String },
    compatibleGenres:   [{ type: String }],
    icon:               { type: String },
    sortOrder:          { type: Number, default: 0 },
}, { toJSON: snakeTransform });

// ==========================================
// 色彩調色板
// ==========================================
const ColorPaletteSchema = new Schema({
    nameZh:         { type: String, required: true },
    nameEn:         { type: String, required: true },
    category:       { type: String, enum: ['warm', 'cool', 'neutral', 'vibrant', 'muted', 'monochrome', 'complementary'], required: true },
    colors:         [{ type: String }],
    primaryColor:   { type: String },
    description:    { type: String },
    mood:           { type: String },
    season:         { type: String },
    useCase:        { type: String },
    englishPrompt:  { type: String },
    icon:           { type: String },
    sortOrder:      { type: Number, default: 0 },
}, { toJSON: snakeTransform });

// ==========================================
// 道具管理（Prop）
// ==========================================
const PropSchema = new Schema({
    storyId:        { type: Schema.Types.ObjectId, ref: 'Story', required: true, index: true },
    name:           { type: String, required: true },
    category:       { type: String, enum: ['weapon', 'accessory', 'vehicle', 'document', 'food', 'furniture', 'technology', 'artifact', 'clothing', 'other'], default: 'other' },
    description:    { type: String, default: '' },
    // 參考照片（多張，用於接戲比對）
    referenceImages: [{ url: String, label: String, uploadedAt: { type: Date, default: Date.now } }],
    // 外觀細節
    appearance:     {
        material:   { type: String, default: '' },   // 材質：木、金屬、皮革...
        color:      { type: String, default: '' },   // 顏色
        size:       { type: String, default: '' },   // 尺寸描述
        condition:  { type: String, default: '' },   // 狀態：全新、磨損、破舊...
        markings:   { type: String, default: '' },   // 標記：刻字、傷痕、貼紙...
    },
    // 關聯角色（誰持有/使用）
    heldBy:         [{ type: Schema.Types.ObjectId, ref: 'Character' }],
    // AI 生成用的英文描述
    visualPrompt:   { type: String, default: '' },
    // 接戲備註（例如「第三集被摔壞」「第五集換了左手拿」）
    continuityNotes:{ type: String, default: '' },
    // 首次出現 / 最後出現場景
    firstAppearance:{ type: String, default: '' },
    lastAppearance: { type: String, default: '' },
    tags:           [{ type: String }],
}, { timestamps: true, toJSON: snakeTransform });

// ==========================================
// 場景管理（Scene） — 核心管理單位
// 一個故事由多個場景組成，每個場景串聯角色、道具、鏡頭、燈光
// ==========================================
const SceneSchema = new Schema({
    storyId:        { type: Schema.Types.ObjectId, ref: 'Story', required: true, index: true },
    chapterId:      { type: Schema.Types.ObjectId, ref: 'Chapter' },
    sceneNumber:    { type: Number, required: true },
    title:          { type: String, default: '' },
    // ── 劇本內容 ──
    synopsis:       { type: String, default: '' },         // 場景概要（一句話）
    scriptContent:  { type: String, default: '' },         // 劇本正文
    dialogueExcerpt:{ type: String, default: '' },         // 關鍵對白摘錄
    // ── 時空設定 ──
    location:       { type: String, default: '' },         // 地點
    timeOfDay:      { type: String, enum: ['dawn', 'morning', 'noon', 'afternoon', 'golden_hour', 'dusk', 'night', 'midnight', 'blue_hour', ''], default: '' },
    weather:        { type: String, default: '' },
    season:         { type: String, default: '' },
    era:            { type: String, default: '' },         // 時代背景
    // ── 角色 ──
    characters:     [{
        characterId:{ type: Schema.Types.ObjectId, ref: 'Character' },
        action:     { type: String, default: '' },         // 角色在做什麼
        emotion:    { type: String, default: '' },         // 情緒狀態
        position:   { type: String, default: '' },         // 站位
        dialogue:   { type: String, default: '' },         // 說了什麼
    }],
    // ── 道具 ──
    props:          [{
        propId:     { type: Schema.Types.ObjectId, ref: 'Prop' },
        position:   { type: String, default: '' },
        state:      { type: String, default: '' },
        action:     { type: String, default: '' },         // 道具互動（拿起、摔碎...）
    }],
    // ── 鏡頭設定 ──
    camera:         {
        shotSize:   { type: String, default: '' },
        angle:      { type: String, default: '' },
        movement:   { type: String, default: '' },
        lensMm:     { type: Number },
        fStop:      { type: Number },
        transition: { type: String, default: '' },         // 入場轉場
        notes:      { type: String, default: '' },
    },
    // ── 燈光 ──
    lighting:       {
        preset:     { type: String, default: '' },
        source:     { type: String, default: '' },
        direction:  { type: String, default: '' },
        colorTemp:  { type: String, default: '' },
        mood:       { type: String, default: '' },
    },
    // ── 視覺風格 ──
    visualStyle:    { type: String, default: '' },
    colorPalette:   { type: String, default: '' },
    mood:           { type: String, default: '' },
    // ── AI 生成 ──
    duration:       { type: Number, default: 8 },          // 秒
    aspectRatio:    { type: String, default: '16:9' },
    promptEn:       { type: String, default: '' },         // 完整英文 prompt
    promptZh:       { type: String, default: '' },         // 中文描述
    negativePrompt: { type: String, default: '' },
    // ── 接戲 ──
    continuityFrom: { type: Schema.Types.ObjectId, ref: 'Scene' },  // 前一個場景
    continuityNotes:{ type: String, default: '' },         // 接戲備註
    flags:          [{
        type:       { type: String, enum: ['prop_mismatch', 'costume_mismatch', 'lighting_inconsistency', 'time_error', 'position_error', 'style_break', 'other'] },
        description:{ type: String },
        severity:   { type: String, enum: ['info', 'warning', 'error', 'critical'], default: 'warning' },
        resolved:   { type: Boolean, default: false },
    }],
    status:         { type: String, enum: ['draft', 'reviewed', 'approved', 'shot', 'rejected'], default: 'draft' },
    sortOrder:      { type: Number, default: 0 },
}, { timestamps: true, toJSON: snakeTransform });

// ==========================================
// 角色接戲記錄（Character Continuity）
// 記錄角色在每個場景的外觀狀態，確保跨鏡頭一致
// ==========================================
const CharacterContinuitySchema = new Schema({
    storyId:        { type: Schema.Types.ObjectId, ref: 'Story', required: true, index: true },
    characterId:    { type: Schema.Types.ObjectId, ref: 'Character', required: true, index: true },
    sceneNumber:    { type: Number, required: true },
    sceneName:      { type: String, default: '' },
    // ── 外觀狀態 ──
    costume:        {
        top:        { type: String, default: '' },     // 上衣
        bottom:     { type: String, default: '' },     // 下裝
        outerwear:  { type: String, default: '' },     // 外套
        shoes:      { type: String, default: '' },     // 鞋子
        accessories:[{ type: String }],                 // 配飾列表
        condition:  { type: String, default: '' },     // 衣服狀態：乾淨、沾泥、破損...
    },
    hair:           {
        style:      { type: String, default: '' },     // 髮型
        color:      { type: String, default: '' },     // 髮色
        wet_dry:    { type: String, default: '' },     // 乾/濕
        damage:     { type: String, default: '' },     // 受損描述
    },
    makeup:         {
        base:       { type: String, default: '' },     // 底妝
        special:    { type: String, default: '' },     // 特效妝（傷疤、老化、髒污）
        notes:      { type: String, default: '' },
    },
    physicalState:  {
        injuries:   [{ type: String }],                 // 傷口/瘀傷位置
        sweat:      { type: String, default: '' },     // 出汗程度
        dirt:       { type: String, default: '' },     // 髒污程度
        expression: { type: String, default: '' },     // 表情基調
    },
    // 手持道具（與 Prop 聯動）
    holdingProps:   [{ type: Schema.Types.ObjectId, ref: 'Prop' }],
    // 位置 / 姿態
    position:       { type: String, default: '' },     // 站位描述
    posture:        { type: String, default: '' },     // 姿態：站立、坐、蹲...
    // AI 視覺描述（英文，可直接用於生成）
    visualPrompt:   { type: String, default: '' },
    // 接戲備註
    notes:          { type: String, default: '' },
}, { timestamps: true, toJSON: snakeTransform });

// ==========================================
// 場景接戲記錄（Scene Continuity Record）
// 跨場景的環境/時間/光線一致性追蹤
// ==========================================
const SceneContinuitySchema = new Schema({
    storyId:        { type: Schema.Types.ObjectId, ref: 'Story', required: true, index: true },
    sceneNumber:    { type: Number, required: true },
    sceneName:      { type: String, default: '' },
    // ── 環境狀態 ──
    environment:    {
        location:   { type: String, default: '' },     // 地點
        timeOfDay:  { type: String, default: '' },     // 時間：清晨、正午、黃昏、深夜
        weather:    { type: String, default: '' },     // 天氣
        season:     { type: String, default: '' },     // 季節
        temperature:{ type: String, default: '' },     // 溫度感受
    },
    lighting:       {
        source:     { type: String, default: '' },     // 主光源：太陽、窗戶、蠟燭...
        direction:  { type: String, default: '' },     // 光線方向
        intensity:  { type: String, default: '' },     // 強度
        colorTemp:  { type: String, default: '' },     // 色溫
        mood:       { type: String, default: '' },     // 光影氛圍
    },
    // ── 道具佈置 ──
    propsInScene:   [{
        propId:     { type: Schema.Types.ObjectId, ref: 'Prop' },
        position:   { type: String, default: '' },     // 位置描述
        state:      { type: String, default: '' },     // 狀態（如「打開的書」）
        visibility: { type: String, default: 'visible' }, // visible / hidden / partial
    }],
    // ── 角色在場 ──
    charactersInScene: [{ type: Schema.Types.ObjectId, ref: 'Character' }],
    // ── 接戲檢查 ──
    continuityFlags: [{
        type:       { type: String, enum: ['prop_mismatch', 'costume_mismatch', 'lighting_inconsistency', 'time_error', 'position_error', 'other'] },
        description:{ type: String },
        severity:   { type: String, enum: ['warning', 'error', 'critical'], default: 'warning' },
        resolved:   { type: Boolean, default: false },
    }],
    // 與前一場景的銜接備註
    transitionNotes:{ type: String, default: '' },
    // AI 可用的英文場景描述
    visualPrompt:   { type: String, default: '' },
}, { timestamps: true, toJSON: snakeTransform });

// ==========================================
// 15秒原子單元（AtomicClip）
// 每個節點輸出的核心數據包
// ==========================================
const AtomicClipSchema = new Schema({
    storyId:        { type: Schema.Types.ObjectId, ref: 'Story', required: true, index: true },
    sceneId:        { type: Schema.Types.ObjectId, ref: 'Scene' },
    sequenceIndex:  { type: Number, required: true },       // 第幾個15秒（0, 1, 2, 3...）
    duration:       { type: Number, default: 15 },          // 硬鎖15秒
    // ── 視覺載體 ──
    videoUrl:       { type: String, default: '' },          // MP4 / EXR 序列
    // ── 尾幀錨點（End-Frame Anchor）──
    endFrameUrl:    { type: String, default: '' },          // 第15秒高清靜態幀
    endFramePrompt: { type: String, default: '' },          // 尾幀的視覺描述（注入下一段）
    // ── 物理狀態快照（Physics Snapshot）──
    physicsSnapshot: {
        lightingVector:  { type: String, default: '' },    // 光照方向/強度/色溫
        characterPose:   { type: String, default: '' },    // 角色骨骼位置描述
        particleState:   { type: String, default: '' },    // 雨滴/灰塵/煙霧密度與速度
        environmentState:{ type: String, default: '' },    // 環境狀態（風速、溫度感）
    },
    // ─爭 叙事進度條（Narrative Cursor）──
    narrativeCursor: {
        percentStart:    { type: Number, default: 0 },     // 起始百分比（0-100）
        percentEnd:      { type: Number, default: 25 },    // 結束百分比
        storyBeat:       { type: String, default: '' },    // 當前敘事節點（起/承/轉/合）
        emotionArc:      { type: String, default: '' },    // 情緒弧線
    },
    // ── 提示詞 ──
    promptEn:       { type: String, default: '' },
    promptZh:       { type: String, default: '' },
    negativePrompt: { type: String, default: '' },
    // ── 鏡頭參數 ──
    camera:         {
        startFrame:  { type: String, default: '' },        // 起始構圖描述
        endFrame:    { type: String, default: '' },        // 終止構圖描述
        movement:    { type: String, default: '' },
        shotSize:    { type: String, default: '' },
        angle:       { type: String, default: '' },
        lensMm:      { type: Number },
    },
    // ── 平台 ──
    platform:       { type: String, enum: ['sora', 'kling', 'runway', 'pika', 'vidu', 'general'], default: 'general' },
    status:         { type: String, enum: ['pending', 'generating', 'generated', 'validated', 'failed'], default: 'pending' },
}, { timestamps: true, toJSON: snakeTransform });

// ==========================================
// 過渡橋接節點（Transition Bridge）
// 讀取尾幀錨點 + 物理快照，注入下一個原子單元
// ==========================================
const TransitionBridgeSchema = new Schema({
    storyId:        { type: Schema.Types.ObjectId, ref: 'Story', required: true, index: true },
    fromClipId:     { type: Schema.Types.ObjectId, ref: 'AtomicClip', required: true },
    toClipId:       { type: Schema.Types.ObjectId, ref: 'AtomicClip', required: true },
    bridgeIndex:    { type: Number, required: true },       // 第幾個橋接（0→1, 1→2, 2→3...）
    // ── 傳遞的狀態 ──
    inheritedState: {
        endFrameUrl:     { type: String, default: '' },    // 從 fromClip 繼承的尾幀
        physicsSnapshot: { type: Schema.Types.Mixed },      // 完整物理快照
        narrativeCursor: { type: Schema.Types.Mixed },      // 敘事進度
        characterState:  { type: String, default: '' },    // 角色連續性描述
        environmentDelta:{ type: String, default: '' },    // 環境變化描述（如「雨勢加大」）
    },
    // ── 過渡類型 ──
    transitionType: { type: String, enum: ['hard_cut', 'cross_dissolve', 'match_cut', 'morph', 'smash_cut', 'fade_through_black', 'wipe', 'custom'], default: 'cross_dissolve' },
    transitionDuration: { type: Number, default: 0.5 },    // 過渡時長（秒）
    // ── 注入指令 ──
    injectionPrompt:{ type: String, default: '' },         // 注入 toClip 的額外提示詞
    // ── 校驗結果 ──
    validated:      { type: Boolean, default: false },
    validationScore:{ type: Number },                       // 0-100 一致性分數
    issues:         [{ type: String }],
}, { timestamps: true, toJSON: snakeTransform });

// ==========================================
// 一致性校驗報告（Consistency Report）
// ==========================================
const ConsistencyReportSchema = new Schema({
    storyId:        { type: Schema.Types.ObjectId, ref: 'Story', required: true, index: true },
    bridgeId:       { type: Schema.Types.ObjectId, ref: 'TransitionBridge' },
    fromClipId:     { type: Schema.Types.ObjectId, ref: 'AtomicClip' },
    toClipId:       { type: Schema.Types.ObjectId, ref: 'AtomicClip' },
    // ── 角色漂移檢測 ──
    characterDrift: {
        detected:   { type: Boolean, default: false },
        score:      { type: Number },                       // 誤差百分比
        threshold:  { type: Number, default: 3 },           // 3% 觸發警告
        details:    { type: String, default: '' },
        severity:   { type: String, enum: ['ok', 'warn', 'fail'], default: 'ok' },
    },
    // ── 光影斷層檢測 ──
    lightingDrift:  {
        detected:   { type: Boolean, default: false },
        histogramDiff: { type: Number },                    // 直方圖差異
        colorTempDiff: { type: Number },                    // 色溫差異
        autoFix:    { type: Boolean, default: false },      // 是否自動插入 LUT 校正
        lutApplied: { type: String, default: '' },
        severity:   { type: String, enum: ['ok', 'warn', 'fail'], default: 'ok' },
    },
    // ── 動作連續性 ──
    motionDrift:    {
        detected:   { type: Boolean, default: false },
        details:    { type: String, default: '' },
        severity:   { type: String, enum: ['ok', 'warn', 'fail'], default: 'ok' },
    },
    // ── 總評 ──
    overallScore:   { type: Number },                       // 0-100
    passed:         { type: Boolean, default: false },
    autoRepairDone: { type: Boolean, default: false },
    repairNotes:    { type: String, default: '' },
}, { timestamps: true, toJSON: snakeTransform });

// ==========================================
// 評論
// ==========================================
const CommentSchema = new Schema({
    userId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
    storyId:   { type: Schema.Types.ObjectId, ref: 'Story', required: true, index: true },
    parentId:  { type: Schema.Types.ObjectId, ref: 'Comment' },
    content:   { type: String, required: true },
    status:    { type: String, enum: ['active', 'hidden', 'deleted'], default: 'active' },
}, { timestamps: true, toJSON: snakeTransform });

// ==========================================
// 互動
// ==========================================
const InteractionSchema = new Schema({
    userId:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: { type: String, enum: ['story', 'prompt', 'user'], required: true },
    targetId:   { type: Schema.Types.ObjectId, required: true },
    action:     { type: String, enum: ['like', 'bookmark', 'follow', 'report', 'view', 'rate'], required: true },
    rating:     { type: Number },
}, { timestamps: true, toJSON: snakeTransform });
InteractionSchema.index({ userId: 1, targetType: 1, targetId: 1, action: 1 }, { unique: true });

// ==========================================
// 通知
// ==========================================
const NotificationSchema = new Schema({
    userId:  { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type:    { type: String, required: true },
    title:   { type: String, required: true },
    message: { type: String, default: '' },
    link:    { type: String },
    isRead:  { type: Boolean, default: false },
}, { timestamps: true, toJSON: snakeTransform });

// ==========================================
// 故事模板
// ==========================================
const StoryTemplateSchema = new Schema({
    name:           { type: String, required: true },
    description:    { type: String },
    categoryId:     { type: Schema.Types.ObjectId, ref: 'Category' },
    genre:          { type: String },
    tone:           { type: String },
    targetAudience: { type: String },
    outline:        { type: String, required: true },
    opening:        { type: String },
    characterTemplate: { type: Schema.Types.Mixed },
    writingTips:    { type: String },
    difficulty:     { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
    icon:           { type: String },
    usageCount:     { type: Number, default: 0 },
    isPublic:       { type: Boolean, default: true },
}, { timestamps: true, toJSON: snakeTransform });

// ==========================================
// 寫作提示
// ==========================================
const WritingPromptSchema = new Schema({
    promptType: { type: String, enum: ['opening', 'character', 'conflict', 'world', 'dialogue', 'twist', 'ending'], required: true },
    content:    { type: String, required: true },
    genre:      { type: String, default: '通用' },
    difficulty: { type: String, default: 'all' },
    usedCount:  { type: Number, default: 0 },
}, { toJSON: snakeTransform });

// ==========================================
// 閱讀清單
// ==========================================
const ReadingListSchema = new Schema({
    userId:      { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name:        { type: String, default: '我的閱讀清單' },
    description: { type: String, default: '' },
    isPublic:    { type: Boolean, default: false },
    items: [{
        storyId: { type: Schema.Types.ObjectId, ref: 'Story' },
        addedAt: { type: Date, default: Date.now },
        notes:   { type: String },
    }],
}, { timestamps: true, toJSON: snakeTransform });

// ==========================================
// 故事版本
// ==========================================
const StoryVersionSchema = new Schema({
    storyId:       { type: Schema.Types.ObjectId, ref: 'Story', required: true, index: true },
    versionNumber: { type: Number, required: true },
    title:         { type: String },
    content:       { type: String, required: true },
    summary:       { type: String },
    changeNote:    { type: String },
}, { timestamps: true, toJSON: snakeTransform });

// ==========================================
// 用戶偏好
// ==========================================
const UserPreferenceSchema = new Schema({
    userId:            { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    theme:             { type: String, enum: ['light', 'dark', 'auto'], default: 'light' },
    fontSize:          { type: String, enum: ['small', 'medium', 'large'], default: 'medium' },
    editorFont:        { type: String, enum: ['sans', 'serif', 'mono'], default: 'sans' },
    language:          { type: String, default: 'zh-TW' },
    emailNotifications:{ type: Boolean, default: true },
    autoSave:          { type: Boolean, default: true },
}, { timestamps: true, toJSON: snakeTransform });

// ==========================================
// 系統設定
// ==========================================
const SystemSettingSchema = new Schema({
    key:         { type: String, required: true, unique: true },
    value:       { type: String },
    description: { type: String },
}, { timestamps: true, toJSON: snakeTransform });

// ==========================================
// 🔥 AI 交互日誌（核心：完整記錄所有 AI 交互）
// ==========================================
const AIInteractionSchema = new Schema({
    userId:        { type: Schema.Types.ObjectId, ref: 'User', index: true },
    // 交互類型
    interactionType: {
        type: String,
        enum: [
            'story_outline',      // 故事大綱生成
            'story_content',      // 故事正文生成
            'story_full',         // 完整故事生成
            'story_continue',     // 故事續寫
            'story_rewrite',      // 改寫/潤色
            'story_translate',    // 翻譯
            'video_prompt_story', // 從故事生成影片提示詞
            'video_prompt_desc',  // 從描述生成影片提示詞
            'character_gen',      // 角色生成
            'world_gen',          // 世界觀生成
            'dialogue_gen',       // 對話生成
            'name_gen',           // 名字生成
            'template_fill',      // 模板填充
            'camera_compose',     // 鏡頭語言組合
        ],
        required: true,
        index: true
    },
    // 輸入數據
    input: {
        prompt:      { type: String },         // 用戶原始輸入
        systemPrompt:{ type: String },         // 系統提示詞
        parameters:  { type: Schema.Types.Mixed }, // 結構化參數
        storyId:     { type: Schema.Types.ObjectId, ref: 'Story' }, // 關聯故事
    },
    // LLM 配置
    llmConfig: {
        provider:    { type: String },         // openai/anthropic/deepseek
        model:       { type: String },         // 具體模型名稱
        tier:        { type: String },         // fast/balanced/powerful
        temperature: { type: Number },
        maxTokens:   { type: Number },
    },
    // 輸出數據
    output: {
        rawResponse:   { type: String },       // LLM 原始回應
        parsedData:    { type: Schema.Types.Mixed }, // 解析後的結構化數據
        contentType:   { type: String },       // 內容類型（json/text/markdown）
        wordCount:     { type: Number },
    },
    // 處理狀態
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed', 'optimized'],
        default: 'pending',
        index: true
    },
    // 優化記錄
    optimization: {
        isOptimized:    { type: Boolean, default: false },
        optimizedAt:    { type: Date },
        optimizedBy:    { type: String },      // 優化使用的模型
        originalScore:  { type: Number },       // 原始品質分數 (0-100)
        optimizedScore: { type: Number },       // 優化後品質分數
        feedback:       { type: String },       // AI 優化反饋
        suggestions:    [{ type: String }],     // 改進建議
    },
    // 品質評估
    quality: {
        score:       { type: Number, min: 0, max: 100 },  // 品質評分
        coherence:   { type: Number, min: 0, max: 10 },   // 連貫性
        creativity:  { type: Number, min: 0, max: 10 },   // 創意性
        relevance:   { type: Number, min: 0, max: 10 },   // 相關性
        language:    { type: Number, min: 0, max: 10 },   // 語言品質
        feedback:    { type: String },                      // 詳細反饋
    },
    // 使用統計
    usage: {
        tokensInput:  { type: Number, default: 0 },
        tokensOutput: { type: Number, default: 0 },
        totalTokens:  { type: Number, default: 0 },
        cost:         { type: Number, default: 0 },        // 積分消耗
        processingMs: { type: Number, default: 0 },        // 處理時間
    },
    // 用戶反饋
    userFeedback: {
        rating:     { type: Number, min: 1, max: 5 },     // 用戶評分
        comment:    { type: String },                       // 用戶評論
        isFavorite: { type: Boolean, default: false },
        isUsed:     { type: Boolean, default: false },     // 是否被用戶採用
    },
    // 錯誤信息
    error: {
        message: { type: String },
        code:    { type: String },
        stack:   { type: String },
    },
    // 元數據
    metadata: {
        userAgent: { type: String },
        ip:        { type: String },
        sessionId: { type: String },
        tags:      [{ type: String }],
    },
}, { timestamps: true, toJSON: snakeTransform });

AIInteractionSchema.index({ userId: 1, createdAt: -1 });
AIInteractionSchema.index({ interactionType: 1, status: 1 });
AIInteractionSchema.index({ 'quality.score': -1 });
AIInteractionSchema.index({ 'optimization.isOptimized': 1 });

// ==========================================
// AI 優化任務
// ==========================================
const AIOptimizationTaskSchema = new Schema({
    interactionId: { type: Schema.Types.ObjectId, ref: 'AIInteraction', required: true },
    taskType: {
        type: String,
        enum: ['quality_check', 'auto_improve', 'style_transfer', 'grammar_fix', 'expand', 'compress', 'translate_optimize'],
        required: true
    },
    status: { type: String, enum: ['pending', 'running', 'completed', 'failed'], default: 'pending' },
    input:  { type: Schema.Types.Mixed },
    output: { type: Schema.Types.Mixed },
    improvement: {
        before: { type: String },
        after:  { type: String },
        diff:   { type: String },
        score:  { type: Number },
    },
    error: { type: String },
}, { timestamps: true, toJSON: snakeTransform });

// ==========================================
// Workflow Model
// ==========================================
const WorkflowSchema = new Schema({
    userId:      { type: Schema.Types.ObjectId, ref: 'User', index: true },
    name:        { type: String, default: 'Untitled Workflow' },
    description: { type: String, default: '' },
    nodes: [{
        id:     { type: String, required: true },
        type:   { type: String, required: true },
        x:      { type: Number, default: 0 },
        y:      { type: Number, default: 0 },
        params: { type: Schema.Types.Mixed, default: {} },
        execState:   { type: String },
        outputData:  { type: Schema.Types.Mixed },
    }],
    connections: [{
        id:         { type: String, required: true },
        fromNode:   { type: String, required: true },
        fromOutput: { type: String, required: true },
        toNode:     { type: String, required: true },
        toInput:    { type: String, required: true },
    }],
    status:  { type: String, enum: ['draft','running','completed','failed'], default: 'draft' },
    tags:    [{ type: String }],
    isPublic:{ type: Boolean, default: false },
    lastExecutedAt: { type: Date },
    executionLog: [{
        nodeId:  { type: String },
        status:  { type: String },
        output:  { type: Schema.Types.Mixed },
        error:   { type: String },
        startedAt:   { type: Date },
        completedAt: { type: Date },
    }],
}, { timestamps: true, toJSON: snakeTransform });
WorkflowSchema.index({ userId: 1, updatedAt: -1 });

// ==========================================
// Export all models
// ==========================================
module.exports = {
    User:              mongoose.model('User', UserSchema),
    Story:             mongoose.model('Story', StorySchema),
    Chapter:           mongoose.model('Chapter', ChapterSchema),
    Character:         mongoose.model('Character', CharacterSchema),
    Category:          mongoose.model('Category', CategorySchema),
    Tag:               mongoose.model('Tag', TagSchema),
    VideoPromptTemplate: mongoose.model('VideoPromptTemplate', VideoPromptTemplateSchema),
    VideoPrompt:       mongoose.model('VideoPrompt', VideoPromptSchema),
    CameraMovement:    mongoose.model('CameraMovement', CameraMovementSchema),
    ShotSize:          mongoose.model('ShotSize', ShotSizeSchema),
    CameraAngle:       mongoose.model('CameraAngle', CameraAngleSchema),
    ShotTransition:    mongoose.model('ShotTransition', ShotTransitionSchema),
    CameraLanguageTemplate: mongoose.model('CameraLanguageTemplate', CameraLanguageTemplateSchema),
    LightingPreset:    mongoose.model('LightingPreset', LightingPresetSchema),
    VisualStyle:       mongoose.model('VisualStyle', VisualStyleSchema),
    ColorPalette:      mongoose.model('ColorPalette', ColorPaletteSchema),
    Prop:              mongoose.model('Prop', PropSchema),
    Scene:             mongoose.model('Scene', SceneSchema),
    CharacterContinuity: mongoose.model('CharacterContinuity', CharacterContinuitySchema),
    SceneContinuity:   mongoose.model('SceneContinuity', SceneContinuitySchema),
    AtomicClip:        mongoose.model('AtomicClip', AtomicClipSchema),
    TransitionBridge:  mongoose.model('TransitionBridge', TransitionBridgeSchema),
    ConsistencyReport: mongoose.model('ConsistencyReport', ConsistencyReportSchema),
    Comment:           mongoose.model('Comment', CommentSchema),
    Interaction:       mongoose.model('Interaction', InteractionSchema),
    Notification:      mongoose.model('Notification', NotificationSchema),
    StoryTemplate:     mongoose.model('StoryTemplate', StoryTemplateSchema),
    WritingPrompt:     mongoose.model('WritingPrompt', WritingPromptSchema),
    ReadingList:       mongoose.model('ReadingList', ReadingListSchema),
    StoryVersion:      mongoose.model('StoryVersion', StoryVersionSchema),
    UserPreference:    mongoose.model('UserPreference', UserPreferenceSchema),
    SystemSetting:     mongoose.model('SystemSetting', SystemSettingSchema),
    AIInteraction:     mongoose.model('AIInteraction', AIInteractionSchema),
    AIOptimizationTask:mongoose.model('AIOptimizationTask', AIOptimizationTaskSchema),
    Workflow:          mongoose.model('Workflow', WorkflowSchema),
};
