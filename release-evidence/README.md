# Release Evidence

This directory stores sanitized Figma Desktop smoke-test evidence for release candidates.

## Rules

- Commit only sanitized JSON evidence produced from `pnpm desktop:evidence:template`.
- Never commit PATs, bridge pairing tokens, private node payloads, or screenshots with confidential designs.
- Evidence files are platform-specific (`windows` or `macos`) and must match the candidate tarball SHA-256.
- Passing evidence does not publish anything; publication still requires explicit human approval.

See `docs/desktop-smoke-test.md` for the full runbook.
