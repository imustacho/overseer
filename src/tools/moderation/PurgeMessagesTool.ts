import { PermissionFlagsBits, type TextChannel, type Collection, type Message } from 'discord.js';
import { z } from 'zod';
import { BaseTool } from '../Tool.js';
import { t } from '../../i18n/index.js';
import type { ToolExecutionContext, ToolResult, ActionRequest, ConfirmationData } from '../../types/index.js';

export class PurgeMessagesTool extends BaseTool {
    readonly name = 'purge_messages';
    readonly description = 'Delete multiple messages from the current channel. Optionally filter by a specific user. Messages older than 14 days cannot be bulk deleted.';
    readonly category = 'moderation' as const;
    readonly requiredDiscordPermission = PermissionFlagsBits.ManageMessages;
    readonly requiresConfirmation = true;
    readonly entityParams = { target: 'member' as const };

    readonly parameters = z.object({
        count: z.number().int().min(1).max(100).describe('Number of messages to delete (1-100)'),
        target: z.string().optional().describe('Only delete messages from this user (username or display name)'),
    });

    async execute(context: ToolExecutionContext): Promise<ToolResult> {
        const channel = context.channel as TextChannel;
        const count = context.arguments.count as number;
        const targetEntity = context.resolvedEntities.get('target');

        let messages: Collection<string, Message>;

        if (targetEntity) {

            const fetched = await channel.messages.fetch({ limit: 100 });
            const filtered = fetched.filter(m => m.author.id === targetEntity.id);
            messages = new (await import('discord.js')).Collection(
                [...filtered.entries()].slice(0, count)
            );
        } else {
            messages = await channel.messages.fetch({ limit: count });
        }

        if (messages.size === 0) {
            return { success: false, message: 'No messages found to delete.' };
        }

        const deleted = await channel.bulkDelete(messages, true);

        return {
            success: true,
            message: `Deleted **${deleted.size}** message${deleted.size !== 1 ? 's' : ''}.`,
        };
    }

    renderConfirmation(action: ActionRequest, locale: string): ConfirmationData {
        const target = action.resolvedEntities.get('target');
        const fields = [
            { name: '🗑️ Count', value: `${action.arguments.count} messages`, inline: true },
        ];

        if (target) {
            fields.push({ name: '🎯 From User', value: `<@${target.id}>`, inline: true });
        }

        return {
            title: 'Purge Messages',
            color: 0xe74c3c,
            fields,
        };
    }
}
