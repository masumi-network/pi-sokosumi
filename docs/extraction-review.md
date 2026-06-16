# Extraction Review

Review date: 2026-06-16

## Summary

The Sokosumi Pi extension is suitable for extraction as a reusable package. The core modules are already generic and callback-driven, and the Pheme-specific behavior lives in the consuming app rather than in this package.

## Findings

### High

None found in the generic Sokosumi/Masumi package behavior covered by the current tests.

### Medium

- Public TypeScript declarations are still weak because several implementation files use `@ts-nocheck` and untyped option objects. This does not block GitHub consumption, but it should be improved before a polished public npm release.
- The package should not be publicly published until the Masumi team confirms the license. The extracted package currently uses `UNLICENSED` intentionally.
- The Masumi memory store is not durable. Production consumers must provide persistent storage before relying on settlement polling.

### Low

- The Masumi settlement poller currently finds payments by listing payments and matching `blockchainIdentifier`. A targeted lookup would be more efficient if the Masumi API exposes one.
- The package still exports an explicit mock client for direct unit tests, but the Pi extension no longer registers mock tools when coworker credentials are missing.

## Validation

The source package passed the Pheme monorepo typecheck. The Sokosumi poller and Masumi payment unit tests passed inside the full Pheme unit run.

The full Pheme unit run had one unrelated failure in a Pheme UI social-channel label assertion:

```txt
list_channels and list_scheduled_posts expose user-scoped schedule state
expected /LinkedIn personal profile: Team LinkedIn/
actual "Available channels: LinkedIn: Team LinkedIn, LinkedIn: Fake LinkedIn Org @fake-linkedin-org, X: Team X @team_x."
```

That failure is outside the extracted package boundary.

## Recommended Follow-ups

- Replace permissive `@ts-nocheck` public modules with explicit exported option/result types.
- Add a durable payment-store example for Postgres or another production database.
- Add an integration test harness for a fake Sokosumi API server.
- Confirm license and registry before npm publication.
