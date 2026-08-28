import {
    type Guild,
    type GuildMember,
    type GuildTextBasedChannel,
    type Role,
    type GuildChannel,
    PermissionFlagsBits,
} from 'discord.js';
import type { z } from 'zod';

export interface AIProvider {
    readonly name: string;
    chat(request: AIRequest): Promise<AIResponse>;
}

export interface AIRequest {
    systemPrompt: string;
    messages: ConversationMessage[];
    tools: AIToolSchema[];
    model: string;
}

export interface AIResponse {
    content: string;
    actions: ActionIntent[];
}

export interface ConversationMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: number;
}

export interface AIToolSchema {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
}

export interface ActionIntent {
    tool: string;
    arguments: Record<string, unknown>;
}

export type ActionStatus =
    | 'pending'
    | 'confirmed'
    | 'cancelled'
    | 'expired'
    | 'executed'
    | 'failed';

export interface ActionRequest {
    id: string;
    guildId: string;
    channelId: string;
    messageId?: string;
    requesterId: string;
    tool: string;
    arguments: Record<string, unknown>;
    resolvedEntities: Map<string, ResolvedEntity>;
    status: ActionStatus;
    createdAt: number;
    expiresAt: number;
    result?: ToolResult;
    error?: string;
}

export type ToolCategory = 'moderation' | 'roles' | 'channels' | 'server';

export interface ToolDefinition {

    name: string;

    description: string;

    category: ToolCategory;

    parameters: z.ZodObject<z.ZodRawShape>;

    entityParams: Record<string, EntityType>;

    requiredDiscordPermission: bigint;

    requiresConfirmation: boolean;

    execute(context: ToolExecutionContext): Promise<ToolResult>;

    renderConfirmation(action: ActionRequest, locale: string): ConfirmationData;
}

export interface ToolExecutionContext {
    guild: Guild;
    channel: GuildTextBasedChannel;
    requester: GuildMember;
    arguments: Record<string, unknown>;
    resolvedEntities: Map<string, ResolvedEntity>;
}

export interface ToolResult {
    success: boolean;
    message: string;
    data?: Record<string, unknown>;
}

export type EntityType = 'member' | 'role' | 'channel';

export interface ResolvedEntity {
    type: EntityType;
    id: string;
    name: string;

    raw: GuildMember | Role | GuildChannel;
}

export interface AmbiguousMatch {
    query: string;
    type: EntityType;
    candidates: ResolvedEntity[];
}

export type ResolutionResult =
    | { status: 'resolved'; entity: ResolvedEntity }
    | { status: 'ambiguous'; match: AmbiguousMatch }
    | { status: 'not_found'; query: string; type: EntityType };

export interface ConfirmationData {
    title: string;
    description?: string;
    fields: ConfirmationField[];
    color: number;
    footer?: string;
}

export interface ConfirmationField {
    name: string;
    value: string;
    inline?: boolean;
}

export interface AuditEntry {
    actionId: string;
    guildId: string;
    requesterId: string;
    tool: string;
    targetId?: string;
    arguments: Record<string, unknown>;
    status: ActionStatus;
    error?: string;
    timestamp: number;
}

export interface AppConfig {
    discordToken: string;
    discordClientId: string;
    aiProvider: string;
    aiApiKey: string;
    aiModel: string;
    aiBaseUrl?: string;
    confirmationTimeout: number;
}

export interface PipelineResult {
    success: boolean;

    message?: string;

    ambiguousMatches?: AmbiguousMatch[];

    actionRequest?: ActionRequest;
}

export interface PermissionCheckResult {
    allowed: boolean;
    reason?: string;
}
