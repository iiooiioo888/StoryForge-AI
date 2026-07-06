/**
 * StoryForge AI - MongoDB Connection
 * 使用 mongodb-memory-server 作為內建 MongoDB 實例
 */
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer = null;

async function connectDatabase() {
    console.log('🗄️  正在啟動 MongoDB...');

    mongoServer = await MongoMemoryServer.create({
        instance: {
            dbName: 'storyforge',
            port: 27017,
        },
    });

    const uri = mongoServer.getUri();
    console.log(`  ✓ MongoDB 已啟動：${uri}`);

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
