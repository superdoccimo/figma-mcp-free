# Release Evidence

This directory stores sanitized, machine-checked evidence for release candidates.

Create a template with:

```bash
pnpm desktop:evidence:template -- --platform windows
```

Validate a completed file with:

```bash
pnpm desktop:evidence:verify -- release-evidence/desktop-smoke-windows.json
```

Never commit a Figma PAT, bridge pairing token, private node JSON, private design screenshot, or credential-bearing environment output. A template with pending steps is not release evidence.

See [Figma Desktop smoke test](../docs/desktop-smoke-test.md).
