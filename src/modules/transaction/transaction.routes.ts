import { Router } from 'express';
import { TransactionController } from './transaction.controller';
import { TransactionRepository } from './transaction.repository';
import { TransactionService } from './transaction.service';
import { AccountRepository } from '../account/account.repository';
import { AccountService } from '../account/account.service';
import { CyberSourceSimulator } from '../cybersource/cybersource.simulator';
import { asyncHandler } from '../../shared/utils/async-handler';

export function buildTransactionRouter(): Router {
    const router = Router();
    const txRepo = new TransactionRepository();
    const accountRepo = new AccountRepository();
    const accountService = new AccountService(accountRepo);
    const gateway = new CyberSourceSimulator(3000, 'ALWAYS_OK');
    const service = new TransactionService(txRepo, gateway, accountService);
    const controller = new TransactionController(service);

    router.get('/:id', asyncHandler(controller.getTransaction));

    return router;
}
