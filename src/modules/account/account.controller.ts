import { Request, Response } from 'express';
import { AccountService } from './account.service';

export class AccountController {
    constructor(private readonly service: AccountService) { }

    getAccount = async (req: Request, res: Response) => {
        const id = Number(req.params.id);
        const acc = this.service.getAccount(id);
        return res.json({ message: 'OK', data: acc });
    };
}
