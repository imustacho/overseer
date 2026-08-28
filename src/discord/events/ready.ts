import type { Client } from 'discord.js';

export function registerReadyEvent(client: Client): void {
    client.once('ready', (readyClient) => {
        console.log('┌──────────────────────────────────────────┐');
        console.log('│           Overseer is online!             │');
        console.log('├──────────────────────────────────────────┤');
        console.log(`│  Bot: ${readyClient.user.tag.padEnd(34)}│`);
        console.log(`│  Guilds: ${String(readyClient.guilds.cache.size).padEnd(31)}│`);
        console.log(`│  Commands: Listening for @mentions       │`);
        console.log('└──────────────────────────────────────────┘');
    });
}
