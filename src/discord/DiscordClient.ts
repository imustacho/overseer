import {
    Client,
    GatewayIntentBits,
    Partials,
} from 'discord.js';

export function createDiscordClient(): Client {
    return new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.GuildModeration,
        ],
        partials: [
            Partials.Message,
            Partials.Channel,
        ],
    });
}
