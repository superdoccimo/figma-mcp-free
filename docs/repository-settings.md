# Recommended GitHub Repository Settings

Source files can define workflows and policy checks, but branch rules, security toggles, merge behavior, and repository metadata live outside the Git tree. Apply this checklist after the related pull request is merged.

## About

Recommended description:

> Rate-aware, read-only Figma tooling for MCP, CLI, design tokens, and starter UI code generation.

Recommended topics:

- `figma`
- `mcp`
- `model-context-protocol`
- `design-tokens`
- `code-generation`
- `typescript`
- `read-only`
- `developer-tools`

Keep the homepage empty until a maintained project site exists.

## Code security and analysis

In **Settings → Code security and analysis**:

1. Enable **Dependency graph**. Until it is enabled, the dependency workflow runs a committed-lockfile audit; that fallback is useful but is not change-aware dependency review.
2. Enable **Dependabot alerts** and **Dependabot security updates**.
3. Enable **Secret scanning** and **Push protection** when GitHub offers them for the repository.
4. Enable **Private vulnerability reporting** so sensitive reports do not require a public issue.
5. Confirm that the repository accepts CodeQL results from the `CodeQL` workflow.

Never add a live Figma PAT merely to make ordinary pull-request CI pass. Standard CI and fork PRs are intentionally secret-free.

## Ruleset for the default branch

Create a ruleset targeting `main` with these protections:

- require a pull request before merging;
- require conversation resolution;
- block force pushes;
- block branch deletion;
- require `verify (18.x)`, `verify (20.x)`, and `verify (22.x)`;
- require `verify (windows-latest, 22.x)` and `verify (macos-latest, 22.x)`;
- require both `Analyze (javascript-typescript)` and `Analyze (actions)` after the CodeQL workflow has passed once;
- require `Dependency review` after the workflow has passed once;
- dismiss stale approvals when the head commit changes if more maintainers are added later;
- allow repository administrators to bypass only for documented recovery work.

For a single-maintainer project, a mandatory second approval can stop all maintenance. Keep review evidence in the PR, require green checks, and add a reviewer requirement when another active maintainer exists.

## Pull requests and merges

Recommended merge settings:

- enable squash merging;
- disable merge commits unless preserving third-party history requires one;
- allow rebase merging for carefully attributed fork contributions;
- automatically delete head branches after merge;
- enable branch updates so contributors can bring stale PRs current without recreating them;
- keep auto-merge disabled until required checks and the branch ruleset are stable.

When adapting work from a fork, preserve the original author in the PR body and commit trailer instead of erasing provenance through an anonymous squash.

## Actions

- Keep the default workflow token read-only. Each workflow declares its own minimal permissions.
- Require approval for workflows from first-time external contributors.
- Do not expose repository or environment secrets to untrusted fork pull requests.
- Review third-party action upgrades through Dependabot before merging them.
- Run **Fork intelligence** manually once and confirm that both Markdown and JSON reports are retained as an artifact.

## Releases

Before the first package publication:

1. Create a protected `release` environment.
2. Require human approval for that environment.
3. Use npm trusted publishing or another provenance-capable flow instead of a long-lived token where supported.
4. Publish only from a reviewed tag whose commit passed the complete CI matrix.
5. Verify the registry package before adding `npm install` or `npx` commands to public documentation.
6. For the local Figma Plugin bridge, record a real Figma Desktop smoke test on the exact release candidate.

## Verification after settings changes

1. Open a documentation-only test PR from a branch.
2. Confirm all required checks appear and finish.
3. Confirm the PR cannot merge while a required check is failing.
4. Confirm a fork PR receives no repository secrets.
5. Confirm direct pushes and force pushes to `main` are blocked according to the ruleset.
6. Re-read the ruleset through the GitHub API or repository settings screen and record the effective configuration.
