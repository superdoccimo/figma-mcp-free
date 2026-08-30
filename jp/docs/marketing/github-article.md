# figma-mcp-free: REST枠を節約し、現在のFigma選択をPATなしでもAIへ渡す

この文書はGitHubや技術記事向けのdraftです。公開前に、root README、現行code、Figma公式documentationと照合してください。

## 1. 宣伝していないのにstarとforkが増えた

`figma-mcp-free`は、Figma designをMCP clientやterminalから読み、Design Tokenやstarter codeへ変換するOSSです。

当初はFigma REST APIとPersonal Access Tokenを使うread-only toolとして始まりました。しかし、積極的に宣伝していない段階でも、他projectよりstarとforkが集まりました。

ここで見るべきなのは数字だけではありません。

- FigmaとAI coding toolをつなぎたい
- official toolだけでは合わないworkflowがある
- REST callを節約したい
- current selectionだけを小さくAIへ渡したい
- credentialとprivate designの扱いを明確にしたい
- forkで自分向けに直したい

この需要が、codeへ投票する形で現れていました。

## 2. 「完全代替」ではなく、2つのread経路へ再設計した

現在の`figma-mcp-free`は、Figma Dev Modeの完全代替を主張しません。Figma公式MCPの`get_design_context`と同じoutputを出すとも言いません。

代わりに、用途の違う2つのbackendを用意しています。

| mode | 向いている用途 | PAT | REST call | Figma Desktop |
| --- | --- | --- | --- | --- |
| Local Plugin Bridge | 現在開いて選択しているdesign | 不要 | 使わない | 必要 |
| REST mode | URL、CI、headless、remote automation | 必要 | 節約して使う | 不要 |

この分離がprojectの中心です。

```text
                              AI client / terminal
                                       |
                                MCP server / CLI
                                       |
                   +-------------------+-------------------+
                   |                                       |
             REST backend                         Local Plugin backend
                   |                                       |
         batch / cache / retry              explicit capture / loopback auth
                   |                                       |
             Figma REST API                   Figma JSON_REST_V1 export
                   +-------------------+-------------------+
                                       |
                    inspector / tokens / code generator
```

## 3. REST modeはAPI callをbudgetとして扱う

RESTはFigma Desktopなしで動き、URL、CI、remote machineに向いています。一方で、endpoint、seat、plan、resourceの置かれた場所によってlimitが変わります。

そのため、次を実装しました。

- 複数node IDを`get_nodes`でbatch取得
- 同一in-flight requestを1件へ束ねる
- boundedなmemory cache
- `--refresh`による明示的再取得
- per-attempt timeout
- short transient retry
- 長い`Retry-After`は無駄に待たず、そのまま診断へ出す
- plan tier、rate-limit class、upgrade guidanceのsafe metadata
- full fileよりcompactな`inspect_selection`を優先
- request、retry、cache、deduplication stats

REST callを「失敗したら何度でも叩く」設計から、「必要な情報を最小回数で取る」設計へ変えています。

## 4. Local Plugin Bridgeは現在選択だけを明示的に渡す

Figma Desktopでtarget designを開いているなら、PATとREST callを使わない経路があります。

Development pluginが、選択nodeをFigmaの`JSON_REST_V1`形式へexportし、userが起動したlocalhost bridgeへ送ります。

ただし、自動送信にはしていません。

1. Bridge serverを起動
2. randomなpairing tokenを取得
3. Figma pluginへURLとtokenを貼る
4. nodeを選択
5. `Capture & Send`を押す
6. MCPまたはbridge CLIで読む

selection change時はplugin UIのsummaryだけが変わります。buttonを押すまでnode JSONは送信されません。

Security boundary:

- bindは`127.0.0.1`、`localhost`、`::1`だけ
- requestごとにpairing token必須
- timing-safe token comparison
- snapshotは最新1件をmemory保存
- body sizeとselection countをbounded
- non-loopback client URLをdefault拒否
- plugin UIはtokenをlocalStorageへ保存しない
- bridge credentialをMCP tool schemaへ出さない
- Figma write toolなし

## 5. 1つのMCP serverで両方使える

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

PATがなくてもLocal Plugin toolsは動きます。pairing tokenがなくてもREST toolsは動きます。

credentialはtool引数ではなく、MCP processのenvironmentから渡します。modelへtoken入力欄を見せないためです。

## 6. code generationはstarterと明示する

