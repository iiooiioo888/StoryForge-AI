require('dotenv').config();

const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const mongoose = require('mongoose');
const { connectDatabase } = require('./database/connection');
const { seedIfEmpty } = require('./database/seed');
const models = require('./models');
const { setupPerformance } = require('./middleware/performance');
const { logger, httpLogger, requestLogger } = require('./middleware/logger');
const LLMService = require('./services/llm');
const StreamingService = require('./services/streaming');
const ContentModeration = require('./services/moderation');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize services
const llmService = new LLMService();
const streamingService = new StreamingService(llmService);

(async () => {
    await connectDatabase();
    await seedIfEmpty();

    // Seed demo workflows if none exist
    try {
        const wfCount = await models.Workflow.countDocuments();
        console.log(`  📊 Workflow count: ${wfCount}`);
        if (wfCount === 0) {
            const demoUser = await models.User.findOne({ username: 'demo' });
            console.log(`  📊 Demo user: ${demoUser ? demoUser.username : 'NOT FOUND'}`);
            if (demoUser) {
                await models.Workflow.insertMany([
                    { userId: demoUser._id, name: 'Cinematic Scene Pipeline', description: 'A 3-node chain for cinematic scene creation', status: 'draft', tags: ['demo','cinematic'],
                      nodes: [
                          { id: 'n1', type: 'world-anchor', x: 100, y: 200, params: { gravity: 9.8, globalLighting: 'HDRi' } },
                          { id: 'n2', type: 'scene-composer', x: 400, y: 150, params: { cameraLayout: 'free', depthRange: 100, weather: { type: 'clear', intensity: 0.3, wind: 5 } } },
                          { id: 'n3', type: 'cinematic-camera', x: 700, y: 200, params: { lensModel: 'ARRI', focalLength: 85, fStop: 2.8, iso: 800, frameRate: '24' } },
                      ],
                      connections: [
                          { id: 'c1', fromNode: 'n1', fromOutput: 'worldDNA', toNode: 'n2', toInput: 'worldDNA' },
                          { id: 'c2', fromNode: 'n2', fromOutput: 'sceneBlueprint', toNode: 'n3', toInput: 'sceneBlueprint' },
                      ]},
                    { userId: demoUser._id, name: 'Full Production Pipeline', description: 'Complete 5-node production workflow', status: 'draft', tags: ['demo','full'],
                      nodes: [
                          { id: 'n1', type: 'world-anchor', x: 100, y: 300, params: { gravity: 9.8, globalLighting: 'Raytraced' } },
                          { id: 'n2', type: 'scene-composer', x: 400, y: 200, params: { cameraLayout: 'side', depthRange: 200 } },
                          { id: 'n3', type: 'cinematic-camera', x: 400, y: 400, params: { lensModel: 'ARRI', focalLength: 50, fStop: 1.8 } },
                          { id: 'n4', type: 'performance-director', x: 700, y: 300, params: { rainInteraction: true } },
                          { id: 'n5', type: 'cine-sync', x: 1000, y: 300, params: { audioType: 'atmos' } },
                      ],
                      connections: [
                          { id: 'c1', fromNode: 'n1', fromOutput: 'worldDNA', toNode: 'n2', toInput: 'worldDNA' },
                          { id: 'c2', fromNode: 'n1', fromOutput: 'worldDNA', toNode: 'n3', toInput: 'worldDNA' },
                          { id: 'c3', fromNode: 'n2', fromOutput: 'sceneBlueprint', toNode: 'n4', toInput: 'worldDNA' },
                          { id: 'c4', fromNode: 'n3', fromOutput: 'cameraData', toNode: 'n5', toInput: 'cameraData' },
                          { id: 'c5', fromNode: 'n4', fromOutput: 'performanceData', toNode: 'n5', toInput: 'performanceData' },
                      ]},
                ]);
                console.log('  ✓ Seeded 2 demo workflows');
                // 新增包含新節點類型的工作流範本
                await models.Workflow.create({
                    userId: demoUser._id,
                    name: 'Lighting & Render Pipeline',
                    description: '含燈光設定、渲染匯出、AI prompt 生成的完整工作流',
                    status: 'draft',
                    tags: ['demo', 'lighting', 'render', 'ai'],
                    nodes: [
                        { id: 'wa1', type: 'world-anchor', x: 80, y: 150, params: { gravity: 9.8, globalLighting: 'HDRi', physicsRules: { gravity: 9.8, fluid: false, cloth: false } } },
                        { id: 'sc1', type: 'scene-composer', x: 360, y: 100, params: { cameraLayout: 'free', depthRange: 150, weather: { type: 'clear', intensity: 0.5, wind: 5 } } },
                        { id: 'cc1', type: 'cinematic-camera', x: 360, y: 300, params: { lensModel: 'ARRI', focalLength: 85, fStop: 2.8, iso: 800, frameRate: '24' } },
                        { id: 'lr1', type: 'lighting-rig', x: 640, y: 150, params: { preset: 'golden-hour', intensity: 1.0, colorTemperature: 3500, mood: 'warm' } },
                        { id: 'pg1', type: 'prompt-generator', x: 640, y: 350, params: { style: 'cinematic', platform: 'sora', customInstructions: 'Golden hour mood' } },
                        { id: 'ro1', type: 'render-output', x: 920, y: 200, params: { renderEngine: 'cycles', resolution: '4K', format: 'mp4', quality: 90, frameRate: '24' } },
                    ],
                    connections: [
                        { id: 'c1', fromNode: 'wa1', fromOutput: 'worldDNA', toNode: 'sc1', toInput: 'worldDNA' },
                        { id: 'c2', fromNode: 'sc1', fromOutput: 'sceneBlueprint', toNode: 'cc1', toInput: 'sceneBlueprint' },
                        { id: 'c3', fromNode: 'wa1', fromOutput: 'worldDNA', toNode: 'lr1', toInput: 'worldDNA' },
                        { id: 'c4', fromNode: 'sc1', fromOutput: 'sceneBlueprint', toNode: 'lr1', toInput: 'sceneBlueprint' },
                        { id: 'c5', fromNode: 'wa1', fromOutput: 'worldDNA', toNode: 'pg1', toInput: 'worldDNA' },
                        { id: 'c6', fromNode: 'sc1', fromOutput: 'sceneBlueprint', toNode: 'pg1', toInput: 'sceneBlueprint' },
                        { id: 'c7', fromNode: 'cc1', fromOutput: 'cameraData', toNode: 'pg1', toInput: 'cameraData' },
                        { id: 'c8', fromNode: 'lr1', fromOutput: 'lightingData', toNode: 'pg1', toInput: 'lightingData' },
                        { id: 'c9', fromNode: 'cc1', fromOutput: 'cameraData', toNode: 'ro1', toInput: 'cameraData' },
                        { id: 'c10', fromNode: 'lr1', fromOutput: 'lightingData', toNode: 'ro1', toInput: 'lightingData' },
                    ],
                });
                console.log('  ✓ Seeded extended workflow: Lighting & Render Pipeline');
            }
        }
    } catch (e) { console.error('Workflow seed error:', e.message, e.stack); }

    // ===== Performance Middleware =====
    setupPerformance(app);

    // ===== Logging =====
    app.use(httpLogger);
    app.use(requestLogger);

    // ===== Body Parsing =====
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());
    
    // ===== Static Files with Cache Headers =====
    const staticOptions = {
        maxAge: '1d',           // Cache for 1 day
        etag: true,             // Enable ETag
        lastModified: true,     // Enable Last-Modified
        setHeaders: (res, filePath) => {
            // Long cache for immutable assets (CSS/JS with hash)
            if (filePath.match(/\.(css|js)$/)) {
                res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
            }
            // No cache for HTML
            if (filePath.endsWith('.html')) {
                res.setHeader('Cache-Control', 'no-cache, must-revalidate');
            }
            // Service Worker - no cache
            if (filePath.endsWith('sw.js')) {
                res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            }
        }
    };
    app.use(express.static(path.join(__dirname, 'public'), staticOptions));

    // ===== CORS (origin whitelist) =====
    const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
        .split(',').map(s => s.trim());
    app.use((req, res, next) => {
        const origin = req.headers.origin;
        if (allowedOrigins.includes(origin)) {
            res.header('Access-Control-Allow-Origin', origin);
        } else if (!origin) {
            // Same-origin requests (no Origin header) — allow
            res.header('Access-Control-Allow-Origin', allowedOrigins[0] || '*');
        }
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Credentials', 'true');
        if (req.method === 'OPTIONS') return res.sendStatus(200);
        next();
    });

    // ===== Request Timeout (30s) =====
    app.use((req, res, next) => {
        req.setTimeout(30000, () => {
            res.status(408).json({ error: '請求超時' });
        });
        next();
    });

    // ===== Content Moderation on write endpoints =====

// ===== API Response Cache (read-only endpoints) =====
    const apiCache = new Map();
    function cacheMiddleware(ttl = 60) {
        return (req, res, next) => {
            if (req.method !== 'GET') return next();
            const key = req.originalUrl;
            const cached = apiCache.get(key);
            if (cached && Date.now() - cached.time < ttl * 1000) {
                res.set('X-Cache', 'HIT');
                return res.json(cached.data);
            }
            const originalJson = res.json.bind(res);
            res.json = (data) => {
                apiCache.set(key, { data, time: Date.now() });
                // Evict old entries
                if (apiCache.size > 500) {
                    const oldest = apiCache.keys().next().value;
                    apiCache.delete(oldest);
                }
                res.set('X-Cache', 'MISS');
                return originalJson(data);
            };
            next();
        };
    }
    
    // Cache camera data (rarely changes)
    app.use('/api/camera', cacheMiddleware(300));
    app.use('/api/prompts/templates', cacheMiddleware(300));
    
app.use('/api/stories', ContentModeration.middleware({ fields: ['content', 'title', 'summary'] }));

    // ===== API Routes =====
    app.use('/api/auth', require('./routes/auth.mongo')(models));
    app.use('/api/stories', require('./routes/stories.mongo')(models));
    app.use('/api/prompts', require('./routes/prompts.mongo')(models));
    app.use('/api/camera', require('./routes/camera.mongo')(models));
    app.use('/api/tools', require('./routes/tools.mongo')(models));
    app.use('/api/llm', require('./routes/llm.mongo')(models));
    app.use('/api/admin', require('./routes/admin.mongo')(models));
    app.use('/api/workflows', require('./routes/workflows.mongo')(models));
    app.use('/api/credits', require('./routes/credits.mongo')(models));

    // ===== SSE Streaming Endpoint =====
    app.post('/api/llm/stream', require('./middleware/auth').authMiddleware, async (req, res) => {
        const { prompt, systemPrompt, provider, tier, model, maxTokens, temperature } = req.body;
        await streamingService.streamChat(req, res, { prompt, systemPrompt, provider, tier, model, maxTokens, temperature });
    });

    // ===== Health Check =====
    app.get('/api/health', (req, res) => {
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        });
    });

    // ===== Landing Page（首頁） =====
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'landing.html'));
    });

    // ===== App 路由（SPA） =====
    app.get('/app', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    // ===== robots.txt 與 sitemap.xml =====
    app.get('/robots.txt', (req, res) => {
        res.type('text/plain');
        res.send(`User-agent: *
Allow: /
Disallow: /api/
Sitemap: https://storyforge.ai/sitemap.xml`);
    });

    app.get('/sitemap.xml', (req, res) => {
        res.type('application/xml');
        res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://storyforge.ai/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://storyforge.ai/app</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
</urlset>`);
    });

    // ===== SPA Fallback =====
    app.get('*', (req, res) => {
        if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'API端點不存在' });
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    // ===== Error Handler =====
    app.use((err, req, res, next) => {
        logger.error('Unhandled error', { error: err.message, stack: err.stack, url: req.originalUrl });
        res.status(500).json({ error: '伺服器內部錯誤' });
    });

    app.listen(PORT, () => {
        logger.info(`StoryForge AI started on port ${PORT}`);
        console.log(`
╔══════════════════════════════════════════════════════╗
║                                                      ║
║   🎭 StoryForge AI - Production Ready                ║
║                                                      ║
║   🌐 http://localhost:${PORT}                           ║
║   📊 Admin: http://localhost:${PORT}/admin                ║
║   💚 Health: http://localhost:${PORT}/api/health           ║
║                                                      ║
║   管理員: admin / admin123 | 用戶: demo / demo123    ║
║   🗄️  MongoDB | 📦 Compression | 🔒 Rate Limiting    ║
║   📝 Winston Logger | 🛡️ Content Moderation           ║
║   🌊 SSE Streaming | 🐳 Docker Ready                  ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
        `);
    });
})();
