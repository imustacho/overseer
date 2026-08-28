import {
    MessageFlags,
    type ButtonInteraction,
    type GuildTextBasedChannel,
    type Message,
    type Guild,
    type GuildMember,
} from 'discord.js';
import type { ActionRequest, ToolResult } from '../types/index.js';
import type { ActionStore } from '../actions/ActionStore.js';
import type { ToolRegistry } from '../tools/ToolRegistry.js';
import { ConfirmationRenderer } from './ConfirmationRenderer.js';
import type { AuditLogger } from '../audit/AuditLogger.js';
import { t } from '../i18n/index.js';

export class ConfirmationManager {
    private readonly renderer = new ConfirmationRenderer();
    private readonly confirmationMessages = new Map<string, Message>();

    private readonly actionLocales = new Map<string, string>();

    constructor(
        private readonly actionStore: ActionStore,
        private readonly toolRegistry: ToolRegistry,
        private readonly auditLogger: AuditLogger,
        private readonly executeAction: (
            action: ActionRequest,
            guild: Guild,
            channel: GuildTextBasedChannel,
            requester: GuildMember,
        ) => Promise<ToolResult>,
    ) {}

    async create(
        action: ActionRequest,
        channel: GuildTextBasedChannel,
        locale: string,
    ): Promise<void> {
        const tool = this.toolRegistry.get(action.tool);
        if (!tool) return;

        this.actionLocales.set(action.id, locale);

        const confirmationData = tool.renderConfirmation(action, locale);
        const messagePayload = this.renderer.render(action, confirmationData, locale);

        const message = await channel.send(messagePayload);
        this.confirmationMessages.set(action.id, message);
    }

    async handleInteraction(interaction: ButtonInteraction): Promise<void> {
        const customId = interaction.customId;
        if (!customId.startsWith('overseer:')) return;

        const parts = customId.split(':');
        const buttonAction = parts[1];
        const actionId = parts[2];
        if (!buttonAction || !actionId) return;

        const action = this.actionStore.get(actionId);
        const locale = this.actionLocales.get(actionId) ?? interaction.guild?.preferredLocale ?? 'en';

        if (!action) {
            await interaction.reply({
                content: t(locale, 'confirm.no_longer_exists'),
                ephemeral: true,
            });
            return;
        }

        if (interaction.user.id !== action.requesterId) {
            await interaction.reply({
                content: t(locale, 'confirm.not_authorized'),
                ephemeral: true,
            });
            return;
        }

        if (this.actionStore.isExpired(action)) {
            this.actionStore.updateStatus(actionId, 'expired');
            await this.updateConfirmationMessage(action, t(locale, 'confirm.expired'), 0x95a5a6, locale);
            await interaction.reply({
                content: t(locale, 'confirm.expired_msg'),
                ephemeral: true,
            });
            return;
        }

        if (action.status !== 'pending') {
            await interaction.reply({
                content: t(locale, 'confirm.already_resolved', { status: action.status }),
                ephemeral: true,
            });
            return;
        }

        if (buttonAction === 'confirm') {
            await this.handleConfirm(interaction, action, locale);
        } else if (buttonAction === 'cancel') {
            await this.handleCancel(interaction, action, locale);
        }
    }

    private async handleConfirm(
        interaction: ButtonInteraction,
        action: ActionRequest,
        locale: string,
    ): Promise<void> {
        this.actionStore.updateStatus(action.id, 'confirmed');
        action.status = 'confirmed';

        await interaction.deferUpdate();

        const guild = interaction.guild;
        const channel = interaction.channel as GuildTextBasedChannel;
        const requester = interaction.member as GuildMember;

        if (!guild || !channel) {
            await this.updateConfirmationMessage(action, t(locale, 'confirm.failed', { error: 'Missing context' }), 0xe74c3c, locale);
            return;
        }

        const result = await this.executeAction(action, guild, channel, requester);

        if (result.success) {
            this.actionStore.updateStatus(action.id, 'executed');
            action.status = 'executed';
            await this.updateConfirmationMessage(action, `✅ ${result.message}`, 0x2ecc71, locale);
        } else {
            this.actionStore.updateStatus(action.id, 'failed', result.message);
            action.status = 'failed';
            await this.updateConfirmationMessage(action, t(locale, 'confirm.failed', { error: result.message }), 0xe74c3c, locale);
        }
    }

    private async handleCancel(
        interaction: ButtonInteraction,
        action: ActionRequest,
        locale: string,
    ): Promise<void> {
        this.actionStore.updateStatus(action.id, 'cancelled');
        action.status = 'cancelled';

        this.auditLogger.log({
            actionId: action.id,
            guildId: action.guildId,
            requesterId: action.requesterId,
            tool: action.tool,
            arguments: action.arguments,
            status: 'cancelled',
            timestamp: Date.now(),
        });

        await interaction.deferUpdate();
        await this.updateConfirmationMessage(action, t(locale, 'confirm.cancelled'), 0xe74c3c, locale);
    }

    private async updateConfirmationMessage(
        action: ActionRequest,
        statusMessage: string,
        statusColor: number,
        locale: string,
    ): Promise<void> {
        const message = this.confirmationMessages.get(action.id);
        if (!message) return;

        const tool = this.toolRegistry.get(action.tool);
        if (!tool) return;

        const confirmationData = tool.renderConfirmation(action, locale);
        const updated = this.renderer.renderDisabled(action, confirmationData, statusMessage, statusColor, locale);

        try {
            await message.edit({
                components: updated.components,
                flags: [MessageFlags.IsComponentsV2],
            });
        } catch {

        }

        this.confirmationMessages.delete(action.id);
        this.actionLocales.delete(action.id);
    }
}
