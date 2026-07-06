/**
 * Performance Middleware - 壓縮、緩存、限流
 */
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

function setupPerformance(app) {
    // Helmet 安全頭
    app.use(helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
    }));

    // gzip 壓縮
    app.use(compression({
        level: 6,
        threshold: 1024,
        filter: (req, res) => {
            if (req.headers['x-no-compression']) return false;
            return compression.filter(req, res);
        }
    }));

    // 全局限流
    const globalLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 分鐘
        max: 300,
        message: { error: '請求過於頻繁，請稍後再試' },
        standardHeaders: true,
        legacyHeaders: false,
    });
    app.use('/api/', globalLimiter);

    // 登入限流（更嚴格）
    const authLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 20,
        message: { error: '登入嘗試過多，請 15 分鐘後再試' },
    });
    app.use('/api/auth/login', authLimiter);

    // 註冊限流
    const registerLimiter = rateLimit({
        windowMs: 60 * 60 * 1000,
        max: 5,
        message: { error: '註冊嘗試過多，請稍後再試' },
    });
    app.use('/api/auth/register', registerLimiter);

    // LLM 生成限流
    const llmLimiter = rateLimit({
        windowMs: 60 * 1000,
        max: 10,
        message: { error: 'AI 生成請求過多，請稍後再試' },
    });
    app.use('/api/llm/', llmLimiter);

    // 靜態資源緩存頭
    app.use('/css', (req, res, next) => {
        res.setHeader('Cache-Control', 'public, max-age=86400');
        next();
    });
    app.use('/js', (req, res, next) => {
        res.setHeader('Cache-Control', 'public, max-age=3600');
        next();
    });
    app.use('/assets', (req, res, next) => {
        res.setHeader('Cache-Control', 'public, max-age=604800');
        next();
    });

    console.log('  ✓ 性能中間件已啟用（壓縮/限流/緩存/安全頭）');
}

module.exports = { setupPerformance };
