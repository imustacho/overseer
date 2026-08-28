import { PermissionFlagsBits, type GuildChannel, type TextChannel } from 'discord.js';
import { z } from 'zod';
import { BaseTool } from '../Tool.js';
import { t } from '../../i18n/index.js';
import type { ToolExecutionContext, ToolResult, ActionRequest, ConfirmationData } from '../../types/index.js';

export class EditChannelTool extends BaseTool {
    readonly name = 'edit_channel';
    readonly description = 'Edit a channel\'s properties (name, topic, slowmode, NSFW).';
    readonly category = 'channels' as const;
    readonly requiredDiscordPermission = PermissionFlagsBits.ManageChannels;
    readonly requiresConfirmation = true;
    readonly entityParams = { channel: 'channel' as const };

    readonly parameters = z.object({
        channel: z.string().describe('The name of the channel to edit'),
        name: z.string().optional().describe('New name for the channel'),
        topic: z.string().optional().describe('New topic for the channel'),
        slowmode: z.number().int().min(0).max(21600).optional().describe('Slowmode in seconds (0 to disable, max 21600)'),
        nsfw: z.boolean().optional().describe('Whether the channel is NSFW'),
    });

    async execute(context: ToolExecutionContext): Promise<ToolResult> {
        const channelEntity = context.resolvedEntities.get('channel');
        if (!channelEntity) return { success: false, message: 'Channel not found.' };

        const channel = channelEntity.raw as GuildChannel;
        const edits: Record<string, unknown> = {};

        if (context.arguments.name) edits.name = String(context.arguments.name);
        if (context.arguments.topic !== undefined) edits.topic = String(context.arguments.topic);
        if (context.arguments.slowmode !== undefined) edits.rateLimitPerUser = context.arguments.slowmode;
        if (context.arguments.nsfw !== undefined) edits.nsfw = context.arguments.nsfw;

        await channel.edit({
            ...edits,
            reason: `[Overseer] Edited by ${context.requester.displayName}`,
        });

        return { success: true, message: `Channel **#${channel.name}** has been updated.` };
    }

    renderConfirmation(action: ActionRequest, locale: string): ConfirmationData {
        const channel = action.resolvedEntities.get('channel');
        const changes: string[] = [];
        if (action.arguments.name) changes.push(`Name → ${action.arguments.name}`);
        if (action.arguments.topic !== undefined) changes.push(`Topic → ${action.arguments.topic || '(cleared)'}`);
        if (action.arguments.slowmode !== undefined) changes.push(`Slowmode → ${action.arguments.slowmode}s`);
        if (action.arguments.nsfw !== undefined) changes.push(`NSFW → ${action.arguments.nsfw}`);

        return {
            title: 'Edit Channel',
            color: 0x3498db,
            fields: [
                { name: '📺 Channel', value: channel ? `<#${channel.id}>` : String(action.arguments.channel), inline: true },
                { name: '📝 Changes', value: changes.join('\n') || 'No changes', inline: false },
            ],
        };
    }
}
