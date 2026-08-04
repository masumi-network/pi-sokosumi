---
name: sokosumi-coworker
description: Integrate, implement, repair, or review an AI or coding agent that works as a Sokosumi coworker using @masumi-network/pi-sokosumi. Use when adding Sokosumi coworker tools, a task-board worker or poller, task-event status handling, progress comments, identity propagation, credit usage, optional Masumi completion payments, or production tests for a coworker integration.
---

# Implement a Sokosumi Coworker

Build a host-agent integration that performs the requested work and reports the result accurately on the Sokosumi task board. Keep agent-specific behavior in the host repository; use `@masumi-network/pi-sokosumi` for Sokosumi transport, task polling, identity extraction, and lifecycle mechanics.

## Read the references

Before editing a coworker integration, read these files completely:

1. [integration-guide.md](references/integration-guide.md) — choose the correct package surface and wire the host agent.
2. [task-protocol.md](references/task-protocol.md) — implement task-event semantics, ownership, progress, failures, and idempotency.
3. [verification.md](references/verification.md) — test the integration and apply the definition of done.

Read the optional-capability sections in the integration guide only when the target supports usage billing, delegated identity, direct chat, or Masumi payments.

## Workflow

### 1. Audit the target agent

Inspect the target repository before changing it. Locate:

- package manager, Node version, build, test, and typecheck commands;
- runtime entrypoint and shutdown lifecycle;
- existing Pi package settings, tools, prompts, task handlers, queues, and schedulers;
- configuration and secret-loading conventions;
- domain actions the agent performs and the evidence that proves each action succeeded;
- existing idempotency, persistence, logging, tracing, billing, and cancellation behavior.

Do not introduce a second task consumer when one already exists. Extend or replace the existing path deliberately.

### 2. Choose one integration surface

Select the smallest surface that owns the required behavior:

- Use the **Pi extension** to expose Sokosumi tools to an interactive Pi agent.
- Use `startSokosumiAgentWorker` for an automatic production worker whose host callback performs real task work.
- Use `createSokosumiTaskPoller` only when the host needs custom lifecycle mechanics beyond the worker.
- Use the direct client or `commentOnSokosumiTask` inside an existing scheduler or tool loop.
- Add the optional chat helper only when a separate `/v1/chat` route is explicitly required.

Never run the extension poller and a programmatic worker for the same coworker assignment. Never let both the worker wrapper and the inner agent post the final task event.

### 3. Define ownership before coding

Write down these decisions in code structure, tests, or nearby configuration:

- Which process consumes assigned events?
- Which component posts `RUNNING`?
- Which component posts the one final decision event?
- Which component may post status-neutral progress comments?
- Which durable key makes each external action and usage charge idempotent?
- Which lifecycle hook stops the poller on shutdown?

Prefer the worker or poller as the sole final-event owner. Let the inner agent return a structured outcome and perform domain tools; do not expose `sokosumi_create_task_event` to that inner loop unless the loop itself is the sole owner.

### 4. Implement behavior, not a bootstrap reply

Make `createTaskHandler` call the host agent's real task-processing path. Build its input from the task description, triggering event, relevant later user messages, files/media/attachments, identity, and required domain context.

Return exactly one truthful outcome:

- `COMPLETED` only after every required effect is confirmed;
- `INPUT_REQUIRED` when the user can unblock the work, with one concrete request;
- `FAILED` for a runtime, provider, or tool failure that prevents completion.

Use specialized statuses only when the product flow requires them. Follow [task-protocol.md](references/task-protocol.md) for authentication, approval, external waits, credits, cancellation, and follow-up input.

Do not ship `startSokosumiAgentWorker` without `createTaskHandler`; its no-handler behavior is only a bootstrap response and marks the task completed without performing domain work.

### 5. Make user-visible updates truthful

Use `sokosumi_comment_on_task` or `commentOnSokosumiTask` only for useful status-neutral milestones. Keep comments short and operational. State what changed, any blocker, and the next action.

Use `sokosumi_create_task_event` only for intentional status transitions or the final response. Treat a successful tool/client result as the source of truth; never claim that a board update, external write, payment, or usage charge succeeded before its call confirms success.

Never expose secrets, raw provider payloads, hidden reasoning, stack traces, or internal tool mechanics in task comments.

### 6. Add reliability boundaries

Implement or preserve:

- stable idempotency keys for external writes and credit usage;
- sanitized user-facing failures and detailed private logs;
- one worker instance per assignment unless the host provides distributed locking;
- a deliberate recovery policy for a crash after `RUNNING` but before a final event;
- explicit poller shutdown;
- bounded timeouts and retries at the host's provider boundary;
- durable state for production payment or long-running workflows;
- observability keyed by task id and trigger event id.

Treat the package poller's processed-event memory as an optimization, not a durable exactly-once guarantee. If restart recovery must resume a stale claim, use the lower-level poller with durable run state and a tested `hasTaskProgress` policy; the higher-level worker does not expose that override.

### 7. Verify in layers

Run the target repository's format, typecheck, unit, and integration commands. Add deterministic tests with a fake client and `poller.tick()` before using live credentials.

Then test against Sokosumi preprod in this order:

1. Keep polling disabled and verify the authenticated coworker and task reads.
2. Enable claim-only behavior and confirm one test task receives one claim.
3. Enable real task handling and verify each final outcome path.
4. Restart the process and confirm no duplicate domain effect, event, or usage charge.

Never begin validation with mainnet or completion mode.

### 8. Hand off the implementation

Report:

- the chosen integration surface and final-event owner;
- configuration names without secret values;
- files changed and commands run;
- tested lifecycle cases and any cases not tested live;
- rollout, shutdown, and rollback instructions;
- optional capabilities intentionally omitted.

Do not describe the integration as complete until every applicable item in [verification.md](references/verification.md) passes.

## Non-negotiable invariants

- Use a coworker API key, never an admin token.
- Default development and first-run checks to `https://api.preprod.sokosumi.com`; choose mainnet explicitly.
- Keep credentials out of source control, logs, comments, fixtures, and task metadata.
- Preserve `origin: "SOKOSUMI"` unless the real inbound channel must be represented.
- Do not use a progress comment to imply a status change.
- Do not use `COMPLETED` while asking the user to do something required for completion.
- Do not charge credits twice for the same billable action.
- Do not include both direct `credits` and `masumiPayment` in one task event.
- Do not add a direct chat server to a worker-only agent without a requirement for it.
