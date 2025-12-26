import { HttpError } from '../../shared/errors/http-error';
import { AccountService } from '../account/account.service';
import { CyberSourceSimulator, WebhookPayload } from '../../infrastructure/gateways/cybersource.simulator';
import { Transaction } from './transaction.entity';
import { TransactionRepository } from './transaction.repository';
import { queueCreditBalance } from '../../infrastructure/queue';

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
    return await this.repo.save({
      accountId,
      amount,
      status: 'AUTHORIZED',
      authId,
      createdAt: now,
      updatedAt: now,
    });
  }

  async handleSettlementWebhook(payload: WebhookPayload): Promise<void> {
    const tx = await this.repo.findByAuthId(payload.authId);
    if (!tx) {
      console.error(`[Webhook] Transaction not found for authId: ${payload.authId}`);
      return;
    }

    // Idempotency: skip if already processed
    if (tx.status === 'SETTLED' || tx.status === 'FAILED') {
      console.log(`[Webhook] Transaction ${tx.id} already ${tx.status}, ignoring`);
      return;
    }

    const now = new Date().toISOString();

    if (payload.status === 'SETTLED') {
      tx.status = 'SETTLED';
      tx.settlementId = payload.settlementId;
      tx.updatedAt = now;
      await this.repo.update(tx);
      await queueCreditBalance(tx.accountId, tx.amount);
      console.log(`[Webhook] Transaction ${tx.id} settled, balance update queued`);
    } else {
      tx.status = 'FAILED';
      tx.failureReason = payload.failureReason || 'Settlement failed';
      tx.updatedAt = now;
      await this.repo.update(tx);
      console.log(`[Webhook] Transaction ${tx.id} failed: ${tx.failureReason}`);
    }
  }

  async getTransaction(id: number): Promise<Transaction> {
    const tx = await this.repo.findById(id);
    if (!tx) throw new HttpError(404, 'NOT_FOUND', 'Transaction not found');
    return tx;
  }
}
