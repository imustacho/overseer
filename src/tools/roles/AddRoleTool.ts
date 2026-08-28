import { PermissionFlagsBits, type GuildMember, type Role } from 'discord.js';
import { z } from 'zod';
import { BaseTool } from '../Tool.js';
import { t } from '../../i18n/index.js';
import type { ToolExecutionContext, ToolResult, ActionRequest, ConfirmationData } from '../../types/index.js';

export class AddRoleTool extends BaseTool {
    readonly name = 'add_role';
    readonly description = 'Add a role to a member.';
    readonly category = 'roles' as const;
    readonly requiredDiscordPermission = PermissionFlagsBits.ManageRoles;
    readonly requiresConfirmation = true;
    readonly entityParams = { target: 'member' as const, role: 'role' as const };

    readonly parameters = z.object({
        target: z.string().describe('The username or display name of the member'),
        role: z.string().describe('The name of the role to add'),
        reason: z.string().optional().describe('The reason for adding the role'),
    });

    async execute(context: ToolExecutionContext): Promise<ToolResult> {
        const target = context.resolvedEntities.get('target');
        const role = context.resolvedEntities.get('role');
        if (!target) return { success: false, message: 'Target member not found.' };
        if (!role) return { success: false, message: 'Role not found.' };

        const member = target.raw as GuildMember;
        const roleObj = role.raw as Role;
        const reason = (context.arguments.reason as string) ?? undefined;

        await member.roles.add(roleObj, `[Overseer] ${reason ?? 'No reason'} (by ${context.requester.displayName})`);

        return { success: true, message: `Added **${roleObj.name}** role to **${member.displayName}**.` };
    }

    renderConfirmation(action: ActionRequest, locale: string): ConfirmationData {
        const target = action.resolvedEntities.get('target');
        const role = action.resolvedEntities.get('role');
        return {
            title: 'Add Role',
            color: 0x3498db,
            fields: [
                { name: '👤 Member', value: target ? `<@${target.id}>` : String(action.arguments.target), inline: true },
                { name: '🏷️ Role', value: role ? `<@&${role.id}>` : String(action.arguments.role), inline: true },
            ],
        };
    }
}
