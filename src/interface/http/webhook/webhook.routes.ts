import { Router } from 'express';
import { getTransactionService } from '../../../modules';
import { asyncHandler } from '../../../shared/utils/async-handler';
import { WebhookController } from './webhook.controller';

export function buildWebhookRouter(): Router {
    const router = Router();

    const txService = getTransactionService();
    const controller = new WebhookController(txService);

    // CyberSource settlement webhook
    router.post('/cybersource/settlement', asyncHandler(controller.handleSettlement));

    return router;
}
