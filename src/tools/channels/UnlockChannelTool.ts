import { PermissionFlagsBits, type TextChannel } from 'discord.js';
import { z } from 'zod';
import { BaseTool } from '../Tool.js';
import { t } from '../../i18n/index.js';
import type { ToolExecutionContext, ToolResult, ActionRequest, ConfirmationData } from '../../types/index.js';

export class UnlockChannelTool extends BaseTool {
    readonly name = 'unlock_channel';
    readonly description = 'Unlock a previously locked channel, allowing @everyone to send messages again.';
    readonly category = 'channels' as const;
    readonly requiredDiscordPermission = PermissionFlagsBits.ManageChannels;
    readonly requiresConfirmation = true;
    readonly entityParams = { channel: 'channel' as const };

    readonly parameters = z.object({
        channel: z.string().describe('The name of the channel to unlock'),
        reason: z.string().optional().describe('The reason for unlocking'),
    });

    async execute(context: ToolExecutionContext): Promise<ToolResult> {
        const channelEntity = context.resolvedEntities.get('channel');
        const channel = (channelEntity?.raw ?? context.channel) as TextChannel;
        const reason = (context.arguments.reason as string) ?? 'No reason provided';

        const everyoneRole = context.guild.roles.everyone;
        await channel.permissionOverwrites.edit(everyoneRole, {
            SendMessages: null,
        }, {
            reason: `[Overseer] Channel unlocked: ${reason} (by ${context.requester.displayName})`,
        });

        return { success: true, message: `Channel **#${channel.name}** has been unlocked. 🔓` };
    }

    renderConfirmation(action: ActionRequest, locale: string): ConfirmationData {
        const channel = action.resolvedEntities.get('channel');
        return {
            title: 'Unlock Channel',
            color: 0x2ecc71,
            fields: [
                { name: '🔓 Channel', value: channel ? `<#${channel.id}>` : String(action.arguments.channel), inline: true },
                { name: '📝 Reason', value: (action.arguments.reason as string) ?? 'No reason provided', inline: true },
            ],
        };
    }
}
