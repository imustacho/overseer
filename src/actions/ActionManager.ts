import { randomUUID } from 'node:crypto';
import type {
    Guild,
    GuildMember,
    GuildTextBasedChannel,
} from 'discord.js';
import type {
    ActionIntent,
    ActionRequest,
    PipelineResult,
    ToolResult,
    AmbiguousMatch,
} from '../types/index.js';
import type { ToolRegistry } from '../tools/ToolRegistry.js';
import { EntityResolver } from '../resolver/EntityResolver.js';
import { PermissionManager } from '../permissions/PermissionManager.js';
import { DiscordPermissionChecker } from '../permissions/DiscordPermissionChecker.js';
import { ActionStore } from './ActionStore.js';
import { ConfirmationManager } from '../confirmation/ConfirmationManager.js';
import type { AuditLogger } from '../audit/AuditLogger.js';
import { t } from '../i18n/index.js';

export class ActionManager {
    private readonly entityResolver = new EntityResolver();
    private readonly permissionManager = new PermissionManager();
    private readonly discordChecker = new DiscordPermissionChecker();
    readonly actionStore: ActionStore;
    readonly confirmationManager: ConfirmationManager;

    constructor(
        private readonly toolRegistry: ToolRegistry,
        private readonly auditLogger: AuditLogger,
        private readonly confirmationTimeout: number = 60,
    ) {
        this.actionStore = new ActionStore();
        this.confirmationManager = new ConfirmationManager(
            this.actionStore,
            this.toolRegistry,
            this.auditLogger,
            this.executeAction.bind(this),
        );
    }

    async processIntent(
        intent: ActionIntent,
        guild: Guild,
        channel: GuildTextBasedChannel,
        requester: GuildMember,
        locale: string,
    ): Promise<PipelineResult> {

        const tool = this.toolRegistry.get(intent.tool);
        if (!tool) {
            return {
                success: false,
                message: t(locale, 'action.unknown_tool', { tool: intent.tool }),
            };
        }

        let validatedArgs: Record<string, unknown>;
        try {
            validatedArgs = tool.parameters.parse(intent.arguments);
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Invalid arguments';
            return {
                success: false,
                message: t(locale, 'action.invalid_args', { tool: intent.tool, error: msg }),
            };
        }

        const resolvedEntities = new Map<string, any>();
        const ambiguousMatches: AmbiguousMatch[] = [];

        for (const [paramName, entityType] of Object.entries(tool.entityParams)) {
            const rawValue = validatedArgs[paramName];
            if (rawValue === undefined || rawValue === null) continue;

            const query = String(rawValue);
            const result = await this.entityResolver.resolve(guild, query, entityType);

            switch (result.status) {
                case 'resolved':
                    resolvedEntities.set(paramName, result.entity);
                    break;
                case 'ambiguous':
                    ambiguousMatches.push(result.match);
                    break;
                case 'not_found':
                    return {
                        success: false,
                        message: t(locale, 'action.not_found', { query: result.query, type: result.type }),
                    };
            }
        }

        if (ambiguousMatches.length > 0) {
            return {
                success: false,
                ambiguousMatches,
                message: this.formatAmbiguous(ambiguousMatches),
            };
        }

        const permCheck = this.permissionManager.checkPermission(
            requester,
            tool.requiredDiscordPermission,
            locale,
        );
        if (!permCheck.allowed) {
            return { success: false, message: `🚫 ${permCheck.reason}` };
        }

        const targetMember = resolvedEntities.get('target')?.raw;
        const botCheck = this.discordChecker.checkBotCanAct(
            guild,
            tool.requiredDiscordPermission,
            locale,
            targetMember,
        );
        if (!botCheck.allowed) {
            return { success: false, message: `🚫 ${botCheck.reason}` };
        }

        if (targetMember) {
            const hierarchyCheck = this.discordChecker.checkRequesterCanAct(
                requester,
                targetMember,
                locale,
            );
            if (!hierarchyCheck.allowed) {
                return { success: false, message: `🚫 ${hierarchyCheck.reason}` };
            }
        }

        const actionId = randomUUID().slice(0, 12);
        const now = Date.now();

        const actionRequest: ActionRequest = {
            id: actionId,
            guildId: guild.id,
            channelId: channel.id,
            requesterId: requester.id,
            tool: intent.tool,
            arguments: validatedArgs,
            resolvedEntities,
            status: 'pending',
            createdAt: now,
            expiresAt: now + this.confirmationTimeout * 1000,
        };

        this.actionStore.store(actionRequest);

        this.auditLogger.log({
            actionId,
            guildId: guild.id,
            requesterId: requester.id,
            tool: intent.tool,
            targetId: resolvedEntities.get('target')?.id,
            arguments: validatedArgs,
            status: 'pending',
            timestamp: now,
        });

        await this.confirmationManager.create(actionRequest, channel, locale);
        return { success: true, actionRequest };
    }

    async processIntents(
        intents: ActionIntent[],
        guild: Guild,
        channel: GuildTextBasedChannel,
        requester: GuildMember,
        locale: string,
    ): Promise<PipelineResult[]> {
        const results: PipelineResult[] = [];
        for (const intent of intents) {
            const result = await this.processIntent(intent, guild, channel, requester, locale);
            results.push(result);
        }
        return results;
    }

    private async executeAction(
        action: ActionRequest,
        guild: Guild,
        channel: GuildTextBasedChannel,
        requester: GuildMember,
    ): Promise<ToolResult> {
        const tool = this.toolRegistry.get(action.tool);
        if (!tool) {
            return { success: false, message: `Unknown tool: ${action.tool}` };
        }

        try {
            const result = await tool.execute({
                guild,
                channel,
                requester,
                arguments: action.arguments,
                resolvedEntities: action.resolvedEntities,
            });

            this.auditLogger.log({
                actionId: action.id,
                guildId: action.guildId,
                requesterId: action.requesterId,
                tool: action.tool,
                targetId: action.resolvedEntities.get('target')?.id,
                arguments: action.arguments,
                status: result.success ? 'executed' : 'failed',
                error: result.success ? undefined : result.message,
                timestamp: Date.now(),
            });

            return result;
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error';

            this.auditLogger.log({
                actionId: action.id,
                guildId: action.guildId,
                requesterId: action.requesterId,
                tool: action.tool,
                arguments: action.arguments,
                status: 'failed',
                error: msg,
                timestamp: Date.now(),
            });

            return { success: false, message: msg };
        }
    }

    private formatAmbiguous(matches: AmbiguousMatch[]): string {
        const parts = matches.map(m => {
            const candidates = m.candidates
                .map((c, i) => `${i + 1}. **${c.name}** (${c.id})`)
                .join('\n');
            return `Multiple ${m.type}s matching "${m.query}":\n${candidates}`;
        });
        return parts.join('\n\n');
    }
}
