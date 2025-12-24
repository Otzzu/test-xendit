export type TransactionStatus = 'PENDING' | 'AUTHORIZED' | 'SETTLED';

export interface Transaction {
  id: number;
  accountId: number;
  amount: number;
  status: TransactionStatus;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}
