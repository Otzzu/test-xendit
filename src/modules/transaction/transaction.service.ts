import { HttpError } from '../../shared/errors/http-error';
import { AccountService } from '../account/account.service';
import { CyberSourceSimulator, WebhookPayload } from '../../infrastructure/gateways/cybersource.simulator';
import { Transaction } from './transaction.entity';
import { TransactionRepository } from './transaction.repository';
import { queueCreditBalance } from '../../infrastructure/queue';
import { logger } from '../../shared/utils/logger';

export class TransactionService {
  constructor(
    private readonly repo: TransactionRepository,
    private readonly gateway: CyberSourceSimulator,
    private readonly accountService: AccountService
  ) { }

  async authorizeTransaction(accountId: number, amount: number): Promise<Transaction> {
    await this.accountService.getAccount(accountId);
    const { authId } = this.gateway.authorize(accountId, amount);

    const now = new Date().toISOString();
    const tx = await this.repo.save({
      accountId,
      amount,
      status: 'AUTHORIZED',
      authId,
      createdAt: now,
      updatedAt: now,
    });

    logger.info('Transaction authorized', { transactionId: tx.id, accountId, amount, authId });
    return tx;
  }

  async handleSettlementWebhook(payload: WebhookPayload): Promise<void> {
    const tx = await this.repo.findByAuthId(payload.authId);
    if (!tx) {
      logger.warn('Transaction not found for webhook', { authId: payload.authId });
      return;
    }

    if (tx.status === 'SETTLED' || tx.status === 'FAILED') {
      logger.info('Transaction already processed, skipping', { transactionId: tx.id, status: tx.status });
      return;
    }

    const now = new Date().toISOString();

    if (payload.status === 'SETTLED') {
      tx.status = 'SETTLED';
      tx.settlementId = payload.settlementId;
      tx.updatedAt = now;
      await this.repo.update(tx);
      await queueCreditBalance(tx.accountId, tx.amount);
      logger.info('Transaction settled', { transactionId: tx.id, settlementId: payload.settlementId });
    } else {
      tx.status = 'FAILED';
      tx.failureReason = payload.failureReason || 'Settlement failed';
      tx.updatedAt = now;
      await this.repo.update(tx);
      logger.warn('Transaction failed', { transactionId: tx.id, reason: tx.failureReason });
    }
  }

  async getTransaction(id: number): Promise<Transaction> {
    const tx = await this.repo.findById(id);
    if (!tx) throw new HttpError(404, 'NOT_FOUND', 'Transaction not found');
    return tx;
  }
}
