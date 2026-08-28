import { OpenAICompatibleProvider } from './OpenAICompatibleProvider.js';

export class OpenRouterProvider extends OpenAICompatibleProvider {
    constructor(apiKey: string) {
        super('openrouter', apiKey, 'https://openrouter.ai/api/v1', {
            'HTTP-Referer': 'https://github.com/overseer-bot',
            'X-Title': 'Overseer Discord Bot',
        });
    }
}
