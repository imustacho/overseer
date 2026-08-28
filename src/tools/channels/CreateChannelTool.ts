import { PermissionFlagsBits, ChannelType } from 'discord.js';
import { z } from 'zod';
import { BaseTool } from '../Tool.js';
import { t } from '../../i18n/index.js';
import type { ToolExecutionContext, ToolResult, ActionRequest, ConfirmationData } from '../../types/index.js';

export class CreateChannelTool extends BaseTool {
    readonly name = 'create_channel';
    readonly description = 'Create a new text or voice channel in the server.';
    readonly category = 'channels' as const;
    readonly requiredDiscordPermission = PermissionFlagsBits.ManageChannels;
    readonly requiresConfirmation = true;
    readonly entityParams = { parent: 'channel' as const };

    readonly parameters = z.object({
        name: z.string().describe('The name for the new channel'),
        type: z.enum(['text', 'voice']).optional().describe('Channel type: text or voice (default: text)'),
        topic: z.string().optional().describe('The channel topic (text channels only)'),
        parent: z.string().optional().describe('The category to create the channel in'),
    });

    async execute(context: ToolExecutionContext): Promise<ToolResult> {
        const name = String(context.arguments.name);
        const type = context.arguments.type === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText;
        const parentEntity = context.resolvedEntities.get('parent');

        const channel = await context.guild.channels.create({
            name,
            type,
            topic: (context.arguments.topic as string) ?? undefined,
            parent: parentEntity?.id ?? undefined,
            reason: `[Overseer] Created by ${context.requester.displayName}`,
        });

        return { success: true, message: `Channel **#${channel.name}** created.` };
    }

    renderConfirmation(action: ActionRequest, locale: string): ConfirmationData {
        const fields = [
            { name: '📝 Name', value: String(action.arguments.name), inline: true },
            { name: '📁 Type', value: String(action.arguments.type ?? 'text'), inline: true },
        ];
        if (action.arguments.parent) {
            const parent = action.resolvedEntities.get('parent');
            fields.push({ name: '📂 Category', value: parent ? parent.name : String(action.arguments.parent), inline: true });
        }
        return { title: 'Create Channel', color: 0x2ecc71, fields };
    }
}
