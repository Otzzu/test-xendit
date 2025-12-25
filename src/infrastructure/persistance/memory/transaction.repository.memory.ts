import { Transaction } from '../../../modules/transaction/transaction.entity';
import { TransactionRepository } from '../../../modules/transaction/transaction.repository';

import { db } from './memory-db';

export class InMemoryTransactionRepository implements TransactionRepository {
  async save(input: Omit<Transaction, 'id'>): Promise<Transaction> {
    const created: Transaction = { ...input, id: db.transactionIdCounter++ };
    db.transactions.push(created);
    return created;
  }

  async findById(id: number): Promise<Transaction | undefined> {
    return db.transactions.find((t) => t.id === id);
  }

  async update(updated: Transaction): Promise<void> {
    const idx = db.transactions.findIndex((t) => t.id === updated.id);
    if (idx !== -1) db.transactions[idx] = updated;
  }

  clear(): void {
    db.clear();
  }
}
