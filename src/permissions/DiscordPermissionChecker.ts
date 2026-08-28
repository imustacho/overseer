import type { Guild, GuildMember } from 'discord.js';
import type { PermissionCheckResult } from '../types/index.js';
import { t } from '../i18n/index.js';

export class DiscordPermissionChecker {
    checkBotCanAct(
        guild: Guild,
        requiredPermission: bigint,
        locale: string,
        targetMember?: GuildMember,
    ): PermissionCheckResult {
        const botMember = guild.members.me;
        if (!botMember) {
            return { allowed: false, reason: 'Bot member not found in guild.' };
        }

        if (!botMember.permissions.has(requiredPermission)) {
            return {
                allowed: false,
                reason: t(locale, 'perm.bot_no_permission'),
            };
        }

        if (targetMember) {
            if (targetMember.id === guild.ownerId) {
                return {
                    allowed: false,
                    reason: t(locale, 'perm.target_is_owner'),
                };
            }

            if (targetMember.id === botMember.id) {
                return {
                    allowed: false,
                    reason: t(locale, 'perm.target_is_self'),
                };
            }

            if (botMember.roles.highest.position <= targetMember.roles.highest.position) {
                return {
                    allowed: false,
                    reason: t(locale, 'perm.bot_role_too_low', { target: targetMember.displayName }),
                };
            }
        }

        return { allowed: true };
    }

    checkRequesterCanAct(
        requester: GuildMember,
        target: GuildMember,
        locale: string,
    ): PermissionCheckResult {
        if (requester.id === requester.guild.ownerId) {
            return { allowed: true };
        }

        if (target.id === requester.guild.ownerId) {
            return {
                allowed: false,
                reason: t(locale, 'perm.requester_is_owner_target'),
            };
        }

        if (requester.id === target.id) {
            return {
                allowed: false,
                reason: t(locale, 'perm.requester_is_self_target'),
            };
        }

        if (requester.roles.highest.position <= target.roles.highest.position) {
            return {
                allowed: false,
                reason: t(locale, 'perm.requester_role_too_low', { target: target.displayName }),
            };
        }

        return { allowed: true };
    }
}
