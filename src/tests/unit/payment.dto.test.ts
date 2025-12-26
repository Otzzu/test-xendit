import { validateCreatePaymentRequest } from '../../interface/http/payment/payment.dto';
import { HttpError } from '../../shared/errors/http-error';

const validCardInfo = {
    cardNumber: '4111111111111111',
    expiryMonth: '12',
    expiryYear: '2025',
    cvv: '123',
};

describe('validateCreatePaymentRequest', () => {
    it('parses valid body', () => {
        const out = validateCreatePaymentRequest({ accountId: 1, amount: 1000, cardInfo: validCardInfo });
        expect(out).toEqual({ accountId: 1, amount: 1000, cardInfo: validCardInfo });
    });

    it('throws 400 for invalid accountId', () => {
        expect(() => validateCreatePaymentRequest({ accountId: 0, amount: 1000, cardInfo: validCardInfo })).toThrow(HttpError);
    });

    it('throws 400 for invalid amount', () => {
        expect(() => validateCreatePaymentRequest({ accountId: 1, amount: 0, cardInfo: validCardInfo })).toThrow(HttpError);
    });

    it('throws 400 for missing cardInfo', () => {
        expect(() => validateCreatePaymentRequest({ accountId: 1, amount: 1000 })).toThrow(HttpError);
    });

    it('throws 400 for incomplete cardInfo', () => {
        expect(() => validateCreatePaymentRequest({
            accountId: 1,
            amount: 1000,
            cardInfo: { cardNumber: '4111111111111111' }
        })).toThrow(HttpError);
    });

    it('coerces string numbers', () => {
        const out = validateCreatePaymentRequest({ accountId: '2', amount: '5000', cardInfo: validCardInfo });
        expect(out).toEqual({ accountId: 2, amount: 5000, cardInfo: validCardInfo });
    });
});
