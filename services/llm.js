/**
 * StoryForge AI - LLM Service Layer
 * 統一的大語言模型接入層，支援多模型提供商
 */

const https = require('https');
const http = require('http');

class LLMService {
    constructor(config = {}) {
        this.providers = {
            openai: {
                name: 'OpenAI',
                baseUrl: config.openaiBaseUrl || 'https://api.openai.com/v1',
                apiKey: config.openaiApiKey || process.env.OPENAI_API_KEY || '',
                models: {
                    fast: 'gpt-4o-mini',
                    balanced: 'gpt-4o',
                    powerful: 'gpt-4o',
                },
                defaultModel: 'gpt-4o-mini',
            },
            anthropic: {
                name: 'Anthropic Claude',
                baseUrl: config.anthropicBaseUrl || 'https://api.anthropic.com/v1',
                apiKey: config.anthropicApiKey || process.env.ANTHROPIC_API_KEY || '',
                models: {
                    fast: 'claude-3-haiku-20240307',
                    balanced: 'claude-3-sonnet-20240229',
                    powerful: 'claude-3-opus-20240229',
                },
                defaultModel: 'claude-3-haiku-20240307',
            },
            deepseek: {
                name: 'DeepSeek',
                baseUrl: config.deepseekBaseUrl || 'https://api.deepseek.com/v1',
                apiKey: config.deepseekApiKey || process.env.DEEPSEEK_API_KEY || '',
                models: {
                    fast: 'deepseek-chat',
                    balanced: 'deepseek-chat',
                    powerful: 'deepseek-reasoner',
                },
                defaultModel: 'deepseek-chat',
            },
            custom: {
                name: 'Custom',
                baseUrl: config.customBaseUrl || process.env.CUSTOM_LLM_URL || '',
                apiKey: config.customApiKey || process.env.CUSTOM_LLM_KEY || '',
                models: {
                    fast: config.customModel || 'default',
                    balanced: config.customModel || 'default',
                    powerful: config.customModel || 'default',
                },
                defaultModel: config.customModel || 'default',
            },
        };

        this.defaultProvider = config.defaultProvider || process.env.LLM_PROVIDER || 'openai';
        this.defaultTier = config.defaultTier || 'balanced';
        this.maxRetries = config.maxRetries || 2;
        this.timeout = config.timeout || 60000;
    }

    /**
     * 統一的 LLM 調用接口
     * @param {Object} options
     * @param {string} options.prompt - 用戶提示詞
     * @param {string} [options.systemPrompt] - 系統提示詞
     * @param {string} [options.provider] - 模型提供商
     * @param {string} [options.tier] - 模型等級 (fast/balanced/powerful)
     * @param {string} [options.model] - 指定模型名稱
     * @param {number} [options.maxTokens] - 最大輸出 token
     * @param {number} [options.temperature] - 溫度參數
     * @param {Array} [options.messages] - 多輪對話消息
     * @returns {Promise<{content: string, usage: Object, model: string, provider: string}>}
     */
    async chat(options) {
        const {
            prompt,
            systemPrompt,
            provider = this.defaultProvider,
            tier = this.defaultTier,
            model,
            maxTokens = 4096,
            temperature = 0.7,
            messages: inputMessages,
        } = options;

        const providerConfig = this.providers[provider];
        if (!providerConfig) throw new Error(`不支援的 LLM 提供商: ${provider}`);
        if (!providerConfig.apiKey && provider !== 'custom') {
            throw new Error(`${providerConfig.name} API Key 未設定。請設定環境變數或在配置中提供。`);
        }

        const actualModel = model || providerConfig.models[tier] || providerConfig.defaultModel;

        // Build messages
        let messages = [];
        if (inputMessages) {
            messages = inputMessages;
        } else {
            if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
            messages.push({ role: 'user', content: prompt });
        }

        // Call provider
        let result;
        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                result = await this._callProvider(provider, {
                    model: actualModel,
                    messages,
                    max_tokens: maxTokens,
                    temperature,
                });
                break;
            } catch (err) {
                if (attempt === this.maxRetries) throw err;
                await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
            }
        }

        return {
            content: result.content,
            usage: result.usage,
            model: actualModel,
            provider,
        };
    }

    async _callProvider(provider, params) {
        const config = this.providers[provider];

        switch (provider) {
            case 'openai':
            case 'deepseek':
            case 'custom':
                return this._callOpenAICompatible(config, params);
            case 'anthropic':
                return this._callAnthropic(config, params);
            default:
                throw new Error(`未實作的提供商: ${provider}`);
        }
    }

    async _callOpenAICompatible(config, params) {
        const url = new URL(`${config.baseUrl}/chat/completions`);
        const body = JSON.stringify({
            model: params.model,
            messages: params.messages,
            max_tokens: params.max_tokens,
            temperature: params.temperature,
        });

        const result = await this._httpRequest({
            method: 'POST',
            hostname: url.hostname,
            port: url.port || (url.protocol === 'https:' ? 443 : 80),
            path: url.pathname,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`,
            },
            body,
            useHttps: url.protocol === 'https:',
        });

        const data = JSON.parse(result);
        if (data.error) throw new Error(`LLM Error: ${data.error.message || JSON.stringify(data.error)}`);

        return {
            content: data.choices?.[0]?.message?.content || '',
            usage: data.usage || {},
        };
    }

    async _callAnthropic(config, params) {
        const url = new URL(`${config.baseUrl}/messages`);

        // Convert OpenAI format to Anthropic format
        const systemPrompt = params.messages.find(m => m.role === 'system')?.content || '';
        const userMessages = params.messages
            .filter(m => m.role !== 'system')
            .map(m => ({ role: m.role, content: m.content }));

        const body = JSON.stringify({
            model: params.model,
            max_tokens: params.max_tokens,
            temperature: params.temperature,
            system: systemPrompt,
            messages: userMessages,
        });

        const result = await this._httpRequest({
            method: 'POST',
            hostname: url.hostname,
            port: url.port || 443,
            path: url.pathname,
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': config.apiKey,
                'anthropic-version': '2023-06-01',
            },
            body,
            useHttps: true,
        });

        const data = JSON.parse(result);
        if (data.error) throw new Error(`Anthropic Error: ${data.error.message}`);

        return {
            content: data.content?.[0]?.text || '',
            usage: data.usage || {},
        };
    }

    _httpRequest(options) {
        return new Promise((resolve, reject) => {
            const transport = options.useHttps ? https : http;
            const req = transport.request({
                hostname: options.hostname,
                port: options.port,
                path: options.path,
                method: options.method,
                headers: options.headers,
                timeout: this.timeout,
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    if (res.statusCode >= 400) {
                        reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 500)}`));
                    } else {
                        resolve(data);
                    }
                });
            });

            req.on('error', reject);
            req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
            req.write(options.body);
            req.end();
        });
    }

    /**
     * 獲取可用的提供商和模型列表
     */
    getAvailableProviders() {
        return Object.entries(this.providers).map(([key, config]) => ({
            id: key,
            name: config.name,
            hasApiKey: !!config.apiKey,
            models: config.models,
        }));
    }

    /**
     * 更新 API Key
     */
    setApiKey(provider, apiKey) {
        if (this.providers[provider]) {
            this.providers[provider].apiKey = apiKey;
        }
    }
}

module.exports = LLMService;
