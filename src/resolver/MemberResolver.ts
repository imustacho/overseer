import type { Guild, GuildMember, Collection } from 'discord.js';
import type { ResolvedEntity, ResolutionResult } from '../types/index.js';

export class MemberResolver {

    async resolve(guild: Guild, query: string): Promise<ResolutionResult> {
        const cleaned = query.trim();
        if (!cleaned) {
            return { status: 'not_found', query: cleaned, type: 'member' };
        }

        const mentionMatch = cleaned.match(/^<@!?(\d+)>$/);
        if (mentionMatch?.[1]) {
            return this.resolveById(guild, mentionMatch[1]);
        }

        if (/^\d{17,20}$/.test(cleaned)) {
            return this.resolveById(guild, cleaned);
        }

        const nameQuery = cleaned.replace(/^@/, '');

        await this.ensureMembers(guild);

        const exactUsername = this.findExact(guild.members.cache, nameQuery, m => m.user.username);
        if (exactUsername.length === 1) {
            return { status: 'resolved', entity: this.toEntity(exactUsername[0]!) };
        }

        const exactDisplay = this.findExact(guild.members.cache, nameQuery, m => m.displayName);
        if (exactDisplay.length === 1) {
            return { status: 'resolved', entity: this.toEntity(exactDisplay[0]!) };
        }

        const exactGlobal = this.findExact(guild.members.cache, nameQuery, m => m.user.globalName ?? '');
        if (exactGlobal.length === 1) {
            return { status: 'resolved', entity: this.toEntity(exactGlobal[0]!) };
        }

        const allExact = this.dedup([...exactUsername, ...exactDisplay, ...exactGlobal]);
        if (allExact.length > 1) {
            return {
                status: 'ambiguous',
                match: {
                    query: nameQuery,
                    type: 'member',
                    candidates: allExact.slice(0, 10).map(m => this.toEntity(m)),
                },
            };
        }

        const startsWith = this.findStartsWith(guild.members.cache, nameQuery);
        if (startsWith.length === 1) {
            return { status: 'resolved', entity: this.toEntity(startsWith[0]!) };
        }
        if (startsWith.length > 1) {
            return {
                status: 'ambiguous',
                match: {
                    query: nameQuery,
                    type: 'member',
                    candidates: startsWith.slice(0, 10).map(m => this.toEntity(m)),
                },
            };
        }

        const contains = this.findContains(guild.members.cache, nameQuery);
        if (contains.length === 1) {
            return { status: 'resolved', entity: this.toEntity(contains[0]!) };
        }
        if (contains.length > 1) {
            return {
                status: 'ambiguous',
                match: {
                    query: nameQuery,
                    type: 'member',
                    candidates: contains.slice(0, 10).map(m => this.toEntity(m)),
                },
            };
        }

        return { status: 'not_found', query: nameQuery, type: 'member' };
    }

    private async resolveById(guild: Guild, id: string): Promise<ResolutionResult> {
        try {
            const member = await guild.members.fetch(id);
            return { status: 'resolved', entity: this.toEntity(member) };
        } catch {
            return { status: 'not_found', query: id, type: 'member' };
        }
    }

    private async ensureMembers(guild: Guild): Promise<void> {
        if (guild.members.cache.size < guild.memberCount && guild.memberCount <= 1000) {
            try {
                await guild.members.fetch();
            } catch {

            }
        }
    }

    private findExact(
        members: Collection<string, GuildMember>,
        query: string,
        getter: (m: GuildMember) => string,
    ): GuildMember[] {
        const q = query.toLowerCase();
        return members.filter(m => getter(m).toLowerCase() === q).map(m => m);
    }

    private findStartsWith(members: Collection<string, GuildMember>, query: string): GuildMember[] {
        const q = query.toLowerCase();
        return members.filter(m =>
            m.user.username.toLowerCase().startsWith(q) ||
            m.displayName.toLowerCase().startsWith(q) ||
            (m.user.globalName?.toLowerCase().startsWith(q) ?? false)
        ).map(m => m);
    }

    private findContains(members: Collection<string, GuildMember>, query: string): GuildMember[] {
        const q = query.toLowerCase();
        return members.filter(m =>
            m.user.username.toLowerCase().includes(q) ||
            m.displayName.toLowerCase().includes(q) ||
            (m.user.globalName?.toLowerCase().includes(q) ?? false)
        ).map(m => m);
    }

    private dedup(members: GuildMember[]): GuildMember[] {
        const seen = new Set<string>();
        return members.filter(m => {
            if (seen.has(m.id)) return false;
            seen.add(m.id);
            return true;
        });
    }

    private toEntity(member: GuildMember): ResolvedEntity {
        return {
            type: 'member',
            id: member.id,
            name: member.displayName,
            raw: member,
        };
    }
}
