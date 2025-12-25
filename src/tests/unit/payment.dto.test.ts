import { validateCreatePaymentRequest } from '../../interface/http/payment/payment.dto';
import { HttpError } from '../../shared/errors/http-error';

describe('validateCreatePaymentRequest', () => {
  it('parses valid body', () => {
    const out = validateCreatePaymentRequest({ accountId: 1, amount: 1000 });
    expect(out).toEqual({ accountId: 1, amount: 1000 });
  });

  it('throws 400 for invalid accountId', () => {
    expect(() => validateCreatePaymentRequest({ accountId: 0, amount: 1000 })).toThrow(HttpError);
    try {
      validateCreatePaymentRequest({ accountId: 0, amount: 1000 });
    } catch (e: any) {
      expect(e.statusCode).toBe(400);
    }
  });

  it('throws 400 for invalid amount', () => {
    expect(() => validateCreatePaymentRequest({ accountId: 1, amount: 0 })).toThrow(HttpError);
    try {
      validateCreatePaymentRequest({ accountId: 1, amount: 0 });
    } catch (e: any) {
      expect(e.statusCode).toBe(400);
    }
  });

  it('coerces string numbers', () => {
    const out = validateCreatePaymentRequest({ accountId: '2', amount: '5000' });
    expect(out).toEqual({ accountId: 2, amount: 5000 });
  });
});
