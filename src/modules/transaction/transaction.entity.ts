export type TransactionStatus = 'PENDING' | 'AUTHORIZED' | 'SETTLED' | 'FAILED';

export interface Transaction {
  id: number;
  accountId: number;
  amount: number;
  status: TransactionStatus;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string

  authId?: string;
  settlementId?: string;
  failureReason?: string;
}
