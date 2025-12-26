import app from './app';
import { startCreditBalanceWorker } from './infrastructure/queue';
import { getAccountService } from './modules';
import { logger } from './shared/utils/logger';

const PORT = process.env.PORT || 3000;

startCreditBalanceWorker(getAccountService());

app.listen(PORT, () => {
  logger.info('Server started', { port: PORT });
});
