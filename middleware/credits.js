/**
 * 積分扣款 Middleware
 * 在 AI 生成 API 呼叫前扣除積分，不足時回傳 402
 */

/**
 * 建立積分扣款 middleware
 * @param {Object} models - Mongoose models
 * @param {number} cost - 本次扣款積分數量
 * @param {string} description - 交易描述
 */
function deductCredits(models, cost, description) {
    return async (req, res, next) => {
        try {
            const userId = req.user.id;
            const user = await models.User.findById(userId).select('credits');
            if (!user) {
                return res.status(404).json({ error: '用戶不存在' });
            }

            // 檢查積分是否足夠
            if (user.credits < cost) {
                return res.status(402).json({
                    error: '積分不足，請先充值',
                    currentCredits: user.credits,
                    requiredCredits: cost,
                    deficit: cost - user.credits,
                });
            }

            // 使用 findOneAndUpdate 進行原子扣款，避免並發問題
            const result = await models.User.findOneAndUpdate(
                { _id: userId, credits: { $gte: cost } },
                { $inc: { credits: -cost } },
                { new: true }
            ).select('credits');

            if (!result) {
                // 原子操作失敗（並發扣除導致積分不足）
                return res.status(402).json({
                    error: '積分不足，請先充值',
                    currentCredits: user.credits,
                    requiredCredits: cost,
                });
            }

            // 記錄交易明細
            await models.CreditTransaction.create({
                userId,
                amount: -cost,
                type: 'deduction',
                description,
                balanceAfter: result.credits,
                relatedId: null,
                metadata: { endpoint: req.originalUrl },
            });

            // 將剩餘積分掛到 req 上，方便後續使用
            req.creditsRemaining = result.credits;
            req.creditCost = cost;

            next();
        } catch (err) {
            console.error('積分扣款失敗:', err.message);
            res.status(500).json({ error: '積分系統異常' });
        }
    };
}

/**
 * 建立積分充值 API（管理員或 Stripe webhook 使用）
 * 手動充值積分
 */
async function addCredits(models, userId, amount, type, description, metadata = {}) {
    const user = await models.User.findById(userId).select('credits');
    if (!user) throw new Error('用戶不存在');

    const result = await models.User.findByIdAndUpdate(
        userId,
        { $inc: { credits: amount } },
        { new: true }
    ).select('credits');

    await models.CreditTransaction.create({
        userId,
        amount,
        type,
        description,
        balanceAfter: result.credits,
        metadata,
    });

    return result.credits;
}

module.exports = { deductCredits, addCredits };
