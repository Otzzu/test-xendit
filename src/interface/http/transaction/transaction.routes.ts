import { Router } from 'express';
import { TransactionController } from './transaction.controller';
import { InMemoryTransactionRepository } from '../../../infrastructure/persistance/transaction.repository.memory';
import { TransactionService } from '../../../modules/transaction/transaction.service';
import { InMemoryAccountRepository } from '../../../infrastructure/persistance/account.repository.memory';
import { AccountService } from '../../../modules/account/account.service';
import { CyberSourceSimulator } from '../../../infrastructure/gateways/cybersource.simulator';
import { asyncHandler } from '../../../shared/utils/async-handler';

export function buildTransactionRouter(): Router {
    const router = Router();
    const txRepo = new InMemoryTransactionRepository();
    const accountRepo = new InMemoryAccountRepository();
    const accountService = new AccountService(accountRepo);
    const gateway = new CyberSourceSimulator(3000, 'ALWAYS_OK');
    const service = new TransactionService(txRepo, gateway, accountService);
    const controller = new TransactionController(service);

    router.get('/:id', asyncHandler(controller.getTransaction));

    return router;
}
