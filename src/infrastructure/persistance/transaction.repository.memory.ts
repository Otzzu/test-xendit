import { Transaction } from '../../modules/transaction/transaction.entity';
import { TransactionRepository } from '../../modules/transaction/transaction.repository';

import { db } from './memory-db';

export class InMemoryTransactionRepository implements TransactionRepository {
  save(input: Omit<Transaction, 'id'>): Transaction {
    const created: Transaction = { ...input, id: db.transactionIdCounter++ };
    db.transactions.push(created);
    return created;
  }

  findById(id: number): Transaction | undefined {
    return db.transactions.find((t) => t.id === id);
  }

  update(updated: Transaction): void {
    const idx = db.transactions.findIndex((t) => t.id === updated.id);
    if (idx !== -1) db.transactions[idx] = updated;
  }

  clear(): void {
    db.clear();
  }
}
