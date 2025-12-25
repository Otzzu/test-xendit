import { Router } from 'express';
import { AccountController } from './account.controller';
import { createAccountRepository } from '../../../infrastructure/persistance';
import { AccountService } from '../../../modules/account/account.service';
import { asyncHandler } from '../../../shared/utils/async-handler';

export function buildAccountRouter(): Router {
    const router = Router();
    const repo = createAccountRepository();
    const service = new AccountService(repo);
    const controller = new AccountController(service);

    router.get('/:id', asyncHandler(controller.getAccount));

    return router;
}
