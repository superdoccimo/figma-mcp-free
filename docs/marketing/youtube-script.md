# YouTube Script: Figma designをAIへ渡す2つの安全な道

Draft status: verify every product claim and setup command before recording.

## Title candidates

- Figma REST枠を節約しながらAIで実装する方法
- Figmaの現在選択をPATなしでMCPへ渡すLocal Bridge
- RESTとPluginを使い分けるfigma-mcp-free新版

Do not use “Figma Dev Modeを無料化” or “完全代替” in the title.

## 0:00 Hook

A small Figma MCP repository kept gaining stars and forks even without promotion. The reason was not simply price. Developers need a reliable bridge between design context and AI coding tools, but REST and editor-local access solve different problems.

Show the two-mode table:

- Local Plugin Bridge: current selection, no PAT, no REST call
- REST mode: URL, CI, headless, remote automation

## 0:35 Security boundary

Before the demo, state:

- read-only tools only;
- bridge binds to localhost;
- pairing token required;
- plugin transmits only after **Capture & Send**;
- snapshot is memory-only;
- generated code is a starter, not a pixel-perfect guarantee.

## 1:05 Offline verification

```bash
pnpm install --frozen-lockfile
pnpm -r build
MODE=offline ./scripts/demo.sh
```

Show generated output without credentials.

## 1:40 Local Plugin demo

1. start the bridge;
2. show the random pairing token;
3. open the Figma development plugin;
4. select a frame;
5. press **Capture & Send**;
6. call `inspect_current_selection` or bridge CLI `inspect`;
7. generate React starter code.

Point out that selection changes alone do not transmit anything.

## 3:00 REST demo

1. run `doctor` on a synthetic or approved public Figma URL;
2. use `inspect-selection` with bounded depth;
3. batch multiple IDs with `nodes`;
4. show cache and retry statistics;
5. explain why full-file polling is avoided.

Never show a real PAT, private file ID, Authorization header, or private layer text.

## 4:10 GitHub and fork operations

Show:

- Node.js 18, 20, and 22 CI;
- plugin-integrity check;
- CodeQL and dependency review;
- weekly fork intelligence;
- contributor credit for a fork-originated PAT-permission fix.

## 4:45 Honest comparison

State clearly:

- this is not the official Figma MCP output;
- this is not full Dev Mode;
- Local Plugin mode requires Figma Desktop;
- REST limits still apply in REST mode;
- write operations are intentionally absent.

## 5:10 Call to action

Ask viewers to:

- test the offline demo;
- report reproducible setup failures without secrets;
- contribute fixtures or fork improvements;
- star the repository if the dual-backend approach is useful.

End with the project thesis:

> Use REST where headless access matters, use an explicit local capture where the editor is already open, and keep credentials outside the model boundary.
