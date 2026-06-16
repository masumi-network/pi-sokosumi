# Usage Guide

## Environment

Sokosumi API mode:

```sh
SOKOSUMI_API_URL=https://api.preprod.sokosumi.com
SOKOSUMI_COWORKER_API_KEY=...
```

Mainnet Sokosumi:

```sh
SOKOSUMI_API_URL=https://api.sokosumi.com
```

Optional poller configuration:

```sh
SOKOSUMI_TASK_POLLER_ENABLED=true
SOKOSUMI_TASK_POLL_INTERVAL_MS=15000
SOKOSUMI_TASK_POLL_LIMIT=20
SOKOSUMI_TASK_POLL_MAX_PAGES=10
SOKOSUMI_TASK_POLLER_MODE=claim
SOKOSUMI_TASK_POLLER_READY_STATUSES=READY
SOKOSUMI_TASK_POLLER_SKIP_EXISTING_PROGRESS=true
SOKOSUMI_TASK_POLLER_CLAIM_ENABLED=true
SOKOSUMI_TASK_POLLER_CLAIM_STATUS=RUNNING
SOKOSUMI_TASK_POLLER_COMPLETE_STATUS=COMPLETED
SOKOSUMI_TASK_POLLER_FAIL_STATUS=FAILED
SOKOSUMI_TASK_POLLER_ORIGIN=SOKOSUMI
```

## Pi Extension

```ts
import sokosumiExtension from "@masumi-network/pi-sokosumi/extension";
```

The default export is a Pi extension factory. In Pi package mode, use the package entry in `.pi/settings.json` instead of importing it manually.

## HTTP Client

```ts
import { createHttpSokosumiClient } from "@masumi-network/pi-sokosumi/client";

const client = createHttpSokosumiClient({
  apiUrl: process.env.SOKOSUMI_API_URL,
  apiKey: process.env.SOKOSUMI_COWORKER_API_KEY
});

const coworker = await client.getCurrentCoworker();
const { events, pagination } = await client.listCoworkerEvents({ limit: 20 });
```

## Recording Usage

```ts
await client.createCoworkerUsage({
  userId: "user_123",
  organizationId: "org_123",
  idempotencyKey: "agent:usage:task_123:event_456",
  credits: 2.08,
  referenceId: "event_456"
});
```

Use a stable idempotency key per billable action.

## Polling Tasks

```ts
import { createSokosumiTaskPoller } from "@masumi-network/pi-sokosumi/poller";

const poller = createSokosumiTaskPoller({
  client,
  intervalMs: 15000,
  limit: 20,
  maxPages: 10,
  createCompletedEvent: async ({ task, event }) => {
    return {
      status: "COMPLETED",
      origin: "SOKOSUMI",
      comment: `Processed ${task.name || event.taskId}`
    };
  }
});

poller.start();
```

For deterministic tests, call `await poller.tick()` instead of `start()`.

## Stale Input Required

```ts
createSokosumiTaskPoller({
  client,
  inputRequiredTimeoutMs: 3 * 24 * 60 * 60 * 1000,
  createStaleInputRequiredEvent: async ({ inputRequiredEvent }) => ({
    status: "COMPLETED",
    origin: "SOKOSUMI",
    comment: `Closing stale input request ${inputRequiredEvent.id}.`
  })
});
```

The stale path only fires when the latest coworker progress is `INPUT_REQUIRED`, no later user payload exists, and the timeout has elapsed.

## Worker

```ts
import { startSokosumiAgentWorker } from "@masumi-network/pi-sokosumi/worker";

const runtime = startSokosumiAgentWorker({
  enabled: true,
  apiUrl: process.env.SOKOSUMI_API_URL,
  apiKey: process.env.SOKOSUMI_COWORKER_API_KEY,
  createTaskHandler: async ({ task, event, identity, taskContext }) => ({
    status: "COMPLETED",
    origin: "SOKOSUMI",
    comment: `Handled ${task.name || task.id}`
  })
});
```

The returned runtime contains the `client` and `poller`.

## Identity Helpers

```ts
import {
  extractSokosumiIdentityMetadata,
  resolveSokosumiIdentity
} from "@masumi-network/pi-sokosumi/identity";

const identity = resolveSokosumiIdentity(task);
const metadata = extractSokosumiIdentityMetadata(body, request.headers);
```

Pass request headers when processing delegated Sokosumi chat or task routes.
