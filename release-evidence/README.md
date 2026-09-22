# Release evidence

Place sanitized Figma Desktop smoke evidence JSON files here (for example `desktop-smoke-windows.json`).

Rules:

- Commit only sanitized evidence produced from `pnpm desktop:evidence:template`.
- Never commit PATs, bridge pairing tokens, private node JSON, or screenshots with confidential designs.
- Evidence is platform-specific (`windows` or `macos`) and must match the candidate tarball SHA-256.
- Passing evidence does not publish anything; publication still requires explicit human approval.

See `docs/desktop-smoke-test.md` for the runbook.
