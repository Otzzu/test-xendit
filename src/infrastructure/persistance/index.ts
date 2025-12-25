import { AccountRepository } from '../../modules/account/account.repository';
import { TransactionRepository } from '../../modules/transaction/transaction.repository';

import { InMemoryAccountRepository } from './memory/account.repository.memory';
import { InMemoryTransactionRepository } from './memory/transaction.repository.memory';
import { PostgresAccountRepository } from './postgres/account.repository.postgres';
import { PostgresTransactionRepository } from './postgres/transaction.repository.postgres';
import { prisma } from './postgres/prisma';

const USE_POSTGRES = process.env.USE_POSTGRES === 'true';

export function createAccountRepository(): AccountRepository {
    if (USE_POSTGRES) {
        return new PostgresAccountRepository(prisma);
    }
    return new InMemoryAccountRepository();
}

export function createTransactionRepository(): TransactionRepository {
    if (USE_POSTGRES) {
        return new PostgresTransactionRepository(prisma);
    }
    return new InMemoryTransactionRepository();
}
