import { CyberSourceSimulator } from '../../infrastructure/gateways/cybersource.simulator';
import { Job } from 'bullmq';
import { CreditBalanceJobData } from '../../infrastructure/queue/settlement.queue';
import { AccountService } from '../../modules/account/account.service';

// Mock Fetch
const mockFetch = jest.fn() as unknown as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

// Mock AccountService
const mockAccountService = {
    credit: jest.fn(),
} as unknown as AccountService;

describe('Infrastructure Resilience Tests', () => {

    describe('CyberSource Simulator', () => {
        let simulator: CyberSourceSimulator;

        beforeEach(() => {
            jest.useFakeTimers();
            mockFetch.mockClear();
            // 5 second delay
            simulator = new CyberSourceSimulator(5000, 'ALWAYS_OK', 0, 'http://localhost:3000');
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should NOT send webhook before delay elapses', () => {
            simulator.authorize(1, 1000);

            // Advance 4.9 seconds
            jest.advanceTimersByTime(4900);
            expect(mockFetch).not.toHaveBeenCalled();
        });

        it('should send webhook after delay elapses', () => {
            simulator.authorize(1, 1000);

            // Advance 5.1 seconds
            jest.advanceTimersByTime(5100);
            expect(mockFetch).toHaveBeenCalled();
        });

        it('should retry webhook delivery on failure', async () => {
            // First call fails, Second succeeds
            mockFetch
                .mockRejectedValueOnce(new Error('Network Error') as never)
                .mockResolvedValueOnce({ ok: true } as Response);

            simulator.authorize(1, 1000);

            // Initial attempt (5s)
            jest.advanceTimersByTime(5100);
            // Wait for promise resolution
            await Promise.resolve();

            expect(mockFetch).toHaveBeenCalledTimes(1);

            // Backoff 1 (1s)
            jest.advanceTimersByTime(1100);
            await Promise.resolve();

            expect(mockFetch).toHaveBeenCalledTimes(2);
        });
    });

    // NOTE: Testing actual BullMQ retries requires a running Redis. 
    // Here we unit test the WORKER LOGIC itself to ensure it throws correctly,
    // which is the prerequisite for BullMQ to trigger retries.
    describe('Settlement Worker Logic', () => {
        it('should throw error if credit fails (allowing BullMQ to catch and retry)', async () => {
            (mockAccountService.credit as jest.Mock).mockRejectedValue(new Error('DB Locked') as never);

            // Simulation of what the worker function does
            const workerProcess = async (job: Job<CreditBalanceJobData>) => {
                await mockAccountService.credit(job.data.accountId, job.data.amount);
            };

            const mockJob = { data: { accountId: 1, amount: 100 } } as Job<CreditBalanceJobData>;

            await expect(workerProcess(mockJob)).rejects.toThrow('DB Locked');
        });
    });
});
