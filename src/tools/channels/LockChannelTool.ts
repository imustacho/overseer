import { PermissionFlagsBits, PermissionsBitField, type GuildChannel, type TextChannel } from 'discord.js';
import { z } from 'zod';
import { BaseTool } from '../Tool.js';
import { t } from '../../i18n/index.js';
import type { ToolExecutionContext, ToolResult, ActionRequest, ConfirmationData } from '../../types/index.js';

export class LockChannelTool extends BaseTool {
    readonly name = 'lock_channel';
    readonly description = 'Lock a channel so that @everyone cannot send messages. Useful for emergencies or announcements.';
    readonly category = 'channels' as const;
    readonly requiredDiscordPermission = PermissionFlagsBits.ManageChannels;
    readonly requiresConfirmation = true;
    readonly entityParams = { channel: 'channel' as const };

    readonly parameters = z.object({
        channel: z.string().describe('The name of the channel to lock (defaults to current channel if not specified)'),
        reason: z.string().optional().describe('The reason for locking'),
    });

    async execute(context: ToolExecutionContext): Promise<ToolResult> {
        const channelEntity = context.resolvedEntities.get('channel');

        const channel = (channelEntity?.raw ?? context.channel) as TextChannel;
        const reason = (context.arguments.reason as string) ?? 'No reason provided';

        const everyoneRole = context.guild.roles.everyone;
        await channel.permissionOverwrites.edit(everyoneRole, {
            SendMessages: false,
        }, {
            reason: `[Overseer] Channel locked: ${reason} (by ${context.requester.displayName})`,
        });

        return { success: true, message: `Channel **#${channel.name}** has been locked. 🔒` };
    }

    renderConfirmation(action: ActionRequest, locale: string): ConfirmationData {
        const channel = action.resolvedEntities.get('channel');
        return {
            title: 'Lock Channel',
            color: 0xe74c3c,
            fields: [
                { name: '🔒 Channel', value: channel ? `<#${channel.id}>` : String(action.arguments.channel), inline: true },
                { name: '📝 Reason', value: (action.arguments.reason as string) ?? 'No reason provided', inline: true },
            ],
        };
    }
}
