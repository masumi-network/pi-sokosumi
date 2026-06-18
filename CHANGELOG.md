# Changelog

## 0.1.5

- Added an optional `@masumi-network/pi-sokosumi/chat` helper for `/v1/chat` HTTP routes and standalone chat servers.
- Added generic chat request normalization with agent/surface validation, identity extraction, payload sanitization, auth/rate-limit hooks, and callback-based dispatch.

## 0.1.4

- Added `updateTask` to the HTTP Sokosumi client so the real client matches the shared client contract.
- Recovered rejected status-event transitions by patching the task status and preserving the user-visible comment, allowing terminal tasks restarted by user input to move back through running/completed states.

## 0.1.3

- Changed coworker failure handling so thrown task-processing errors post a `FAILED` task event instead of being downgraded to a comment-only event after prior terminal history.
- Disabled comment-only invalid-transition fallback for failed events so task status is not silently left successful when processing failed.

## 0.1.2

- Stripped `masumiPayment` from comment-only task-event fallbacks because Sokosumi only allows payment metadata on `COMPLETED` events.
- Added regression coverage for invalid terminal-transition fallback and terminal follow-up comment-only events carrying payment metadata.

## 0.1.1

- Changed Pi extension startup without `SOKOSUMI_COWORKER_API_KEY` to log a configuration error and register no Sokosumi tools.
- Removed the no-key mock-tool fallback from extension mode to avoid implying real task-board side effects.

## 0.1.0

- Extracted the reusable Sokosumi Pi extension from Pheme.
- Added the Sokosumi HTTP coworker client, mock client, task poller, identity helpers, and generic agent worker.
- Added Masumi completion-payment helpers for creating payments, attaching payment payloads to completed task events, storing pending result submissions, and polling settlement state.
- Added standalone TypeScript build and package metadata for GitHub/npm distribution.
