import { Router } from 'express';
import { AccountController } from './account.controller';
import { AccountRepository } from './account.repository';
import { AccountService } from './account.service';
import { asyncHandler } from '../../shared/utils/async-handler';

export function buildAccountRouter(): Router {
    const router = Router();
    const repo = new AccountRepository();
    const service = new AccountService(repo);
    const controller = new AccountController(service);

    router.get('/:id', asyncHandler(controller.getAccount));

    return router;
}
