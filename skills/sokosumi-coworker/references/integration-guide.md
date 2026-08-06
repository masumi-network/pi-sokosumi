# Sokosumi Coworker Integration Guide

## Contents

1. [Select the package surface](#select-the-package-surface)
2. [Install and configure](#install-and-configure)
3. [Use the Pi extension](#use-the-pi-extension)
4. [Build an automatic worker](#build-an-automatic-worker)
5. [Build a custom poller](#build-a-custom-poller)
6. [Build task context](#build-task-context)
7. [Register tools in a custom loop](#register-tools-in-a-custom-loop)
8. [Propagate identity](#propagate-identity)
9. [Record usage](#record-usage)
10. [Add Masumi payments](#add-masumi-payments)
11. [Add direct chat only when required](#add-direct-chat-only-when-required)
12. [Operate the worker](#operate-the-worker)

## Select the package surface

Choose one primary consumer:

| Need | Surface | Owner |
| --- | --- | --- |
| Give an interactive Pi agent Sokosumi read/write tools | Pi extension | The agent tool loop |
| Automatically process assigned tasks with host behavior | `startSokosumiAgentWorker` | Worker callback + package lifecycle |
| Customize READY selection, stale-claim recovery, drainable shutdown, failures, or hooks | `createSokosumiTaskPoller` | Host callback + custom poller config |
| Add Sokosumi calls to an existing queue/scheduler | HTTP client and narrow tool helpers | Existing runtime |
| Expose an unrelated direct chat API | Chat helper | Host HTTP server |

Do not enable two consumers for the same coworker. In particular, do not run `SOKOSUMI_TASK_POLLER_ENABLED=true` in the Pi extension while also starting `startSokosumiAgentWorker`.

Choose one final-event owner:

- In worker/poller mode, make the callback return the final event and prevent the inner agent from posting it.
- In tool-loop mode, let the agent post the final event and do not wrap it with automatic completion.

## Install and configure

Require Node `>=22.19.0`. Follow the target repository's package manager.

Install the package from its approved source. For an unpublished/local build, use one of:

```sh
pnpm add github:masumi-network/pi-sokosumi
pnpm add @masumi-network/pi-sokosumi@file:/absolute/path/to/pi-sokosumi
```

Set credentials through the host's secret manager:

```sh
SOKOSUMI_API_URL=https://api.preprod.sokosumi.com
SOKOSUMI_COWORKER_API_KEY=...
```

Use `https://api.sokosumi.com` only for an intentional production rollout. The client appends `/v1/...`; do not include `/v1` in `SOKOSUMI_API_URL`.

Use a coworker API key. A missing key makes the Pi extension register no Sokosumi tools and makes the worker stay disabled when no custom client is supplied.

## Use the Pi extension

Add the package to Pi settings:

```json
{
  "packages": ["@masumi-network/pi-sokosumi"]
}
```

For a local checkout, use `pi install -l /absolute/path/to/pi-sokosumi`.

With a coworker key, the extension registers:

- `sokosumi_get_current_coworker`
- `sokosumi_list_coworker_events`
- `sokosumi_get_task`
- `sokosumi_comment_on_task`
- `sokosumi_create_task_event`
- `sokosumi_create_coworker_usage`

Begin with `SOKOSUMI_TASK_POLLER_ENABLED=false`. If claim-only behavior is needed later, enable the extension poller with `SOKOSUMI_TASK_POLLER_MODE=claim`.

Do not use extension `complete` mode as a substitute for real agent execution. It posts a configured completion template; it does not invoke the host agent's domain behavior.

## Build an automatic worker

Prefer the worker for a production coworker that automatically handles assigned tasks:

```ts
import { startSokosumiAgentWorker } from "@masumi-network/pi-sokosumi/worker";
import type { SokosumiTaskEventInput } from "@masumi-network/pi-sokosumi/types";

const runtime = startSokosumiAgentWorker({
  enabled: process.env.SOKOSUMI_TASK_POLLER_ENABLED === "true",
  apiUrl: process.env.SOKOSUMI_API_URL,
  apiKey: process.env.SOKOSUMI_COWORKER_API_KEY,
  intervalMs: 15_000,
  createTaskHandler: async (input): Promise<SokosumiTaskEventInput> => {
    try {
      const outcome = await handleAgentTask(input); // Implement in the host.

      if (outcome.kind === "needs_input") {
        return {
          status: "INPUT_REQUIRED",
          origin: "SOKOSUMI",
          comment: outcome.request
        };
      }

      if (outcome.kind === "failed") {
        return {
          status: "FAILED",
          origin: "SOKOSUMI",
          comment: outcome.publicMessage
        };
      }

      return {
        status: "COMPLETED",
        origin: "SOKOSUMI",
        comment: outcome.result
      };
    } catch (error) {
      logPrivateTaskFailure(input.task.id, input.event.id, error);
      return {
        status: "FAILED",
        origin: "SOKOSUMI",
        comment: "I couldn't complete this task because the service failed. Please retry."
      };
    }
  }
});

registerShutdownHook(() => runtime?.poller.stop());
```

Adapt `handleAgentTask`, logging, and shutdown to the host. Do not copy undefined helper names literally.

The worker:

- creates the HTTP client unless a custom client is supplied;
- polls assigned events;
- posts a `RUNNING` claim;
- resolves the initial Sokosumi identity;
- invokes `createTrace`, then `resolveTaskContext`, then `createTaskHandler`;
- posts the returned final event;
- handles cancel requests, duplicate progress, terminal follow-up input, and stale input callbacks;
- exposes `{ client, poller }` for host calls and shutdown.

Always supply `createTaskHandler` for a real integration. Returning `undefined` creates no final event and may leave the task claimed; reserve that behavior for an intentionally claim-only flow.

Catch expected provider failures in the host and return a sanitized `FAILED` event. An uncaught handler error reaches the poller's default failure path, whose user-visible comment includes the error message.

The worker starts the package interval loop immediately. Calling `runtime.poller.stop()` prevents future scheduled ticks but does not provide a promise that drains an already active tick. Also, default progress detection treats a later `RUNNING` event as progress, so a process crash after the claim and before the final event can leave that trigger skipped after restart. Use the worker only with an explicit operational recovery policy. When the host must resume stale claims or await an active tick during shutdown, use the lower-level poller with durable run state, provider reconciliation, a lease-aware `hasTaskProgress`, and a host-owned drainable tick loop.

## Build a custom poller

Use `createSokosumiTaskPoller` when the worker does not expose a required policy:

```ts
import { createSokosumiTaskPoller } from "@masumi-network/pi-sokosumi/poller";

const poller = createSokosumiTaskPoller({
  client,
  intervalMs: 15_000,
  createCompletedEvent: async ({ task, event }) => runAndMapTask(task, event),
  createFailedEvent: ({ error }) => ({
    status: "FAILED",
    origin: "SOKOSUMI",
    comment: toSafePublicFailure(error)
  }),
  beforeTaskEventCreated: enrichFinalEvent,
  afterTaskEventCreated: recordAcceptedResult
});
```

Use `await poller.tick()` in tests. Use `poller.start()` only in the runtime entrypoint and call `poller.stop()` during shutdown.

Keep default event selection unless product behavior requires changes. The defaults process READY, later user input after coworker progress, cancel requests, and user follow-up after terminal completion. Review the package tests before overriding `shouldProcessEvent` or `hasTaskProgress`.

For stale-claim recovery, persist a run key derived from task id and trigger event id. Treat a recent `RUNNING` event as active; after its lease expires, reconcile every possibly committed provider effect by its stable key before allowing the trigger to run again. Suppress a second `RUNNING` event when resuming the same claim. Do not implement stale recovery with elapsed time alone.

For drainable shutdown, drive `poller.tick()` through the host's non-overlapping scheduler, stop scheduling new ticks, and await the active tick within a bounded shutdown window. Do not also call `poller.start()` in that design.

Use `beforeTaskEventCreated` for a required transformation that must succeed before the event is posted. Its failure aborts the final event and enters failure handling. Use `afterTaskEventCreated` for side effects that depend on the accepted event; its failure is logged and does not undo the accepted final event.

## Build task context

Pass the inner agent enough context to act correctly, but keep final-event ownership outside it.

Include:

- `task.id`, `name`/`title`, description/body/content, and current status;
- the triggering event id, status, visible text, channel, and timestamp;
- user messages after the most recent coworker decision;
- task and event files, attachments, and media;
- relevant task links, project/workspace metadata, and domain state;
- resolved user and organization identity;
- the allowed output schema and status decision rules;
- idempotency keys derived from task id, trigger event id, and action type.

Use `getSokosumiEventText` and `getSokosumiTaskPrimaryText` for the package's standard text extraction. Preserve event order and label authors. Do not concatenate hidden metadata or credentials into the prompt.

Prefer a structured inner-agent outcome such as:

```ts
type AgentTaskOutcome =
  | { kind: "completed"; result: string; evidence: Record<string, string> }
  | { kind: "needs_input"; request: string }
  | { kind: "failed"; publicMessage: string; errorCode: string };
```

Require effect evidence before mapping `completed` to `COMPLETED`. Keep provider ids in private logs or safe event metadata only when needed for audit.

Import `SOKOSUMI_TASK_EVENT_STATUS_DECISION_PROMPT` from `@masumi-network/pi-sokosumi/types` when a model must choose between `COMPLETED`, `INPUT_REQUIRED`, and `FAILED`.

## Register tools in a custom loop

Reuse the package registrar when the host owns Pi-compatible tool registration:

```ts
import { registerSokosumiCoworkerTools } from "@masumi-network/pi-sokosumi/tools";

registerSokosumiCoworkerTools(pi, client);
```

For status-neutral progress only:

```ts
import {
  commentOnSokosumiTask,
  createSokosumiCommentOnTaskTool
} from "@masumi-network/pi-sokosumi/tools";
```

Do not expose the broad final-event tool to an inner agent when the worker callback owns finalization.

## Propagate identity

The worker supplies `identity`, resolved from the task snapshot. Treat it as nullable and fall back to the task's validated `userId`/`organizationId` only when the domain operation permits that fallback.

For custom or delegated HTTP routes, use:

```ts
import {
  extractSokosumiIdentityMetadata,
  resolveSokosumiIdentity
} from "@masumi-network/pi-sokosumi/identity";
```

Pass request headers to identity extraction for delegated routes. Do not accept a caller-provided Authorization header through the client; the client owns its coworker bearer credential.

## Record usage

Record credit usage only for a defined billable action and only once:

```ts
await client.createCoworkerUsage({
  userId: task.userId,
  organizationId: task.organizationId ?? null,
  idempotencyKey: `coworker:${task.id}:${event.id}:completed:v1`,
  credits: calculatedCredits,
  referenceId: createdTaskEvent.id
});
```

Require a positive finite credit value. Use a stable semantic idempotency key, not a timestamp or random UUID.

For simple integrations, record usage from `afterTaskEventCreated` after verifying the created event represents the intended accepted final state. Do not bill a comment-only invalid-transition fallback.

For crash-safe billing, persist a pending usage intent before posting the completion, attach a stable final-event/usage key in safe event metadata, and make the intent eligible for dispatch only after the returned or reconciled event proves accepted completion. On startup, reconcile prepared intents against task events. Dispatch `createCoworkerUsage` from a durable outbox with the same idempotency key on every retry. A failure after task acceptance must not undo the task event or double-charge.

## Add Masumi payments

Add Masumi only when escrow-backed completion payments are required.

Wire `createMasumiCompletionHooks` into `beforeTaskEventCreated` and `afterTaskEventCreated`, then run `createMasumiPaymentPoller`. Replace the memory store with a durable production implementation.

Preserve this order:

1. Build a `COMPLETED` event.
2. Create and attach `masumiPayment` before posting it.
3. Post the event.
4. Hash and store the exact accepted payload after posting.
5. Submit the result hash after funds are locked or result submission is requested.

Never include both `credits` and `masumiPayment` in the task event. Keep a stable record keyed by `blockchainIdentifier`. Follow `docs/masumi-completion-payments.md` in the package for client setup, amount conversion, settlement states, and failure handling.

## Add direct chat only when required

The worker does not require a direct chat server. Add `createPiAgentChatRouteHandler` or `startPiAgentChatServer` only when the agent must also expose `/v1/chat`.

When adding it, preserve the host's authorization, rate limiting, supported-agent, supported-surface, body-size, and shutdown policies. Pass delegated request headers to identity extraction when applicable.

## Operate the worker

- Start one poller per coworker assignment unless distributed locking makes multiple replicas safe.
- Stop the poller on normal shutdown and deployment termination.
- Log structured task id, trigger event id, status, latency, provider correlation id, and retry class.
- Never log API keys, delegated headers, full user payloads, authentication URLs, or payment secrets.
- Set provider timeouts shorter than the worker's operational deadline.
- Make external domain actions idempotent because task-board deduplication is not a distributed transaction.
- Roll out on preprod with polling disabled, then claim-only, then full handling.
