import type {
    ToolDefinition,
    ToolCategory,
    ToolExecutionContext,
    ToolResult,
    ActionRequest,
    ConfirmationData,
    EntityType,
} from '../types/index.js';
import type { z } from 'zod';

export abstract class BaseTool implements ToolDefinition {
    abstract readonly name: string;
    abstract readonly description: string;
    abstract readonly category: ToolCategory;
    abstract readonly parameters: z.ZodObject<z.ZodRawShape>;
    abstract readonly entityParams: Record<string, EntityType>;
    abstract readonly requiredDiscordPermission: bigint;

    readonly requiresConfirmation: boolean = true;

    abstract execute(context: ToolExecutionContext): Promise<ToolResult>;
    abstract renderConfirmation(action: ActionRequest, locale: string): ConfirmationData;

    validateArguments(args: Record<string, unknown>): Record<string, unknown> {
        return this.parameters.parse(args);
    }
}
