# Tester Guide

Use this guide when testing `@masumi-network/pi-sokosumi` in another Pi agent.

## Local Install

From a target agent repository:

```sh
pnpm add @masumi-network/pi-sokosumi@file:/absolute/path/to/pi-sokosumi
```

Or install the extension directly into Pi settings:

```sh
pi install -l /absolute/path/to/pi-sokosumi
```

Expected `.pi/settings.json` shape:

```json
{
  "packages": ["/absolute/path/to/pi-sokosumi"]
}
```

## Safe First Run

Start in mock mode by leaving `SOKOSUMI_COWORKER_API_KEY` unset:

```sh
unset SOKOSUMI_COWORKER_API_KEY
pi
```

Expected mock tools:

- `sokosumi_create_task`
- `sokosumi_update_task`
- `sokosumi_comment_on_task`
- `sokosumi_get_task`

These tools are local in-memory test tools only.

## API Mode

Set a Sokosumi coworker API key to use real coworker APIs:

```sh
export SOKOSUMI_API_URL=https://api.preprod.sokosumi.com
export SOKOSUMI_COWORKER_API_KEY=...
export SOKOSUMI_TASK_POLLER_ENABLED=false
pi
```

Expected API tools:

- `sokosumi_get_current_coworker`
- `sokosumi_list_coworker_events`
- `sokosumi_get_task`
- `sokosumi_create_task_event`
- `sokosumi_create_coworker_usage`

Keep `SOKOSUMI_TASK_POLLER_ENABLED=false` for the first API test so the agent can inspect Sokosumi without changing task state.

## Poller Test

Enable the poller only after API tools work.

Safe claim-only mode:

```sh
export SOKOSUMI_TASK_POLLER_ENABLED=true
export SOKOSUMI_TASK_POLL_INTERVAL_MS=15000
export SOKOSUMI_TASK_POLL_LIMIT=20
export SOKOSUMI_TASK_POLL_MAX_PAGES=10
export SOKOSUMI_TASK_POLLER_MODE=claim
export SOKOSUMI_TASK_POLLER_READY_STATUSES=READY
export SOKOSUMI_TASK_POLLER_SKIP_EXISTING_PROGRESS=true
export SOKOSUMI_TASK_POLLER_CLAIM_ENABLED=true
pi
```

`claim` mode posts a running/claim event only.

Completion mode:

```sh
export SOKOSUMI_TASK_POLLER_MODE=complete
export SOKOSUMI_TASK_POLLER_COMPLETE_COMMENT='Processed task "{task.name}"'
pi
```

Use `complete` mode only when the test intentionally expects completion events.

## Programmatic Imports

```ts
import sokosumiExtension from "@masumi-network/pi-sokosumi/extension";
import { createHttpSokosumiClient } from "@masumi-network/pi-sokosumi/client";
import { createSokosumiTaskPoller } from "@masumi-network/pi-sokosumi/poller";
```

## Checklist

1. Run `pnpm check` in the package repository.
2. Install locally into the target agent.
3. Start in mock mode and confirm mock tools are visible.
4. Switch to API mode with a coworker API key and keep the poller disabled.
5. Call `sokosumi_get_current_coworker`.
6. Enable `claim` poller mode.
7. Confirm in Sokosumi that a test task is claimed once and not duplicated on restart.

## Notes

- Do not use a Sokosumi admin token for agent runtime tests. Use a coworker API key.
- Do not enable completion mode unless the test explicitly expects completion events.
- Agent-specific task behavior belongs in the consuming agent, not in this package.
