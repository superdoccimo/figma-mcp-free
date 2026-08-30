# figma-mcp-free 現行要件定義

更新日: 2026-08-30  
状態: 実装済み機能と今後のrelease gateを定義するcanonical document

## 1. プロジェクトの目的

`figma-mcp-free`は、Figma designをAI coding clientやterminalから安全に読み、実装へ移すためのread-only toolkitです。

目的は次の4点です。

1. Figma REST APIを使うheadless workflowを、batch、cache、timeout、診断付きで扱いやすくする
2. Figma Desktopで現在選択しているnodeを、PATやREST callなしで明示的にcaptureできるLocal Plugin Bridgeを提供する
3. RESTとLocal Pluginの出力を、同一のselection inspector、Design Token exporter、code generatorへ渡す
4. forkで生まれた改善を発見し、creditとprovenanceを保ってupstreamへ還流できるOSS運用を作る

本projectは、Figma公式MCP、Figma Dev Mode、またはFigma Plugin API全体の完全代替を主張しません。公式toolと出力schema、権限、rate limit、editor integrationは異なります。

## 2. 主要利用者

- Figma designからReact、Vue、Svelte、HTMLのstarter codeを作りたいdeveloper
- Claude、Cursor、Codex、Windsurf、Clineなどへ選択layerのcontextを渡したいdeveloper
- Figma REST API callを節約したい個人、small team、CI operator
- private design dataをdiskへ自動保存せず、localhost内で明示的に扱いたい利用者
- forkを作り、自分の環境向けに改良したいOSS contributor

## 3. 設計原則

### 3.1 Read-only by default

現行toolはFigma objectを作成、編集、移動、削除、公開しません。

将来write capabilityを追加する場合も、既存read toolへ暗黙追加してはいけません。別tool名、明示的opt-in、narrow permission、実行後verification、専用security reviewを必須とします。

### 3.2 Dual backend

```text
                               AI client / terminal
                                        |
                                 MCP server / CLI
                                        |
                    +-------------------+-------------------+
                    |                                       |
              REST backend                         Local Plugin backend
                    |                                       |
        quota-aware FigmaClient                 authenticated loopback bridge
                    |                                       |
          Figma REST API GET                    Figma JSON_REST_V1 export
                    +-------------------+-------------------+
                                        |
                     inspector / tokens / code generator
```

- REST backendはURL、headless automation、CI、remote machine向け
- Local Plugin backendはFigma Desktopで現在開いているselection向け
- downstream処理はbackend-neutralに保つ

### 3.3 API callはbudget

REST callを無制限資源として扱いません。

- 複数nodeはbatchする
- 同一in-flight requestは1件へ束ねる
- bounded memory cacheを使う
- full fileより選択nodeとdepth制限を優先する
- 長い`Retry-After`では無駄な自動retryを行わない
- call countとretryを観測できるようにする

### 3.4 Secretをmodel-visibleにしない

- PATは環境変数または保護されたlocal configから読む
- Plugin Bridge tokenとURLはMCP process environmentから読む
- MCP tool schemaへcredential fieldを出さない
- CLI、doctor、error messageでsecret値を表示しない

### 3.5 Fork-first operations

- operational codeへupstream owner名やdeveloper固有pathを埋め込まない
- fork networkをread-onlyで監査する
- unique downstream commitをhuman review候補として出す
- fork-originated fixのauthor、commit、license provenanceを残す
- forkへ勝手にpush、merge、issue作成しない

### 3.6 Backward compatibility

- 既存MCP tool名を保つ
- 新しいinputは原則optional
- breaking changeはmajor versionとmigration documentを必要とする
- package、CLI、schema、generated outputの互換性をtestで固定する

## 4. 非目標

現時点では次をscope外とします。

- Figma公式`get_design_context`と同一schemaや同一品質の再現
- pixel-perfect code compilerの保証
- Figma objectへのwrite
- browserやLANへ公開するremote bridge
- private design snapshotのdisk history
- 自動npm publish
- human approvalなしのFigma Community公開
- `/slides` design nodeのREST対応
- temporary Images API URLをproduction assetとして管理すること

## 5. Functional requirements

## 5.1 REST client

必須:

