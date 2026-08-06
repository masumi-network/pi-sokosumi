# Sokosumi Coworker Verification

Apply every applicable check before calling an integration complete.

## Static and local checks

- [ ] Use the target repository's package manager and supported Node version.
- [ ] Import only public `@masumi-network/pi-sokosumi` export paths.
- [ ] Run formatting, linting, typecheck, build, and tests.
- [ ] Keep API URLs, keys, payment tokens, and delegated identities out of source and fixtures.
- [ ] Confirm the worker is gated by explicit configuration and disabled safely without credentials.
- [ ] Confirm a runtime entrypoint retains the worker/poller and stops it on shutdown.
- [ ] Confirm only one configured consumer handles a coworker assignment.
- [ ] Confirm only one component owns the final task event.

For this package repository itself, run:

```sh
pnpm check
```

Validate this skill with the skill-creator validator after editing it.

## Deterministic test matrix

Use a fake client and `await poller.tick()` instead of timers. Test observable calls and returned events.

### Configuration and reads

- [ ] A missing coworker key registers no extension tools and starts no HTTP worker.
- [ ] Preprod is the development default; mainnet requires explicit configuration.
- [ ] The API URL is not double-suffixed with `/v1`.
- [ ] A coworker key, not an admin token, authenticates the client.
- [ ] The current coworker, assigned events, and task snapshot can be read without writes when polling is disabled.

### Task context

- [ ] The handler receives the task id, primary instruction, triggering event, and relevant later user input.
- [ ] Files, attachments, media, and links needed by the task reach the host agent.
- [ ] User and organization identity resolve correctly, including a safe nullable-identity path.
- [ ] Coworker-authored progress is not mistaken for new user input.
- [ ] Hidden metadata, secrets, and irrelevant event history do not enter the model prompt.

### Lifecycle

- [ ] READY produces one RUNNING claim and one final decision.
- [ ] A second tick does not repeat the same domain action in the same process.
- [ ] A process restart does not repeat the domain action because the host idempotency boundary rejects or reconciles it.
- [ ] A crash after RUNNING either resumes through a tested stale-lease policy or is handled by a documented operator/platform recovery path; it does not remain silently stranded.
- [ ] Stale-claim recovery reconciles ambiguous provider effects before retrying and does not post a second RUNNING event.
- [ ] Existing later coworker progress prevents duplicate processing.
- [ ] Later user input after INPUT_REQUIRED resumes processing.
- [ ] Later user input after COMPLETED or FAILED reopens and processes the task.
- [ ] A cancel request produces CANCELED once and does not start new work.
- [ ] Missing/deleted tasks do not prevent other assigned tasks from processing.
- [ ] Pagination reaches backlog events without starving new head events.
- [ ] Shutdown stops future polling; when graceful drain is promised, it also awaits the active tick within a bound.

### Final decisions

- [ ] A successful, confirmed domain effect maps to COMPLETED with a concrete result.
- [ ] Missing user-provided data maps to INPUT_REQUIRED with one actionable question.
- [ ] Provider/runtime failure maps to FAILED with sanitized public text.
- [ ] A required authorization flow maps to AUTHENTICATION_REQUIRED with a valid HTTPS URL.
- [ ] A comment-only progress update contains no status and leaves task status unchanged.
- [ ] The handler never returns COMPLETED while requesting a required user action.
- [ ] Returning `undefined` is impossible unless the integration intentionally supports claim-only work.
- [ ] Invalid transition recovery or comment fallback does not duplicate domain effects.

### Safety and observability

- [ ] Public comments contain no secrets, stack traces, raw payloads, hidden reasoning, or internal tool details.
- [ ] Private logs include task id and trigger event id without secret values.
- [ ] Expected provider errors are caught before the package's raw default failure comment can expose them.
- [ ] Ambiguous partial failures reconcile provider state before retrying.
- [ ] Alerts distinguish handler failure, event-post failure, after-hook failure, and billing failure.

### Usage billing

- [ ] Billing uses the correct user and organization identity.
- [ ] Credits are positive, finite, and calculated from a documented rule.
- [ ] The idempotency key is stable for the semantic billable action.
- [ ] Billing occurs at the chosen acceptance point, normally after the final task event is accepted.
- [ ] A comment-only invalid-transition fallback does not trigger a completion charge.
- [ ] If crash-safe billing is required, a prepared durable intent is reconciled after a crash between final-event acceptance and the after hook.
- [ ] Retrying cannot double-charge.
- [ ] A failed usage call is retried or surfaced without falsely undoing an already accepted final event.

### Masumi, when enabled

- [ ] Payment creation happens only for the intended completion statuses.
- [ ] The completion event contains `masumiPayment` and omits direct `credits`.
- [ ] The exact accepted completion payload is hashed and stored.
- [ ] The store is durable and idempotent by `blockchainIdentifier` in production.
- [ ] The settlement poller submits only after funds are locked or result submission is requested.
- [ ] Error states mark the pending payment dropped with safe diagnostic data.
- [ ] Restarting does not create a second payment or submit the result twice.

## Preprod progression

Use a dedicated test coworker and disposable test tasks.

### 1. Inspect-only

Set:

```sh
SOKOSUMI_API_URL=https://api.preprod.sokosumi.com
SOKOSUMI_TASK_POLLER_ENABLED=false
```

Verify the coworker profile, event list, and task read. Confirm no task event or usage record was created.

### 2. Claim-only

Enable one consumer in claim-only mode. Create one READY task and verify exactly one RUNNING event. Restart and verify no duplicate claim or domain effect.

### 3. Full behavior

Use separate tasks to verify:

- a successful domain action and COMPLETED event;
- a missing-input path and resumed completion;
- a safe provider failure;
- cancellation;
- a useful progress comment on a long-running task;
- usage and payment flows, if enabled.

Inspect both the Sokosumi board and private logs. Verify that user-visible text agrees with actual provider state.

### 4. Mainnet readiness

Do not switch the API URL until all preprod checks pass. Use the host's normal secret, deployment, canary, monitoring, and rollback procedures. Begin with a single worker replica and a controlled assignment set.

## Definition of done

The integration is done only when:

- [ ] The host performs real domain work instead of returning the package bootstrap response.
- [ ] One task consumer and one final-event owner are unambiguous.
- [ ] Status mapping is truthful for completion, missing input, failure, authorization, waits, and cancellation.
- [ ] Progress comments are status-neutral and sparse.
- [ ] External effects, usage, and payments are idempotent across restart.
- [ ] Failures are sanitized publicly and diagnosable privately.
- [ ] Identity and billing attribution are correct.
- [ ] The poller starts and stops with the host lifecycle.
- [ ] Deterministic tests cover normal, duplicate, resume, cancel, and failure paths.
- [ ] Preprod behavior matches the task board and provider state.
- [ ] The handoff documents configuration, verification, rollout, rollback, and intentionally omitted optional features.
