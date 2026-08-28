import { type Client, type Interaction, InteractionType, ComponentType } from 'discord.js';
import type { ActionManager } from '../../actions/ActionManager.js';

export function registerInteractionCreateEvent(
    client: Client,
    actionManager: ActionManager,
): void {
    client.on('interactionCreate', async (interaction: Interaction) => {

        if (interaction.isButton()) {
            const customId = interaction.customId;

            if (customId.startsWith('overseer:')) {
                try {
                    await actionManager.confirmationManager.handleInteraction(interaction);
                } catch (error) {
                    console.error('[InteractionCreate] Error handling button:', error);
                    try {
                        if (!interaction.replied && !interaction.deferred) {
                            await interaction.reply({
                                content: '⚠️ An error occurred while processing this action.',
                                ephemeral: true,
                            });
                        }
                    } catch {

                    }
                }
            }
        }

    });
}
