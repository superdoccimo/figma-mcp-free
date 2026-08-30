# Standalone npm Distribution

The public distribution is intentionally one package: `figma-mcp-free`.

The repository remains a pnpm workspace because the internal boundaries are useful for development, tests, and fork contributions. Publishing every internal workspace package would make first use depend on scoped-package ownership, release ordering, and six synchronized versions. The release candidate instead bundles the five internal runtime packages inside one npm tarball while leaving ordinary third-party dependencies visible to npm.

## User-facing commands

After a verified npm release, one package provides these entry points:

```text
figma-mcp-free                 REST/offline CLI, plus command dispatch
figma-mcp-free bridge ...      local bridge commands
figma-mcp-free mcp             MCP STDIO server
figma-mcp-free plugin ...      development Plugin setup and verification
```

Compatibility aliases are also included:

```text
figma-mcp-free-cli
figma-mcp-free-bridge
figma-mcp-free-mcp
figma-mcp-free-plugin
```

The package is not published merely because the tarball builds. Public installation commands must be added only after the registry package is independently verified.

## Build a local candidate

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm dist:pack -- --output ./release-artifacts
```

The output directory contains:

- `figma-mcp-free-<version>.tgz`
- `release-manifest.json` with source commit, size, bundled-package list, and SHA-256

The stage process rejects any remaining `workspace:` protocol in the public or bundled manifests.

## Clean-install proof

```bash
pnpm dist:smoke
```

This command creates a temporary empty consumer project, installs only the generated tarball, and verifies:

1. all internal packages are present inside the installed package;
2. the main CLI, bridge, and Plugin help commands start;
3. offline React starter generation works from the packaged examples;
4. Plugin files can be generated and verified on a custom loopback port;
5. the MCP process starts without requiring a Figma PAT at startup.

The smoke test runs in CI on Ubuntu with Node.js 18, 20, and 22, and on Windows and macOS with Node.js 22.

## Installed development Plugin setup

```bash
figma-mcp-free plugin create-manifest <FIGMA_PLUGIN_ID> \
  --port 3845 \
  --out-dir ./figma-mcp-free-plugin

figma-mcp-free plugin verify ./figma-mcp-free-plugin
```

The generated manifest permits only `127.0.0.1` and `localhost` on the chosen port. It does not add wildcard or remote domains.

## Release boundary

A registry publication or GitHub Release remains blocked until all of the following are true:

- exact-head CI, CodeQL, and dependency review are green;
- clean tarball installation succeeds on the supported Node/OS matrix;
- a real Figma Desktop smoke test is completed against the candidate tarball;
- the evidence file passes `pnpm desktop:evidence:verify`;
- a human explicitly approves publication.

See [Desktop smoke test](desktop-smoke-test.md) and [Release policy](releasing.md).
