import { Account } from '../../../modules/account/account.entity';
import { PrismaClient } from '../../../generated/prisma/client';
import { AccountRepository } from '../../../modules/account/account.repository';

function toAccount(row: any): Account {
  return {
    id: row.id,
    balance: row.balance,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class PostgresAccountRepository implements AccountRepository {
  constructor(private readonly db: PrismaClient) { }

  async getOrCreate(accountId: number): Promise<Account> {
    const row = await this.db.account.upsert({
      where: { id: accountId },
      update: {},
      create: { id: accountId, balance: 0 },
    });
    return toAccount(row);
  }

  async credit(accountId: number, amount: number): Promise<Account> {
    // Ensure exists then credit atomically
    await this.db.account.upsert({
      where: { id: accountId },
      update: {},
      create: { id: accountId, balance: 0 },
    });

    const row = await this.db.account.update({
      where: { id: accountId },
      data: { balance: { increment: amount } },
    });

    return toAccount(row);
  }
}
