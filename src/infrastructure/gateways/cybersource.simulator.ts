import { logger } from '../../shared/utils/logger';

export type GatewayMode = 'ALWAYS_OK' | 'ALWAYS_FAIL' | 'RANDOM_FAIL';

export interface AuthorizationResult {
    authId: string;
}

export interface WebhookPayload {
    authId: string;
    settlementId: string;
    status: 'SETTLED' | 'FAILED';
    failureReason?: string;
}

export class CyberSourceSimulator {
    private webhookUrl: string;

    constructor(
        private readonly settlementDelayMs: number = 5000,
        private readonly mode: GatewayMode = 'ALWAYS_OK',
        private readonly failRate: number = 0.1,
        webhookBaseUrl: string = 'http://localhost:3000'
    ) {
        this.webhookUrl = `${webhookBaseUrl}/webhooks/cybersource/settlement`;
    }

    authorize(_accountId: number, _amount: number): AuthorizationResult {
        const authId = `auth_${Date.now()}_${Math.random().toString(16).slice(2)}`;
        this.scheduleSettlementWebhook(authId);
        return { authId };
    }

    private scheduleSettlementWebhook(authId: string): void {
        setTimeout(() => this.sendWebhookWithRetry(authId, 0), this.settlementDelayMs);
    }

    private async sendWebhookWithRetry(authId: string, attempt: number): Promise<void> {
        const MAX_RETRIES = 3;
        const payload = this.generateSettlementPayload(authId);

        try {
            logger.info('Sending CyberSource webhook', { authId, attempt: attempt + 1 });
            const response = await fetch(this.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            logger.info('CyberSource webhook sent successfully', { authId, status: payload.status });

        } catch (err) {
            logger.error('CyberSource webhook delivery failed', {
                authId,
                attempt: attempt + 1,
                error: (err as Error).message
            });

            if (attempt < MAX_RETRIES) {
                const backoff = 1000 * Math.pow(2, attempt); // 1s, 2s, 4s...
                logger.debug('Retrying webhook...', { authId, nextAttemptIn: backoff });
                setTimeout(() => this.sendWebhookWithRetry(authId, attempt + 1), backoff);
            } else {
                logger.error('CyberSource webhook permanently failed after retries', { authId });
            }
        }
    }

    private generateSettlementPayload(authId: string): WebhookPayload {
        if (this.mode === 'ALWAYS_FAIL') {
            return { authId, settlementId: '', status: 'FAILED', failureReason: 'Settlement failed (simulated)' };
        }
        if (this.mode === 'RANDOM_FAIL' && Math.random() < this.failRate) {
            return { authId, settlementId: '', status: 'FAILED', failureReason: 'Gateway timeout (simulated)' };
        }
        return {
            authId,
            settlementId: `stl_${Date.now()}_${Math.random().toString(16).slice(2)}`,
            status: 'SETTLED',
        };
    }
}
