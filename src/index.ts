import { loadConfig } from './config/Config.js';
import { createDiscordClient } from './discord/DiscordClient.js';
import { AIManager } from './ai/AIManager.js';
import { ActionManager } from './actions/ActionManager.js';
import { AuditLogger } from './audit/AuditLogger.js';
import { ToolRegistry } from './tools/ToolRegistry.js';

import { registerReadyEvent } from './discord/events/ready.js';
import { registerMessageCreateEvent } from './discord/events/messageCreate.js';
import { registerInteractionCreateEvent } from './discord/events/interactionCreate.js';

import { BanMemberTool } from './tools/moderation/BanMemberTool.js';
import { UnbanMemberTool } from './tools/moderation/UnbanMemberTool.js';
import { KickMemberTool } from './tools/moderation/KickMemberTool.js';
import { TimeoutMemberTool } from './tools/moderation/TimeoutMemberTool.js';
import { RemoveTimeoutTool } from './tools/moderation/RemoveTimeoutTool.js';
import { WarnMemberTool } from './tools/moderation/WarnMemberTool.js';
import { PurgeMessagesTool } from './tools/moderation/PurgeMessagesTool.js';

import { AddRoleTool } from './tools/roles/AddRoleTool.js';
import { RemoveRoleTool } from './tools/roles/RemoveRoleTool.js';
import { CreateRoleTool } from './tools/roles/CreateRoleTool.js';
import { DeleteRoleTool } from './tools/roles/DeleteRoleTool.js';
import { EditRoleTool } from './tools/roles/EditRoleTool.js';

import { CreateChannelTool } from './tools/channels/CreateChannelTool.js';
import { DeleteChannelTool } from './tools/channels/DeleteChannelTool.js';
import { EditChannelTool } from './tools/channels/EditChannelTool.js';
import { LockChannelTool } from './tools/channels/LockChannelTool.js';
import { UnlockChannelTool } from './tools/channels/UnlockChannelTool.js';

import { SetServerNameTool } from './tools/server/SetServerNameTool.js';
import { SetServerIconTool } from './tools/server/SetServerIconTool.js';

async function main(): Promise<void> {
    console.log('[Overseer] Starting...');

    const config = loadConfig();
    console.log('[Config] Loaded successfully');

    const toolRegistry = new ToolRegistry();

    toolRegistry.register(new BanMemberTool());
    toolRegistry.register(new UnbanMemberTool());
    toolRegistry.register(new KickMemberTool());
    toolRegistry.register(new TimeoutMemberTool());
    toolRegistry.register(new RemoveTimeoutTool());
    toolRegistry.register(new WarnMemberTool());
    toolRegistry.register(new PurgeMessagesTool());

    toolRegistry.register(new AddRoleTool());
    toolRegistry.register(new RemoveRoleTool());
    toolRegistry.register(new CreateRoleTool());
    toolRegistry.register(new DeleteRoleTool());
    toolRegistry.register(new EditRoleTool());

    toolRegistry.register(new CreateChannelTool());
    toolRegistry.register(new DeleteChannelTool());
    toolRegistry.register(new EditChannelTool());
    toolRegistry.register(new LockChannelTool());
    toolRegistry.register(new UnlockChannelTool());

    toolRegistry.register(new SetServerNameTool());
    toolRegistry.register(new SetServerIconTool());

    console.log(`[Tools] Registered ${toolRegistry.getAll().length} tools`);

    const auditLogger = new AuditLogger();
    const aiManager = new AIManager(config, toolRegistry);
    const actionManager = new ActionManager(toolRegistry, auditLogger, config.confirmationTimeout);

    console.log('[Managers] ActionManager, AIManager, AuditLogger initialized');

    const client = createDiscordClient();

    registerReadyEvent(client);
    registerMessageCreateEvent(client, aiManager, actionManager);
    registerInteractionCreateEvent(client, actionManager);

    console.log('[Events] Event handlers registered');

    await client.login(config.discordToken);

    const shutdown = () => {
        console.log('\n[Overseer] Shutting down...');
        actionManager.actionStore.destroy();
        client.destroy();
        process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}

main().catch((error) => {
    console.error('[Overseer] Fatal error:', error);
    process.exit(1);
});
