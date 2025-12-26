import { Request, Response } from 'express';
import { TransactionService } from '../../../modules/transaction/transaction.service';
import { WebhookPayload } from '../../../infrastructure/gateways/cybersource.simulator';
import { logger } from '../../../shared/utils/logger';

export class WebhookController {
    constructor(private readonly txService: TransactionService) { }

    handleSettlement = async (req: Request, res: Response) => {
        const payload = req.body as WebhookPayload;

        if (!payload.authId) {
            return res.status(400).json({ error: 'Missing authId' });
        }

        logger.info('Webhook received', { authId: payload.authId, status: payload.status });

        try {
            await this.txService.handleSettlementWebhook(payload);
            return res.status(200).json({ received: true });
        } catch (err) {
            logger.error('Webhook processing failed', { authId: payload.authId, error: (err as Error).message });
            return res.status(500).json({ error: 'Failed to process webhook' });
        }
    };
}
