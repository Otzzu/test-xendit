import app from './app';
import { startCreditBalanceWorker } from './infrastructure/queue';
import { getAccountService } from './modules';

const PORT = process.env.PORT || 3000;

startCreditBalanceWorker(getAccountService());

app.listen(PORT, () => {
  console.log(`Transaction Processor running on port ${PORT}`);
});
