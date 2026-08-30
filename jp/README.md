# figma-mcp-free 日本語ガイド

Figmaをread-onlyで扱う、quota-awareなMCPサーバー／CLI／ローカルPlugin bridgeです。

このプロジェクトには、用途の異なる2つの読み取り経路があります。

1. **Figma REST backend**
   - file、node、component、frame、Design Tokenをheadlessに取得
   - Personal Access Tokenが必要
   - REST APIの利用枠を消費
   - batch、cache、request結合、request budget、rate-limit診断に対応

2. **Local Figma Plugin bridge**
   - Figma Desktopで現在選択しているnodeを、ユーザーが明示的にCaptureしたときだけ取得
   - Personal Access Tokenは不要
   - REST APIの利用枠を消費しない
   - localhost限定、認証付き、memory-only、read-only

どちらの経路も、選択nodeの整理、React / Vue / Svelte / HTMLのstarter code生成へつなげられます。

このプロジェクトはFigma公式MCP、Figma Dev Mode、Figma Community Pluginの代替を名乗るものではありません。Figma上の要素を作成・移動・削除・公開するwrite toolは提供していません。

英語版は[ルートREADME](../README.md)です。

## 機能比較

| 機能 | REST backend | Local Plugin bridge |
| --- | --- | --- |
| headless実行 | 可能 | 不可。Figma Desktopと明示captureが必要 |
| Figma PAT | 必要 | 不要 |
| REST quota | 消費する | 消費しない |
| file全体 | 可能 | 不可 |
| component metadata | 可能 | 不可 |
| 現在選択中のnode | file ID / node IDで取得 | 明示captureで取得 |
| CLI | 対応 | 対応 |
| MCP | 対応 | 対応 |
| Figmaへのwrite | 不可 | 不可 |
| 保存 | bounded memory cache | 1件のmemory snapshotのみ |
| remote server | Figma API | 不可。loopback限定 |

## 現在の状態

- REST MCP server: 実装済み
- REST / offline CLI: 実装済み
- Local Plugin bridge server: 実装済み
- Figma development Plugin: 実装済み
- Plugin向けMCP / CLI tools: 実装済み
- Node.js protocol test / static Plugin検査: 実装済み
- Figma Desktop実機smoke test: release前の確認項目
- npm公開: まだ行っていません
- Figma Community公開: 行っていません
- write tool: 提供していません

現在はsource checkoutで利用します。

## なぜREST requestを節約するのか

