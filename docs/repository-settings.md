# Recommended GitHub repository settings

Source code, workflows, templates, and documentation live in Git. Some GitHub repository settings do not. This checklist records the intended configuration so the upstream repository and serious forks can reproduce the same operating boundary.

## About section

Recommended description:

```text
Quota-aware, read-only Figma MCP toolkit with REST batching, an authenticated local plugin bridge, design tokens, and code generation.
```

Recommended topics:

```text
figma
mcp
model-context-protocol
figma-plugin
design-to-code
design-tokens
typescript
ai-coding
cursor
claude
codex
read-only
```

Do not describe the project as an official Figma product or as a write-capable replacement for Figma Dev Mode.

## General settings

- Default branch: `main`
- Preserve Issues and Pull Requests.
- Enable automatic deletion of merged head branches after the active development branches are cleaned up.
- Keep merge commits, squash merges, or rebase merges according to maintainer preference, but use squash for large generated implementation branches.
- Do not enable automatic publication or deployment without a separate approval path.

## Default branch ruleset

After all required workflows have completed successfully at least once on `main`, protect the default branch with:

- pull requests required for non-emergency changes;
- required status checks for the primary CI matrix;
- CodeQL required when code scanning is available;
- dependency review required for pull requests that change dependencies;
- conversation resolution required;
- force pushes blocked;
- branch deletion blocked;
- administrators allowed to perform an explicit emergency bypass with a recorded reason.

Do not require a status check before its workflow name has stabilized. A stale required check can make the repository impossible to merge.

## Security settings

- Enable private vulnerability reporting when available.
- Keep Dependabot alerts enabled.
- Keep dependency graph enabled.
- Review CodeQL alerts in the Security tab.
- Do not grant GitHub Actions broader permissions than each workflow needs.
- Do not store Figma PATs or Plugin Bridge pairing tokens as repository variables. Use secrets only for an approved CI workflow that genuinely needs them.

The current CI, fork audit, CodeQL, and dependency-review workflows use explicit minimal permissions.

## Fork expectations

Forks can run the same CI and fork-intelligence scripts without retaining the upstream repository owner in operational code. A fork that publishes packages must use its own npm scope and must not impersonate upstream releases.

## Release settings

Package publication and a public Figma Community plugin are separate external-release operations. Before enabling either:

1. verify package ownership;
2. use provenance-capable publishing;
3. create a signed or clearly attributable release tag;
4. run all CI, package-content, plugin-integrity, and CodeQL checks;
5. obtain human approval for publication;
6. document rollback and credential-rotation procedures.

## Review cadence

- Weekly: inspect the fork-intelligence workflow summary.
- On every dependency pull request: review the dependency-review result.
- Monthly: inspect open CodeQL and Dependabot alerts.
- Before each release: confirm README claims against current Figma documentation.