- `/file`と`/design` URL解析
- `node-id=1-2`から`1:2`への正規化
- file取得
- component metadata取得
- frame一覧
- single node取得
- multiple node batch取得
- configurable depth
- bounded memory cache
- explicit refresh
- in-flight deduplication
- per-attempt timeout
- short transient retry
- long `Retry-After`の即時surface
- plan tier、rate-limit type、upgrade linkのsafe metadata保持
- request、retry、cache、deduplication stats

禁止:

- PATのerror message混入
- 429に対する無制限retry
- nodeごとの不要なserial API loop
- private responseの自動disk保存

## 5.2 Local Plugin Bridge

Server必須:

- bind hostは`127.0.0.1`、`localhost`、`::1`だけ
- pairing tokenは16文字以上
- requestごとにauthentication
- timing-safe token comparison
- memory snapshotは最新1件
- default body上限10 MiB
- default selection上限50件
- health、get snapshot、post snapshot、clear snapshot endpoint
- invalid JSON、oversize、unauthorized、missing snapshotの明確なstatus
- shutdown可能なserver handle

Client必須:

- defaultでnon-loopback URL拒否
- HTTP loopbackのみ許可
- timeout
- safe error detail

Figma development plugin必須:

- Figma発行plugin IDを使うlocal manifest生成
- production network domainなし
- development domainはdefault loopback endpointだけ
- selection change時はsummaryだけ表示
- `Capture & Send`を押した時だけexportと送信
- `JSON_REST_V1`でREST-shaped nodeを作る
- credentialをlocalStorage、sessionStorage、IndexedDBへ保存しない
- write APIを使わない

## 5.3 MCP server

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

Local Plugin tools:

- `get_plugin_bridge_status`
- `get_current_selection`
- `inspect_current_selection`
- `generate_current_selection`

Requirement:

- REST tokenなしでもLocal Plugin toolsが動く
- Bridge tokenなしでもREST toolsが動く
- credentialをtool inputへ含めない
- selection index、depth、children、batch sizeをboundedにする
- existing REST tool inputを破壊しない

## 5.4 CLI

REST CLI:

- `init`
- `doctor`
- `file`
- `nodes`
- `frames`
- `components`
- `inspect-selection`
- `export-tokens`
- `generate`
- `generate-many`
- `generate-from-json`
- `config get token`
- `config path`
- `config security`

Bridge CLI:

- `serve`
- `status`
- `current`
- `inspect`
- `generate`
- `clear`

CLI requirement:

- relative input pathをcallerのworking directoryから解決
- invalid framework、depth、indexを早期拒否
- missing nodeをplaceholder生成せずfail
- tokenをstdout/stderrへ出さない。ただし`serve`が生成したone-time pairing tokenは、userへpairingさせるため起動時だけ明示する
- batch generationはmanifestを出す

## 5.5 Selection inspector

Compact schemaへ含める:

- node ID、name、type
- size、position
- Auto Layoutとalignment
- padding、spacing
- fills、strokes、opacity
- text styleとcharacters
- component information
- shadows/effects
- bounded child summary
- unsupported/truncated理由

除外または要約する:

- image bytes
- raw private image reference
- vector path全量
- unbounded child tree

## 5.6 Design Tokens

対象:

- color
- size
- spacing
- typography
- shadow

Requirement:

- W3C Design Tokensを意識したJSON
- generated codeでtoken lookupを任意利用可能
- tokenなしでもgeneratorが動く
- unknown valueはraw valueへfallback

## 5.7 Code generator

対応:

- React
- Vue
- Svelte
- HTML

Requirement:

- deterministic fixture test
- malformed nodeでsilent corruptionしない
- outputをstarter codeと明記
- real projectのcomponent system、responsive、accessibility、lint、testへの調整を前提とする

## 5.8 Fork intelligence

必須:

- current repositoryがforkならGitHub metadataからparentを特定
- upstreamならfork一覧をpagination取得
- compare可能なforkをahead、behind、diverged、in-syncへ分類
- unique commitを最大件数付きでreport
- MarkdownとJSON report
- weekly scheduled workflow
- read-only permission
- optional fail-on-ahead
- contributor provenance記載欄

## 6. Security requirements

