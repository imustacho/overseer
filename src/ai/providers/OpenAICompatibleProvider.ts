import type {
    AIProvider,
    AIRequest,
    AIResponse,
    ActionIntent,
    AIToolSchema,
} from '../../types/index.js';

interface OpenAIMessage {
    role: 'system' | 'user' | 'assistant';
    content: string | null;
    tool_calls?: OpenAIToolCall[];
}

interface OpenAIToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string;
    };
}

interface OpenAITool {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: Record<string, unknown>;
    };
}

interface OpenAICompletionResponse {
    choices: {
        message: {
            content: string | null;
            tool_calls?: OpenAIToolCall[];
        };
        finish_reason: string;
    }[];
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

export class OpenAICompatibleProvider implements AIProvider {
    readonly name: string;
    private readonly apiKey: string;
    private readonly baseUrl: string;
    private readonly extraHeaders: Record<string, string>;

    constructor(
        name: string,
        apiKey: string,
        baseUrl: string = 'https://api.openai.com/v1',
        extraHeaders: Record<string, string> = {},
    ) {
        this.name = name;
        this.apiKey = apiKey;
        this.baseUrl = baseUrl.replace(/\/+$/, '');
        this.extraHeaders = extraHeaders;
    }

    async chat(request: AIRequest): Promise<AIResponse> {
        const messages = this.buildMessages(request);
        const tools = this.buildTools(request.tools);

        const body: Record<string, unknown> = {
            model: request.model,
            messages,
        };

        if (tools.length > 0) {
            body.tools = tools;
            body.tool_choice = 'auto';
        }

        const response = await fetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
                ...this.extraHeaders,
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
                `${this.name} API error (${response.status}): ${errorText}`,
            );
        }

        const data = (await response.json()) as OpenAICompletionResponse;
        return this.parseResponse(data);
    }

    private buildMessages(request: AIRequest): OpenAIMessage[] {
        const messages: OpenAIMessage[] = [
            { role: 'system', content: request.systemPrompt },
        ];

        for (const msg of request.messages) {
            messages.push({
                role: msg.role,
                content: msg.content,
            });
        }

        return messages;
    }

    private buildTools(tools: AIToolSchema[]): OpenAITool[] {
        return tools.map(tool => ({
            type: 'function' as const,
            function: {
                name: tool.name,
                description: tool.description,
                parameters: tool.parameters,
            },
        }));
    }

    private parseResponse(data: OpenAICompletionResponse): AIResponse {
        const choice = data.choices[0];
        if (!choice) {
            throw new Error(`${this.name}: No response choice returned`);
        }

        const content = choice.message.content ?? '';
        const actions: ActionIntent[] = [];

        if (choice.message.tool_calls) {
            for (const toolCall of choice.message.tool_calls) {
                try {
                    const args = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;
                    actions.push({
                        tool: toolCall.function.name,
                        arguments: args,
                    });
                } catch {
                    console.error(
                        `[${this.name}] Failed to parse tool call arguments:`,
                        toolCall.function.arguments,
                    );
                }
            }
        }

        return { content, actions };
    }
}
