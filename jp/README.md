# figma-mcp-free 日本語ガイド

Figma REST APIを使う、無料・read-only・quota-awareなMCPサーバー／CLIです。

Claude、Cursor、Codex、Windsurf、ClineなどからFigmaのファイルや選択ノードを読み取り、次の処理ができます。

- 選択レイヤーを実装向けの小さなJSONへ整理
- 複数node IDを一括取得
- React / Vue / Svelte / HTMLのスターターコード生成
- W3C形式を意識したDesign Token出力
- Figma URLと`node-id`の自動正規化
- API制限を意識したcache、重複排除、timeout、Retry-After処理
- fork差分の自動監査と本家への還流支援

このプロジェクトはFigma公式MCP、Figma Dev Mode、Figma Pluginの代替を名乗るものではありません。REST modeは意図的にread-onlyであり、Figma上の要素を作成・移動・削除・公開できません。

英語版は[ルートREADME](../README.md)です。

## 重要な前提

FigmaのREST API制限は、endpoint、seat、plan、対象ファイルが置かれたplanによって変わります。特に`GET file`と`GET file nodes`は利用枠が小さい場合があります。最新値は必ずFigma公式の[REST API Rate Limits](https://developers.figma.com/docs/rest-api/rate-limits/)で確認してください。

そのため、このリポジトリは「何回でもAPIを呼ぶ」のではなく、次を設計原則にしています。

1. 複数node IDは`get_nodes`でまとめる
2. 同じrequestが同時に来たら1回へ束ねる
3. MCP server内では短時間cacheする
4. 大きなfile全体より、必要なnodeを狭く読む
5. `Retry-After`が長いときは無駄な自動再試行をしない
6. `doctor`でplan tierやrate-limit classを安全に診断する

## 現在の状態

- REST MCP server: 利用可能
- CLI: 利用可能
- offline generator demo: 利用可能
- npm公開: まだ行っていません
- Figma Plugin bridge: [ROADMAP](../ROADMAP.md)で別backendとして準備中
- write tool: 未提供

現在はsource checkoutで使います。

## 1. 必要な環境

- Node.js 18以上
- pnpm 9系
- Figma Personal Access Token
- MCP対応client、またはterminal

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

## 3. tokenなしで試す

```bash
pnpm --filter figma-mcp-free dev -- \
  generate-from-json ./examples/sample-node.json \
  --framework react \
  --use-tokens ./examples/sample-tokens.json
```

これはFigmaへ接続しません。clone、依存関係、build、generatorを安全に確認する最短ルートです。

## 4. Personal Access Tokenの扱い

Figmaの設定画面で、対象ファイルを読むために必要な最小限のscopeを持つPATを作成してください。FigmaのUIやscope名は変更されることがあるため、作成画面の説明を優先してください。

一時利用では環境変数を推奨します。

```bash
export FIGMA_TOKEN="figd_..."
```

Windows PowerShell:

```powershell
$env:FIGMA_TOKEN = "figd_..."
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

`--token`をcommand lineへ直接書くとshell historyへ残る可能性があります。interactive入力か環境変数を使う方が安全です。

## 5. Figma URL

対応:

```text
https://www.figma.com/file/<FILE_ID>/...?node-id=1-2
https://www.figma.com/design/<FILE_ID>/...?node-id=1-2
```

`node-id=1-2`はAPI形式`1:2`へ自動変換します。

非対応:

```text
https://www.figma.com/slides/...
```

対象frameやcomponentを選択し、Figmaの「Copy link」でnode ID付きURLを取得してください。

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
- 子nodeのbounded summary

省略するもの:

- image bytes
- private image reference値
- vector path全量
- 無制限のchild tree

これはFigma公式`get_design_context`と同じtoolでも同じschemaでもありません。

## 8. 複数nodeを一括取得

個別に3回APIを呼ぶ代わりに、可能な範囲で1回へまとめます。

```bash
pnpm --filter figma-mcp-free dev -- \
  nodes "$FIGMA_URL" 1:2 3:4 5:6 \
  --depth 2
```

MCPでは`get_nodes`を使います。

入力例:

```json
{
  "figmaUrl": "https://www.figma.com/design/FILE/Example",
  "nodeIds": ["1:2", "3:4", "5:6"],
  "depth": 2
}
```

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

`generate-many`はnodeをbatch取得し、各nodeのfileとmanifest JSONを出します。

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

## 11. その他のCLI

fileを読む:

```bash
pnpm --filter figma-mcp-free dev -- file "$FIGMA_URL" --depth 2
```

frame一覧:

```bash
pnpm --filter figma-mcp-free dev -- frames "$FIGMA_URL" --depth 3
```

component検索:

```bash
pnpm --filter figma-mcp-free dev -- \
  components "$FIGMA_URL" \
  --query Button \
  --limit 20 \
  --json
```

cacheを使わず最新値を取り直したい場合は、対応commandへ`--refresh`を付けます。

## 12. MCP server

```bash
pnpm -r build
node packages/mcp-server/dist/index.js
```

設定例:

- [Codex](../examples/codex-config/mcp.json)
- [Cursor](../examples/cursor-config/mcp.json)

公開tools:

| Tool | 用途 |
| --- | --- |
| `get_file` | file取得 |
| `get_nodes` | node一括取得 |
| `inspect_selection` | 選択nodeのcompact context |
| `get_components` | component metadata |
| `list_frames` | frame一覧 |
| `export_tokens` | token抽出 |
| `generate_code` | starter code生成 |
| `get_cache_stats` | cache / retry / network統計 |
| `clear_cache` | memory cache削除 |

環境変数:

| 変数 | default | 内容 |
| --- | ---: | --- |
| `FIGMA_MCP_CACHE_TTL_MS` | `300000` | memory cache時間 |
| `FIGMA_MCP_MAX_CACHE_ENTRIES` | `128` | 最大cache entry |
| `FIGMA_MCP_REQUEST_TIMEOUT_MS` | `20000` | 1 attemptのtimeout |
| `FIGMA_MCP_MAX_RETRIES` | `2` | transient retry回数 |
| `FIGMA_MCP_NODE_BATCH_SIZE` | `100` | 1 requestのnode上限 |

cacheはmemory-onlyで、process終了時に消えます。private design dataをdisk cacheへ自動保存しません。

## 13. fork対応

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

GitHub Actionsの`Fork intelligence` workflowはread-onlyです。forkへpushしたり、勝手にmergeしたり、issueを作ったりしません。

詳細: [Forks, downstreams, and contribution flow](../docs/forks.md)

実際にforkから発見したPAT permission修正を本家へ取り込み、atomic writeとdoctor検査まで拡張しています。由来とcreditは[CHANGELOG](../CHANGELOG.md)に残しています。

## 14. security

絶対に公開しないもの:

- PAT
- private Figma file ID
- private raw API response
- private `inspect_selection` output
- private design textやlayer name

Gitへ追加しない例:

```gitignore
.env
.env.*
*.log
node_modules/
```

Figma image APIのURLは期限付きになることがあります。production assetは自分のrepository、CDN、object storageへexportして管理してください。

脆弱性報告はpublic issueではなく[SECURITY.md](../SECURITY.md)に従ってください。

## 15. 開発と検証

```bash
pnpm install --frozen-lockfile
pnpm run check
pnpm run pack:check
```

CIでは以下を確認します。

- build
- typecheck
- unit / fixture test
- offline smoke
- secret pattern
- fork portability
- package contents
- Node.js 18 / 20 / 22

## 16. AIへの依頼テンプレート

```text
このFigma nodeを実装してください。

Figma URL:
https://www.figma.com/design/<FILE_ID>/Example?node-id=1-2

取得方針:
- 最初にinspect_selectionを使う
- 複数nodeが必要ならget_nodesでbatchする
- file全体は必要な場合だけdepthを付けて読む
- API rate limitを考慮し、同じrequestを繰り返さない

実装先:
src/components/Card.tsx

要件:
- TypeScript
- responsive
- keyboard accessibility
- 既存Design Tokenを優先
- lint / test / buildを実行
- Figmaへ書き込まない
```

## 関連資料

- [English README](../README.md)
- [Architecture](../docs/architecture.md)
- [Quickstart](../docs/quickstart.md)
- [Troubleshooting](../docs/troubleshooting.md)
- [Fork support](../docs/forks.md)
- [Roadmap](../ROADMAP.md)
- [Changelog](../CHANGELOG.md)

この文書は2026年のFigma API制限と現行repository実装に合わせて再構成しています。価格、plan、seat、API limitは変わるため、数値を固定的な約束として扱わず公式documentationを確認してください。
