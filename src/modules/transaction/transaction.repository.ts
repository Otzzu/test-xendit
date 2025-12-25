import { Transaction } from './transaction.entity';

import { db } from '../../shared/db/memory-db';

export class TransactionRepository {
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
