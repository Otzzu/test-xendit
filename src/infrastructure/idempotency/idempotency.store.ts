export interface IdempotencyRecord {
    response: {
        statusCode: number;
        body: unknown;
    };
    createdAt: Date;
}

export interface IdempotencyStore {
    get(key: string): Promise<IdempotencyRecord | undefined>;
    set(key: string, record: IdempotencyRecord, ttlMs?: number): Promise<void>;
}

const store = new Map<string, IdempotencyRecord>();
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export class InMemoryIdempotencyStore implements IdempotencyStore {
    async get(key: string): Promise<IdempotencyRecord | undefined> {
        const record = store.get(key);
        if (!record) return undefined;

        if (Date.now() - record.createdAt.getTime() > DEFAULT_TTL_MS) {
            store.delete(key);
            return undefined;
        }
        return record;
    }

    async set(key: string, record: IdempotencyRecord): Promise<void> {
        store.set(key, record);
    }

    clear(): void {
        store.clear();
    }
}

let idempotencyStore: IdempotencyStore = new InMemoryIdempotencyStore();

export function getIdempotencyStore(): IdempotencyStore {
    return idempotencyStore;
}

export function setIdempotencyStore(store: IdempotencyStore): void {
    idempotencyStore = store;
}
