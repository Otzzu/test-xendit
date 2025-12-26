import { Request, Response } from 'express';
import { PaymentController } from '../../interface/http/payment/payment.controller';
import { PaymentService } from '../../modules/payment/payment.service';
import { InMemoryIdempotencyStore, setIdempotencyStore } from '../../infrastructure/idempotency';

const mockPaymentService = {
    createPayment: jest.fn(),
} as unknown as PaymentService;

const validBody = {
    accountId: 1,
    amount: 1000,
    cardInfo: {
        cardNumber: '4111111111111111',
        expiryMonth: '12',
        expiryYear: '2025',
        cvv: '123',
    },
};

describe('PaymentController - Idempotency', () => {
    let controller: PaymentController;
    let store: InMemoryIdempotencyStore;
    let mockRes: Partial<Response>;

    beforeEach(() => {
        store = new InMemoryIdempotencyStore();
        setIdempotencyStore(store);
        store.clear();

        controller = new PaymentController(mockPaymentService);

        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };

        jest.clearAllMocks();
    });

    it('processes payment without idempotency key', async () => {
        const mockTx = { id: 1, accountId: 1, amount: 1000, status: 'AUTHORIZED' };
        (mockPaymentService.createPayment as jest.Mock).mockResolvedValue(mockTx);

        const req = { headers: {}, body: validBody } as Request;
        await controller.createPayment(req, mockRes as Response);

        expect(mockPaymentService.createPayment).toHaveBeenCalledWith(1, 1000);
        expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('returns cached response for duplicate idempotency key', async () => {
        const mockTx = { id: 1, accountId: 1, amount: 1000, status: 'AUTHORIZED' };
        (mockPaymentService.createPayment as jest.Mock).mockResolvedValue(mockTx);

        const req1 = {
            headers: { 'x-idempotency-key': 'test-key-123' },
            body: validBody,
        } as unknown as Request;

        await controller.createPayment(req1, mockRes as Response);
        expect(mockPaymentService.createPayment).toHaveBeenCalledTimes(1);

        const req2 = {
            headers: { 'x-idempotency-key': 'test-key-123' },
            body: validBody,
        } as unknown as Request;

        await controller.createPayment(req2, mockRes as Response);
        expect(mockPaymentService.createPayment).toHaveBeenCalledTimes(1); // Still 1, not 2
    });

    it('processes different idempotency keys separately', async () => {
        const mockTx1 = { id: 1, accountId: 1, amount: 1000, status: 'AUTHORIZED' };
        const mockTx2 = { id: 2, accountId: 2, amount: 2000, status: 'AUTHORIZED' };
        (mockPaymentService.createPayment as jest.Mock)
            .mockResolvedValueOnce(mockTx1)
            .mockResolvedValueOnce(mockTx2);

        const req1 = {
            headers: { 'x-idempotency-key': 'key-1' },
            body: validBody,
        } as unknown as Request;

        const req2 = {
            headers: { 'x-idempotency-key': 'key-2' },
            body: { ...validBody, accountId: 2, amount: 2000 },
        } as unknown as Request;

        await controller.createPayment(req1, mockRes as Response);
        await controller.createPayment(req2, mockRes as Response);

        expect(mockPaymentService.createPayment).toHaveBeenCalledTimes(2);
    });
});
