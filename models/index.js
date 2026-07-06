/**
 * StoryForge AI - MongoDB Models
 * 完整的數據模型定義
 */
const mongoose = require('mongoose');
const { Schema } = mongoose;

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
}, { timestamps: true });

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
}, { timestamps: true });

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
}, { timestamps: true });

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
}, { timestamps: true });

// ==========================================
// 分類
// ==========================================
const CategorySchema = new Schema({
    name:        { type: String, required: true, unique: true },
    slug:        { type: String, required: true, unique: true },
    description: { type: String, default: '' },
    icon:        { type: String, default: '' },
    sortOrder:   { type: Number, default: 0 },
}, { timestamps: true });

// ==========================================
// 標籤
// ==========================================
const TagSchema = new Schema({
    name:       { type: String, required: true, unique: true },
    slug:       { type: String, required: true, unique: true },
    usageCount: { type: Number, default: 0 },
});

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
}, { timestamps: true });

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
}, { timestamps: true });

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
});

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
});

const CameraAngleSchema = new Schema({
    nameZh:             { type: String, required: true },
    nameEn:             { type: String, required: true },
    description:        { type: String },
    psychologicalEffect:{ type: String },
    useCase:            { type: String },
    englishPrompt:      { type: String },
    icon:               { type: String },
    sortOrder:          { type: Number, default: 0 },
});

const ShotTransitionSchema = new Schema({
    nameZh:         { type: String, required: true },
    nameEn:         { type: String, required: true },
    description:    { type: String },
    technique:      { type: String },
    mood:           { type: String },
    englishPrompt:  { type: String },
    icon:           { type: String },
    sortOrder:      { type: Number, default: 0 },
});

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
});

// ==========================================
// 評論
// ==========================================
const CommentSchema = new Schema({
    userId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
    storyId:   { type: Schema.Types.ObjectId, ref: 'Story', required: true, index: true },
    parentId:  { type: Schema.Types.ObjectId, ref: 'Comment' },
    content:   { type: String, required: true },
    status:    { type: String, enum: ['active', 'hidden', 'deleted'], default: 'active' },
}, { timestamps: true });

// ==========================================
// 互動
// ==========================================
const InteractionSchema = new Schema({
    userId:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: { type: String, enum: ['story', 'prompt', 'user'], required: true },
    targetId:   { type: Schema.Types.ObjectId, required: true },
    action:     { type: String, enum: ['like', 'bookmark', 'follow', 'report', 'view', 'rate'], required: true },
    rating:     { type: Number },
}, { timestamps: true });
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
}, { timestamps: true });

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
}, { timestamps: true });

// ==========================================
// 寫作提示
// ==========================================
const WritingPromptSchema = new Schema({
    promptType: { type: String, enum: ['opening', 'character', 'conflict', 'world', 'dialogue', 'twist', 'ending'], required: true },
    content:    { type: String, required: true },
    genre:      { type: String, default: '通用' },
    difficulty: { type: String, default: 'all' },
    usedCount:  { type: Number, default: 0 },
});

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
}, { timestamps: true });

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
}, { timestamps: true });

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
}, { timestamps: true });

// ==========================================
// 系統設定
// ==========================================
const SystemSettingSchema = new Schema({
    key:         { type: String, required: true, unique: true },
    value:       { type: String },
    description: { type: String },
}, { timestamps: true });

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
}, { timestamps: true });

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
}, { timestamps: true });

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
};
