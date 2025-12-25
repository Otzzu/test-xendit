import express from 'express';
import { buildPaymentRouter } from './modules/payment/payment.routes';
import { errorHandler } from './shared/errors/error-handler';

import { buildAccountRouter } from './modules/account/account.routes';
import { buildTransactionRouter } from './modules/transaction/transaction.routes';

const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});

// API routes
app.use('/api', buildPaymentRouter());
app.use('/api/transactions', buildTransactionRouter());
app.use('/api/accounts', buildAccountRouter());
app.use(errorHandler);

export default app;
