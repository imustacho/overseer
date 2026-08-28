import type { Guild } from 'discord.js';
import type {
    AIProvider,
    AIRequest,
    AIResponse,
    AppConfig,
} from '../types/index.js';
import type { ToolRegistry } from '../tools/ToolRegistry.js';
import { ContextManager } from '../context/ContextManager.js';
import { buildSystemPrompt } from './SystemPrompt.js';

import { GeminiProvider } from './providers/GeminiProvider.js';
import { OpenAICompatibleProvider } from './providers/OpenAICompatibleProvider.js';
import { OpenRouterProvider } from './providers/OpenRouterProvider.js';
import { GroqProvider } from './providers/GroqProvider.js';

export class AIManager {
    private readonly providers = new Map<string, AIProvider>();
    private readonly activeProviderName: string;
    private readonly model: string;
    readonly contextManager = new ContextManager();
    private readonly toolRegistry: ToolRegistry;

    constructor(config: AppConfig, toolRegistry: ToolRegistry) {
        this.toolRegistry = toolRegistry;
        this.activeProviderName = config.aiProvider;
        this.model = config.aiModel;

        this.registerProvider(new GeminiProvider(config.aiApiKey));
        this.registerProvider(new OpenRouterProvider(config.aiApiKey));
        this.registerProvider(new GroqProvider(config.aiApiKey));

        if (config.aiBaseUrl) {
            this.registerProvider(
                new OpenAICompatibleProvider('openai', config.aiApiKey, config.aiBaseUrl),
            );
        } else {
            this.registerProvider(
                new OpenAICompatibleProvider('openai', config.aiApiKey),
            );
        }

        if (!this.providers.has(this.activeProviderName)) {
            const available = Array.from(this.providers.keys()).join(', ');
            throw new Error(
                `AI provider "${this.activeProviderName}" not found. Available: ${available}`,
            );
        }

        console.log(`[AI] Active provider: ${this.activeProviderName} (model: ${this.model})`);
    }

    async processMessage(
        userMessage: string,
        guild: Guild,
        channelId: string,
    ): Promise<AIResponse> {
        const provider = this.getActiveProvider();

        this.contextManager.addMessage(channelId, {
            role: 'user',
            content: userMessage,
            timestamp: Date.now(),
        });

        const systemPrompt = buildSystemPrompt(
            this.toolRegistry,
            guild.name,
            guild.memberCount,
        );

        const messages = this.contextManager.getContext(channelId);

        const request: AIRequest = {
            systemPrompt,
            messages,
            tools: this.toolRegistry.getAIToolSchemas(),
            model: this.model,
        };

        const response = await provider.chat(request);

        return response;
    }

    private registerProvider(provider: AIProvider): void {
        this.providers.set(provider.name, provider);
    }

    private getActiveProvider(): AIProvider {
        const provider = this.providers.get(this.activeProviderName);
        if (!provider) {
            throw new Error(`AI provider "${this.activeProviderName}" not found.`);
        }
        return provider;
    }
}
