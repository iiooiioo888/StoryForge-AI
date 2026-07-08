/**
 * SSE Streaming Service - LLM 流式輸出
 */
const https = require('https');
const http = require('http');

class StreamingService {
    constructor(llmService) {
        this.llm = llmService;
    }

    /**
     * SSE 流式調用 LLM
     */
    async streamChat(req, res, options) {
        const {
            prompt,
            systemPrompt,
            provider = 'openai',
            tier = 'balanced',
            model,
            maxTokens = 4096,
            temperature = 0.7,
        } = options;

        // 設定 SSE headers
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
        });

        const providerConfig = this.llm.providers[provider];
        if (!providerConfig) {
            res.write(`data: ${JSON.stringify({ error: `不支援的提供商: ${provider}` })}\n\n`);
            res.write('data: [DONE]\n\n');
            res.end();
            return;
        }

        const actualModel = model || providerConfig.models[tier] || providerConfig.defaultModel;

        // Build messages
        const messages = [];
        if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
        messages.push({ role: 'user', content: prompt });

        const ctx = { aborted: false, transportReq: null };
        req.on('close', () => {
            ctx.aborted = true;
            if (ctx.transportReq && !ctx.transportReq.destroyed) ctx.transportReq.destroy();
        });

        try {
            if (provider === 'anthropic') {
                await this._streamAnthropic(ctx, res, providerConfig, actualModel, messages, maxTokens, temperature);
            } else {
                await this._streamOpenAI(ctx, res, providerConfig, actualModel, messages, maxTokens, temperature);
            }
        } catch (err) {
            if (!ctx.aborted && !res.writableEnded) {
                res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
                res.write('data: [DONE]\n\n');
                res.end();
            }
        }
    }

    async _streamOpenAI(ctx, res, config, model, messages, maxTokens, temperature) {
        const url = new URL(`${config.baseUrl}/chat/completions`);
        const body = JSON.stringify({
            model,
            messages,
            max_tokens: maxTokens,
            temperature,
            stream: true,
        });

        return new Promise((resolve, reject) => {
            const transport = url.protocol === 'https:' ? https : http;
            const req = transport.request({
                hostname: url.hostname,
                port: url.port || (url.protocol === 'https:' ? 443 : 80),
                path: url.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`,
                },
            }, (response) => {
                let buffer = '';
                response.on('data', (chunk) => {
                    if (ctx.aborted) return;
                    buffer += chunk.toString();
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (!trimmed || !trimmed.startsWith('data: ')) continue;
                        const data = trimmed.slice(6);

                        if (data === '[DONE]') {
                            if (!res.writableEnded) {
                                res.write('data: [DONE]\n\n');
                                res.end();
                            }
                            resolve();
                            return;
                        }

                        try {
                            const parsed = JSON.parse(data);
                            const content = parsed.choices?.[0]?.delta?.content;
                            if (content && !res.writableEnded) {
                                res.write(`data: ${JSON.stringify({ content, model })}\n\n`);
                            }
                        } catch (e) {
                            // Skip unparseable chunks
                        }
                    }
                });
                response.on('end', () => {
                    if (!res.writableEnded) {
                        res.write('data: [DONE]\n\n');
                        res.end();
                    }
                    resolve();
                });
                response.on('error', reject);
            });

            ctx.transportReq = req;
            req.on('error', reject);
            req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
            req.write(body);
            req.end();
        });
    }

    async _streamAnthropic(ctx, res, config, model, messages, maxTokens, temperature) {
        const url = new URL(`${config.baseUrl}/messages`);
        const systemPrompt = messages.find(m => m.role === 'system')?.content || '';
        const userMessages = messages.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content }));

        const body = JSON.stringify({
            model,
            max_tokens: maxTokens,
            temperature,
            system: systemPrompt,
            messages: userMessages,
            stream: true,
        });

        return new Promise((resolve, reject) => {
            const req = https.request({
                hostname: url.hostname,
                port: 443,
                path: url.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': config.apiKey,
                    'anthropic-version': '2023-06-01',
                },
            }, (response) => {
                let buffer = '';
                response.on('data', (chunk) => {
                    if (ctx.aborted) return;
                    buffer += chunk.toString();
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (!trimmed.startsWith('data: ')) continue;
                        try {
                            const parsed = JSON.parse(trimmed.slice(6));
                            if (parsed.type === 'content_block_delta' && parsed.delta?.text && !res.writableEnded) {
                                res.write(`data: ${JSON.stringify({ content: parsed.delta.text, model })}\n\n`);
                            }
                            if (parsed.type === 'message_stop') {
                                if (!res.writableEnded) {
                                    res.write('data: [DONE]\n\n');
                                    res.end();
                                }
                                resolve();
                            }
                        } catch (e) {}
                    }
                });
                response.on('end', () => {
                    if (!res.writableEnded) { res.write('data: [DONE]\n\n'); res.end(); }
                    resolve();
                });
                response.on('error', reject);
            });

            ctx.transportReq = req;
            req.on('error', reject);
            req.write(body);
            req.end();
        });
    }
}

module.exports = StreamingService;
