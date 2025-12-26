# Transaction Processor

A Node.js + TypeScript payment processing service that simulates CyberSource integration with async settlement via webhooks and queue-based balance updates.

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local development)

### Run with Docker (Recommended)
```bash
# 1. Create .env file
cp .env.example .env

# 2. Start all services (PostgreSQL, Redis, App)
# App will be accessible at http://localhost:3000 (default)
docker-compose up -d

# 3. View logs
docker-compose logs -f app

# Stop
docker-compose down -v
```
> [!NOTE]  
> When running with Docker (PostgreSQL), the database is **auto-seeded with 3 demo accounts** (IDs: `1`, `2`, `3`) initialized with `0` balance. Use these IDs for testing.

### Run Locally
```bash
npm install
npm run build
npm start
```

## API Endpoints

### Create Payment
```bash
POST /api/payments
Content-Type: application/json
X-Idempotency-Key: <optional-unique-key>

{
  "accountId": 1,
  "amount": 1000,
  "cardInfo": {
    "cardNumber": "4111111111111111",
    "expiryMonth": "12",
    "expiryYear": "2025",
    "cvv": "123"
  }
}
```

### Get Transaction
```bash
GET /api/transactions/:id
```

### Get Account Balance
```bash
GET /api/accounts/:id
```

### Health Check
```bash
GET /health
```

## Running Tests

### Run with Docker (Recommended)
```bash
# Option 1: Run standard tests (Unit + In-Memory)
docker-compose run --rm tests

# Option 2: Run FULL tests including PostgreSQL Integration
# Note: Requires USE_POSTGRES=true. This command starts DB, runs tests, and cleans up.
docker-compose run --rm -e USE_POSTGRES=true tests
```

### Run Locally (Requires Node.js)
```bash
# Run unit & in-memory tests
npm test

# Run with PostgreSQL (Requires local DB running)
# On Windows (PowerShell):
# $env:USE_POSTGRES="true"; npm test
# On Mac/Linux:
# USE_POSTGRES=true npm test
```

## Test Coverage

| Type | Scope | Description |
|------|-------|-------------|
| **Unit** | `DTOs` | Validates input structure (e.g., card info presence, negative amounts). |
| **Unit** | `Services` | Tests business logic (`TransactionService`, `AccountService`) in isolation using mocked repositories. |
| **Unit** | `Idempotency` | Verifies key expiration (TTL) and cache hit/miss logic in `IdempotencyStore`. |
| **Integration** | `PostgreSQL` | Verifies real DB interactions (Insert, Select) using a Dockerized Postgres instance. |
| **Integration** | `API (Simulated)` | Verifies end-to-end flow from Controller → Service → In-Memory Repo. |

## Architecture

```
POST /api/payments
       ↓
   Authorize (sync) → Return AUTHORIZED
       ↓
   [CyberSource internal delay - 5s]
       ↓
   POST /webhooks/cybersource/settlement (gateway callback)
       ↓
   Update transaction → SETTLED
       ↓
   Queue: creditBalance (BullMQ) → Worker credits account
```

## Assumptions

1. **CyberSource Integration via Webhook**
   - Real CyberSource uses async webhooks for settlement notification
   - Settlement delay simulated with 5 second timeout before webhook callback

2. **Card Validation**
   - App only validates field presence (cardNumber, expiryMonth, expiryYear, cvv)
   - Complex validation (Luhn check, expiry date, BIN detection) handled by gateway
   - This follows industry practice where gateway is source of truth

3. **Card Data Not Stored**
   - Following PCI compliance, raw card data is never persisted
   - Only gateway-provided authId/settlementId stored

4. **Account Pre-exists**
   - accountId in request assumed to be valid merchant account
   - New accounts auto-created on first transaction (for demo purposes)

5. **Single Currency**
   - All amounts in smallest unit (cents/rupiah) as integers
   - No currency conversion

6. **No Authentication**
   - API endpoints publicly accessible (for demo purposes)
   - Production would require API key/OAuth

## Design Decisions

