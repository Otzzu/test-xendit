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
        setTimeout(async () => {
            const payload = this.generateSettlementPayload(authId);
            try {
                const response = await fetch(this.webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                if (!response.ok) {
                    logger.error('CyberSource webhook failed', { authId, statusCode: response.status });
                } else {
                    logger.info('CyberSource webhook sent', { authId, status: payload.status });
                }
            } catch (err) {
                logger.error('CyberSource webhook error', { authId, error: (err as Error).message });
            }
        }, this.settlementDelayMs);
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
