import express from 'express';
import { buildPaymentRouter } from './modules/payment/payment.routes';

const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// API routes
app.use('/api', buildPaymentRouter());

export default app;
