import { Request, Response } from 'express';
import { TransactionService } from '../../../modules/transaction/transaction.service';
import { WebhookPayload } from '../../../infrastructure/gateways/cybersource.simulator';

export class WebhookController {
    constructor(private readonly txService: TransactionService) { }

    handleSettlement = async (req: Request, res: Response) => {
        const payload = req.body as WebhookPayload;

        if (!payload.authId) {
            return res.status(400).json({ error: 'Missing authId' });
        }

        console.log(`[Webhook] Received settlement for ${payload.authId}: ${payload.status}`);

        try {
            await this.txService.handleSettlementWebhook(payload);
            return res.status(200).json({ received: true });
        } catch (err) {
            console.error(`[Webhook] Error processing:`, err);
            return res.status(500).json({ error: 'Failed to process webhook' });
        }
    };
}
