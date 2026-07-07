/**
 * StoryForge AI - MongoDB Connection
 * 
 * 優先級：
 *   1. 環境變量 MONGODB_URI → 直連外部 MongoDB（推薦用獨立 Docker 容器）
 *   2. 無 MONGODB_URI → fallback 到 MongoMemoryServer（僅限本地開發）
 */
const mongoose = require('mongoose');

let mongoServer = null;

async function connectDatabase() {
    const externalUri = process.env.MONGODB_URI;

    if (externalUri && externalUri.trim() !== '') {
        // ── 外部 MongoDB（Docker / Atlas / 自建）──
        console.log(`🗄️  正在連接外部 MongoDB: ${externalUri}`);
        await mongoose.connect(externalUri, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        });
        console.log('  ✓ Mongoose 已連接外部 MongoDB');
        return externalUri;
    }

    // ── Fallback: MongoMemoryServer（開發用）──
    console.log('🗄️  未設定 MONGODB_URI，啟動內建 MongoDB（開發模式）...');
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongoServer = await MongoMemoryServer.create({
        binary: { version: '7.0.20' },
        instance: {
            dbName: 'storyforge',
            port: 27017,
        },
    });

    const uri = mongoServer.getUri();
    console.log(`  ✓ 內建 MongoDB 已啟動：${uri}`);

    await mongoose.connect(uri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
    });

    console.log('  ✓ Mongoose 已連接');
    return uri;
}

async function disconnectDatabase() {
    await mongoose.disconnect();
    if (mongoServer) {
        await mongoServer.stop();
        mongoServer = null;
    }
}

module.exports = { connectDatabase, disconnectDatabase };
