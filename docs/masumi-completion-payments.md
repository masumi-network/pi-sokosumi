# Masumi Completion Payments

The Masumi module helps agents attach escrow-backed payment metadata to completed Sokosumi task events and submit result hashes after funds are locked.

It does not register agents, create payments automatically, or persist state unless the host app wires it explicitly.

## Flow

1. The agent prepares a `COMPLETED` Sokosumi task event.
2. `beforeTaskEventCreated` creates a Masumi payment and attaches `masumiPayment` to the task event body.
3. The Sokosumi task event is posted.
4. `afterTaskEventCreated` hashes the exact accepted completion payload and stores a pending payment record.
5. The Masumi payment poller lists payments and waits for either:
   - `NextAction.requestedAction === "SubmitResultRequested"`, or
   - `onChainState === "FundsLocked"`.
6. The poller submits the stored result hash to `/payment/submit-result`.
7. The store marks the payment submitted or dropped.

## Client

```ts
import { createMasumiPaymentClient } from "@masumi-network/pi-sokosumi/masumi";

const client = createMasumiPaymentClient({
  apiUrl: process.env.MASUMI_PAYMENT_API_URL,
  apiToken: process.env.MASUMI_PAYMENT_API_TOKEN,
  agentIdentifier: process.env.MASUMI_AGENT_IDENTIFIER,
  network: process.env.MASUMI_NETWORK || "Preprod"
});
```

`apiUrl` can point at the admin origin or at `/api/v1`; it is normalized internally.

## Amounts

The built-in conversion treats credits as cents:

```txt
1 Sokosumi credit = 1 cent = 10000 USDM/tUSDM raw units
```

Examples:

- `1` credit -> `10000`
- `0.13` credits -> `1300`
- `2.08` credits -> `20800`

Built-in units:

- Preprod tUSDM: `16a55b2a349361ff88c03788f93e1e966e5d689605d044fef722ddde0014df10745553444d`
- Mainnet USDM: `c48cbb3d5e57ed56e276bc45f99ab39abe94e6cd7ac39fb402da47ad0014df105553444d`

## Completion Hooks

```ts
import {
  createMasumiCompletionHooks,
  createMemoryMasumiPaymentStore
} from "@masumi-network/pi-sokosumi/masumi";

const store = createMemoryMasumiPaymentStore();
const hooks = createMasumiCompletionHooks({
  masumiClient: client,
  store,
  calculateCostCents: async ({ taskEvent }) => taskEvent.credits || 1
});
```

Wire the hooks into `createSokosumiTaskPoller`:

```ts
createSokosumiTaskPoller({
  client: sokosumiClient,
  createCompletedEvent,
  beforeTaskEventCreated: hooks.beforeTaskEventCreated,
  afterTaskEventCreated: hooks.afterTaskEventCreated
});
```

## Settlement Poller

```ts
import { createMasumiPaymentPoller } from "@masumi-network/pi-sokosumi/masumi";

createMasumiPaymentPoller({
  client,
  store,
  intervalMs: 15 * 60 * 1000
}).start();
```

Production hosts should replace `createMemoryMasumiPaymentStore` with a durable implementation.

## Hashing

The stored result hash is:

```ts
sha256Hex(canonicalJson(taskEvent))
```

This means the result hash represents the exact completion payload that included the `masumiPayment` object accepted by Sokosumi.

## Failure Handling

If a payment reports `NextAction.errorType`, the poller marks the pending payment as dropped and records `errorType` plus `errorNote`.

If a payment is not ready for result submission, the poller leaves it pending.
