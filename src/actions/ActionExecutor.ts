import type { GuildMember } from 'discord.js';
import type { ToolDefinition, ToolResult, ActionRequest, ResolvedEntity } from '../types/index.js';
import type { ToolRegistry } from '../tools/ToolRegistry.js';
import type { AuditLogger } from '../audit/AuditLogger.js';

export class ActionExecutor {
    constructor(
        private readonly toolRegistry: ToolRegistry,
        private readonly auditLogger: AuditLogger,
    ) {}

    async execute(action: ActionRequest): Promise<ToolResult> {
        if (action.status !== 'confirmed') {
            return {
                success: false,
                message: `Cannot execute action in status "${action.status}". Only confirmed actions can be executed.`,
            };
        }

        const tool = this.toolRegistry.get(action.tool);
        if (!tool) {
            return {
                success: false,
                message: `Unknown tool: ${action.tool}`,
            };
        }

        const context = this.buildContext(action, tool);
        if (!context) {
            return {
                success: false,
                message: 'Failed to build execution context. Required entities may be missing.',
            };
        }

        try {
            const result = await tool.execute(context);

            this.auditLogger.log({
                actionId: action.id,
                guildId: action.guildId,
                requesterId: action.requesterId,
                tool: action.tool,
                targetId: this.extractTargetId(action),
                arguments: action.arguments,
                status: result.success ? 'executed' : 'failed',
                error: result.success ? undefined : result.message,
                timestamp: Date.now(),
            });

            return result;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown execution error';

            this.auditLogger.log({
                actionId: action.id,
                guildId: action.guildId,
                requesterId: action.requesterId,
                tool: action.tool,
                targetId: this.extractTargetId(action),
                arguments: action.arguments,
                status: 'failed',
                error: message,
                timestamp: Date.now(),
            });

            return {
                success: false,
                message: `Action failed: ${message}`,
            };
        }
    }

    private buildContext(action: ActionRequest, _tool: ToolDefinition) {

        return {
            guild: null as any,
            channel: null as any,
            requester: null as any,
            arguments: action.arguments,
            resolvedEntities: action.resolvedEntities,
        };
    }

    private extractTargetId(action: ActionRequest): string | undefined {
        const target = action.resolvedEntities.get('target');
        return target?.id;
    }
}
