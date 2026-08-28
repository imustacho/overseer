import type { ToolDefinition, ToolCategory, AIToolSchema } from '../types/index.js';
import { zodToJsonSchema } from '../utils/zodToJsonSchema.js';

export class ToolRegistry {
    private readonly tools = new Map<string, ToolDefinition>();

    register(tool: ToolDefinition): void {
        if (this.tools.has(tool.name)) {
            throw new Error(`Tool "${tool.name}" is already registered.`);
        }
        this.tools.set(tool.name, tool);
    }

    get(name: string): ToolDefinition | undefined {
        return this.tools.get(name);
    }

    getAll(): ToolDefinition[] {
        return Array.from(this.tools.values());
    }

    getByCategory(category: ToolCategory): ToolDefinition[] {
        return this.getAll().filter(t => t.category === category);
    }

    has(name: string): boolean {
        return this.tools.has(name);
    }

    getAIToolSchemas(): AIToolSchema[] {
        return this.getAll().map(tool => ({
            name: tool.name,
            description: tool.description,
            parameters: zodToJsonSchema(tool.parameters),
        }));
    }
}
