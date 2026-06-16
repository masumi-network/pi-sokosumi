# Publishing Notes

This repository is prepared for GitHub consumption and npm-style packaging, but public publication should wait for a few explicit decisions.

GitHub dependency installs build `dist` through the package `prepare` script. Published tarballs include `dist/extensions` and `dist/src`.

## Required Decisions Before Public npm Publish

- Confirm package scope: `@masumi-network/pi-sokosumi`.
- Confirm registry: npm public registry, GitHub Packages, or both.
- Confirm license. The package currently uses `UNLICENSED` to avoid assigning a legal license by assumption.
- Confirm whether the first public release should include full public API typings or keep the current permissive declarations.

## Local Validation

```sh
pnpm install
pnpm check
pnpm pack --dry-run
```

## Publish to npm

After the package name, registry, and license are confirmed:

```sh
pnpm version patch
pnpm publish --access public
```

## Publish to GitHub Packages

Add an `.npmrc` configured for GitHub Packages, then publish with the org scope.

```ini
@masumi-network:registry=https://npm.pkg.github.com
```

```sh
pnpm publish
```

## Release Checklist

1. Run `pnpm check`.
2. Run `pnpm pack --dry-run` and inspect included files.
3. Install the packed tarball into a sample Pi agent.
4. Test missing-key startup and confirm no tools are registered.
5. Test API mode with the poller disabled.
6. Test claim-only poller mode.
7. Test Masumi hooks with a fake client/store or preprod credentials.
8. Tag the release after publication.
