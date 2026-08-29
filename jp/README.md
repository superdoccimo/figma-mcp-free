# figma-mcp-free 日本語ガイド

`figma-mcp-free`は、FigmaのdesignをAI clientやterminalから読むための、無料・read-only・quota-awareなMCP server／CLIです。

Claude、Cursor、Codex、Windsurf、Clineなどから、次の処理ができます。

- 選択layerを実装向けの小さなJSONへ整理
- 複数node IDを一括取得
- React / Vue / Svelte / HTMLのstarter code生成
- W3C形式を意識したDesign Token出力
- Figma URLと`node-id`の自動正規化
- API制限を考慮したcache、重複排除、timeout、Retry-After処理
- fork差分の自動監査と本家への還流支援

現在は2つのread経路があります。

| mode | 向いている用途 | Figma PAT | REST API枠 | Figma Desktop |
| --- | --- | --- | --- | --- |
| Local Plugin Bridge | いまFigmaで開いて選択しているdesign | 不要 | 使わない | 必要 |
| REST mode | URL、headless処理、CI、remote automation、file全体 | 必要 | 節約して使う | 不要 |

どちらにもFigmaへのwrite toolはありません。Figma公式MCP、Figma Dev Mode、write可能なFigma Pluginの代替を名乗るものでもありません。

英語版は[ルートREADME](../README.md)です。

## なぜ2つのmodeがあるのか

