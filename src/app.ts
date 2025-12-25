import express from 'express';
import { errorHandler } from './shared/errors/error-handler';

import { buildHttpRouter } from './interface/http';

const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});

// API routes
app.use('/api', buildHttpRouter());

app.use(errorHandler);

export default app;
