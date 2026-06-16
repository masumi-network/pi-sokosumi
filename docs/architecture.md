# Architecture

`@masumi-network/pi-sokosumi` is split into small runtime modules so agents can adopt only the pieces they need.

## Package Boundaries

The package owns generic Sokosumi and Masumi infrastructure:

- Pi extension registration.
- Sokosumi coworker HTTP calls.
- Task polling and task-event state mechanics.
- Identity extraction from Sokosumi-shaped payloads.
- Worker wiring for generic agent task handling.
- Masumi completion-payment creation, pending-payment storage contract, and result-submission polling.

The package does not own agent-specific behavior:

- No deterministic product behavior.
- No social-network or domain-specific scheduling logic.
- No Pheme-specific prompts, URLs, persistence, or credentials.
- No automatic billing or task-board mutation unless the host app explicitly starts the relevant client, tool, or poller.

## Modules

### Extension

`extensions/sokosumi/index.ts` loads environment configuration and registers Pi tools.

When `SOKOSUMI_COWORKER_API_KEY` is set, the extension uses the real coworker API. Otherwise it logs a configuration error and registers no Sokosumi tools.

### Client

`src/client/httpSokosumiClient.ts` wraps coworker API requests:

- `GET /v1/coworkers/me`
- `GET /v1/coworkers/me/events`
- `GET /v1/tasks/:id`
- `POST /v1/tasks/:id/events`
- `POST /v1/coworkers/me/usage`
- delegated `GET /v1/users/:id`

The client validates required inputs and never accepts caller-supplied `Authorization` headers.

### Poller

`src/poller/createSokosumiTaskPoller.ts` scans assigned coworker events and handles task-board mechanics:

- READY task claiming.
- Duplicate progress detection.
- terminal task restart on later user input.
- cancellation handling.
- invalid status transition fallback to comment-only events.
- stale `INPUT_REQUIRED` completion callbacks.
- before/after final task-event hooks.

The poller is callback-driven. The host agent supplies completion, failure, stale-input, billing, tracing, or persistence behavior.

### Worker

`src/worker/startSokosumiAgentWorker.ts` combines client setup, poller setup, task identity extraction, trace callbacks, and the host-provided task handler.

Use this when an agent wants the package to own the Sokosumi service mechanics while the agent owns the actual task response.

### Identity

`src/identity/resolveSokosumiIdentity.ts` extracts user, organization, workspace, name, and image information from common Sokosumi payload shapes and delegated request headers.

### Masumi

`src/masumi/*` contains generic completion-payment helpers:

- payment client for create/list/submit-result.
- cent and raw-unit conversion helpers.
- completion hooks that attach `masumiPayment` to completed task events.
- pending-payment store interface with an in-memory implementation.
- settlement poller that submits result hashes once funds are locked or result submission is requested.

## Side Effects

Importing the package has no external side effects. Side effects occur only when the host explicitly:

- registers and invokes tools,
- starts the Sokosumi task poller,
- calls the HTTP client,
- creates coworker usage,
- creates Masumi payments,
- starts the Masumi settlement poller.

## Persistence

The included Masumi memory store is for tests and local demos. Production agents should provide a persistent store implementing:

- `recordPendingMasumiPayment`
- `listPendingMasumiPayments`
- `markMasumiSubmitted`
- `markMasumiDropped`

The host app should make the store idempotent by `blockchainIdentifier`.
