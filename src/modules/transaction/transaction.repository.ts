import { Transaction } from './transaction.entity';

export interface TransactionRepository {
    save(input: Omit<Transaction, 'id'>): Promise<Transaction>;
    findById(id: number): Promise<Transaction | undefined>;
    findByAuthId(authId: string): Promise<Transaction | undefined>;
    update(updated: Transaction): Promise<void>;
}

