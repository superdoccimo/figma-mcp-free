# Blog Outline: Choose the right figma-mcp-free setup

Draft status: package installation commands must match the actual published state. The repository is currently source-checkout first.

## Opening decision

Ask one question first:

> Is the target design open in Figma Desktop right now?

- Yes: use Local Plugin Bridge.
- No, or the workflow is CI/headless/remote: use REST mode.

## Shared installation

```bash
git clone https://github.com/superdoccimo/figma-mcp-free.git
cd figma-mcp-free
pnpm install --frozen-lockfile
pnpm -r build
```

Run the offline fixture before adding credentials.

## Path A: Local Plugin Bridge

1. start `figma-mcp-free-bridge serve`;
2. create a local manifest from a Figma-issued plugin ID;
3. import the development plugin;
4. paste the loopback URL and pairing token;
5. select a node and press **Capture & Send**;
6. inspect or generate through the bridge CLI or MCP tools.

Show that no PAT is configured and no REST call is made for the captured selection.

Security callouts:

- loopback only;
- explicit capture;
- memory-only snapshot;
- token not persisted by plugin UI;
- no write tools.

## Path B: REST mode

1. set `FIGMA_TOKEN` or run interactive `init`;
2. copy a `/file` or `/design` URL with `node-id`;
3. run `doctor`;
4. use `inspect-selection` first;
5. use `nodes` for multiple IDs;
6. export tokens and generate starter code;
7. use `--refresh` only when necessary.

Explain why `init --token ...` in a shell command is not the recommended demonstration because shell history can retain secrets.

## Unified MCP configuration

Show optional environment values for both backends and explain that credentials are not tool arguments.

Link the generic PAT-free example:

```text
examples/local-plugin-config/mcp.json
```

## Verification section

```bash
pnpm run check
pnpm run pack:check
```

Explain plugin integrity, fork portability, CodeQL, and dependency review.

## Troubleshooting section

Cover:

- unauthorized bridge token;
- Figma manifest network block;
- missing snapshot;
- 401/403 PAT failures;
- 429 and long Retry-After;
- unsupported `/slides` URLs;
- private output handling.

## Closing

Emphasize the read-only boundary and the choice between local current-selection access and headless REST access. Avoid claiming unlimited API capacity or complete Dev Mode equivalence.
