import { PermissionFlagsBits, type GuildMember } from 'discord.js';
import { z } from 'zod';
import { BaseTool } from '../Tool.js';
import { t } from '../../i18n/index.js';
import type { ToolExecutionContext, ToolResult, ActionRequest, ConfirmationData } from '../../types/index.js';

export class RemoveTimeoutTool extends BaseTool {
    readonly name = 'remove_timeout';
    readonly description = 'Remove a timeout from a member, allowing them to interact normally again.';
    readonly category = 'moderation' as const;
    readonly requiredDiscordPermission = PermissionFlagsBits.ModerateMembers;
    readonly requiresConfirmation = true;
    readonly entityParams = { target: 'member' as const };

    readonly parameters = z.object({
        target: z.string().describe('The username or display name of the member to remove timeout from'),
        reason: z.string().optional().describe('The reason for removing the timeout'),
    });

    async execute(context: ToolExecutionContext): Promise<ToolResult> {
        const target = context.resolvedEntities.get('target');
        if (!target) return { success: false, message: 'Target member not found.' };

        const member = target.raw as GuildMember;
        const reason = (context.arguments.reason as string) ?? 'No reason provided';

        await member.timeout(null, `[Overseer] ${reason} (by ${context.requester.displayName})`);

        return { success: true, message: `Timeout removed from **${member.displayName}**.` };
    }

    renderConfirmation(action: ActionRequest, locale: string): ConfirmationData {
        const target = action.resolvedEntities.get('target');
        return {
            title: 'Remove Timeout',
            color: 0x2ecc71,
            fields: [
                { name: '🎯 Target', value: target ? `<@${target.id}>` : String(action.arguments.target), inline: true },
                { name: '📝 Reason', value: (action.arguments.reason as string) ?? 'No reason provided', inline: true },
            ],
        };
    }
}