Figma REST APIの制限は、endpoint、seat、plan、対象fileが置かれたplanによって変わります。最新値はFigma公式の[REST API Rate Limits](https://developers.figma.com/docs/rest-api/rate-limits/)で確認してください。

REST modeでは、API callを使い捨てにしません。

1. 複数node IDは`get_nodes`でまとめる
2. 同一requestが同時に来たら1回へ束ねる
3. MCP server内では短時間memory cacheする
4. file全体より必要なnodeを狭く読む
5. 長い`Retry-After`では無駄な自動再試行をしない
6. `doctor`でrate-limit metadataを安全に表示する

一方、Figma Desktopで開いている現在の選択は、Local Plugin BridgeがFigma内部で`JSON_REST_V1`へexportし、認証付きlocalhostへ1 snapshotだけ送ります。この経路はPATもREST callも必要ありません。

## 現在の状態

- REST MCP server: 利用可能
- REST CLI: 利用可能
- Local Plugin Bridge: 利用可能
- Local Plugin用CLI: 利用可能
- offline generator demo: 利用可能
- fork intelligence: 利用可能
- npm公開: まだ行っていません
- write tool: 未提供

現在はsource checkoutで使います。

# 共通インストール

## 1. 必要な環境

- Node.js 18以上
- pnpm 9系
- MCP対応client、またはterminal
- Local Plugin modeではFigma Desktop
- REST modeではFigma Personal Access Token

```bash
node --version
pnpm --version
```

## 2. cloneとbuild

```bash
git clone https://github.com/superdoccimo/figma-mcp-free.git
cd figma-mcp-free
pnpm install --frozen-lockfile
pnpm -r build
```

## 3. tokenなしのoffline確認

```bash
pnpm --filter figma-mcp-free dev -- \
  generate-from-json ./examples/sample-node.json \
  --framework react \
  --use-tokens ./examples/sample-tokens.json
```

Figmaへ接続せず、clone、依存関係、build、generatorを確認できます。

# Local Plugin Bridge

Figma Desktopで現在選択しているnodeを読みたい場合はこちらを使います。

## 1. Bridge serverを起動

```bash
pnpm --filter figma-mcp-free bridge -- serve
```

またはbuild後に直接起動します。

```bash
node packages/cli/dist/bridge-cli.js serve
```

起動時に次が表示されます。

- `http://127.0.0.1:3845`などのloopback URL
- randomなpairing token
- read-only / memory-onlyであること

terminalは開いたままにします。pairing tokenは秘密情報として扱ってください。

固定tokenを使う場合:

```bash
FIGMA_PLUGIN_BRIDGE_TOKEN="十分に長いrandom文字列" \
  node packages/cli/dist/bridge-cli.js serve
```

PowerShell:

```powershell
$env:FIGMA_PLUGIN_BRIDGE_TOKEN = "十分に長いrandom文字列"
node packages/cli/dist/bridge-cli.js serve
```

## 2. Figma development pluginを準備

Plugin IDはFigmaが発行します。Figma Desktopでdevelopment pluginを一度作成し、そのmanifestにある数字のIDを使います。

```bash
node plugins/local-bridge/create-manifest.mjs <FIGMA_GENERATED_PLUGIN_ID>
```

これで次が生成されます。

```text
plugins/local-bridge/manifest.json
```

このfileをFigma Desktopへdevelopment pluginとしてimportします。生成manifestはGit管理対象外です。

checked-in templateはproduction domainを一切許可せず、development時の以下だけを許可します。

```text
http://127.0.0.1:3845
http://localhost:3845
```

portを変更する場合はlocalの`manifest.json`にある`networkAccess.devAllowedDomains`も同じportへ変更してください。

## 3. 選択nodeをcapture

1. FigmaでLocal Bridge pluginを開く
2. Bridge URLとpairing tokenを貼る
3. `Test connection`を押す
4. frame、component、instance、group、textなどを選択する
5. `Capture & Send`を押す

selectionを変えただけでは送信されません。buttonを押した時だけ、選択nodeをREST互換JSONへexportしてlocalhostへ渡します。

## 4. Bridge CLIから使う

```bash
export FIGMA_PLUGIN_BRIDGE_URL="http://127.0.0.1:3845"
export FIGMA_PLUGIN_BRIDGE_TOKEN="<PAIRING_TOKEN>"

node packages/cli/dist/bridge-cli.js status
node packages/cli/dist/bridge-cli.js current
node packages/cli/dist/bridge-cli.js inspect --depth 2 --max-children 20
node packages/cli/dist/bridge-cli.js generate --framework react
```

複数nodeをcaptureした場合:

```bash
node packages/cli/dist/bridge-cli.js inspect --index 1
node packages/cli/dist/bridge-cli.js generate --index 2 --framework vue
```

memory snapshotを消す:

```bash
node packages/cli/dist/bridge-cli.js clear
```

詳細は[Local Figma Plugin Bridge](../plugins/local-bridge/README.md)を参照してください。

# REST mode

URLから読む、Figma Desktopのないmachineで動かす、CIや自動化に使う場合はこちらです。

## 1. Personal Access Token

一時利用では環境変数を推奨します。

```bash
export FIGMA_TOKEN="figd_..."
```

PowerShell:

```powershell
$env:FIGMA_TOKEN = "figd_..."
```

local configへ保存する場合:

```bash
pnpm --filter figma-mcp-free dev -- init
```

安全上の仕様:

- token値は出力しない
- POSIXではconfig directoryを`0700`、fileを`0600`へ制限
- temp fileへ書き、`fsync`後にatomic replace
- `doctor`と`config security`でpermission確認

```bash
pnpm --filter figma-mcp-free dev -- config security
```

`--token`をcommand lineへ書くとshell historyへ残る可能性があります。interactive入力か環境変数の方が安全です。

## 2. 対応Figma URL

```text
https://www.figma.com/file/<FILE_ID>/...?node-id=1-2
https://www.figma.com/design/<FILE_ID>/...?node-id=1-2
```

`node-id=1-2`はAPI形式`1:2`へ自動変換します。

現在のREST pipelineでは`/slides/...`を扱いません。

## 3. doctor

```bash
FIGMA_URL="https://www.figma.com/design/<FILE_ID>/Example?node-id=1-2"
pnpm --filter figma-mcp-free dev -- doctor "$FIGMA_URL"
```

JSON output:

```bash
pnpm --filter figma-mcp-free dev -- doctor "$FIGMA_URL" --json
```

確認内容:

- Node.js / pnpm
- 環境変数PAT
- local PAT
- config permission
- URL / node ID
- optionalなAPI access
- rate-limit metadata
- read-only boundary

## 4. 選択layerをcompactに読む

```bash
pnpm --filter figma-mcp-free dev -- \
  inspect-selection "$FIGMA_URL" \
  --depth 2 \
  --max-children 20
```

主な内容:

- size / position
- Auto Layout
- padding / spacing
- fills / strokes / shadows
- text style
- component properties
- boundedなchild summary

省略するもの:

- image bytes
- private image reference値
- vector path全量
- 無制限のchild tree

これはFigma公式`get_design_context`と同じtool・schemaではありません。

## 5. 複数nodeを一括取得

```bash
pnpm --filter figma-mcp-free dev -- \
  nodes "$FIGMA_URL" 1:2 3:4 5:6 \
  --depth 2
```

MCPでは`get_nodes`を使います。

```json
{
  "figmaUrl": "https://www.figma.com/design/FILE/Example",
  "nodeIds": ["1:2", "3:4", "5:6"],
  "depth": 2
}
```

## 6. code generation

1 node:

```bash
pnpm --filter figma-mcp-free dev -- \
  generate "$FIGMA_URL" \
  --framework react > Card.tsx
```

複数node:

```bash
pnpm --filter figma-mcp-free dev -- \
  generate-many "$FIGMA_URL" 1:2 3:4 5:6 \
  --framework react \
  --out-dir ./generated
```

対応framework:

- `react`
- `vue`
- `svelte`
- `html`

生成物はstarter codeです。pixel-perfect保証ではありません。

## 7. Design Token

```bash
pnpm --filter figma-mcp-free dev -- \
  export-tokens "$FIGMA_URL" > tokens.json
```

```bash
pnpm --filter figma-mcp-free dev -- \
  generate "$FIGMA_URL" \
  --framework react \
  --use-tokens ./tokens.json
```

## 8. その他のREST CLI

```bash
pnpm --filter figma-mcp-free dev -- file "$FIGMA_URL" --depth 2
pnpm --filter figma-mcp-free dev -- frames "$FIGMA_URL" --depth 3
pnpm --filter figma-mcp-free dev -- components "$FIGMA_URL" --query Button --limit 20 --json
```

最新値を取り直す場合は、対応commandへ`--refresh`を付けます。

# Unified MCP server

```bash
pnpm -r build
node packages/mcp-server/dist/index.js
```

RESTとLocal Pluginのどちらか、または両方を環境変数で設定できます。

```json
{
  "env": {
    "FIGMA_TOKEN": "<OPTIONAL_REST_PAT>",
    "FIGMA_PLUGIN_BRIDGE_URL": "http://127.0.0.1:3845",
    "FIGMA_PLUGIN_BRIDGE_TOKEN": "<OPTIONAL_PAIRING_TOKEN>"
  }
}
```

秘密値はMCP tool引数としてmodelへ公開しません。

設定例:

- [Codex](../examples/codex-config/mcp.json)
- [Cursor](../examples/cursor-config/mcp.json)

## REST tools

| Tool | 用途 |
| --- | --- |
| `get_file` | file取得 |
| `get_nodes` | node一括取得 |
| `inspect_selection` | REST nodeのcompact context |
| `get_components` | component metadata |
| `list_frames` | frame一覧 |
| `export_tokens` | token抽出 |
| `generate_code` | starter code生成 |
| `get_cache_stats` | cache / retry / network統計 |
| `clear_cache` | REST memory cache削除 |

## Local Plugin tools

| Tool | 用途 |
| --- | --- |
| `get_plugin_bridge_status` | bridge接続とsnapshot状態 |
| `get_current_selection` | capture済みnode取得 |
| `inspect_current_selection` | REST枠を使わずcompact context生成 |
| `generate_current_selection` | REST枠を使わずstarter code生成 |

## 環境変数

| 変数 | default | 内容 |
| --- | ---: | --- |
| `FIGMA_MCP_CACHE_TTL_MS` | `300000` | REST memory cache時間 |
| `FIGMA_MCP_MAX_CACHE_ENTRIES` | `128` | 最大REST cache entry |
| `FIGMA_MCP_REQUEST_TIMEOUT_MS` | `20000` | REST 1 attemptのtimeout |
| `FIGMA_MCP_MAX_RETRIES` | `2` | REST transient retry回数 |
| `FIGMA_MCP_NODE_BATCH_SIZE` | `100` | REST 1 requestのnode上限 |
| `FIGMA_PLUGIN_BRIDGE_URL` | `http://127.0.0.1:3845` | local bridge URL |
| `FIGMA_PLUGIN_BRIDGE_TOKEN` | なし | Plugin toolsに必須 |
| `FIGMA_PLUGIN_BRIDGE_TIMEOUT_MS` | `10000` | bridge request timeout |

# fork対応

forkは単なるcopyではなく、改善が生まれる場所として扱います。

```bash
git remote add upstream https://github.com/superdoccimo/figma-mcp-free.git
git fetch upstream
git switch main
git merge --ff-only upstream/main
```

fork network監査:

```bash
GITHUB_TOKEN=... node tools/audit-forks.mjs --repo owner/repository
```

`Fork intelligence` workflowはread-onlyです。forkへpush、auto merge、issue作成をしません。

詳細: [Forks, downstreams, and contribution flow](../docs/forks.md)

forkから発見したPAT permission修正も、本家へcredit付きで取り込み済みです。

# security

- REST mode、Local Plugin modeともFigma write toolなし
- bridgeはloopbackだけへbind
- 全bridge requestでpairing token必須
- 最新snapshot 1件だけをmemory保存
- Pluginはbuttonを押した時だけcapture
- pairing tokenとURLをMCP tool schemaへ出さない
- PAT fileはatomic write
- POSIXではdirectory `0700`、file `0600`
- PAT、pairing token、private file ID、private response、private design textをGitへcommitしない

Local Plugin snapshotには選択layer名やtextが含まれます。接続先AIへ渡してよいdesignだけをcaptureしてください。

脆弱性報告はpublic issueではなく[SECURITY.md](../SECURITY.md)に従ってください。

# 開発と検証

```bash
pnpm install --frozen-lockfile
pnpm run check
pnpm run pack:check
```

CI確認内容:

- build
- typecheck
- unit / fixture / security / bridge test
- offline smoke
- secret pattern
- fork portability
- package contents
- Node.js 18 / 20 / 22

# AIへの依頼テンプレート

Local Plugin mode:

```text
現在Figmaでcapture済みの選択nodeを実装してください。

取得方針:
- 最初にget_plugin_bridge_statusを確認
- inspect_current_selectionでcompact contextを取得
- 必要な場合だけget_current_selectionを使う
- pairing tokenやbridge URLを出力しない
- Figmaへ書き込まない

実装先:
src/components/Card.tsx

要件:
- TypeScript
- responsive
- keyboard accessibility
- 既存Design Tokenを優先
- lint / test / buildを実行
```

REST mode:

```text
このFigma nodeを実装してください。

Figma URL:
https://www.figma.com/design/<FILE_ID>/Example?node-id=1-2

取得方針:
- inspect_selectionを優先
- 複数nodeはget_nodesでbatch
- file全体は必要な場合だけdepth付きで読む
- 同じrequestを繰り返さない
- Figmaへ書き込まない
```

# 関連資料

- [English README](../README.md)
- [Local Plugin Bridge](../plugins/local-bridge/README.md)
- [Architecture](../docs/architecture.md)
- [Quickstart](../docs/quickstart.md)
- [Troubleshooting](../docs/troubleshooting.md)
- [Fork support](../docs/forks.md)
- [Roadmap](../ROADMAP.md)
- [Changelog](../CHANGELOG.md)

Figmaの価格、plan、seat、API limit、Plugin仕様は変わる可能性があります。固定的な約束として扱わず、公式documentationも確認してください。
