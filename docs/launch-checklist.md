# Launch And Release Checklist

Use this before announcing a major capability, publishing a package, or creating a stable release.

## Source integrity

- [ ] Working tree is clean.
- [ ] Release commit is reviewed and identified.
- [ ] `pnpm install --frozen-lockfile` succeeds.
- [ ] `pnpm check` succeeds.
- [ ] `git diff --check` succeeds.
- [ ] No token, private file ID, private text, raw private response or local username is tracked.

## Compatibility

- [ ] CLI commands and JSON fields are documented.
- [ ] MCP tool names and schemas are tested.
- [ ] Exported package APIs are typechecked.
- [ ] Generated-code fixtures are reviewed.
- [ ] Breaking changes have migration instructions and an appropriate version.
- [ ] English and Japanese README files agree on capability status.

## Fork readiness

- [ ] `pnpm check:fork` passes in upstream context.
- [ ] `pnpm check:fork` passes in simulated fork context.
- [ ] Ordinary CI requires no repository secrets.
- [ ] Workflows do not use `pull_request_target`.
- [ ] Checkout credentials are not persisted in read-only CI.
- [ ] Useful fork commits were reviewed and attribution preserved.

## Figma behavior

- [ ] Official documentation was checked for volatile API or plan behavior.
- [ ] Offline tests do not require a token.
- [ ] Live tests use a dedicated non-sensitive file and least-privilege token.
- [ ] Rate limits produce structured, safe diagnostics.
- [ ] Large inputs have explicit depth, count, size or batch bounds.

## Security

- [ ] Read and write capabilities remain separate.
- [ ] No new arbitrary shell, file or network access was added without review.
- [ ] A new listener binds safely and authenticates sessions.
- [ ] Persistent storage, if any, is explicit and documented.
- [ ] Error output does not expose tokens or private design content.
- [ ] `SECURITY.md` covers the new boundary.

## Distribution

- [ ] Intended package names are owned and available.
- [ ] Packed tarballs contain only intended files.
- [ ] Installation was tested from clean archives.
- [ ] Publication requires human approval.
- [ ] Artifact provenance and source commit are clear.
- [ ] GitHub Release, tag, changelog and package versions match.
- [ ] Documentation does not advertise an artifact before public verification.

## Announcement

- [ ] State what is implemented.
- [ ] State what is not implemented.
- [ ] Include safe installation and verification commands.
- [ ] Link the changelog and migration notes.
- [ ] Avoid fixed quota claims that may become stale.
