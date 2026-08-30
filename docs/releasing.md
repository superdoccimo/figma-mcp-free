# Release Policy

This document distinguishes release readiness from package publication. A package manifest containing `publishConfig` does not prove that a package is currently available on npm.

## Current publication status

Until a GitHub Release and changelog explicitly identify published package versions, users should install from a source checkout.

Documentation must not advertise `npx`, `pnpm dlx`, npm package installation, or an MCP registry entry before the corresponding artifact is verifiably public.

## Release gate

A release candidate must pass:

```bash
pnpm install --frozen-lockfile
pnpm check
```

The gate includes build, typecheck, tests, offline smoke checks, secret scanning, fork compatibility, and package-content verification.

Additional release checks:

1. No real token, private file ID, generated private response, or local path in tracked files.
2. README and Japanese README describe the same supported capabilities.
3. MCP tool schemas and CLI machine-readable output remain compatible or include documented migration.
4. Every package contains the expected license, README, entry point and type declarations.
5. Generated package archives are inspected before publication.
6. `CHANGELOG.md` identifies user-visible changes and breaking changes.
7. A tag and release title use the same version.
8. Published artifacts are created from the tagged commit, not an uncommitted working tree.

## Versioning

Use semantic versioning once the first stable package set is published:

- Patch: backward-compatible bug fix or documentation correction shipped with code.
- Minor: backward-compatible feature, tool, command or exported API.
- Major: removal, rename, behavior change, schema change, or default that can break existing automation.

Before `1.0.0`, compatibility still matters. A `0.x` version is not permission to silently break MCP configurations.

## Multi-package versioning

The initial public release should use one coordinated version across packages unless there is a demonstrated need for independent versioning. Coordinated versions make issue reports and compatibility matrices easier to understand.

A future independent-version strategy requires a release tool, dependency-range policy and documented rollback procedure.

## Safe publication direction

The preferred future publication flow is:

1. Maintainer-approved version change and changelog PR.
2. CI passes on the exact commit.
3. Protected release environment requires human approval.
4. npm trusted publishing or short-lived provenance is used instead of a long-lived token when available.
5. GitHub Release is created with checksums and package list.
6. Installation commands are added to documentation only after public verification.

Publishing remains an external side effect. It must never run from ordinary pull request CI or from an untrusted fork.

## Fork releases

A fork may release its own variant under the MIT license, but it must use distinct package names or scope, identify itself as a fork, preserve attribution, and use its own credentials.

Upstream does not accept a PR that adds a fork maintainer's publishing secret or automatically publishes on every push.

## Rollback

If a package is broken:

- Do not overwrite an existing immutable version.
- Deprecate the bad npm version with a clear message.
- Publish a corrected patch version.
- Record the incident and affected versions in the changelog or security advisory as appropriate.
- Keep the source tag for forensic comparison.
