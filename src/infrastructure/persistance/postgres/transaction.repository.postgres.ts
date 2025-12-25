import { PrismaClient } from '../../../generated/prisma/client';
import { Transaction } from '../../../modules/transaction/transaction.entity';
import { TransactionRepository } from '../../../modules/transaction/transaction.repository';

function toTx(row: any): Transaction {
  return {
    id: row.id,
    accountId: row.accountId,
    amount: row.amount,
    status: row.status,
    authId: row.authId ?? undefined,
    settlementId: row.settlementId ?? undefined,
    failureReason: row.failureReason ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class PostgresTransactionRepository implements TransactionRepository {
  constructor(private readonly db: PrismaClient) { }

  async save(input: Omit<Transaction, 'id'>): Promise<Transaction> {
    const row = await this.db.transaction.create({
      data: {
        accountId: input.accountId,
        amount: input.amount,
        status: input.status,
        authId: input.authId ?? null,
        settlementId: input.settlementId ?? null,
      },
    });
    return toTx(row);
  }

  async findById(id: number): Promise<Transaction | undefined> {
    const row = await this.db.transaction.findUnique({ where: { id } });
    return row ? toTx(row) : undefined;
  }

  async update(updated: Transaction): Promise<void> {
    await this.db.transaction.update({
      where: { id: updated.id },
      data: {
        status: updated.status,
        authId: updated.authId ?? null,
        settlementId: updated.settlementId ?? null,
        failureReason: updated.failureReason ?? null,
      },
    });
  }
}
