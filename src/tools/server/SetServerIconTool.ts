import { PermissionFlagsBits } from 'discord.js';
import { z } from 'zod';
import { BaseTool } from '../Tool.js';
import { t } from '../../i18n/index.js';
import type { ToolExecutionContext, ToolResult, ActionRequest, ConfirmationData } from '../../types/index.js';

export class SetServerIconTool extends BaseTool {
    readonly name = 'set_server_icon';
    readonly description = 'Change the server icon. Provide a URL to an image.';
    readonly category = 'server' as const;
    readonly requiredDiscordPermission = PermissionFlagsBits.ManageGuild;
    readonly requiresConfirmation = true;
    readonly entityParams = {};

    readonly parameters = z.object({
        url: z.string().url().describe('URL to the new server icon image'),
    });

    async execute(context: ToolExecutionContext): Promise<ToolResult> {
        const url = String(context.arguments.url);

        await context.guild.setIcon(url, `[Overseer] Changed by ${context.requester.displayName}`);

        return { success: true, message: 'Server icon has been updated.' };
    }

    renderConfirmation(action: ActionRequest, locale: string): ConfirmationData {
        return {
            title: 'Change Server Icon',
            color: 0x9b59b6,
            fields: [
                { name: '🖼️ Image URL', value: String(action.arguments.url), inline: false },
            ],
        };
    }
}
