import type { ConversationMessage } from '../types/index.js';

interface ChannelContext {
    messages: ConversationMessage[];
    lastActivity: number;
}

export class ContextManager {

    private readonly maxMessages: number;

    private readonly maxAgeMs: number;

    private readonly channels = new Map<string, ChannelContext>();

    constructor(maxMessages: number = 10, maxAgeMinutes: number = 5) {
        this.maxMessages = maxMessages;
        this.maxAgeMs = maxAgeMinutes * 60 * 1000;

        setInterval(() => this.cleanupStale(), 60_000);
    }

    addMessage(channelId: string, message: ConversationMessage): void {
        let context = this.channels.get(channelId);
        if (!context) {
            context = { messages: [], lastActivity: Date.now() };
            this.channels.set(channelId, context);
        }

        context.messages.push({
            ...message,
            timestamp: message.timestamp ?? Date.now(),
        });
        context.lastActivity = Date.now();

        if (context.messages.length > this.maxMessages) {
            context.messages = context.messages.slice(-this.maxMessages);
        }
    }

    getContext(channelId: string): ConversationMessage[] {
        const context = this.channels.get(channelId);
        if (!context) return [];

        const cutoff = Date.now() - this.maxAgeMs;

        context.messages = context.messages.filter(
            m => (m.timestamp ?? 0) > cutoff,
        );

        return [...context.messages];
    }

    clear(channelId: string): void {
        this.channels.delete(channelId);
    }

    private cleanupStale(): void {
        const cutoff = Date.now() - this.maxAgeMs * 2;
        for (const [channelId, context] of this.channels) {
            if (context.lastActivity < cutoff) {
                this.channels.delete(channelId);
            }
        }
    }
}
