import { OpenAICompatibleProvider } from './OpenAICompatibleProvider.js';

export class GroqProvider extends OpenAICompatibleProvider {
    constructor(apiKey: string) {
        super('groq', apiKey, 'https://api.groq.com/openai/v1');
    }
}
