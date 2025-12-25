import { Router } from 'express';
import { InMemoryTransactionRepository } from '../../../infrastructure/persistance/transaction.repository.memory';
import { TransactionService } from '../../../modules/transaction/transaction.service';
import { PaymentService } from '../../../modules/payment/payment.service';
import { asyncHandler } from '../../../shared/utils/async-handler';
import { CyberSourceSimulator } from '../../../infrastructure/gateways/cybersource.simulator';
import { InMemoryAccountRepository } from '../../../infrastructure/persistance/account.repository.memory';
import { AccountService } from '../../../modules/account/account.service';
import { PaymentController } from './payment.controller';

export function buildPaymentRouter(): Router {
  const router = Router();

  const accountRepo = new InMemoryAccountRepository();
  const accountService = new AccountService(accountRepo);

  const txRepo = new InMemoryTransactionRepository();
  const gateway = new CyberSourceSimulator(3000, 'ALWAYS_OK');
  const txService = new TransactionService(txRepo, gateway, accountService);


  const paymentService = new PaymentService(txService);
  const controller = new PaymentController(paymentService);

  router.post('/payments', asyncHandler(controller.createPayment));


  return router;
}
