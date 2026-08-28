import { PermissionFlagsBits, type Role } from 'discord.js';
import { z } from 'zod';
import { BaseTool } from '../Tool.js';
import { t } from '../../i18n/index.js';
import type { ToolExecutionContext, ToolResult, ActionRequest, ConfirmationData } from '../../types/index.js';

export class EditRoleTool extends BaseTool {
    readonly name = 'edit_role';
    readonly description = 'Edit an existing role\'s properties (name, color, hoist, mentionable).';
    readonly category = 'roles' as const;
    readonly requiredDiscordPermission = PermissionFlagsBits.ManageRoles;
    readonly requiresConfirmation = true;
    readonly entityParams = { role: 'role' as const };

    readonly parameters = z.object({
        role: z.string().describe('The current name of the role to edit'),
        name: z.string().optional().describe('New name for the role'),
        color: z.string().optional().describe('New hex color (e.g. "#ff0000")'),
        hoist: z.boolean().optional().describe('Whether to display separately in member list'),
        mentionable: z.boolean().optional().describe('Whether the role is mentionable'),
    });

    async execute(context: ToolExecutionContext): Promise<ToolResult> {
        const roleEntity = context.resolvedEntities.get('role');
        if (!roleEntity) return { success: false, message: 'Role not found.' };

        const role = roleEntity.raw as Role;
        const edits: Record<string, unknown> = {};

        if (context.arguments.name) edits.name = String(context.arguments.name);
        if (context.arguments.color) {
            const hex = String(context.arguments.color).replace(/^#/, '');
            edits.color = parseInt(hex, 16);
        }
        if (context.arguments.hoist !== undefined) edits.hoist = context.arguments.hoist;
        if (context.arguments.mentionable !== undefined) edits.mentionable = context.arguments.mentionable;

        await role.edit({
            ...edits,
            reason: `[Overseer] Edited by ${context.requester.displayName}`,
        });

        return { success: true, message: `Role **${role.name}** has been updated.` };
    }

    renderConfirmation(action: ActionRequest, locale: string): ConfirmationData {
        const role = action.resolvedEntities.get('role');
        const changes: string[] = [];
        if (action.arguments.name) changes.push(`Name → ${action.arguments.name}`);
        if (action.arguments.color) changes.push(`Color → ${action.arguments.color}`);
        if (action.arguments.hoist !== undefined) changes.push(`Hoist → ${action.arguments.hoist}`);
        if (action.arguments.mentionable !== undefined) changes.push(`Mentionable → ${action.arguments.mentionable}`);

        return {
            title: 'Edit Role',
            color: 0x3498db,
            fields: [
                { name: '🏷️ Role', value: role ? `<@&${role.id}>` : String(action.arguments.role), inline: true },
                { name: '📝 Changes', value: changes.join('\n') || 'No changes', inline: false },
            ],
        };
    }
}
