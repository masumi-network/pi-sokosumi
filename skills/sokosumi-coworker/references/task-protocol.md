# Sokosumi Task Protocol

## Contents

1. [Separate task status from event status](#separate-task-status-from-event-status)
2. [Choose the final decision](#choose-the-final-decision)
3. [Use specialized statuses deliberately](#use-specialized-statuses-deliberately)
4. [Use comments correctly](#use-comments-correctly)
5. [Respect event ownership](#respect-event-ownership)
6. [Understand poller lifecycle behavior](#understand-poller-lifecycle-behavior)
7. [Handle failures safely](#handle-failures-safely)
8. [Make effects idempotent](#make-effects-idempotent)
9. [Write useful task-board copy](#write-useful-task-board-copy)

## Separate task status from event status

Sokosumi task snapshots may use task statuses such as `draft`, `in_progress`, `awaiting_approval`, `done`, and `failed`, or may expose an observed event status. Coworker writes create task events with uppercase protocol statuses.

Do not patch the task directly merely to announce progress. Create task events through the client/tool. Let the package poller recover an invalid status transition through `updateTask` only when the API rejects the event and the client supports that recovery.

`CANCEL_REQUESTED`, `CANCELLED`, and `DONE` may be observed response aliases. Do not create them as task-event inputs. Create `CANCELED` or `COMPLETED` instead.

## Choose the final decision

Use this default decision set for host agent outcomes:

| Status | Use when | Comment requirement |
| --- | --- | --- |
| `COMPLETED` | All requested work and required writes are finished and confirmed | Summarize the result and identify the created/changed artifact when useful |
| `INPUT_REQUIRED` | The user must provide information, approval, setup, credentials, a choice, or clarification | Ask one specific, answerable question and explain why it blocks completion |
| `FAILED` | A runtime, provider, validation, or tool failure prevents completion | State a safe failure summary and a practical retry/next step |

Never return `COMPLETED` when the comment contains a required instruction such as “please connect,” “approve,” “choose,” “send,” or “confirm.” Return `INPUT_REQUIRED` or a specialized waiting status.

Do not equate model text generation with task completion. Require confirmation from every necessary external write. If only a draft was requested, producing the draft can be completion; if publishing was requested, a draft alone is not completion.

## Use specialized statuses deliberately

The creation API accepts these statuses:

| Status | Meaning or normal owner |
| --- | --- |
| `DRAFT`, `QUEUED`, `READY` | Intake/orchestrator lifecycle; do not use as a host final decision. The poller may use `READY` to reopen a terminal task after new user input. |
| `GRANT_PENDING` | A required grant is pending. |
| `RUNNING` | The coworker claimed or started the task. Let the worker/poller own this in automatic mode. |
| `INPUT_REQUIRED` | The user must provide missing input. |
| `APPROVAL_REQUIRED` | A prepared action needs explicit user approval. |
| `AUTHENTICATION_REQUIRED` | The user must authorize an account. Include a nonempty HTTPS `authenticationUrl`; do not include that field on other statuses. |
| `OUT_OF_CREDITS` | Work cannot continue until credits are available. |
| `CREDITS_TOPPED_UP` | Credits became available; normally a platform/integration transition rather than a final result. |
| `AWAITING_EXTERNAL` | Work is waiting on a third-party process that the user cannot immediately resolve. Explain what is pending and how completion will resume. |
| `COMPLETED` | Requested work is done. |
| `FAILED` | Processing failed. |
| `CANCELED` | Cancellation is acknowledged. The poller creates this from a cancel request. |

Prefer the default three-way decision unless Sokosumi UX or the host domain explicitly needs a specialized state.

## Use comments correctly

`sokosumi_comment_on_task` and `commentOnSokosumiTask` create an event with `origin: "SOKOSUMI"` and a comment but no status. They cannot change task status.

Use a status-neutral comment for a meaningful milestone, changed estimate, or discovered blocker before the final decision. Do not send timer-based “still working” noise. For short work, send no intermediate update.

Use `sokosumi_create_task_event` or a callback-returned event for deliberate transitions and the final response. The broad event tool accepts a required status plus optional comment, origin, credits, and authentication URL.

Do not include both `channel` and `origin`. The package APIs retain `origin` as a compatibility name for Sokosumi's event channel.

## Respect event ownership

Choose exactly one owner for each event class:

| Event | Recommended owner in automatic worker mode |
| --- | --- |
| `RUNNING` claim | Package worker/poller |
| Status-neutral progress | Host handler through the narrow comment helper |
| Final decision | Host handler return value, posted by package worker/poller |
| Usage record | Host `afterTaskEventCreated` hook or durable billing worker |
| Cancellation acknowledgement | Package poller |

Do not expose `sokosumi_create_task_event` to the inner model if its structured return is already mapped to a final event. Do not separately post the returned final event inside `createTaskHandler`; the poller posts it after the callback returns.

If the model is the sole tool-loop owner, give it explicit instructions:

- read the current task before deciding;
- use the narrow comment tool for progress;
- use the broad event tool once for the final state;
- inspect the tool result before claiming success;
- do not narrate an intended board update without calling the tool.

## Understand poller lifecycle behavior

With defaults, the package poller:

- pages through assigned coworker events and processes them oldest first;
- loads one task snapshot per task for the scan;
- processes a READY trigger and later user payload after coworker progress;
- skips a trigger that already has later coworker progress;
- posts a RUNNING claim before invoking completion behavior;
- converts a cancel request to one CANCELED event;
- skips terminal tasks unless later user input requests a restart;
- reopens a terminal task with READY, then runs and finalizes it after new user input;
- can close stale INPUT_REQUIRED tasks through a host callback when no later user payload exists;
- falls back to a comment-only event if a status transition is invalid and cannot be recovered;
- calls the before hook before the final create and the after hook only after an accepted final event.

The poller's processed ids, canceled task ids, and stale-input ids live in process memory. A restart, multiple replicas, or a crash between domain effects and task events can replay work. Design the host for that reality.

A particularly important crash window occurs after the package posts `RUNNING` but before it posts a final event. On restart, default progress detection can treat that `RUNNING` event as proof that the trigger was already handled, leaving the task stranded. If the product requires automatic recovery, use durable run leases and provider reconciliation with the lower-level poller's `hasTaskProgress` override. Resume only after the lease is stale, reuse the same domain idempotency keys, and do not post a second claim for the same run.

`poller.stop()` stops future interval callbacks but is not a drain promise for an active tick. Use a host-owned `tick()` scheduler when bounded graceful draining is required.

Do not override READY selection or existing-progress detection without tests for comments, attachments, media, terminal follow-up, and cancel events.

## Handle failures safely

Separate private diagnosis from public task copy.

Private logs may contain:

- sanitized exception class and message;
- provider status/code and correlation id;
- task id, trigger event id, attempt, and latency;
- whether an effect may have committed before the failure.

Public `FAILED` comments must not contain:

- credentials, tokens, delegated headers, signed URLs, or authentication URLs;
- stack traces, request/response dumps, SQL, or internal paths;
- hidden prompts, reasoning, tool schemas, or infrastructure names that do not help the user.

Catch expected provider errors in `createTaskHandler` and map them to safe failures. If using the lower-level poller, supply a sanitized `createFailedEvent`. Account for partial success: if a provider write may have succeeded, reconcile by idempotency key before retrying.

Use `INPUT_REQUIRED`, not `FAILED`, when the system works but required user-provided data is absent. Use `FAILED`, not `INPUT_REQUIRED`, when only an operator or code change can fix the problem.

## Make effects idempotent

At minimum, derive a stable operation key from:

```txt
coworker + taskId + triggerEventId + actionType + schemaVersion
```

Use the same key when retrying the same semantic action. Do not use timestamps or a new random UUID per attempt.

Protect:

- third-party creates/updates;
- messages, emails, posts, and deployments;
- final task events when the host posts them directly;
- coworker usage records;
- payment creation and result submission;
- durable job creation.

If the third party lacks idempotency support, store an outbox/operation record before the call and reconcile provider state after ambiguous failures.

## Write useful task-board copy

Keep updates brief and user-facing.

Progress pattern:

```txt
Status: Validated the source data and started the import.
Next: Reconcile 12 rejected rows, then publish the result.
```

Input-required pattern:

```txt
I need the destination workspace before I can create the report. Which workspace should I use?
```

Completed pattern:

```txt
Created the weekly report in Acme Operations and verified that all 248 rows were imported.
```

Failed pattern:

```txt
I couldn't publish the report because the provider is unavailable. No report was created; please retry.
```

Avoid “done,” “processed,” or “handled” without naming the result. Avoid internal plans, code-level mechanics, and claims that are not backed by a successful result.