### 1. Pragmatic Domain-Driven Design (DDD) Architecture
The codebase prioritizes **maintainability and readability** by following Clean Architecture principles:
- **Modules (Merged Domain & Application):** The Domain and Application layers are consolidated under `src/modules` to reduce folder depth while keeping logic organized.
- **Separation of Concerns:** Business logic (`modules`), external tools (`infrastructure`), and API delivery (`interface`) are strictly separated. This makes the code easy to navigate and refactor.
- **Dependency Injection:** Services receive repositories (`infrastructure`) via constructor, making the system highly testable and loosely coupled.
- **Infrastructure Layer:** Kept strictly separate to allow swapping implementations (e.g., changing databases or queues) without affecting business logic.
- **Interface Layer:** Decoupled from logic to allow flexibility in how the application is served (HTTP, CLI, etc.).
This approach maintains the benefits of Clean Architecture (swappability, testability) while avoiding over-engineering.

### 2. Evolutionary Architecture (In-Memory → PostgreSQL)

- **Phase 1 (In-Memory):** Initial development used in-memory repositories to strictly focus on core business logic flow and speed up feedback loops without database overhead.
- **Phase 2 (PostgreSQL):** Once core features were stable enough, PostgreSQL was introduced as a "real-world" persistence layer.
  - **Reason for Change:** To ensure data durability (survives restarts) and scalability, which in-memory setup lacks.
  - **Why PostgreSQL?** For financial transactions, strict ACID compliance and row-level locking (to prevent race conditions on balance updates) are critical. The data is highly structured, making a relational DB more suitable than schema-less NoSQL options like MongoDB. PostgreSQL also serves as a robust general-purpose DB.

### 3. Webhook-Based Settlement
Instead of polling, CyberSource simulator triggers webhook after settlement delay. This mimics real payment gateway behavior.

### 4. Queue for Balance Updates
BullMQ (Redis) handles balance credit. **Why Message Queue over `setTimeout` or simple background worker?**
- **Durability:** If the server crashes during settlement, `setTimeout` is lost. Redis queue persists job data.
- **Retries:** Financial operations must be resilient. BullMQ provides built-in exponential backoff for retries on failure.
- **Concurrency Control:** Queue ensures controlled processing load on the database.
- **Why BullMQ (Redis)?** It is the simplest to implement for this use case compared to heavier brokers like RabbitMQ or Kafka, while still offering robust features.
This is chosen over simpler options to guarantee that user balances are eventually credited even in unstable conditions.

### 5. Idempotency (Client-Side)
- **Purpose:** To prevent accidental double charges if the client retries a `POST /payments` request.
- **Mechanism:** `X-Idempotency-Key` header identifies unique requests. If the same key is received within a configurable window (e.g., 24 hours), the server returns the cached response.
- **Why In-Memory?** Idempotency records are transient data (short TTL) and do not require long-term persistence, making a cache-like store suitable. A simple custom in-memory Key-Value store is sufficient for this demo implementation to avoid infrastructure complexity. In production, Redis would be used to handle TTL and scaling.

### 6. Double Settlement Protection (Server-Side)
- **Purpose:** To prevent processing the same settlement webhook multiple times.
- **Mechanism:** The system checks the internal transaction status. If it's already `SETTLED` or `FAILED`, the webhook is ignored. This protects against duplicate webhook delivery from the gateway.

### 7. Card Info Handling
Card data validated but not stored (PCI compliance best practice). Only authId/settlementId stored.

### 8. Structured Logging
- **Why JSON?** Log aggregation tools (Datadog, Kibana, CloudWatch) can natively parse JSON. This allows efficient filtering (e.g., `level:"error"`) and context extraction (e.g., grouping by `transactionId`).
- **Production:** `NODE_ENV=production` defaults to JSON for machine readablity.
- **Development:** Text format for human readablity in the terminal.

## Environment Variables

Values in `.env.example` are for **local development**. When running via `docker-compose`, URLs are automatically adjusted to Docker network (e.g., `db:5432` instead of `localhost:5432`).

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `NODE_ENV` | development | `production` for JSON logs |
| `USE_POSTGRES` | true | Use PostgreSQL (`true`) or in-memory (`false`) |
| `DATABASE_URL` | postgresql://xendit:xendit@localhost:5432/xendit | PostgreSQL connection (Docker overrides with `db:5432`) |
| `REDIS_URL` | redis://localhost:6379 | Redis connection (Docker overrides with `redis:6379`) |


## Project Structure

```
src/
├── interface/http/          # Controllers, routes, DTOs
├── modules/                  # Business logic (services)
├── infrastructure/
│   ├── gateways/            # CyberSource simulator
│   ├── persistance/         # Repositories (memory, postgres)
│   ├── queue/               # BullMQ queue & worker
│   └── idempotency/         # Idempotency store
├── shared/                   # Errors, utils, logger
└── tests/                    # Jest tests
```