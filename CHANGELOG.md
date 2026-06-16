# Changelog

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
