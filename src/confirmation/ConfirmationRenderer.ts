import {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    type MessageCreateOptions,
} from 'discord.js';
import type { ActionRequest, ConfirmationData } from '../types/index.js';
import { t } from '../i18n/index.js';

export class ConfirmationRenderer {
    render(action: ActionRequest, confirmationData: ConfirmationData, locale: string): MessageCreateOptions {
        const container = new ContainerBuilder()
            .setAccentColor(confirmationData.color);

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## ⚠️ ${confirmationData.title}`),
        );

        if (confirmationData.description) {
            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(confirmationData.description),
            );
        }

        container.addSeparatorComponents(
            new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
        );

        const fieldLines = confirmationData.fields
            .map(f => `**${f.name}**\n${f.value}`)
            .join('\n\n');

        if (fieldLines) {
            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(fieldLines),
            );
        }

        container.addSeparatorComponents(
            new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
        );

        const remainingMs = action.expiresAt - Date.now();
        const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `👤 **${t(locale, 'confirm.requested_by')}:** <@${action.requesterId}>\n-# ⏱️ ${t(locale, 'confirm.expires_in', { seconds: remainingSec })} • \`${action.id.slice(0, 8)}\``,
            ),
        );

        const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId(`overseer:confirm:${action.id}`)
                .setLabel(t(locale, 'confirm.confirm'))
                .setStyle(ButtonStyle.Danger)
                .setEmoji('✅'),
            new ButtonBuilder()
                .setCustomId(`overseer:cancel:${action.id}`)
                .setLabel(t(locale, 'confirm.cancel'))
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('❌'),
        );

        container.addActionRowComponents(buttons);

        return {
            components: [container],
            flags: [MessageFlags.IsComponentsV2],
        };
    }

    renderDisabled(
        action: ActionRequest,
        confirmationData: ConfirmationData,
        statusMessage: string,
        statusColor: number,
        locale: string,
    ): { components: ContainerBuilder[]; flags: MessageFlags[] } {
        const container = new ContainerBuilder()
            .setAccentColor(statusColor);

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## ${statusMessage}`),
        );

        container.addSeparatorComponents(
            new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
        );

        const fieldLines = confirmationData.fields
            .map(f => `**${f.name}**\n${f.value}`)
            .join('\n\n');

        if (fieldLines) {
            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(fieldLines),
            );
        }

        container.addSeparatorComponents(
            new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
        );

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `👤 **${t(locale, 'confirm.requested_by')}:** <@${action.requesterId}>`,
            ),
        );

        const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId(`overseer:confirm:${action.id}`)
                .setLabel(t(locale, 'confirm.confirm'))
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId(`overseer:cancel:${action.id}`)
                .setLabel(t(locale, 'confirm.cancel'))
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
        );

        container.addActionRowComponents(buttons);

        return {
            components: [container],
            flags: [MessageFlags.IsComponentsV2],
        };
    }
}
