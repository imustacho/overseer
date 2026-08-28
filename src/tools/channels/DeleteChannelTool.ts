import { PermissionFlagsBits, type GuildChannel } from 'discord.js';
import { z } from 'zod';
import { BaseTool } from '../Tool.js';
import { t } from '../../i18n/index.js';
import type { ToolExecutionContext, ToolResult, ActionRequest, ConfirmationData } from '../../types/index.js';

export class DeleteChannelTool extends BaseTool {
    readonly name = 'delete_channel';
    readonly description = 'Delete a channel from the server. This is irreversible.';
    readonly category = 'channels' as const;
    readonly requiredDiscordPermission = PermissionFlagsBits.ManageChannels;
    readonly requiresConfirmation = true;
    readonly entityParams = { channel: 'channel' as const };

    readonly parameters = z.object({
        channel: z.string().describe('The name of the channel to delete'),
        reason: z.string().optional().describe('The reason for deleting'),
    });

    async execute(context: ToolExecutionContext): Promise<ToolResult> {
        const channelEntity = context.resolvedEntities.get('channel');
        if (!channelEntity) return { success: false, message: 'Channel not found.' };

        const channel = channelEntity.raw as GuildChannel;
        const channelName = channel.name;

        await channel.delete(`[Overseer] ${(context.arguments.reason as string) ?? 'No reason'} (by ${context.requester.displayName})`);

        return { success: true, message: `Channel **#${channelName}** deleted.` };
    }

    renderConfirmation(action: ActionRequest, locale: string): ConfirmationData {
        const channel = action.resolvedEntities.get('channel');
        return {
            title: 'Delete Channel',
            color: 0xe74c3c,
            fields: [
                { name: '📺 Channel', value: channel ? `<#${channel.id}>` : String(action.arguments.channel), inline: true },
                { name: '📝 Reason', value: (action.arguments.reason as string) ?? 'No reason provided', inline: true },
            ],
        };
    }
}
