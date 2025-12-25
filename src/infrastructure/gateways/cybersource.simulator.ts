import { HttpError } from '../../shared/errors/http-error';

export type GatewayMode = 'ALWAYS_OK' | 'ALWAYS_FAIL' | 'RANDOM_FAIL';

export interface AuthorizationResult {
    authId: string;
}

export interface SettlementResult {
    settlementId: string;
}


export class CyberSourceSimulator {
    constructor(
        private readonly settlementDelayMs: number = 20000,
        private readonly mode: GatewayMode = 'ALWAYS_OK',
        private readonly failRate: number = 0.1
    ) { }

    authorize(_accountId: number, _amount: number): AuthorizationResult {
        return { authId: `auth_${Date.now()}_${Math.random().toString(16).slice(2)}` };
    }

    async settle(authId: string): Promise<SettlementResult> {
        await new Promise((r) => setTimeout(r, this.settlementDelayMs));

        if (this.mode === 'ALWAYS_FAIL') {
            throw new HttpError(502, 'GATEWAY_ERROR', 'Settlement failed (simulated)', { authId });
        }

        if (this.mode === 'RANDOM_FAIL' && Math.random() < this.failRate) {
            throw new HttpError(504, 'GATEWAY_TIMEOUT', 'Gateway timeout (simulated)', { authId });
        }

        return { settlementId: `stl_${Date.now()}_${Math.random().toString(16).slice(2)}` };
    }
}
