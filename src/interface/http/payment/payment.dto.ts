import { HttpError } from '../../../shared/errors/http-error';

export interface CardInfo {
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
}

export interface CreatePaymentRequest {
  accountId: number;
  amount: number;
  cardInfo: CardInfo;
}

export function validateCreatePaymentRequest(body: unknown): CreatePaymentRequest {
  if (typeof body !== 'object' || body === null) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Invalid request payload', {
      error: 'Body must be an object',
    });
  }

  const { accountId: rawAccountId, amount: rawAmount, cardInfo } = body as Record<string, unknown>;

  const accountId = Number(rawAccountId);
  const amount = Number(rawAmount);

  const details: Record<string, string> = {};

  if (!Number.isFinite(accountId) || accountId <= 0) {
    details['accountId'] = 'must be a positive number';
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    details['amount'] = 'must be a positive number';
  }

  if (!cardInfo || typeof cardInfo !== 'object') {
    details['cardInfo'] = 'is required';
  } else {
    const card = cardInfo as Record<string, unknown>;
    if (!card.cardNumber || typeof card.cardNumber !== 'string') {
      details['cardInfo.cardNumber'] = 'is required';
    }
    if (!card.expiryMonth || typeof card.expiryMonth !== 'string') {
      details['cardInfo.expiryMonth'] = 'is required';
    }
    if (!card.expiryYear || typeof card.expiryYear !== 'string') {
      details['cardInfo.expiryYear'] = 'is required';
    }
    if (!card.cvv || typeof card.cvv !== 'string') {
      details['cardInfo.cvv'] = 'is required';
    }
  }

  if (Object.keys(details).length > 0) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Invalid request payload', details);
  }

  return {
    accountId,
    amount,
    cardInfo: cardInfo as CardInfo,
  };
}
