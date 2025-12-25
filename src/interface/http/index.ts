import { Router } from 'express';
import { buildPaymentRouter } from './payment/payment.routes';
import { buildTransactionRouter } from './transaction/transaction.routes';
import { buildAccountRouter } from './account/account.routes';

export function buildHttpRouter(): Router {
    const router = Router();

    router.use(buildPaymentRouter());
    router.use('/transactions', buildTransactionRouter());
    router.use('/accounts', buildAccountRouter());

    return router;
}
