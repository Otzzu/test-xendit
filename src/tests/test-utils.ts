export async function flushMicrotasks(): Promise<void> {
    // Flush all pending timers and their resulting promises
    await jest.runAllTimersAsync();
}
