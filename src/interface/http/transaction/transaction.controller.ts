import { Request, Response } from 'express';
import { TransactionService } from '../../../modules/transaction/transaction.service';

export class TransactionController {
    constructor(private readonly service: TransactionService) { }

    getTransaction = async (req: Request, res: Response) => {
        const id = Number(req.params.id);
        const tx = await this.service.getTransaction(id);
        if (!tx) {
            return res.status(404).json({ message: 'Transaction not found' });
        }
        return res.json({ message: 'OK', data: tx });
    };
}