### 6.1 PAT storage

- local config directoryはPOSIXで`0700`
- config fileはPOSIXで`0600`
- temp fileはexclusive create
- write後に`fsync`
- atomic rename
- existing file modeもread時またはwrite時にharden
- WindowsではPOSIX modeを偽装せずACL管理であることを説明

### 6.2 Plugin Bridge

- loopback only
- auth required
- memory only
- bounded body
- bounded selections
- no write tool
- explicit capture
- no credential persistence
- no credential in MCP schema
- CSP/network allowlistをstatic check

### 6.3 GitHub Actions

- workflowごとに最小permissions
- ordinary CIは`contents: read`
- fork auditはread-only
- CodeQLだけ`security-events: write`
- dependency reviewは`contents: read`
- secret pattern scan
- owner-specific path scan
- plugin integrity scan
- dependency reviewでnew high-severity vulnerabilityを拒否
- CodeQLでJavaScript/TypeScriptを定期解析

### 6.4 Vulnerability reports

`SECURITY.md`のprivate report routeを使います。public issueへsecret、private URL、snapshot、layer textを貼ってはいけません。

## 7. GitHub repository requirements

Git管理対象:

- CI
- CodeQL
- dependency review
- fork audit
- Dependabot
- issue templates
- PR template
- security policy
- contribution policy
- changelog
- roadmap
- package metadata
- architectureとtroubleshooting

Git外設定:

- About description
- topics
- default branch ruleset
- private vulnerability reporting
- auto-delete merged branch

推奨値は`docs/repository-settings.md`をcanonicalとします。

## 8. Testing requirements

Pull request merge前に次がPASSすること:

- Node.js 18、20、22 build
- TypeScript typecheck
- unit test
- fixture test
- URL parsing test
- 401、403、404、429、5xx error test
- Retry-After test
- batch test
- cache test
- in-flight dedupe test
- timeout test
- PAT redaction test
- POSIX permission test
- bridge auth test
- bridge lifecycle test
- body/selection limit test
- MCP schema secret exclusion test
- plugin integrity static test
- offline smoke test
- secret scan
- fork portability scan
- package tarball content check
- CodeQL
- dependency review when dependencies change

## 9. Release gate

npm publish、GitHub Release、Figma Community公開は外部影響のあるoperationです。human approvalなしで実行しません。

Release前の必須条件:

1. main CI green
2. CodeQL alert review
3. dependency review green
4. package tarball内容確認
5. package ownership確認
6. provenance-capable publish設計
7. changelog更新
8. version policy決定
9. clean install test
10. Figma Desktopでreal selection end-to-end test
11. rollback手順
12. credential rotation手順
13. human approval

## 10. 成功指標

Vanity metricだけで判断しません。

Product indicators:

- setup成功率
- `doctor`で解決できたerror比率
- REST call削減率
- batch利用率
- Local Plugin selection capture成功率
- generated outputを実projectへ採用できた割合
- issueからfixまでの時間
- fork unique commitのupstream還流件数
- secret leakage incident 0

Community indicators:

- starとforkの増加
- external contributor数
- issue再現情報の質
- fork auditから見つかった改善数
- documentation language coverage

## 11. 次の優先候補

P0:

- real Figma Desktop end-to-end test
- package release dry run
- About descriptionとtopics設定
- default branch ruleset適用

P1:

- golden Figma fixture collection
- variable、gradient、mask、image fillのcoverage拡張
- bridge pairing UX改善
- OS credential storeまたはsigned session file検討

P2:

- OAuth adapter
- Figma Community companionの公開審査
- additional code framework
- generated code quality benchmark

write capabilityは別project sliceとして扱い、read-only defaultへ混ぜません。

## 12. 重要な決定記録

- 「公式MCPが有料だから無料完全代替」という初期主張は廃止
- 「Dev Mode以上」という比較主張は廃止
- RESTだけのarchitectureからdual backendへ移行
- freeの意味を「無制限API」ではなく、OSS、read-only、安全なlocal workflowとして定義
- forkをcopy扱いせず、product discoveryとcontribution surfaceとして扱う
- external publicationはhuman approval gateを維持

この文書を実装、test、documentation、GitHub運用の基準とします。
