import express from 'express';
import { errorHandler } from './shared/errors/error-handler';
import { buildHttpRouter } from './interface/http';
import { buildWebhookRouter } from './interface/http/webhook/webhook.routes';

const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});

app.use('/api', buildHttpRouter());
app.use('/webhooks', buildWebhookRouter());
app.use(errorHandler);

export default app;
