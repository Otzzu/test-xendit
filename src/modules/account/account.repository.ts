import { Account } from './account.entity';

export interface AccountRepository {
    getOrCreate(accountId: number): Promise<Account>;
    credit(accountId: number, amount: number): Promise<Account>;
}
