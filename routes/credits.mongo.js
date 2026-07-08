/**
 * 積分系統 API 路由
 * - GET  /api/credits/balance     查詢積分餘額
 * - POST /api/credits/recharge    充值積分（管理員/模擬）
 * - GET  /api/credits/transactions 查詢交易紀錄（分頁）
 */
const express = require('express');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { addCredits } = require('../middleware/credits');

module.exports = function (models) {
    const router = express.Router();

    // ========== 查詢積分餘額 ==========
    router.get('/balance', authMiddleware, async (req, res) => {
        try {
            const user = await models.User.findById(req.user.id).select('credits');
            if (!user) return res.status(404).json({ error: '用戶不存在' });

            // 取得最近一筆交易紀錄
            const lastTx = await models.CreditTransaction.findOne({ userId: req.user.id })
                .sort({ createdAt: -1 })
                .select('type description amount createdAt');

            res.json({
                credits: user.credits,
                lastTransaction: lastTx || null,
            });
        } catch (err) {
            res.status(500).json({ error: '查詢積分失敗' });
        }
    });

    // ========== 充值積分（模擬充值，正式環境由 Stripe webhook 觸發） ==========
    router.post('/recharge', authMiddleware, adminMiddleware, async (req, res) => {
        try {
            const { amount, description } = req.body;

            if (!amount || amount <= 0) {
                return res.status(400).json({ error: '充值金額必須為正整數' });
            }
            if (amount > 100000) {
                return res.status(400).json({ error: '單次充值上限為 100,000 積分' });
            }

            const newBalance = await addCredits(
                models,
                req.user.id,
                amount,
                'purchase',
                description || `充值 ${amount} 積分`,
                { source: 'manual_recharge' }
            );

            res.json({
                success: true,
                message: `成功充值 ${amount} 積分`,
                credits: newBalance,
            });
        } catch (err) {
            res.status(500).json({ error: '充值失敗：' + err.message });
        }
    });

    // ========== 查詢交易紀錄（分頁） ==========
    router.get('/transactions', authMiddleware, async (req, res) => {
        try {
            const {
                page = 1,
                limit = 20,
                type,       // 可選：按交易類型過濾
                start_date, // 可選：起始日期 YYYY-MM-DD
                end_date,   // 可選：結束日期 YYYY-MM-DD
            } = req.query;

            const filter = { userId: req.user.id };

            if (type) {
                filter.type = type;
            }
            if (start_date || end_date) {
                filter.createdAt = {};
                if (start_date) filter.createdAt.$gte = new Date(start_date);
                if (end_date) filter.createdAt.$lte = new Date(end_date + 'T23:59:59.999Z');
            }

            const pageNum = Math.max(1, parseInt(page));
            const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
            const skip = (pageNum - 1) * limitNum;

            const [transactions, total] = await Promise.all([
                models.CreditTransaction.find(filter)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limitNum)
                    .lean(),
                models.CreditTransaction.countDocuments(filter),
            ]);

            res.json({
                transactions,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    totalPages: Math.ceil(total / limitNum),
                },
            });
        } catch (err) {
            res.status(500).json({ error: '查詢交易紀錄失敗' });
        }
    });

    // ========== 交易統計 ==========
    router.get('/stats', authMiddleware, async (req, res) => {
        try {
            const userId = req.user.id;
            const now = new Date();
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

            // 本月支出（扣款）
            const monthlyDeduction = await models.CreditTransaction.aggregate([
                {
                    $match: {
                        userId: models.CreditTransaction.schema.path('userId').cast(userId),
                        type: 'deduction',
                        createdAt: { $gte: monthStart },
                    },
                },
                { $group: { _id: null, total: { $sum: { $abs: '$amount' } } } },
            ]);

            // 本月充值
            const monthlyPurchase = await models.CreditTransaction.aggregate([
                {
                    $match: {
                        userId: models.CreditTransaction.schema.path('userId').cast(userId),
                        type: { $in: ['purchase', 'bonus', 'refund', 'subscription'] },
                        createdAt: { $gte: monthStart },
                    },
                },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]);

            res.json({
                monthlySpent: monthlyDeduction[0]?.total || 0,
                monthlyAdded: monthlyPurchase[0]?.total || 0,
                month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
            });
        } catch (err) {
            res.status(500).json({ error: '查詢統計失敗' });
        }
    });

    return router;
};
