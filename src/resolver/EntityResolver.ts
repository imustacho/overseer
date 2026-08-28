import type { Guild } from 'discord.js';
import type { EntityType, ResolutionResult } from '../types/index.js';
import { MemberResolver } from './MemberResolver.js';
import { RoleResolver } from './RoleResolver.js';
import { ChannelResolver } from './ChannelResolver.js';

export class EntityResolver {
    private readonly memberResolver = new MemberResolver();
    private readonly roleResolver = new RoleResolver();
    private readonly channelResolver = new ChannelResolver();

    async resolve(guild: Guild, query: string, type: EntityType): Promise<ResolutionResult> {
        switch (type) {
            case 'member':
                return this.memberResolver.resolve(guild, query);
            case 'role':
                return this.roleResolver.resolve(guild, query);
            case 'channel':
                return this.channelResolver.resolve(guild, query);
            default:
                return { status: 'not_found', query, type };
        }
    }
}
