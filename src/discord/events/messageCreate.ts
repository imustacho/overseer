import type { Client, Message, GuildTextBasedChannel, GuildMember } from 'discord.js';
import type { AIManager } from '../../ai/AIManager.js';
import type { ActionManager } from '../../actions/ActionManager.js';
import { t } from '../../i18n/index.js';

export function registerMessageCreateEvent(
    client: Client,
    aiManager: AIManager,
    actionManager: ActionManager,
): void {
    client.on('messageCreate', async (message: Message) => {

        if (message.author.bot) return;

        if (!message.guild || !message.member) return;

        if (!message.mentions.has(client.user!)) return;

        const content = message.content
            .replace(new RegExp(`<@!?${client.user!.id}>`, 'g'), '')
            .trim();

        const locale = message.guild.preferredLocale;

        if (!content) {
            await message.reply(t(locale, 'greeting'));
            return;
        }

        const channel = message.channel as GuildTextBasedChannel;
        const guild = message.guild;
        const requester = message.member as GuildMember;

        try {

            await channel.sendTyping();

            const aiResponse = await aiManager.processMessage(
                content,
                guild,
                channel.id,
            );

            const hasActions = aiResponse.actions.length > 0;
            const hasText = aiResponse.content?.trim();

            if (hasText) {
                await message.reply(aiResponse.content!);

                if (!hasActions) {
                    aiManager.contextManager.addMessage(channel.id, {
                        role: 'assistant',
                        content: aiResponse.content!,
                        timestamp: Date.now(),
                    });
                }
            }

            if (hasActions) {
                const results = await actionManager.processIntents(
                    aiResponse.actions,
                    guild,
                    channel,
                    requester,
                    locale,
                );

                for (const result of results) {
                    if (!result.success && result.message) {
                        await channel.send(result.message);
                    }
                }
            } else if (!hasText) {

                await message.reply(t(locale, 'error.unclear'));
            }
        } catch (error) {
            console.error('[MessageCreate] Error processing message:', error);

            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            if (errorMessage.includes('API error') || errorMessage.includes('fetch')) {
                await message.reply(t(locale, 'error.ai_service'));
            } else {
                await message.reply(t(locale, 'error.generic'));
            }
        }
    });
}
