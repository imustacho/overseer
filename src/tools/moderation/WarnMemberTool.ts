import { PermissionFlagsBits, type GuildMember } from 'discord.js';
import { z } from 'zod';
import { BaseTool } from '../Tool.js';
import { t } from '../../i18n/index.js';
import type { ToolExecutionContext, ToolResult, ActionRequest, ConfirmationData } from '../../types/index.js';

export class WarnMemberTool extends BaseTool {
    readonly name = 'warn_member';
    readonly description = 'Send a warning message to a member via DM. This is a soft moderation action — no punishment is applied.';
    readonly category = 'moderation' as const;
    readonly requiredDiscordPermission = PermissionFlagsBits.ModerateMembers;
    readonly requiresConfirmation = true;
    readonly entityParams = { target: 'member' as const };

    readonly parameters = z.object({
        target: z.string().describe('The username or display name of the member to warn'),
        reason: z.string().describe('The warning message / reason'),
    });

    async execute(context: ToolExecutionContext): Promise<ToolResult> {
        const target = context.resolvedEntities.get('target');
        if (!target) return { success: false, message: 'Target member not found.' };

        const member = target.raw as GuildMember;
        const reason = String(context.arguments.reason);

        try {
            await member.send(
                `⚠️ **Warning from ${context.guild.name}**\n\n${reason}\n\n_Warned by ${context.requester.displayName}_`,
            );
        } catch {
            return {
                success: true,
                message: `Warning issued to **${member.displayName}**, but could not send DM (their DMs may be closed).`,
            };
        }

        return { success: true, message: `**${member.displayName}** has been warned.` };
    }

    renderConfirmation(action: ActionRequest, locale: string): ConfirmationData {
        const target = action.resolvedEntities.get('target');
        return {
            title: 'Warn Member',
            color: 0xf1c40f,
            fields: [
                { name: '🎯 Target', value: target ? `<@${target.id}>` : String(action.arguments.target), inline: true },
                { name: '📝 Reason', value: String(action.arguments.reason), inline: true },
            ],
        };
    }
}
