# figma-mcp-free Documentation

`figma-mcp-free` is a quota-aware, read-only Figma toolkit with two complementary backends:

- REST mode for URLs, headless jobs, CI, and remote automation;
- an authenticated Local Plugin Bridge for the design currently open in Figma Desktop.

Both backends share the same compact inspector and starter-code generator. The project does not claim to reproduce Figma Dev Mode or the official Figma MCP output, and it exposes no Figma write tools.

## Start here

- [Quickstart](./quickstart.md): choose REST or Local Plugin mode and verify the installation.
- [Architecture](./architecture.md): backend, credential, cache, and write boundaries.
- [Troubleshooting](./troubleshooting.md): authentication, rate limits, plugin manifest, CSP, pairing, and MCP client issues.
- [Local Plugin Bridge](../plugins/local-bridge/README.md): complete Figma Desktop development-plugin setup.
- [Japanese guide](../jp/README.md): detailed Japanese installation and operation guide.

## Project operation

- [Why this exists](./why-this-exists.md): current product rationale and non-goals.
- [Fork support](./forks.md): downstream synchronization, provenance, and read-only fork intelligence.
- [Recommended repository settings](./repository-settings.md): About metadata, topics, rulesets, and security settings that live outside Git.
- [Launch and release checklist](./launch-checklist.md): validation gates before publication.
- [Security policy](../SECURITY.md): private reporting and threat boundaries.
- [Contributing](../CONTRIBUTING.md): compatibility, API-cost, test, and provenance requirements.
- [Canonical requirements](../figma_mcp_requirements.md): current functional and non-functional specification.
- [Roadmap](../ROADMAP.md): approved future slices.
- [Changelog](../CHANGELOG.md): implemented changes.

## Supporting material

- [Demo runbook](./demo/runbook.md): repeatable local demonstration commands.
- [Marketing drafts](./marketing/): draft content only; technical claims must be checked against the current README and official Figma documentation before publication.
- [Assets](./assets/): documentation diagrams.

The old “free complete Dev Mode alternative” framing is not the current project definition. Use the canonical requirements and root README for present-day claims.
