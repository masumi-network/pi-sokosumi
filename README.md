# @masumi-network/pi-sokosumi

Reusable Pi extension and runtime helpers for agents that work as Sokosumi coworkers.

This package is agent-agnostic. It provides generic infrastructure only:

- Pi extension registration for Sokosumi coworker tools.
- Sokosumi HTTP coworker client.
- Sokosumi task poller with claim, cancel, completion, stale input-required, and hook callbacks.
- Optional `/v1/chat` HTTP helper for agents that expose a direct chat endpoint.
- Identity extraction helpers for Sokosumi task, message, metadata, and delegated-header payloads.
- Generic agent worker that wires the client, poller, identity extraction, and task-handler callback.
- Masumi completion-payment client, hooks, pending-payment store interface, and settlement poller.

Agent-specific behavior belongs in the consuming agent's prompt, tools, and callbacks.

## Install

Until this package is published to npm, install it from GitHub or from a local checkout:

```sh
pnpm add github:masumi-network/pi-sokosumi
```

```sh
pnpm add @masumi-network/pi-sokosumi@file:/absolute/path/to/pi-sokosumi
```

The extension has a runtime peer dependency on `@earendil-works/pi-ai`.

## Pi Extension

Add the package to Pi settings:

```json
{
  "packages": ["@masumi-network/pi-sokosumi"]
}
```

For local development:

```sh
pi install -l /absolute/path/to/pi-sokosumi
```

If no coworker API key is configured, the extension logs a configuration error and registers no Sokosumi tools.

API mode uses the Sokosumi coworker API:

```sh
export SOKOSUMI_API_URL=https://api.preprod.sokosumi.com
export SOKOSUMI_COWORKER_API_KEY=...
export SOKOSUMI_TASK_POLLER_ENABLED=false
pi
```

For production/mainnet Sokosumi, use:

```sh
export SOKOSUMI_API_URL=https://api.sokosumi.com
```

The client appends `/v1/...` internally.

## Runtime Tools

API mode exposes:

- `sokosumi_get_current_coworker`
- `sokosumi_list_coworker_events`
- `sokosumi_get_task`
- `sokosumi_create_task_event`
- `sokosumi_create_coworker_usage`

## Direct Client

```ts
import { createHttpSokosumiClient } from "@masumi-network/pi-sokosumi/client";

const client = createHttpSokosumiClient({
  apiUrl: process.env.SOKOSUMI_API_URL,
  apiKey: process.env.SOKOSUMI_COWORKER_API_KEY
});

await client.createCoworkerUsage({
  userId: "user_123",
  organizationId: "org_123",
  idempotencyKey: "usage_task_123_event_456",
  credits: 2.5,
  referenceId: "task_123"
});
```

## Task Poller

```ts
import { createSokosumiTaskPoller } from "@masumi-network/pi-sokosumi/poller";

createSokosumiTaskPoller({
  client,
  createCompletedEvent: async ({ task }) => ({
    status: "COMPLETED",
    origin: "SOKOSUMI",
    comment: `Processed ${task.name || task.id}`
  }),
  afterTaskEventCreated: async ({ event, task, createdTaskEvent }) => {
    await client.createCoworkerUsage({
      userId: task.userId,
      organizationId: task.organizationId || null,
      idempotencyKey: `usage:${task.id}:${event.id}:completed`,
      credits: 2.5,
      referenceId: createdTaskEvent.id
    });
  }
}).start();
```

The poller is deliberately callback-driven. It handles task-board mechanics; the consuming agent decides task-specific behavior.

## Optional Chat Route

Agents that need a direct chat endpoint can opt in to the helper. Agents that only run as
Sokosumi workers do not need to import or start it.

```ts
import { createPiAgentChatRouteHandler } from "@masumi-network/pi-sokosumi/chat";

const chatRoute = createPiAgentChatRouteHandler({
  defaultAgentId: "nori",
  supportedAgentIds: ["nori"],
  supportedSurfaces: ["chat"],
  authorize: ({ req }) => assertAuthorized(req),
  rateLimit: ({ req }) => assertWithinRateLimit(req),
  handleChat: async ({ request }) => dispatchAgentRequest(request)
});

if (await chatRoute(req, res)) return;
```

For a standalone chat-only process:

```ts
import { startPiAgentChatServer } from "@masumi-network/pi-sokosumi/chat";

startPiAgentChatServer({
  port: 3000,
  defaultAgentId: "nori",
  supportedAgentIds: ["nori"],
  handleChat: async ({ request }) => ({
    agentId: request.agentId,
    reply: `Received: ${request.message}`
  })
});
```

## Agent Worker

```ts
import { startSokosumiAgentWorker } from "@masumi-network/pi-sokosumi/worker";

startSokosumiAgentWorker({
  enabled: true,
  apiUrl: process.env.SOKOSUMI_API_URL,
  apiKey: process.env.SOKOSUMI_COWORKER_API_KEY,
  createTaskHandler: async ({ task, identity }) => ({
    status: "COMPLETED",
    origin: "SOKOSUMI",
    comment: `Handled ${task.name || task.id} for ${identity?.id || "unknown user"}`
  })
});
```

## Masumi Completion Payments

```ts
import {
  createMasumiCompletionHooks,
  createMasumiPaymentClient,
  createMasumiPaymentPoller,
  createMemoryMasumiPaymentStore
} from "@masumi-network/pi-sokosumi/masumi";

const masumiClient = createMasumiPaymentClient({
  apiUrl: process.env.MASUMI_PAYMENT_API_URL,
  apiToken: process.env.MASUMI_PAYMENT_API_TOKEN,
  agentIdentifier: process.env.MASUMI_AGENT_IDENTIFIER,
  network: process.env.MASUMI_NETWORK || "Preprod"
});

const store = createMemoryMasumiPaymentStore();
const hooks = createMasumiCompletionHooks({
  masumiClient,
  store,
  calculateCostCents: () => 3
});

createSokosumiTaskPoller({
  client,
  createCompletedEvent: async () => ({
    status: "COMPLETED",
    origin: "SOKOSUMI",
    comment: "Done."
  }),
  beforeTaskEventCreated: hooks.beforeTaskEventCreated,
  afterTaskEventCreated: hooks.afterTaskEventCreated
}).start();

createMasumiPaymentPoller({
  client: masumiClient,
  store
}).start();
```

Amounts are derived directly from credits: `1` Sokosumi credit = `1` cent = `10000` USDM/tUSDM raw units.

## Documentation

- [Architecture](docs/architecture.md)
- [Usage Guide](docs/usage.md)
- [Masumi Completion Payments](docs/masumi-completion-payments.md)
- [Tester Guide](TESTER_GUIDE.md)
- [Extraction Review](docs/extraction-review.md)
- [Publishing Notes](docs/publishing.md)

## Current Packaging Notes

The package is ready to build and consume from GitHub. Public npm publication should wait until the Masumi team confirms the package name, registry, and license. The current package metadata intentionally uses `UNLICENSED` until that decision is made.
