import { Request, Response } from 'express';
import { PaymentService } from './payment.service';
import { validateCreatePaymentRequest } from './payment.dto';

export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  createPayment = (req: Request, res: Response) => {
    try {
      const { accountId, amount } = validateCreatePaymentRequest(req.body);
      const tx = this.paymentService.createPayment(accountId, amount);
      return res.status(201).json(tx);
    } catch (err: any) {
      // basic 400 for validation errors
      return res.status(400).json({
        error: 'Bad Request',
        message: err?.message ?? 'Invalid input',
      });
    }
  };
}
