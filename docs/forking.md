# Forking And Upstream Contribution

Forks are treated as active development surfaces, not disposable copies. A fork can reveal a missing feature or bug fix even when no issue was opened upstream.

## First setup

```bash
git clone https://github.com/<YOU>/figma-mcp-free.git
cd figma-mcp-free
git remote add upstream https://github.com/superdoccimo/figma-mcp-free.git
pnpm install --frozen-lockfile
pnpm check
```

Confirm repository context:

```bash
pnpm check:fork
```

Expected modes:

- `upstream`: origin resolves to `superdoccimo/figma-mcp-free`.
- `fork`: origin resolves to another GitHub owner/repository.
- `unknown`: no usable GitHub repository identity was found. Local build and tests still remain valid.

## Keeping a fork current

```bash
git fetch upstream
git switch main
git merge --ff-only upstream/main
git push origin main
```

Use a feature branch for changes:

```bash
git switch -c feat/clear-change-name
```

Avoid developing directly on the fork's default branch. A clean default branch makes upstream synchronization and comparison reliable.

## Fork intelligence audit

Maintainers can inspect all public forks without writing to them:

```bash
pnpm fork:audit
pnpm fork:audit:json > fork-audit.json
```

The audit reports:

- fork repository and default branch
- ahead/behind status relative to upstream
- last push time
- unique commit subjects when GitHub can compare the branches
- comparison errors without hiding the rest of the report

The command uses the public GitHub API. `GITHUB_TOKEN` is optional and only increases the read-rate allowance.

A commit found in a fork is not automatically copied. Before bringing it upstream:

1. Read the complete diff, not only the commit subject.
2. Confirm the code's license and authorship.
3. Check whether the change is still needed on current `main`.
4. Preserve attribution through a PR, co-authored commit, or clear commit message.
5. Run `pnpm check`.
6. Do not copy tokens, file IDs, generated private data, or unrelated local configuration.

## What works without upstream secrets

The ordinary CI path is intentionally secret-free:

- build
- typecheck
- unit and fixture tests
- offline smoke tests
- secret-pattern scan
- fork compatibility check
- package-content check

A fork pull request must not need a Figma token merely to prove the code builds.

Live API tests belong in a separately approved maintainer workflow using a dedicated test file and least-privilege token.

## Repository policy

[`repo.config.json`](../repo.config.json) is the canonical machine-readable policy.

Current guarantees:

- Runtime source is neutral to the upstream GitHub owner.
- Ordinary CI does not require secrets.
- `pull_request_target` is not allowed.
- Package publishing is opt-in.
- The workspace root remains private to prevent accidental npm publication.

Run the policy check after modifying workflows, package names, or runtime source:

```bash
pnpm check:fork
```

## Rebranding a long-lived fork

A fork that remains compatible and intends to contribute upstream can keep the canonical package names locally.

A fork that publishes divergent packages must:

1. Choose a new npm scope or package name.
2. Change package metadata and executable names that could be confused with upstream.
3. Retain the MIT license and copyright notice.
4. State clearly that it is a fork and is not an official upstream release.
5. Use its own release credentials and provenance.
6. Avoid publishing over any upstream-owned package name.

The GitHub repository name alone does not grant rights to an npm package name.

## Pull request preparation

Before opening a PR:

```bash
pnpm install --frozen-lockfile
pnpm check
git diff --check
```

The PR should explain:

- problem and user impact
- chosen solution
- compatibility effect
- security and privacy effect
- tests run
- API or plan assumptions that may change
- whether the idea or implementation originated in another fork

Large transport, plugin, authentication, write-capability, or package-publication changes should begin with an issue or RFC-style discussion.

## Conflict handling

Prefer a small rebase or merge that preserves meaningful commit history. Do not squash away third-party authorship merely to make a fork look native to upstream.

When two forks implement the same idea, compare behavior, tests, security and maintenance cost. Star count or commit age alone does not decide which implementation is adopted.
