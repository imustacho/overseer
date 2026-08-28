import { PermissionFlagsBits, type GuildMember } from 'discord.js';
import { z } from 'zod';
import { BaseTool } from '../Tool.js';
import { t } from '../../i18n/index.js';
import type { ToolExecutionContext, ToolResult, ActionRequest, ConfirmationData } from '../../types/index.js';

export class KickMemberTool extends BaseTool {
    readonly name = 'kick_member';
    readonly description = 'Kick a member from the server. They can rejoin with an invite.';
    readonly category = 'moderation' as const;
    readonly requiredDiscordPermission = PermissionFlagsBits.KickMembers;
    readonly requiresConfirmation = true;
    readonly entityParams = { target: 'member' as const };

    readonly parameters = z.object({
        target: z.string().describe('The username or display name of the member to kick'),
        reason: z.string().optional().describe('The reason for kicking'),
    });

    async execute(context: ToolExecutionContext): Promise<ToolResult> {
        const target = context.resolvedEntities.get('target');
        if (!target) return { success: false, message: 'Target member not found.' };

        const member = target.raw as GuildMember;
        const reason = (context.arguments.reason as string) ?? 'No reason provided';

        await member.kick(`[Overseer] ${reason} (by ${context.requester.displayName})`);

        return { success: true, message: `**${member.displayName}** has been kicked.` };
    }

    renderConfirmation(action: ActionRequest, locale: string): ConfirmationData {
        const target = action.resolvedEntities.get('target');
        return {
            title: 'Kick Member',
            color: 0xe67e22,
            fields: [
                { name: '🎯 Target', value: target ? `<@${target.id}>` : String(action.arguments.target), inline: true },
                { name: '📝 Reason', value: (action.arguments.reason as string) ?? 'No reason provided', inline: true },
            ],
        };
    }
}
