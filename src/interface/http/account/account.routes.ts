import { Router } from 'express';
import { AccountController } from './account.controller';
import { InMemoryAccountRepository } from '../../../infrastructure/persistance/account.repository.memory';
import { AccountService } from '../../../modules/account/account.service';
import { asyncHandler } from '../../../shared/utils/async-handler';

export function buildAccountRouter(): Router {
    const router = Router();
    const repo = new InMemoryAccountRepository();
    const service = new AccountService(repo);
    const controller = new AccountController(service);

    router.get('/:id', asyncHandler(controller.getAccount));

    return router;
}
