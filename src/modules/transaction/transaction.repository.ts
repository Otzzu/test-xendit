import { Transaction } from './transaction.entity';

export class TransactionRepository {
  private transactions: Transaction[] = [];
  private idCounter = 1;

  save(input: Omit<Transaction, 'id'>): Transaction {
    const created: Transaction = { ...input, id: this.idCounter++ };
    this.transactions.push(created);
    return created;
  }

  findById(id: number): Transaction | undefined {
    return this.transactions.find((t) => t.id === id);
  }

  update(updated: Transaction): void {
    const idx = this.transactions.findIndex((t) => t.id === updated.id);
    if (idx !== -1) this.transactions[idx] = updated;
  }

  clear(): void {
    this.transactions = [];
    this.idCounter = 1;
  }
}
