import { Account } from './account.entity';

export interface AccountRepository {
  getOrCreate(accountId: number): Account;
  credit(accountId: number, amount: number): Account;
}
