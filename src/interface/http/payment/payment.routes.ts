import { Router } from 'express';
import { getPaymentService } from '../../../modules';
import { asyncHandler } from '../../../shared/utils/async-handler';
import { PaymentController } from './payment.controller';

export function buildPaymentRouter(): Router {
  const router = Router();

  const paymentService = getPaymentService();
  const controller = new PaymentController(paymentService);

  router.post('/payments', asyncHandler(controller.createPayment));

  return router;
}

