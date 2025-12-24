import { HttpError } from '../../shared/errors/http-error';

export interface CreatePaymentRequest {
  accountId: number;
  amount: number;
}

export function validateCreatePaymentRequest(body: unknown): CreatePaymentRequest {
  if (typeof body !== 'object' || body === null) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Invalid request payload', {
      error: 'Body must be an object',
    });
  }

  const { accountId: rawAccountId, amount: rawAmount } = body as Record<string, unknown>;

  const accountId = Number(rawAccountId);
  const amount = Number(rawAmount);

  const details: Record<string, string> = {};

  if (!Number.isFinite(accountId) || accountId <= 0) {
    details['accountId'] = 'must be a positive number';
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    details['amount'] = 'must be a positive number';
  }

  if (Object.keys(details).length > 0) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Invalid request payload', details);
  }

  return { accountId, amount };
}
