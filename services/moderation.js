/**
 * Content Moderation - 內容審核服務
 */

const SENSITIVE_PATTERNS = {
    violence: /殺死|謀殺|自殺|血腥|虐待|酷刑|屠殺|爆炸|槍殺|砍殺/i,
    sexual: /色情|裸體|性行為|成人內容/i,
    political: /政治敏感|政黨|選舉作弊|顛覆政权/i,
    hate: /種族歧視|性別歧視|仇恨言論|歧視殘障/i,
    illegal: /毒品|販毒|走私|洗錢|詐騙教學|駭客攻擊/i,
};

class ContentModeration {
    /**
     * 快速文本審核（本地規則）
     */
    static quickCheck(text) {
        if (!text || text.length < 10) return { safe: true, score: 100 };

        const issues = [];
        let score = 100;

        for (const [category, pattern] of Object.entries(SENSITIVE_PATTERNS)) {
            const matches = text.match(new RegExp(pattern, 'gi'));
            if (matches) {
                issues.push({ category, matches: matches.length });
                score -= matches.length * 15;
            }
        }

        // 檢查過長文本（可能 spam）
        if (text.length > 50000) {
            issues.push({ category: 'spam', reason: '文本過長' });
            score -= 10;
        }

        return {
            safe: score >= 70,
            score: Math.max(0, score),
            issues,
            needsReview: score < 70 && score >= 40,
            blocked: score < 40,
        };
    }

    /**
     * LLM 深度審核（用於爭議內容）
     */
    static async llmModerate(llmService, text, provider) {
        try {
            const result = await llmService.chat({
                systemPrompt: `你是一個內容審核系統。分析以下文本，判斷是否包含不當內容。
輸出 JSON：{"safe": true/false, "categories": ["類別"], "reason": "原因", "score": 0-100}
類別包括：violence, sexual, political, hate, illegal, spam, none`,
                prompt: `請審核以下文本：\n\n${text.substring(0, 2000)}`,
                provider,
                tier: 'fast',
                temperature: 0.1,
                maxTokens: 256,
            });

            try {
                const jsonMatch = result.content.match(/\{[\s\S]*\}/);
                return JSON.parse(jsonMatch ? jsonMatch[0] : result.content);
            } catch (e) {
                return { safe: true, score: 80, categories: ['parse_error'] };
            }
        } catch (err) {
            return { safe: true, score: 50, categories: ['check_failed'] };
        }
    }

    /**
     * 審核中間件
     */
    static middleware(options = {}) {
        const { fields = ['content', 'title', 'summary'], blockThreshold = 40 } = options;

        return (req, res, next) => {
            for (const field of fields) {
                const value = req.body[field];
                if (!value) continue;

                const result = ContentModeration.quickCheck(value);
                
                if (result.blocked) {
                    return res.status(400).json({
                        error: '內容包含不當信息，已被攔截',
                        details: { field, score: result.score, issues: result.issues },
                    });
                }

                if (result.needsReview) {
                    req.contentNeedsReview = true;
                    req.contentReviewResult = result;
                }
            }
            next();
        };
    }
}

module.exports = ContentModeration;
