import type { Guild } from 'discord.js';
import type { ResolvedEntity, ResolutionResult } from '../types/index.js';

export class RoleResolver {
    async resolve(guild: Guild, query: string): Promise<ResolutionResult> {
        const cleaned = query.trim();
        if (!cleaned) {
            return { status: 'not_found', query: cleaned, type: 'role' };
        }

        const mentionMatch = cleaned.match(/^<@&(\d+)>$/);
        if (mentionMatch?.[1]) {
            return this.resolveById(guild, mentionMatch[1]);
        }

        if (/^\d{17,20}$/.test(cleaned)) {
            return this.resolveById(guild, cleaned);
        }

        const nameQuery = cleaned.replace(/^@/, '');
        const q = nameQuery.toLowerCase();

        const roles = guild.roles.cache;

        const exact = roles.filter(r => r.name.toLowerCase() === q && r.id !== r.guild.id);
        if (exact.size === 1) {
            return { status: 'resolved', entity: this.toEntity(exact.first()!) };
        }
        if (exact.size > 1) {
            return {
                status: 'ambiguous',
                match: {
                    query: nameQuery,
                    type: 'role',
                    candidates: [...exact.values()].slice(0, 10).map(r => this.toEntity(r)),
                },
            };
        }

        const startsWith = roles.filter(r => r.name.toLowerCase().startsWith(q) && r.id !== r.guild.id);
        if (startsWith.size === 1) {
            return { status: 'resolved', entity: this.toEntity(startsWith.first()!) };
        }
        if (startsWith.size > 1) {
            return {
                status: 'ambiguous',
                match: {
                    query: nameQuery,
                    type: 'role',
                    candidates: [...startsWith.values()].slice(0, 10).map(r => this.toEntity(r)),
                },
            };
        }

        const contains = roles.filter(r => r.name.toLowerCase().includes(q) && r.id !== r.guild.id);
        if (contains.size === 1) {
            return { status: 'resolved', entity: this.toEntity(contains.first()!) };
        }
        if (contains.size > 1) {
            return {
                status: 'ambiguous',
                match: {
                    query: nameQuery,
                    type: 'role',
                    candidates: [...contains.values()].slice(0, 10).map(r => this.toEntity(r)),
                },
            };
        }

        return { status: 'not_found', query: nameQuery, type: 'role' };
    }

    private resolveById(guild: Guild, id: string): ResolutionResult {
        const role = guild.roles.cache.get(id);
        if (role) {
            return { status: 'resolved', entity: this.toEntity(role) };
        }
        return { status: 'not_found', query: id, type: 'role' };
    }

    private toEntity(role: { id: string; name: string }): ResolvedEntity {
        return {
            type: 'role',
            id: role.id,
            name: role.name,
            raw: role as any,
        };
    }
}
