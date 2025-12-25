import { Account } from '../../modules/account/account.entity';
import { Transaction } from '../../modules/transaction/transaction.entity';

class MemoryDB {
    private static instance: MemoryDB;

    public transactions: Transaction[] = [];
    public transactionIdCounter = 1;
    public accounts: Map<number, Account> = new Map();

    private constructor() { }

    public static getInstance(): MemoryDB {
        if (!MemoryDB.instance) {
            MemoryDB.instance = new MemoryDB();
        }
        return MemoryDB.instance;
    }

    public clear(): void {
        this.transactions = [];
        this.transactionIdCounter = 1;
        this.accounts.clear();
        console.log('In-memory DB cleared');
    }
}

export const db = MemoryDB.getInstance();
