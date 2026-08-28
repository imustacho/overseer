import { PermissionFlagsBits } from 'discord.js';
import { z } from 'zod';
import { BaseTool } from '../Tool.js';
import { t } from '../../i18n/index.js';
import type { ToolExecutionContext, ToolResult, ActionRequest, ConfirmationData } from '../../types/index.js';

export class UnbanMemberTool extends BaseTool {
    readonly name = 'unban_member';
    readonly description = 'Unban a previously banned user from the server.';
    readonly category = 'moderation' as const;
    readonly requiredDiscordPermission = PermissionFlagsBits.BanMembers;
    readonly requiresConfirmation = true;
    readonly entityParams = {};

    readonly parameters = z.object({
        target: z.string().describe('The username or ID of the banned user to unban'),
        reason: z.string().optional().describe('The reason for unbanning'),
    });

    async execute(context: ToolExecutionContext): Promise<ToolResult> {
        const targetQuery = String(context.arguments.target);
        const reason = (context.arguments.reason as string) ?? 'No reason provided';

        const bans = await context.guild.bans.fetch();
        const ban = bans.find(
            b => b.user.username.toLowerCase() === targetQuery.toLowerCase() ||
                b.user.id === targetQuery ||
                b.user.globalName?.toLowerCase() === targetQuery.toLowerCase(),
        );

        if (!ban) {
            return { success: false, message: `User "${targetQuery}" not found in the ban list.` };
        }

        await context.guild.members.unban(ban.user.id, `[Overseer] ${reason} (by ${context.requester.displayName})`);

        return {
            success: true,
            message: `**${ban.user.username}** has been unbanned.`,
        };
    }

    renderConfirmation(action: ActionRequest, locale: string): ConfirmationData {
        return {
            title: 'Unban Member',
            color: 0x2ecc71,
            fields: [
                { name: '🎯 Target', value: String(action.arguments.target), inline: true },
                { name: '📝 Reason', value: (action.arguments.reason as string) ?? 'No reason provided', inline: true },
            ],
        };
    }
}
