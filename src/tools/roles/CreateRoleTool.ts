import { PermissionFlagsBits } from 'discord.js';
import { z } from 'zod';
import { BaseTool } from '../Tool.js';
import { t } from '../../i18n/index.js';
import type { ToolExecutionContext, ToolResult, ActionRequest, ConfirmationData } from '../../types/index.js';

function resolveColor(color: string | undefined): number | undefined {
    if (!color) return undefined;
    const hex = color.replace(/^#/, '');
    const parsed = parseInt(hex, 16);
    return isNaN(parsed) ? undefined : parsed;
}

export class CreateRoleTool extends BaseTool {
    readonly name = 'create_role';
    readonly description = 'Create a new role in the server.';
    readonly category = 'roles' as const;
    readonly requiredDiscordPermission = PermissionFlagsBits.ManageRoles;
    readonly requiresConfirmation = true;
    readonly entityParams = {};

    readonly parameters = z.object({
        name: z.string().describe('The name for the new role'),
        color: z.string().optional().describe('The hex color for the role (e.g. "#ff0000")'),
        hoist: z.boolean().optional().describe('Whether to display this role separately in the member list'),
        mentionable: z.boolean().optional().describe('Whether this role can be mentioned by anyone'),
    });

    async execute(context: ToolExecutionContext): Promise<ToolResult> {
        const name = String(context.arguments.name);
        const color = resolveColor(context.arguments.color as string | undefined);

        const role = await context.guild.roles.create({
            name,
            color,
            hoist: (context.arguments.hoist as boolean) ?? false,
            mentionable: (context.arguments.mentionable as boolean) ?? false,
            reason: `[Overseer] Created by ${context.requester.displayName}`,
        });

        return { success: true, message: `Role **${role.name}** created.` };
    }

    renderConfirmation(action: ActionRequest, locale: string): ConfirmationData {
        const fields = [
            { name: '🏷️ Name', value: String(action.arguments.name), inline: true },
        ];
        if (action.arguments.color) {
            fields.push({ name: '🎨 Color', value: String(action.arguments.color), inline: true });
        }
        return { title: 'Create Role', color: 0x2ecc71, fields };
    }
}
