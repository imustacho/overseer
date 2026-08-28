import { en } from './locales/en.js';
import { tr } from './locales/tr.js';

export type LocaleKey = keyof typeof en;
export type LocaleStrings = Record<LocaleKey, string>;

const locales: Record<string, LocaleStrings> = { en, tr };
const DEFAULT_LOCALE = 'en';

function resolveLocale(discordLocale: string): string {
    const base = discordLocale.split('-')[0]!.toLowerCase();
    if (locales[base]) return base;
    return DEFAULT_LOCALE;
}

export function t(
    locale: string,
    key: LocaleKey,
    params?: Record<string, string | number>,
): string {
    const resolved = resolveLocale(locale);
    const strings = locales[resolved] ?? locales[DEFAULT_LOCALE]!;
    let text = strings[key] ?? en[key] ?? key;

    if (params) {
        for (const [k, v] of Object.entries(params)) {
            text = text.replaceAll(`{{${k}}}`, String(v));
        }
    }

    return text;
}
