import 'dotenv/config';
import type { AppConfig } from '../types/index.js';

function requireEnv(key: string): string {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
}

function optionalEnv(key: string, fallback?: string): string | undefined {
    return process.env[key] ?? fallback;
}

export function loadConfig(): AppConfig {
    return {
        discordToken: requireEnv('DISCORD_TOKEN'),
        discordClientId: requireEnv('DISCORD_CLIENT_ID'),
        aiProvider: requireEnv('AI_PROVIDER'),
        aiApiKey: requireEnv('AI_API_KEY'),
        aiModel: requireEnv('AI_MODEL'),
        aiBaseUrl: optionalEnv('AI_BASE_URL'),
        confirmationTimeout: parseInt(optionalEnv('CONFIRMATION_TIMEOUT', '60') ?? '60', 10),
    };
}
