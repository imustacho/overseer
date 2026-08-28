import { PermissionFlagsBits, type GuildMember } from 'discord.js';
import { z } from 'zod';
import { BaseTool } from '../Tool.js';
import { t } from '../../i18n/index.js';
import type {
    ToolExecutionContext,
    ToolResult,
    ActionRequest,
    ConfirmationData,
} from '../../types/index.js';

export class BanMemberTool extends BaseTool {
    readonly name = 'ban_member';
    readonly description = 'Ban a member from the server. Optionally specify a reason and how many days of messages to delete.';
    readonly category = 'moderation' as const;
    readonly requiredDiscordPermission = PermissionFlagsBits.BanMembers;
    readonly requiresConfirmation = true;
    readonly entityParams = { target: 'member' as const };

    readonly parameters = z.object({
        target: z.string().describe('The username or display name of the member to ban'),
        reason: z.string().optional().describe('The reason for the ban'),
        delete_message_days: z.number().int().min(0).max(7).optional()
            .describe('Number of days of messages to delete (0-7)'),
    });

    async execute(context: ToolExecutionContext): Promise<ToolResult> {
        const target = context.resolvedEntities.get('target');
        if (!target) {
            return { success: false, message: 'Target member not found.' };
        }

        const member = target.raw as GuildMember;
        const reason = (context.arguments.reason as string) ?? 'No reason provided';
        const deleteMessageDays = (context.arguments.delete_message_days as number) ?? 0;

        await context.guild.members.ban(member, {
            reason: `[Overseer] ${reason} (by ${context.requester.displayName})`,
            deleteMessageSeconds: deleteMessageDays * 86400,
        });

        return {
            success: true,
            message: `**${member.displayName}** has been banned.`,
        };
    }

    renderConfirmation(action: ActionRequest, locale: string): ConfirmationData {
        const target = action.resolvedEntities.get('target');
        return {
            title: t(locale, 'tool.ban_member'),
            color: 0xe74c3c,
            fields: [
                { name: t(locale, 'field.target'), value: target ? `<@${target.id}>` : String(action.arguments.target), inline: true },
                { name: t(locale, 'field.reason'), value: (action.arguments.reason as string) ?? t(locale, 'field.no_reason'), inline: true },
                ...(action.arguments.delete_message_days
                    ? [{ name: t(locale, 'field.delete_messages'), value: t(locale, 'field.days', { count: action.arguments.delete_message_days as number }), inline: true }]
                    : []),
            ],
        };
    }
}
