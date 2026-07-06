const express = require('express');
const Database = require('better-sqlite3');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'database', 'story_platform.db');

// Initialize DB if not exists
if (!fs.existsSync(DB_PATH)) {
    console.log('📦 數據庫未找到，正在初始化...');
    require('./database/init');
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// CORS for development
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

// API Routes
app.use('/api/auth', require('./routes/auth')(db));
app.use('/api/stories', require('./routes/stories')(db));
app.use('/api/prompts', require('./routes/prompts')(db));
app.use('/api/camera', require('./routes/camera')(db));
app.use('/api/tools', require('./routes/tools')(db));
app.use('/api/llm', require('./routes/llm')(db));
app.use('/api/admin', require('./routes/admin')(db));

// SPA fallback - serve index.html for non-API routes
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API端點不存在' });
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({ error: '伺服器內部錯誤' });
});

app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════╗
║                                          ║
║   🎭 StoryForge AI - 故事生成平台        ║
║                                          ║
║   🌐 http://localhost:${PORT}               ║
║   📊 管理後台: http://localhost:${PORT}/admin  ║
║                                          ║
║   管理員帳號: admin / admin123           ║
║   示範帳號:   demo / demo123             ║
║                                          ║
╚══════════════════════════════════════════╝
    `);
});

module.exports = app;