Figma REST APIの制限はendpoint、seat、plan、対象fileの所属先によって変わります。最新値はFigma公式の[REST API Rate Limits](https://developers.figma.com/docs/rest-api/rate-limits/)で確認してください。

このリポジトリは「失敗するまでAPIを連打する」のではなく、次を設計原則にしています。

1. 複数node IDはまとめて取得する
2. 同一requestが同時発生したら1本へ束ねる
3. 短時間の成功responseはbounded memory cacheで再利用する
4. 必要なnodeだけを狭く読む
5. 実network attemptへ上限を設定できるようにする
6. 長時間の`Retry-After`やplan由来の429は無駄に再試行しない
7. plan tier、rate-limit type、request IDを安全な診断情報として保持する
8. 現在の選択nodeだけでよい場合はLocal Plugin bridgeを使い、REST quotaを使わない

## 1. 必要な環境

共通:

- Node.js 18以上
- pnpm 9系
- terminal

REST backendを使う場合:

- Figma Personal Access Token

Local Plugin bridgeを使う場合:

- Figma Desktop
- development Pluginを読み込める環境

確認:

```bash
node --version
pnpm --version
```

## 2. インストール

```bash
git clone https://github.com/superdoccimo/figma-mcp-free.git
cd figma-mcp-free
pnpm install --frozen-lockfile
pnpm -r build
```

## 3. Figmaにも接続せず試す

```bash
pnpm --filter figma-mcp-free dev -- \
  generate-from-json ./examples/sample-node.json \
  --framework react \
  --use-tokens ./examples/sample-tokens.json
```

これはFigmaへ接続しません。clone、依存関係、build、generatorを安全に確認する最短ルートです。

# REST backend

## 4. Personal Access Token

Figmaの設定画面で、対象fileを読むために必要な最小限のscopeを持つPATを作成してください。FigmaのUIやscope名は変更される可能性があるため、作成画面の最新説明を優先してください。

一時利用では環境変数を推奨します。

Linux / macOS:

```bash
export FIGMA_TOKEN="<YOUR_FIGMA_TOKEN>"
```

Windows PowerShell:

```powershell
$env:FIGMA_TOKEN = "<YOUR_FIGMA_TOKEN>"
```

local configへ保存する場合:

```bash
pnpm --filter figma-mcp-free dev -- init
```

安全上の仕様:

- token値は出力しません
- POSIXではconfig directoryを`0700`、fileを`0600`へ制限します
- temp fileへ書いてからatomicに置き換えます
- `doctor`と`config security`で権限を確認できます

```bash
pnpm --filter figma-mcp-free dev -- config security
```

`--token`をcommand lineへ直接書くとshell historyやprocess一覧へ残る可能性があります。interactive入力か環境変数を使う方が安全です。

## 5. Figma URL

対応:

```text
https://www.figma.com/file/<FILE_ID>/...?node-id=1-2
https://www.figma.com/design/<FILE_ID>/...?node-id=1-2
```

数値形式の`node-id=1-2`はAPI形式`1:2`へ自動変換します。

非対応:

```text
https://www.figma.com/slides/...
```

対象frameやcomponentを選び、Figmaの「Copy link」でnode ID付きURLを取得してください。

## 6. doctor

```bash
FIGMA_URL="https://www.figma.com/design/<FILE_ID>/Example?node-id=1-2"
pnpm --filter figma-mcp-free dev -- doctor "$FIGMA_URL"
```

machine-readable output:

```bash
pnpm --filter figma-mcp-free dev -- doctor "$FIGMA_URL" --json
```

確認項目:

- Node.js version
- pnpm
- 環境変数tokenの有無
- local tokenの有無
- local config fileのpermission
- URLとnode ID
- optionalなAPI access
- rate-limit metadata
- read-only boundary

## 7. 選択レイヤーを小さく読む

```bash
pnpm --filter figma-mcp-free dev -- \
  inspect-selection "$FIGMA_URL" \
  --depth 2 \
  --max-children 20
```

`inspect-selection` / `inspect_selection`は、REST nodeを次のような実装情報へ整理します。

- sizeとposition
- Auto Layout
- paddingとspacing
- fills / strokes / shadows
- text style
- component properties
- boundedな子node summary

省略するもの:

- image bytes
- private image reference値
- vector path全量
- 無制限のchild tree

これはFigma公式`get_design_context`と同じtoolでも同じschemaでもありません。

## 8. 複数nodeを一括取得

個別に何度もAPIを呼ぶ代わりに、可能な範囲で1requestへまとめます。

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

同一node IDはde-duplicateされ、同じURLへの同時requestも1本へ結合されます。

## 9. code generation

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

生成物はstarter codeです。pixel-perfect保証ではありません。実projectのcomponent、CSS、responsive、accessibility、testへ合わせてAIまたは人間が仕上げてください。

## 10. Design Token

```bash
pnpm --filter figma-mcp-free dev -- \
  export-tokens "$FIGMA_URL" > tokens.json
```

生成時に利用:

```bash
pnpm --filter figma-mcp-free dev -- \
  generate "$FIGMA_URL" \
  --framework react \
  --use-tokens ./tokens.json
```

## 11. REST cacheとrequest budget

MCP serverでは同じ`FigmaClient`を再利用し、短時間のresponseをmemory-onlyでcacheします。

主な設定:

```text
FIGMA_MCP_CACHE_TTL_MS=300000
FIGMA_MCP_MAX_CACHE_ENTRIES=128
FIGMA_MCP_REQUEST_TIMEOUT_MS=20000
FIGMA_MCP_MAX_RETRIES=2
FIGMA_MCP_NODE_BATCH_SIZE=100
```

TypeScriptからはhard request budgetも指定できます。

```ts
import { FigmaClient } from "@figma-mcp-free/figma-client";

const client = new FigmaClient({
  token: process.env.FIGMA_TOKEN!,
  requestBudget: 6,
  cacheTtlMs: 30_000
});
```

budgetは実network attemptを数えます。retryも消費します。cache hitと同時requestの結合は追加消費しません。

# Local Figma Plugin bridge

## 12. 何が違うのか

Local Plugin bridgeは、現在Figma Desktopで選択しているnodeを、ユーザーがボタンを押した時だけ取得します。

```text
Figma selection
  -> Capture & Send
  -> JSON_REST_V1 export
  -> authenticated localhost bridge
  -> CLI / MCP
  -> inspect / generate
```

特徴:

- PAT不要
- REST quotaを消費しない
- selection changeだけでは送信しない
- Figma documentへwriteしない
- remote接続を許可しない
- snapshotは1件だけmemoryへ保持
- server停止時にtoken、session、snapshotが消える

## 13. bridge serverを起動

```bash
pnpm --filter figma-mcp-free bridge -- serve
```

次が表示されます。

- loopback URL
- random session ID
- pairing token

pairing tokenは秘密情報です。terminalを開いたままにしてください。

上限を厳しくする例:

```bash
pnpm --filter figma-mcp-free bridge -- serve \
  --max-body-mb 5 \
  --max-selections 10 \
  --max-nodes 2000 \
  --max-depth 32 \
  --request-timeout 5000
```

## 14. Figma development Pluginを作る

Figma Desktopでdevelopment Pluginを1回作成し、Figmaが発行した数値IDを取得します。

```bash
node plugins/local-bridge/create-manifest.mjs <FIGMA_GENERATED_PLUGIN_ID> [BRIDGE_PORT]
```

`BRIDGE_PORT`は省略時`3845`です。bridge serverを別portで起動する場合は、同じportを指定します。

```bash
node plugins/local-bridge/create-manifest.mjs <FIGMA_GENERATED_PLUGIN_ID> 49152
```

生成された次のfileをdevelopment Pluginとしてimportします。

```text
plugins/local-bridge/manifest.json
```

`manifest.json`はgit管理しません。生成されたmanifestが許可する通信先は、指定したportの次の2つだけです。

```text
http://127.0.0.1:<PORT>
http://localhost:<PORT>
```

remote hostやwildcard domainは追加しないでください。

## 15. pairingとcapture

1. development Pluginを開く
2. bridge URLを貼る
3. pairing tokenを貼る
4. `Test connection`を押す
5. Figma上でnodeを選ぶ
6. `Capture & Send`を押す

selectionを変更しただけでは、node本文は送信されません。

Plugin UIはtokenを保存しません。

- `localStorage`なし
- `sessionStorage`なし
- `indexedDB`なし
- Figma `clientStorage`なし
- file書き込みなし

## 16. bridge CLI

環境変数を使います。

Linux / macOS:

```bash
export FIGMA_PLUGIN_BRIDGE_URL=http://127.0.0.1:3845
export FIGMA_PLUGIN_BRIDGE_TOKEN='<PAIRING_TOKEN>'
```

Windows PowerShell:

```powershell
$env:FIGMA_PLUGIN_BRIDGE_URL = "http://127.0.0.1:3845"
$env:FIGMA_PLUGIN_BRIDGE_TOKEN = "<PAIRING_TOKEN>"
```

状態確認:

```bash
pnpm --filter figma-mcp-free bridge -- status
```

snapshot全体:

```bash
pnpm --filter figma-mcp-free bridge -- current
```

1件をbounded contextへ整理:

```bash
pnpm --filter figma-mcp-free bridge -- \
  inspect --index 0 --depth 2 --max-children 20
```

starter code生成:

```bash
pnpm --filter figma-mcp-free bridge -- \
  generate --index 0 --framework react
```

snapshot削除:

```bash
pnpm --filter figma-mcp-free bridge -- clear
```

`--token`へ直接書くとshell historyへ残る可能性があるため、環境変数を推奨します。

## 17. Plugin向けMCP設定

bridge tokenはMCP processの環境変数へ入れます。AIから見えるtool引数へは出しません。

```json
{
  "mcpServers": {
    "figma-mcp-free": {
      "transport": "stdio",
      "command": "node",
      "args": ["./packages/mcp-server/dist/index.js"],
      "env": {
        "FIGMA_PLUGIN_BRIDGE_URL": "http://127.0.0.1:3845",
        "FIGMA_PLUGIN_BRIDGE_TOKEN": "<PAIRING_TOKEN>"
      }
    }
  }
}
```

Plugin tools:

| Tool | 用途 |
| --- | --- |
| `get_plugin_bridge_status` | sessionとsnapshot状態を確認 |
| `list_current_selections` | node全文を取る前にindex、ID、name、typeだけ確認 |
| `get_current_selection` | 1件のcaptured node全文を取得 |
| `inspect_current_selection` | REST quotaなしでbounded contextを生成 |
| `generate_current_selection` | REST quotaなしでstarter codeを生成 |

REST toolsは引き続き`FIGMA_TOKEN`を使います。Plugin bridgeが失敗したときにRESTへ勝手にfallbackすることはありません。RESTが失敗したときにPluginへ切り替えることもありません。

## 18. Local bridgeの安全境界

複数の防御を重ねています。

- loopback-only bind
- remote socket addressの検証
- Host headerの検証
- DNS rebindingを想定した拒否
- 32文字以上512文字以下のbearer token
- timing-safe token comparison
- redirect拒否
- URL内credential、path、query、fragment拒否
- 1件のmemory-only snapshot
- `Cache-Control: no-store`
- request body、selection数、node数、depth、header数、timeoutの上限
- snapshot POSTは`application/json`のみ
- non-loopback escape hatchなし
- static検査でFigma write APIを拒否

Figma Pluginからlocalhostへ通信するため、bridge responseはwildcard CORSを使います。そのため、pairing token、loopback transport、remote address、Host validation、redirect拒否を認証境界として扱います。

pairing tokenを次へ貼らないでください。

- Webサイト
- 公開issue
- screenshot
- X投稿
- committed config
- shell history
- telemetry

漏れた可能性がある場合はserverを再起動してください。tokenとsession IDが新しくなります。

# MCP全体

## 19. MCP server起動

```bash
pnpm -r build
node packages/mcp-server/dist/index.js
```

REST tools:

- `get_file`
- `get_nodes`
- `inspect_selection`
- `get_components`
- `list_frames`
- `export_tokens`
- `generate_code`
- `get_cache_stats`
- `clear_cache`

Plugin tools:

- `get_plugin_bridge_status`
- `list_current_selections`
- `get_current_selection`
- `inspect_current_selection`
- `generate_current_selection`

既存REST tool名と入力は維持し、Plugin toolは追加として分離しています。

# Forkと開発

## 20. fork対応

このrepositoryはforkをfirst-classに扱います。

```bash
pnpm run check:fork
pnpm run fork:audit
```

fork auditはread-onlyです。

- 公開forkを列挙
- upstreamとの差分を比較
- forkだけにあるcommitを検出
- compare errorを記録
- forkへpushしない
- issueを自動作成しない
- mergeしない

fork由来の改善を採用する場合は、source repository、commit、author、licenseを確認し、attributionを残します。

## 21. 検証

complete gate:

```bash
pnpm install --frozen-lockfile
pnpm check
git diff --check
```

`pnpm check`には次が含まれます。

- build
- typecheck
- unit / fixture tests
- offline smoke
- secret pattern check
- owner-neutral portability check
- structured fork policy check
- Local Plugin boundary check
- package content check

CIはUbuntuでNode.js 18・20・22、WindowsとmacOSでNode.js 22のcomplete gateを実行します。

## 22. 実機でしか確認できないこと

CIは次を自動確認できます。

- Node.js bridge protocol
- authentication
- Host validation
- request limit
- MCP schema
- package export
- Plugin sourceのsyntax
- Figma write APIの検出
- credential persistence pattern

ただし、CIはFigma Desktopを操作できません。

release-readyとする前に、exact candidate commitで次の実機確認が必要です。

1. development Plugin import
2. bridge pairing
3. selection capture
4. status
5. list
6. inspect
7. generate
8. clear
9. server再起動後のtoken / session rotation

非機密のsample fileで証跡を残してください。

## 23. 現在の制限

- Figmaへwriteできません
- Figma Communityへ公開していません
- npmへ公開していません
- Plugin bridgeはremote serverとして使えません
- whole-file取得はREST backendのみです
- component metadataはREST backendのみです
- `/slides`はREST pipelineで非対応です
- code generationはstarter codeです
- 大きすぎるselectionや深すぎるtreeは意図的に拒否します
- Images API URLは一時的であり、永続assetとしてcommitしないでください

## 関連資料

- [ルートREADME](../README.md)
- [Local Plugin bridge](../docs/local-plugin-bridge.md)
- [Architecture](../docs/architecture.md)
- [Troubleshooting](../docs/troubleshooting.md)
- [Fork support](../docs/forks.md)
- [Security](../SECURITY.md)
- [Roadmap](../ROADMAP.md)
- [Changelog](../CHANGELOG.md)
- [Contributing](../CONTRIBUTING.md)
