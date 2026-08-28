import type { GuildMember } from 'discord.js';
import type { PermissionCheckResult } from '../types/index.js';
import { t } from '../i18n/index.js';

export class PermissionManager {
    checkPermission(
        member: GuildMember,
        requiredPermission: bigint,
        locale: string,
    ): PermissionCheckResult {
        if (member.id === member.guild.ownerId) {
            return { allowed: true };
        }

        if (!member.permissions.has(requiredPermission)) {
            return {
                allowed: false,
                reason: t(locale, 'perm.no_permission'),
            };
        }

        return { allowed: true };
    }
}
