import { Router } from 'express';
import { TransactionRepository } from '../transaction/transaction.repository';
import { TransactionService } from '../transaction/transaction.service';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { asyncHandler } from '../../shared/utils/async-handler';
import { CyberSourceSimulator } from '../cybersource/cybersource.simulator';
import { AccountRepository } from '../account/account.repository';
import { AccountService } from '../account/account.service';

export function buildPaymentRouter(): Router {
  const router = Router();

  const accountRepo = new AccountRepository();
  const accountService = new AccountService(accountRepo);

  const txRepo = new TransactionRepository();
  const gateway = new CyberSourceSimulator(3000, 'ALWAYS_OK');
  const txService = new TransactionService(txRepo, gateway, accountService);


  const paymentService = new PaymentService(txService);
  const controller = new PaymentController(paymentService);

  router.post('/payments', asyncHandler(controller.createPayment));


  return router;
}
