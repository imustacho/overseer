import type { ActionRequest, ActionStatus } from '../types/index.js';

export class ActionStore {
    private readonly actions = new Map<string, ActionRequest>();
    private readonly cleanupInterval: ReturnType<typeof setInterval>;

    constructor(cleanupIntervalMs: number = 30_000) {

        this.cleanupInterval = setInterval(() => this.cleanup(), cleanupIntervalMs);
    }

    store(action: ActionRequest): void {
        this.actions.set(action.id, action);
    }

    get(id: string): ActionRequest | undefined {
        return this.actions.get(id);
    }

    update(id: string, updates: Partial<ActionRequest>): ActionRequest | undefined {
        const action = this.actions.get(id);
        if (!action) return undefined;

        const updated = { ...action, ...updates };
        this.actions.set(id, updated);
        return updated;
    }

    updateStatus(id: string, status: ActionStatus, error?: string): ActionRequest | undefined {
        return this.update(id, { status, error });
    }

    delete(id: string): boolean {
        return this.actions.delete(id);
    }

    isExpired(action: ActionRequest): boolean {
        return Date.now() > action.expiresAt;
    }

    private cleanup(): void {
        const now = Date.now();
        for (const [id, action] of this.actions) {
            if (action.status === 'pending' && now > action.expiresAt) {
                action.status = 'expired';

            }

            if (
                action.status !== 'pending' &&
                now - action.createdAt > 5 * 60 * 1000
            ) {
                this.actions.delete(id);
            }
        }
    }

    destroy(): void {
        clearInterval(this.cleanupInterval);
        this.actions.clear();
    }
}
