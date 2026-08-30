# Figma Desktop Smoke Test

Automated CI proves the Node.js bridge protocol, package installation, authentication, Host validation, bounded payloads, MCP schemas, and the static absence of Figma write APIs. It cannot operate the real Figma Desktop editor.

This runbook turns the remaining manual check into a reproducible release gate rather than an informal “it seemed to work” note.

## Platform scope

- REST, CLI, MCP, and the bridge server are tested on Linux, Windows, and macOS.
- End-to-end development Plugin verification requires Figma Desktop, so the evidence platform must be `windows` or `macos`.
- Do not claim a platform is Desktop-verified until a passing evidence file exists for that platform.

## Safety rules

Use a non-confidential sample Figma file. Never record or attach:

- a Figma PAT;
- the bridge pairing token;
- private node JSON;
- screenshots containing private design data;
- environment dumps containing credentials.

A failed or ambiguous step blocks publication. Restarting the bridge after a possible token exposure invalidates the old token, but the smoke test must then be repeated from pairing onward.

## 1. Build the exact candidate

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm dist:pack -- --output ./release-artifacts
```

Record the tarball SHA-256 from `release-artifacts/release-manifest.json`.

Install the tarball into a clean test environment. Do not test an older global installation.

## 2. Create the evidence template

Windows:

```bash
pnpm desktop:evidence:template -- \
  --platform windows \
  --output release-evidence/desktop-smoke-windows.json
```

macOS:

```bash
pnpm desktop:evidence:template -- \
  --platform macos \
  --output release-evidence/desktop-smoke-macos.json
```

Fill in the operating-system version, Figma Desktop version, execution time, and tarball SHA-256. Do not insert the pairing token anywhere.

## 3. Generate the development Plugin

From the installed candidate:

```bash
figma-mcp-free plugin create-manifest <FIGMA_GENERATED_PLUGIN_ID> \
  --port 3845 \
  --out-dir ./figma-mcp-free-plugin

figma-mcp-free plugin verify ./figma-mcp-free-plugin
```

Import the generated `manifest.json` in Figma Desktop as a development Plugin.

## 4. Execute every evidence step

Use the candidate package for all commands.

1. `install-candidate`: confirm the clean tarball installation and version.
2. `generate-plugin-manifest`: generate and verify the bounded loopback manifest.
3. `import-development-plugin`: import it into Figma Desktop without changing the tracked template.
4. `start-loopback-bridge`: run `figma-mcp-free bridge serve`.
5. `test-pairing`: paste the ephemeral token into the open Plugin UI and test the connection.
6. `capture-sample-selection`: select a non-confidential frame and press **Capture & Send**.
7. `read-bridge-status`: run `figma-mcp-free bridge status`.
8. `list-current-selections`: confirm the lightweight selection list through MCP or the bridge CLI.
9. `inspect-current-selection`: generate bounded implementation context.
10. `generate-react-starter`: generate React starter code and inspect it for obvious corruption.
11. `clear-snapshot`: clear the in-memory snapshot and confirm it is no longer readable.
12. `restart-rotates-session`: restart the bridge and confirm both session ID and pairing token changed.

Mark a step `pass` only after observing it. Notes should describe outcomes without copying private payloads.

## 5. Confirm the read-only boundary

During the complete run:

- no Figma object is created, edited, moved, deleted, or published;
- no variable or Plugin data is written;
- the pairing token is not persisted;
- only one bounded snapshot exists in bridge memory;
- selection changes alone send nothing.

Set the four attestation fields accordingly.

## 6. Validate the evidence

```bash
pnpm desktop:evidence:verify -- release-evidence/desktop-smoke-windows.json
```

The verifier checks the stable source fingerprint, candidate version, tarball hash, exact step set, loopback URL, read-only attestations, and absence of credential-bearing fields.

The source fingerprint excludes `release-evidence/`, so committing sanitized evidence does not invalidate the code fingerprint it attests to.

## Publication decision

A passing evidence file proves only the recorded platform and candidate. It does not publish anything. npm publication, a GitHub Release, or a Figma Community submission still requires an explicit human approval after the final candidate SHA and package digest are reviewed.
