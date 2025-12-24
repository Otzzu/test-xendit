import { Transaction } from '../transaction/transaction.entity';
import { TransactionService } from '../transaction/transaction.service';

export class PaymentService {
  constructor(private readonly txService: TransactionService) {}

  createPayment(accountId: number, amount: number): Transaction {
    return this.txService.authorizeTransaction(accountId, amount);
  }
}
