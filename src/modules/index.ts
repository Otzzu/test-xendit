// Centralized service registry for dependency injection
// This allows worker and routes to share the same service instances

import { createAccountRepository, createTransactionRepository } from '../infrastructure/persistance';
import { AccountService } from './account/account.service';
import { TransactionService } from './transaction/transaction.service';
import { CyberSourceSimulator } from '../infrastructure/gateways/cybersource.simulator';
import { PaymentService } from './payment/payment.service';

// Singleton instances
let accountService: AccountService | null = null;
let transactionService: TransactionService | null = null;
let paymentService: PaymentService | null = null;

export function getAccountService(): AccountService {
    if (!accountService) {
        const accountRepo = createAccountRepository();
        accountService = new AccountService(accountRepo);
    }
    return accountService;
}

export function getTransactionService(): TransactionService {
    if (!transactionService) {
        const txRepo = createTransactionRepository();
        const gateway = new CyberSourceSimulator(3000, 'ALWAYS_OK');
        transactionService = new TransactionService(txRepo, gateway, getAccountService());
    }
    return transactionService;
}

export function getPaymentService(): PaymentService {
    if (!paymentService) {
        paymentService = new PaymentService(getTransactionService());
    }
    return paymentService;
}
