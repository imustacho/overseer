import { PermissionFlagsBits } from 'discord.js';
import { z } from 'zod';
import { BaseTool } from '../Tool.js';
import { t } from '../../i18n/index.js';
import type { ToolExecutionContext, ToolResult, ActionRequest, ConfirmationData } from '../../types/index.js';

export class SetServerNameTool extends BaseTool {
    readonly name = 'set_server_name';
    readonly description = 'Change the server name.';
    readonly category = 'server' as const;
    readonly requiredDiscordPermission = PermissionFlagsBits.ManageGuild;
    readonly requiresConfirmation = true;
    readonly entityParams = {};

    readonly parameters = z.object({
        name: z.string().min(2).max(100).describe('The new server name'),
    });

    async execute(context: ToolExecutionContext): Promise<ToolResult> {
        const newName = String(context.arguments.name);
        const oldName = context.guild.name;

        await context.guild.setName(newName, `[Overseer] Changed by ${context.requester.displayName}`);

        return { success: true, message: `Server name changed from **${oldName}** to **${newName}**.` };
    }

    renderConfirmation(action: ActionRequest, locale: string): ConfirmationData {
        return {
            title: 'Change Server Name',
            color: 0x9b59b6,
            fields: [
                { name: '📝 New Name', value: String(action.arguments.name), inline: true },
            ],
        };
    }
}
