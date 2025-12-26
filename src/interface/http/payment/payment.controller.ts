import { Request, Response } from 'express';
import { PaymentService } from '../../../modules/payment/payment.service';
import { validateCreatePaymentRequest } from './payment.dto';
import { getIdempotencyStore } from '../../../infrastructure/idempotency';
import { HttpError } from '../../../shared/errors/http-error';

export class PaymentController {
  constructor(private readonly paymentService: PaymentService) { }

  createPayment = async (req: Request, res: Response) => {
    const idempotencyKey = req.headers['x-idempotency-key'] as string | undefined;

    if (idempotencyKey) {
      const store = getIdempotencyStore();
      const cached = await store.get(idempotencyKey);

      if (cached) {
        return res.status(cached.response.statusCode).json(cached.response.body);
      }
    }

    const { accountId, amount } = validateCreatePaymentRequest(req.body);
    const tx = await this.paymentService.createPayment(accountId, amount);

    const responseBody = {
      message: 'Payment authorized successfully',
      data: tx,
    };

    if (idempotencyKey) {
      const store = getIdempotencyStore();
      await store.set(idempotencyKey, {
        response: { statusCode: 201, body: responseBody },
        createdAt: new Date(),
      });
    }

    return res.status(201).json(responseBody);
  };
}