対応framework:

- React
- Vue
- Svelte
- HTML

Design Token:

- color
- size
- spacing
- typography
- shadow

ただし、generated codeをpixel-perfect compilerの完成品とは呼びません。

real projectでは次を調整します。

- project固有component
- responsive behavior
- accessibility
- state management
- design system
- image asset
- lint
- test
- build

誇張を減らすことは弱体化ではありません。利用者が「何ができ、何を仕上げる必要があるか」を判断しやすくなります。

## 7. forkを利用者調査として扱う

forkはcopyではありません。

誰かがforkしてcodeを変えたなら、そこには「本家で足りなかったもの」が実装として残っている可能性があります。

今回、8 forkを比較し、`mogaming217/figma-mcp-free`のunique commitから、PAT config fileをowner-only permissionへするsecurity fixを発見しました。

本家ではその改善を次まで拡張して取り込みました。

- directory `0700`
- file `0600`
- exclusive temp file
- `fsync`
- atomic rename
- existing file hardening
- `doctor`と`config security`による確認
- original authorとcommitのcredit保存

さらにGitHub Actionsでweeklyのfork intelligenceを追加しました。

- upstreamをGitHub metadataから判定
- forkをpagination取得
- ahead、behind、diverged、in-syncへ分類
- unique commitをMarkdownとJSONへ出力
- forkへpushしない
- auto mergeしない
- issueを勝手に作らない

forkは監視対象ではなく、改善signalです。

## 8. GitHub自体もprojectの一部として改修した

追加・強化したもの:

- Node.js 18、20、22 CI
- TypeScript typecheck
- unit / fixture / security / bridge test
- offline smoke test
- secret pattern scan
- fork portability scan
- Plugin integrity scan
- package tarball content check
- CodeQL
- dependency review
- Dependabot
- fork intelligence workflow
- backend-aware issue template
- API costとfork provenanceを求めるPR template
- expanded security policy
- changelog、roadmap、architecture、canonical requirements

Plugin integrity checkは、次をstaticに確認します。

- production network domainなし
- development domainはloopbackだけ
- `Capture & Send`を持つ
- credential persistenceなし
- representativeなFigma write APIなし
- manifestとJavaScript syntaxが有効

## 9. 最短で試す

### 共通build

```bash
git clone https://github.com/superdoccimo/figma-mcp-free.git
cd figma-mcp-free
pnpm install --frozen-lockfile
pnpm -r build
```

### credentialなしのoffline demo

```bash
MODE=offline ./scripts/demo.sh
```

### REST mode

```bash
export FIGMA_TOKEN="<PAT>"
export FIGMA_URL="https://www.figma.com/design/<FILE_ID>/Example?node-id=1-2"
MODE=rest ./scripts/demo.sh
```

PATをcommand lineの`--token`へ直接書くとshell historyへ残る可能性があるため、environmentまたはinteractive `init`を推奨します。

### Local Plugin mode

```bash
pnpm --filter figma-mcp-free bridge -- serve
```

Figma development pluginでcapture後:

```bash
export FIGMA_PLUGIN_BRIDGE_TOKEN="<PAIRING_TOKEN>"
MODE=plugin ./scripts/demo.sh
```

## 10. 現在できないこと

- Figma objectへのwrite
- official `get_design_context`同等保証
- `/slides`のREST node処理
- unlimited REST access
- one-click npm install
- public Figma Community plugin install
- pixel-perfect generation保証

npm publish、GitHub Release、Figma Community公開は外部影響があるため、clean install、provenance、rollback、human approvalが揃うまで実行しません。

## 11. 次に価値が高いこと

優先順位は次です。

1. real Figma Desktopでend-to-end captureを記録
2. Auto Layout、variant、variable、gradient、mask、image fillのgolden fixtureを増やす
3. package publishのdry runとprovenance設計
4. About description、topics、default branch rulesetをGitHub settingへ適用
5. pairing UXを改善
6. npmとFigma Community公開をhuman approval後に行う

## 結論

`figma-mcp-free`の価値は「公式と同じものを無料にする」という単純な話ではありません。

- headlessではRESTを賢く使う
- editorが開いているなら明示的local captureを使う
- credentialをmodel境界へ出さない
- private designを勝手にpersistしない
- generated codeをreview可能なstarterとして扱う
- forkで生まれた改善をcredit付きで本家へ戻す

この運用全体をOSSとして残すprojectです。
