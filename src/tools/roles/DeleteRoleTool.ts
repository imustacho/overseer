import { PermissionFlagsBits, type Role } from 'discord.js';
import { z } from 'zod';
import { BaseTool } from '../Tool.js';
import { t } from '../../i18n/index.js';
import type { ToolExecutionContext, ToolResult, ActionRequest, ConfirmationData } from '../../types/index.js';

export class DeleteRoleTool extends BaseTool {
    readonly name = 'delete_role';
    readonly description = 'Delete a role from the server.';
    readonly category = 'roles' as const;
    readonly requiredDiscordPermission = PermissionFlagsBits.ManageRoles;
    readonly requiresConfirmation = true;
    readonly entityParams = { role: 'role' as const };

    readonly parameters = z.object({
        role: z.string().describe('The name of the role to delete'),
        reason: z.string().optional().describe('The reason for deleting the role'),
    });

    async execute(context: ToolExecutionContext): Promise<ToolResult> {
        const roleEntity = context.resolvedEntities.get('role');
        if (!roleEntity) return { success: false, message: 'Role not found.' };

        const role = roleEntity.raw as Role;
        const roleName = role.name;

        await role.delete(`[Overseer] ${(context.arguments.reason as string) ?? 'No reason'} (by ${context.requester.displayName})`);

        return { success: true, message: `Role **${roleName}** deleted.` };
    }

    renderConfirmation(action: ActionRequest, locale: string): ConfirmationData {
        const role = action.resolvedEntities.get('role');
        return {
            title: 'Delete Role',
            color: 0xe74c3c,
            fields: [
                { name: '🏷️ Role', value: role ? `<@&${role.id}>` : String(action.arguments.role), inline: true },
                { name: '📝 Reason', value: (action.arguments.reason as string) ?? 'No reason provided', inline: true },
            ],
        };
    }
}
