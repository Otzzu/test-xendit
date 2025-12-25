import { Router } from 'express';
import { TransactionRepository } from '../transaction/transaction.repository';
import { TransactionService } from '../transaction/transaction.service';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { asyncHandler } from '../../shared/utils/async-handler';

export function buildPaymentRouter(): Router {
  const router = Router();

  const txRepo = new TransactionRepository();
  const txService = new TransactionService(txRepo);
  const paymentService = new PaymentService(txService);
  const controller = new PaymentController(paymentService);

  router.post('/payments', asyncHandler(controller.createPayment));

  return router;
}
