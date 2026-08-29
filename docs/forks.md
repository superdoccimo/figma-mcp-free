# Forks, downstreams, and contribution flow

Forks are a supported way to experiment with `figma-mcp-free`. The project is designed so operational code does not depend on the upstream owner name, a particular home directory, or one GitHub installation.

## Keep a fork current

```bash
git remote add upstream https://github.com/superdoccimo/figma-mcp-free.git
git fetch upstream
git switch main
git merge --ff-only upstream/main
git push origin main
```

Create downstream work on a separate branch rather than committing directly to the fork's `main` branch:

```bash
git switch -c feature/my-change
pnpm install --frozen-lockfile
pnpm run check
```

## Return improvements upstream

A useful fork commit is often better than a feature request because it includes executable evidence. Pull requests should state:

- the fork and commit where the change originated;
- the user problem it solves;
- whether the change remains read-only;
- tests and compatibility evidence;
- any upstream code or license attribution that must be preserved.

The pull request template includes a fork-provenance section. Maintainers should preserve author credit when adapting a downstream fix.

## Automated fork intelligence

`.github/workflows/fork-audit.yml` runs read-only. It discovers the canonical upstream from GitHub metadata, so the same workflow also works in a fork. On the upstream repository it enumerates the whole fork network and classifies each comparable fork as:

- in sync;
- behind upstream;
- ahead with unique work;
- diverged with unique work;
- uncomparable.

The workflow writes a Markdown report to the GitHub Actions summary. It never pushes to a fork, opens issues, or merges code automatically.

Run it locally with a GitHub token when the unauthenticated API limit is too small:

```bash
GITHUB_TOKEN=... node tools/audit-forks.mjs --repo owner/repository
```

In a fork, the script compares the current repository with its GitHub `parent` by default. Add `--all` to inspect the entire upstream fork network.

## Package names in a redistributed fork

The source checkout works under any repository owner. Publishing a modified fork to npm is different: the upstream package names may already be owned by the upstream project. Downstream publishers should use their own npm scope and clearly document compatibility. Do not impersonate an upstream release.

## Security inheritance

Local Figma PATs are stored with owner-only POSIX permissions where supported. This hardening originated in the fork commit by `mogaming217` and was adapted upstream with atomic replacement and diagnostics. Forks should keep this behavior unless they replace local token storage with a stronger platform credential store.
