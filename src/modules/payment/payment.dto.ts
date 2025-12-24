export interface CreatePaymentRequest {
  accountId: number;
  amount: number;
  // card info fields could be added here later as needed
}

export function validateCreatePaymentRequest(body: any): CreatePaymentRequest {
  const accountId = Number(body?.accountId);
  const amount = Number(body?.amount);

  if (!Number.isFinite(accountId) || accountId <= 0) {
    throw new Error('accountId must be a positive number');
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('amount must be a positive number');
  }

  return { accountId, amount };
}
