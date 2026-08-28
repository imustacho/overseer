import { PermissionFlagsBits, type GuildMember } from 'discord.js';
import { z } from 'zod';
import { BaseTool } from '../Tool.js';
import { t } from '../../i18n/index.js';
import type { ToolExecutionContext, ToolResult, ActionRequest, ConfirmationData } from '../../types/index.js';

const DURATION_MAP: Record<string, number> = {
    '30s': 30_000,
    '1m': 60_000,
    '5m': 300_000,
    '10m': 600_000,
    '30m': 1_800_000,
    '1h': 3_600_000,
    '2h': 7_200_000,
    '6h': 21_600_000,
    '12h': 43_200_000,
    '1d': 86_400_000,
    '3d': 259_200_000,
    '7d': 604_800_000,
    '14d': 1_209_600_000,
    '28d': 2_419_200_000,
};

function parseDuration(input: string): number | null {

    const mapped = DURATION_MAP[input.toLowerCase()];
    if (mapped) return mapped;

    const match = input.match(/^(\d+)\s*(s|sn|sec|secs|seconds?|saniye|m|min|mins|minutes?|dakika|h|hr|hrs|hours?|saat|d|days?|gün)$/i);
    if (match?.[1] && match[2]) {
        const value = parseInt(match[1], 10);
        const unit = match[2].toLowerCase();
        if (unit.startsWith('s') || unit === 'saniye' || unit === 'sn') return value * 1_000;
        if (unit.startsWith('m') || unit === 'dakika') return value * 60_000;
        if (unit.startsWith('h') || unit === 'saat') return value * 3_600_000;
        if (unit.startsWith('d') || unit === 'gün') return value * 86_400_000;
    }

    return null;
}

function formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1_000);
    if (seconds < 60) return `${seconds} second${seconds !== 1 ? 's' : ''}`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''}`;
    const days = Math.floor(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''}`;
}

export class TimeoutMemberTool extends BaseTool {
    readonly name = 'timeout_member';
    readonly description = 'Timeout (mute) a member for a specified duration. They cannot send messages, react, or join voice channels during the timeout.';
    readonly category = 'moderation' as const;
    readonly requiredDiscordPermission = PermissionFlagsBits.ModerateMembers;
    readonly requiresConfirmation = true;
    readonly entityParams = { target: 'member' as const };

    readonly parameters = z.object({
        target: z.string().describe('The username or display name of the member to timeout'),
        duration: z.string().describe('Duration of the timeout (e.g. "30s", "10m", "1h", "1d", "30 seconds", "30 saniye")'),
        reason: z.string().optional().describe('The reason for the timeout'),
    });

    async execute(context: ToolExecutionContext): Promise<ToolResult> {
        const target = context.resolvedEntities.get('target');
        if (!target) return { success: false, message: 'Target member not found.' };

        const member = target.raw as GuildMember;
        const durationStr = String(context.arguments.duration);
        const durationMs = parseDuration(durationStr);

        if (!durationMs) {
            return { success: false, message: `Invalid duration: "${durationStr}". Use formats like "10m", "1h", "1d".` };
        }

        if (durationMs > 2_419_200_000) {
            return { success: false, message: 'Maximum timeout duration is 28 days.' };
        }

        const reason = (context.arguments.reason as string) ?? 'No reason provided';

        await member.timeout(durationMs, `[Overseer] ${reason} (by ${context.requester.displayName})`);

        return {
            success: true,
            message: `**${member.displayName}** has been timed out for ${formatDuration(durationMs)}.`,
        };
    }

    renderConfirmation(action: ActionRequest, locale: string): ConfirmationData {
        const target = action.resolvedEntities.get('target');
        const durationMs = parseDuration(String(action.arguments.duration));
        return {
            title: 'Timeout Member',
            color: 0xf39c12,
            fields: [
                { name: '🎯 Target', value: target ? `<@${target.id}>` : String(action.arguments.target), inline: true },
                { name: '⏱️ Duration', value: durationMs ? formatDuration(durationMs) : String(action.arguments.duration), inline: true },
                { name: '📝 Reason', value: (action.arguments.reason as string) ?? 'No reason provided', inline: true },
            ],
        };
    }
}
