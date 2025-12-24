import { Transaction, TransactionStatus } from './transaction.entity';
import { TransactionRepository } from './transaction.repository';

export class TransactionService {
  constructor(private readonly repo: TransactionRepository) {}

  authorizeTransaction(accountId: number, amount: number): Transaction {
    const now = new Date().toISOString();

    const status: TransactionStatus = 'AUTHORIZED';

    return this.repo.save({
      accountId,
      amount,
      status,
      createdAt: now,
      updatedAt: now,
    });
  }
}
