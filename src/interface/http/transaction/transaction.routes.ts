import { Router } from 'express';
import { TransactionController } from './transaction.controller';
import { createAccountRepository, createTransactionRepository } from '../../../infrastructure/persistance';
import { TransactionService } from '../../../modules/transaction/transaction.service';
import { AccountService } from '../../../modules/account/account.service';
import { CyberSourceSimulator } from '../../../infrastructure/gateways/cybersource.simulator';
import { asyncHandler } from '../../../shared/utils/async-handler';

export function buildTransactionRouter(): Router {
    const router = Router();
    const txRepo = createTransactionRepository();
    const accountRepo = createAccountRepository();
    const accountService = new AccountService(accountRepo);
    const gateway = new CyberSourceSimulator(3000, 'ALWAYS_OK');
    const service = new TransactionService(txRepo, gateway, accountService);
    const controller = new TransactionController(service);

    router.get('/:id', asyncHandler(controller.getTransaction));

    return router;
}
