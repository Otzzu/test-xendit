import { Request, Response } from 'express';
import { PaymentService } from '../../../modules/payment/payment.service';
import { validateCreatePaymentRequest } from './payment.dto';

export class PaymentController {
  constructor(private readonly paymentService: PaymentService) { }

  createPayment = async (req: Request, res: Response) => {
    const { accountId, amount } = validateCreatePaymentRequest(req.body);
    const tx = await this.paymentService.createPayment(accountId, amount);
    return res.status(201).json({
      message: 'Payment authorized successfully',
      data: tx,
    });
  };
}
