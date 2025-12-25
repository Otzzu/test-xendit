import { Transaction } from './transaction.entity';

export interface TransactionRepository {
  save(input: Omit<Transaction, 'id'>): Transaction;
  findById(id: number): Transaction | undefined;
  update(updated: Transaction): void;
}
