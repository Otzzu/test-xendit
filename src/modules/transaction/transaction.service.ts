import { HttpError } from '../../shared/errors/http-error';
import { AccountService } from '../account/account.service';
import { CyberSourceSimulator } from '../../infrastructure/gateways/cybersource.simulator';
import { Transaction } from './transaction.entity';
import { TransactionRepository } from './transaction.repository';

export class TransactionService {
  constructor(
    private readonly repo: TransactionRepository,
    private readonly gateway: CyberSourceSimulator,
    private readonly accountService: AccountService
  ) { }

  authorizeTransaction(accountId: number, amount: number): Transaction {
    const { authId } = this.gateway.authorize(accountId, amount);

    const now = new Date().toISOString();
    return this.repo.save({
      accountId,
      amount,
      status: 'AUTHORIZED',
      authId,
      createdAt: now,
      updatedAt: now,
    });
  }

  async settleTransaction(transactionId: number): Promise<void> {
    const tx = this.repo.findById(transactionId);
    if (!tx) {
      throw new HttpError(404, 'NOT_FOUND', 'Transaction not found');
    }

    if (tx.status === 'SETTLED' || tx.status === 'FAILED') {
      return; // no-op (idempotent)
    }

    if (!tx.authId) {
      throw new HttpError(
        409,
        'INVALID_TRANSACTION_STATE',
        'Missing auth reference for settlement'
      );
    }

    try {
      const { settlementId } = await this.gateway.settle(tx.authId);

      const now = new Date().toISOString();
      tx.status = 'SETTLED';
      tx.settlementId = settlementId;
      tx.updatedAt = now;
      this.repo.update(tx);

      void this.accountService.creditAfterSettlement(tx.accountId, tx.amount);
    } catch (err: unknown) {
      const now = new Date().toISOString();
      tx.status = 'FAILED';

      let message = 'Settlement failed';
      if (err instanceof Error) message = err.message;
      else if (err instanceof HttpError) message = err.message;
      else if (typeof err === 'string') message = err;

      tx.failureReason = message;
      tx.updatedAt = now;
      this.repo.update(tx);

      // For background processing, we log and swallow.
      console.error('Settlement error', { transactionId, err });
    }
  }

  getTransaction(id: number): Transaction {
    const tx = this.repo.findById(id);
    if (!tx) throw new HttpError(404, 'NOT_FOUND', 'Transaction not found');
    return tx;
  }
}
