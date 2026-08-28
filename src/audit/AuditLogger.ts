import type { AuditEntry } from '../types/index.js';

export class AuditLogger {
    log(entry: AuditEntry): void {
        const logLine = {
            type: 'AUDIT',
            ...entry,
            time: new Date(entry.timestamp).toISOString(),
        };

        switch (entry.status) {
            case 'failed':
                console.error('[AUDIT]', JSON.stringify(logLine));
                break;
            case 'executed':
                console.log('[AUDIT]', JSON.stringify(logLine));
                break;
            default:
                console.log('[AUDIT]', JSON.stringify(logLine));
        }
    }
}
