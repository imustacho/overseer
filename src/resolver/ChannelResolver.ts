import type { Guild } from 'discord.js';
import type { ResolvedEntity, ResolutionResult } from '../types/index.js';

export class ChannelResolver {
    async resolve(guild: Guild, query: string): Promise<ResolutionResult> {
        const cleaned = query.trim();
        if (!cleaned) {
            return { status: 'not_found', query: cleaned, type: 'channel' };
        }

        const mentionMatch = cleaned.match(/^<#(\d+)>$/);
        if (mentionMatch?.[1]) {
            return this.resolveById(guild, mentionMatch[1]);
        }

        if (/^\d{17,20}$/.test(cleaned)) {
            return this.resolveById(guild, cleaned);
        }

        const nameQuery = cleaned.replace(/^#/, '');
        const q = nameQuery.toLowerCase();

        const channels = [...guild.channels.cache.values()].filter(c => !c.isThread());

        const exact = channels.filter(c => c.name.toLowerCase() === q);
        if (exact.length === 1) {
            return { status: 'resolved', entity: this.toEntity(exact[0]!) };
        }
        if (exact.length > 1) {
            return {
                status: 'ambiguous',
                match: {
                    query: nameQuery,
                    type: 'channel',
                    candidates: exact.slice(0, 10).map(c => this.toEntity(c)),
                },
            };
        }

        const startsWith = channels.filter(c => c.name.toLowerCase().startsWith(q));
        if (startsWith.length === 1) {
            return { status: 'resolved', entity: this.toEntity(startsWith[0]!) };
        }
        if (startsWith.length > 1) {
            return {
                status: 'ambiguous',
                match: {
                    query: nameQuery,
                    type: 'channel',
                    candidates: startsWith.slice(0, 10).map(c => this.toEntity(c)),
                },
            };
        }

        const contains = channels.filter(c => c.name.toLowerCase().includes(q));
        if (contains.length === 1) {
            return { status: 'resolved', entity: this.toEntity(contains[0]!) };
        }
        if (contains.length > 1) {
            return {
                status: 'ambiguous',
                match: {
                    query: nameQuery,
                    type: 'channel',
                    candidates: contains.slice(0, 10).map(c => this.toEntity(c)),
                },
            };
        }

        return { status: 'not_found', query: nameQuery, type: 'channel' };
    }

    private resolveById(guild: Guild, id: string): ResolutionResult {
        const channel = guild.channels.cache.get(id);
        if (channel) {
            return { status: 'resolved', entity: this.toEntity(channel) };
        }
        return { status: 'not_found', query: id, type: 'channel' };
    }

    private toEntity(channel: { id: string; name: string }): ResolvedEntity {
        return {
            type: 'channel',
            id: channel.id,
            name: channel.name,
            raw: channel as any,
        };
    }
}
