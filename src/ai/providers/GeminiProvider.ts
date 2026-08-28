import {
    GoogleGenerativeAI,
    type FunctionDeclaration,
    type FunctionDeclarationSchema,
    type Part,
    type Content,
    SchemaType,
    FunctionCallingMode,
} from '@google/generative-ai';
import type {
    AIProvider,
    AIRequest,
    AIResponse,
    ActionIntent,
    AIToolSchema,
} from '../../types/index.js';

export class GeminiProvider implements AIProvider {
    readonly name = 'gemini';
    private readonly client: GoogleGenerativeAI;

    constructor(apiKey: string) {
        this.client = new GoogleGenerativeAI(apiKey);
    }

    async chat(request: AIRequest): Promise<AIResponse> {
        const tools = this.buildFunctionDeclarations(request.tools);

        const model = this.client.getGenerativeModel({
            model: request.model,
            systemInstruction: request.systemPrompt,
            tools: tools.length > 0
                ? [{ functionDeclarations: tools }]
                : undefined,
            toolConfig: tools.length > 0
                ? { functionCallingConfig: { mode: FunctionCallingMode.AUTO } }
                : undefined,
        });

        const contents = this.buildContents(request);

        const result = await model.generateContent({ contents });
        const response = result.response;

        return this.parseResponse(response);
    }

    private buildContents(request: AIRequest): Content[] {
        const contents: Content[] = [];

        for (const msg of request.messages) {
            if (msg.role === 'system') continue;

            contents.push({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }],
            });
        }

        return contents;
    }

    private buildFunctionDeclarations(tools: AIToolSchema[]): FunctionDeclaration[] {
        return tools.map(tool => ({
            name: tool.name,
            description: tool.description,
            parameters: this.convertToGeminiSchema(tool.parameters) as unknown as FunctionDeclarationSchema,
        }));
    }

    private convertToGeminiSchema(jsonSchema: Record<string, unknown>): Record<string, unknown> {
        const type = jsonSchema.type as string;

        const result: Record<string, unknown> = {};

        switch (type) {
            case 'object': {
                result.type = SchemaType.OBJECT;
                const props = jsonSchema.properties as Record<string, Record<string, unknown>> | undefined;
                if (props) {
                    result.properties = {};
                    for (const [key, value] of Object.entries(props)) {
                        (result.properties as Record<string, unknown>)[key] = this.convertToGeminiSchema(value);
                    }
                }
                if (jsonSchema.required) {
                    result.required = jsonSchema.required;
                }
                break;
            }
            case 'string':
                result.type = SchemaType.STRING;
                if (jsonSchema.enum) result.enum = jsonSchema.enum;
                break;
            case 'number':
                result.type = SchemaType.NUMBER;
                break;
            case 'integer':
                result.type = SchemaType.INTEGER;
                break;
            case 'boolean':
                result.type = SchemaType.BOOLEAN;
                break;
            case 'array':
                result.type = SchemaType.ARRAY;
                if (jsonSchema.items) {
                    result.items = this.convertToGeminiSchema(jsonSchema.items as Record<string, unknown>);
                }
                break;
            default:
                result.type = SchemaType.STRING;
        }

        if (jsonSchema.description) {
            result.description = jsonSchema.description;
        }
        if (jsonSchema.nullable) {
            result.nullable = true;
        }

        return result;
    }

    private parseResponse(response: any): AIResponse {
        let content = '';
        try {
            content = response.text();
        } catch {

        }

        const actions: ActionIntent[] = [];
        const functionCalls = response.functionCalls();
        if (functionCalls) {
            for (const call of functionCalls) {
                actions.push({
                    tool: call.name,
                    arguments: call.args,
                });
            }
        }

        return { content, actions };
    }
}
