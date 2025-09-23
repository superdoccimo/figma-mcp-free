## 📢 はじめに：なぜこの記事が必要なのか

> **知っていましたか？** MCPは完全無料のオープン規格です。  
> でも、Figmaの公式Dev Mode MCP Serverは**有料プラン限定**（月額$15以上）にしています。

**朗報：Personal Access Tokenだけで、無料で同じことができます！**

本記事では、Figmaの無料プランユーザーでも、MCPを使ってデザインからコード生成まで実現できる方法を、**初心者でも必ず成功できるよう**超詳細に解説します。

### この記事で実現できること

- ✅ Figmaデザインから自動でReact/Vue/HTMLコードを生成

- ✅ Claude CodeやCodex CLIでのAI支援開発

- ✅ デザイントークンの自動抽出

- ✅ **完全無料**での実装（有料プラン不要）

📖 **English Documentation**: For quick setup and API usage examples, see the [English README](../README.md) - includes package overview and `FIGMA_TOKEN` usage examples.

## 🎓 前提知識：MCPとは

### Model Context Protocol (MCP) について

MCPは、2024年11月にAnthropicがオープンソース化した**完全無料の標準規格**です。AIアシスタントと外部ツール・データソースを接続するための「USB-Cポート」のようなものです。

#### なぜFigmaは有料化したのか？

- **MCP自体**：オープンソースで完全無料

- **Figma公式サーバー**：Dev Mode（有料プラン）限定で提供

- **解決策**：コミュニティが開発した無料代替サーバーを使用

## 🛠 必要なツールの準備

### 必須環境（すべて無料）

#### 1\. Node.js（18以上）

```
# インストール確認
node --version

# v18以上が表示されればOK
# インストールされていない場合：https://nodejs.org/ からダウンロード
```

#### 2\. npm または pnpm

```
# npmの確認（Node.jsに付属）
npm --version

# または pnpm（高速な代替）
npm install -g pnpm
```

#### 3\. テキストエディタ（いずれか1つ）

- **VS Code**：https://code.visualstudio.com/

- **Cursor**：https://cursor.com/

- **Windsurf**：https://codeium.com/windsurf

#### 4\. Claude CodeまたはCodex CLI（後で詳しく説明）

## 👤 Figmaアカウントの作成とセットアップ

### ステップ1：Figmaアカウント作成

1. **Figmaウェブサイトにアクセス**  
    [https://www.figma.com/](https://www.figma.com/)

3. **「Sign up」をクリック**
    - メールアドレスまたはGoogleアカウントで登録(勝手に○○としてログインと表示されることも)  
        その場合は自動でログインして無料プランになっています。一度使ったことがあると下記の作業が不要の可能性があります。
    
    - **重要**：無料プラン（Starter）を選択

5. **メール認証**
    - 登録メールアドレスに届いた確認リンクをクリック

7. **プロフィール設定**
    - 名前を入力
    
    - 用途を選択（Personal projectでOK）



### ステップ2：Figmaデスクトップアプリのインストール（推奨）

1. **ダウンロードページにアクセス**  
    `https://www.figma.com/downloads/`

3. **OSに応じたバージョンをダウンロード**
    - Windows：.exe ファイル
    
    - macOS：.dmg ファイル
    
    - Linux：.AppImage ファイル

5. **インストール後、ログイン**
    - 作成したアカウントでログイン

左上のプロフィールアイコンをクリックしてもダウンロードできるようです。

## 🔑 Personal Access Tokenの取得

### 重要：これが無料でMCPを使う鍵です！

#### ステップ1：設定画面へアクセス

1. **Figmaを開く**（ブラウザまたはデスクトップアプリ）

3. **左上のプロフィールアイコンをクリック**

5. **「設定」を選択**

初めての場合、設定を出すには左上から「ファイルに戻る」をクリックしないといけないようです。

#### ステップ2：Personal Access Tokenの生成

1. **「セキュリティ」タブをクリック**

3. **下にスクロールして「個人アクセストークン」セクションを見つける**

5. **「新規トークンを作成」をクリック**

7. **トークンの設定**

```
トークン名: figma-mcp-free（わかりやすい名前）
有効期限: 30日間（または希望の期間）

Figma MCP用に推奨するチェック項目：
✅ 必須（これらは絶対チェック）

ファイルのコンテンツ - デザインファイル読み取りに必須
ファイルのメタデータ - ファイル情報取得に必須
現在のユーザー - API認証確認に必要

⚡ 推奨（MCPの機能を最大化）

ライブラリのコンテンツ - コンポーネント/スタイル取得
ライブラリアセット - Design Token抽出に有用
チームライブラリのコンテンツ - チーム共有コンポーネント対応

🔧 オプション（高度な機能用）

ファイルバージョン - 履歴管理機能を作る場合
プロジェクト - プロジェクト全体の管理機能
Webフック - リアルタイム同期機能（将来実装予定）
開発リリース - Dev Mode相当の機能

🚫 不要

ファイルの開発リリース - 読み取り専用なら不要

### 🛡️ 最小権限で OK

**必要最小限 - この4つだけで十分:**
✅ 現在のユーザー
✅ ファイルのコンテンツ
✅ ファイルのメタデータ
✅ ライブラリのコンテンツ

**🔄 足りなければ再発行**
権限が不足した場合は後からトークンを再発行すれば大丈夫です。初心者はスコープを過剰にしがちですが、まずは最小構成で動作確認してから拡張していくのがベストプラクティスです。
```

5. **「トークンを生成」をクリック**

7. **⚠️ 超重要：トークンをコピーして保存**

```
例：figd_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

- **このトークンは二度と表示されません！**

- メモ帳などに必ず保存してください

## 📊 **Figma APIの権限制限構造**

これが囲い込み戦略の核心部分です。

### 囲い込み比較チャート

![Comparison chart for enclosure strategies](./assets/figma_comparison_chart.svg)

### **Personal Access Token（無料）**

- ✅ 読み取り専用

- ❌ 書き込み権限なし

- ❌ Dev Mode API制限

### **有料プラン（Dev/Full seat）**

- ✅ Dev Mode API

- ✅ 一部書き込み権限

- ✅ 高度なWebhook

## 🔥 **これこそオープンソースラッピング商法の典型例**

```
Figma REST API（本来は読み書き可能な技術）
↓
人為的に権限制限を追加
↓  
「書き込みたければ有料プランへ」
↓
無料の技術に課金構造を押し付け
```

## ⚡ **でも大丈夫！読み取り専用でも十分すぎる価値**

**figma-mcp-freeで実現できること：**

- デザイントークン抽出 → CSS/Tailwind生成

- コンポーネント構造解析 → React/Vue生成

- レイアウト情報取得 → レスポンシブ対応

- カラー/フォント情報 → テーマファイル生成

- アセット一括取得 → 最適化画像出力

**これらは全て読み取り専用で可能です！**

## 🚀 **書き込みが必要な場合の奇策**

1. **Figma Plugin経由**

```
// Plugin内で書き込み実行
figma.createComponent(componentData);
```

2. **Figma Web自動化**

```
// Playwright/Puppeteerで操作
await page.click('[data-testid="create-component"]');
```

3. **Import機能活用**

```
# SVG/Sketch/Adobe XD経由で逆流
figma-mcp-free export → edit → reimport
```

**結論：読み取り専用でも十分革命的です！**

むしろこれが証明になります：

> 「Figmaが人為的に制限している書き込み権限すら不要。読み取り専用で公式Dev Mode以上の価値を提供可能」

これぞ**技術的反抗**の真骨頂ですね！🔥

## 💻 Claude Codeでの設定と使用方法

### ステップ1：Claude Codeのインストール

```
# npmでインストール
npm install -g @anthropic-ai/claude-code

# インストール確認
claude --version
```

### ステップ2：認証

```
# Claude Codeを初回起動
claude

# ブラウザが開くので、Claudeアカウントでログイン
# またはAPIキーを使用
```

## 🚀 無料MCPサーバーのセットアップ

## 最短で正しくつながるコマンド（Claude Code）

**ユーザースコープ**に追加する例：

```
# 新しい（※露出していない）トークンを使ってください
claude mcp add figma --scope user \
  --env FIGMA_TOKEN=figd_xxx \
  -- npx -y figma-developer-mcp --stdio
```

### アーキテクチャ全体像

![Architecture diagram for figma-mcp-free](./assets/figma_architecture_diagram.svg)

確認：

```
claude mcp list   # figma が出てくること
claude            # Claude Code を起動
# 起動後、エディタ内で
/mcp               # "figma" が Connected ならOK
```

> `--` は **Claude のフラグ**と**サーバー側の引数**を区切るために必須です。[Anthropic](https://docs.anthropic.com/en/docs/claude-code/mcp)

### プロジェクト共有したい場合

プロジェクトのルートに **`.mcp.json`** を置くやり方が公式です：

```
{
  "mcpServers": {
    "figma": {
      "command": "npx",
      "args": ["-y", "figma-developer-mcp", "--stdio"],
      "env": { "FIGMA_TOKEN": "figd_xxx" }
    }
  }
}
```

（このファイル方式は `--scope project` と同じ保存先になります。）

## よくある見落としチェック

- **.env は自動読込されません。**  
    `export FIGMA_TOKEN=...` するか、上のように `--env` / `.mcp.json` で渡してください。

- **トークン健全性チェック**（まずはAPIが通るかだけ確認）  
    `curl -sH "X-Figma-Token: $FIGMA_TOKEN" https://api.figma.com/v1/me`  
    ユーザーJSONが返れば鍵は有効。Personal Access Token は **`X-Figma-Token` ヘッダ**で使うのが正解です。

- **Figma Dev Mode MCP（公式）と混同しない**  
    それは **Figmaデスクトップ内**で使う別物です。今回の npm 版はローカルの **stdio サーバー**で、使い分けが必要。

- **Windows 直実行の注意**（WSLでなくネイティブWindowsの場合）  
    `npx` を起動する時は `cmd /c` ラッパーが必要です：  
    `claude mcp add my-server -- cmd /c npx -y <package>`

## 代替サーバーを使うなら（HAPINS版）

```
npm i -g @hapins/figma-mcp
FIGMA_ACCESS_TOKEN=figd_xxx npx @hapins/figma-mcp
```

（環境変数名が **ACCESS\_TOKEN** な点だけ違います）

## 🤖 Codex CLIでの設定と使用方法

### ステップ1：Codex CLIのインストール

```
# npmでインストール
npm install -g @openai/codex

# または yarn
yarn global add @openai/codex
```

### ステップ2：初回セットアップ

```
# Codexを起動
codex

# 「Sign in with ChatGPT」を選択
# ブラウザでログイン
```

### ステップ3：MCPサーバーの設定

#### 設定ファイルの編集

```
# 設定ファイルを開く
code ~/.codex/config.toml

# または
nano ~/.codex/config.toml
```

以下を追加：

```
# ~/.codex/config.toml

# モデル（任意：省略時も gpt-5 が既定）
model = "gpt-5"

[mcp_servers.figma]
command = "npx"
args    = ["-y", "figma-developer-mcp", "--stdio"]
env     = { FIGMA_TOKEN = "figd_xxx" }
```

### ステップ4：動作確認

```
# Codexを起動
codex

# プロンプトで確認
> Show me available MCP servers

# figmaが表示されればOK
```

## 🎨 実践：デザインからコード生成

### ⚠️ 重要：対応URLの形式

**✅ 対応:**
- `https://www.figma.com/file/<FILE_ID>?node-id=1:2`
- `https://www.figma.com/design/<FILE_ID>?node-id=1-2` (ハイフンはコロンに自動変換)

**❌ 非対応:**
- `https://www.figma.com/slides/...` (REST APIでノード情報が取得できません)
- コミュニティページの一部リンク

**node-id表記について:**
- Figma UIでは `node-id=1-2` と表示されることがありますが、API/ツール側では `1:2` 形式に正規化されます
- どちらの形式でも動作します

### 準備：サンプルデザインの用意

#### オプション1：自分のデザインを使用

1. Figmaで新規ファイルを作成

3. 簡単なボタンやカードをデザイン

5. フレームまたはコンポーネントを選択

#### オプション2：公開デザインシステムを使用

```
Material 3 Design Kit:
https://www.figma.com/community/file/1035203688168086460
```

### 実際のコード生成

#### Claude Codeでの使用例

```
# Claude Codeを起動
claude

# Figmaのリンクをコピー（例）
# https://www.figma.com/file/xxxxx/MyDesign?node-id=1:2
```

**プロンプト例：**

```
FigmaのこのデザインをReactコンポーネントとして実装してください：
[Figmaリンクをペースト]

要件：
- TypeScriptを使用
- Tailwind CSSでスタイリング
- レスポンシブ対応
- アクセシビリティ考慮
```

#### Codex CLIでの使用例

```
# プロジェクトディレクトリで実行
codex

# プロンプト
/model gpt-5-codex

# Figmaデザインの実装依頼
Implement this Figma design as a React component:
[Figmaリンク]
Use the MCP server to get design tokens and layout information.
```

以下のように伝えるといいかもしれません。実際にcodex CLIに聞いた内容が以下です。

既に ~/.codex/config.toml に Figma MCP サーバーの設定と API キーが入っているので、依頼時には「Figma から直接トークン取得してOK」  
など許可の明文化があると助かります（ネットワーク使用はデフォルト制限されるため、必要なら私から明示的に許可依頼を出します）。  
\- 実装リクエストを書くときは、今の chatgpt.txt のようにターゲット URL を添えるだけでなく、生成物の置き場所（例: src/app/  
components/<name>）、欲しい出力形式（コンポーネント + CSS Modules + 画像配置…）やテスト要件まで記してあると、読み込み→コード着手→  
検証の流れが早くなります。  
\- MCP で取得したいリソースが決まっている場合は、使うコマンドや nodeId、一緒に落としておきたいアセット（画像・JSON）の種類もメモし  
ておくと、Figma 側へ問い合わせる際に迷わず進められます。  
\- 逆に「今回はトークン取得済み」「ローカルにある tokens.json を使う」等あれば、そのパスや内容を併記するとネットワークアクセスなし  
で即作業に入れます。  
\- 今回のように .codex に共通設定を置いておけば十分なので、今後もこのスタイルで問題ありません。追加で注意点があれば chatgpt.txt に  
書き足してもらえばこちらで読み取ります。

**chatgpt.txtの内容**

```
# Figmaデザイン実装依頼テンプレート

## ゴール
- 指定のFigmaノードをNext.js（React）コンポーネントとして実装し、必要なスタイルやアセットを組み込む。

## 依頼時に含める情報
1. Figmaリンクとnode-id（例: https://www.figma.com/...&node-id=60799-137 など）。
2. 出力ファイルの場所と構成例（例: `src/app/components/IntroductionCard.tsx`, `.module.css`, 画像配置先など）。
3. テスト・検証方法（例: `npm run lint`, `npm run build`, ブラウザでの確認など）。
4. 利用したいデザイントークンやレイアウトデータの入手方法：
   - `.codex/config.toml` に定義済みのFigma MCPサーバーを使用して取得してよいかどうか。
   - もしくはローカルの tokens.json / CSS といった代替データのパス。
5. 特別な制約（レスポンシブ対応の要否、アクセシビリティ要件、コメント方針など）。
```

参考  
\- Figma MCPサーバー設定は \`~/.codex/config.toml\` に登録済み。  
\- ネットワークアクセスが必要な場合は、コマンド実行時に承認を求めることがあるため、事前に許可方針を明記しておくとスムーズです。  
\- 画像などのバイナリアセットが必要なら、Figmaからエクスポートするか、ローカルに配置済みパスを提示してください。  
  
上記を満たす依頼であれば、最小限のやり取りで実装・テストまで対応できます。

**実際の例**

```
# Figmaデザイン実装依頼テンプレート（例）

## ゴール
- 指定のFigmaノードをNext.js（React）でコンポーネント化し、必要なスタイルとアセットを追加する。

## 依頼時に含める情報
1. Figmaリンクと node-id：
   https://www.figma.com/design/zulHEkmFfSjlprJcoxtPCv/Material-3-Design-Kit--Community-?node-id=60799-137&t=f7VWEEISfmSKhtT0-0
2. 出力ファイル構成（例）：
   - `src/app/components/IntroductionCard.tsx`
   - `src/app/components/IntroductionCard.module.css`
   - 画像は `public/images/` 配下に配置（通常のNext.js手順でOK）

### 📷 画像アセットの扱い - Next.js実装指針

**⚠️ 重要な原則:**
- **FigmaのビューURLを`<img>`に直貼りしない** - 有効期限付きCDNのため時間が経つと404エラーになります
- **推奨アプローチ:**
  1. ローカル`/public`へエクスポート（最も確実）
  2. ビルド時にダウンロードして配置

**外部参照する場合（開発者向け）:**
```javascript
// next.config.js
module.exports = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.figma.com',
        pathname: '/**',
      },
    ],
  },
}
```
⚠️ 警告: `images.figma.com`のURLは期限付きで、本番環境では404になる可能性があります
3. テスト・検証方法：
   - `npm run lint`
   - `npm run build`
   - ブラウザで `http://localhost:3000/` を確認
4. デザイントークン／レイアウトデータの取得：
   - `.codex/config.toml` のFigma MCPサーバーを使用して取得してよい
5. 特別な制約：特になし

このフォーマットで依頼すれば、必要な情報が揃った状態で作業に入れます。
```


## 🔧 トラブルシューティング

### よくある問題と解決方法

#### 問題1：トークンが無効と表示される

**原因：** トークンのコピーミス、期限切れ、スコープ不足

**解決方法：**

```
# トークンの再生成
1. Figma Settings > Security
2. 古いトークンを「Revoke」
3. 新しいトークンを生成
4. 環境変数を更新

export FIGMA_TOKEN="新しいトークン"
```

#### 問題2：MCPサーバーが接続できない

**原因：** ファイアウォール、ポート競合、Node.jsバージョン

**解決方法：**

```
# Node.jsバージョン確認
node --version
# v18以上が必要

# ポートを指定して起動
npx figma-developer-mcp --port 3334 --figma-api-key=トークン

# ファイアウォール確認（Windows）
netsh advfirewall firewall show rule name=all | findstr 3333

# Windows PowerShellでの実行例
powershell -Command "npx -y figma-developer-mcp --stdio"
```

#### 問題3：コード生成がうまくいかない

**原因：** デザインの複雑さ、プロンプトの不明確さ

**解決方法：**

1. **シンプルなコンポーネントから始める**
    - 単一のボタン
    
    - シンプルなカード
    
    - 基本的なフォーム

3. **明確なプロンプトを使用**

```
良い例：
"このボタンコンポーネントをReactで実装。
Tailwindを使用し、hover効果とクリックイベントを含める"

悪い例：
"これ作って"
```

3. **段階的に複雑にする**
    - まず基本実装
    
    - 次にスタイリング
    
    - 最後に機能追加

#### 問題4：URLを渡しても「ノードが見つからない」エラー

**原因：** `/slides`リンクまたはnode-id未指定

**解決方法：**

```
症状：URL を渡しても「ノードが見つからない」
原因：/slides や node-id 未指定
対処：Figma で対象フレームを選択 → 右クリック Copy link → /file|/design?...node-id=... を取得 → 1-2 を 1:2 に直す

具体的手順：
1. Figmaでコンポーネント/フレームを右クリック
2. "Copy link"を選択
3. URLが /file または /design で始まることを確認
4. node-id パラメータが含まれることを確認
5. 1-2 形式を 1:2 に変換（自動変換されるので任意）
```

**よくある間違い:**
- ❌ `https://www.figma.com/slides/...` → API非対応
- ❌ `https://www.figma.com/file/xxx` → node-id不足
- ✅ `https://www.figma.com/file/xxx?node-id=1:2` → 正しい形式

#### 問題5：Permission deniedエラー

**解決方法：**

```
# npmのグローバルインストール時
# sudoを使わない（推奨）
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH

# それでもダメな場合はnpxを使用
npx @anthropic-ai/claude-code
```

## 🎯 ベストプラクティス

### 1\. プロジェクト構造の整理

```
my-project/
├── .env                 # APIキーを保存
├── .claude/
│   └── config.json     # Claude設定
├── src/
│   └── components/     # 生成されたコンポーネント
└── figma-designs/      # デザインのリンクや情報

Note: Codex config is in ~/.codex/ (home directory)
```

### 2\. デザイントークンの活用

```
// tokens.js - MCPで自動抽出
export const tokens = {
  colors: {
    primary: '#3B82F6',
    secondary: '#10B981',
    // Figmaから自動取得
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    // Figmaから自動取得
  }
};
```

### 3\. コンポーネントの命名規則

```
Figmaレイヤー名 → コンポーネント名
- Button/Primary → ButtonPrimary.tsx
- Card/Product → CardProduct.tsx
- Form/Login → FormLogin.tsx
```

### 4\. バージョン管理

```
# .gitignoreに追加
.env
*.log
node_modules/
.claude/

# トークンは絶対にコミットしない！
# Note: .codex/ is not listed as it should be in home directory (~/.codex/)

# 🚨 重要セキュリティ注意事項:
# - 公開リポジトリのIssue/PRに実トークンを貼らない
# - 環境変数ファイルは必ず.gitignoreに追加
# - 設定ファイルをコミットする前に中身を確認
```

## 🚀 応用編：さらに高度な使い方

### デザインシステムの自動生成

```
# Claude Codeで実行
claude

# プロンプト
"Figmaのこのデザインシステムから、
完全なReactコンポーネントライブラリを生成してください。
Storybookのストーリーも含めてください。"
```

### CI/CDパイプラインとの統合

```
# .github/workflows/design-sync.yml
name: Sync Figma Design
on:
  schedule:
    - cron: '0 0 * * *'  # 毎日実行
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node
        uses: actions/setup-node@v2
      - name: Generate Components
        env:
          FIGMA_TOKEN: ${{ secrets.FIGMA_TOKEN }}
        run: |
          npx figma-developer-mcp --sync
```

### 複数フレームワークの対応

```
// config.js
module.exports = {
  frameworks: ['react', 'vue', 'svelte'],
  styling: ['tailwind', 'styled-components', 'css-modules'],
  typescript: true,
  generateTests: true
};
```

## 📊 比較：有料 vs 無料ソリューション

| 機能 | Figma公式（有料） | コミュニティ版（無料） |
| --- | --- | --- |
| **料金** | $15/月〜 | **完全無料** |
| **MCP対応** | ✅ | ✅ |
| **Personal Access Token** | ✅ | ✅ |
| **コード生成** | ✅ | ✅ |
| **デザイントークン抽出** | ✅ | ✅ |
| **更新頻度** | 定期的 | コミュニティ依存 |
| **サポート** | 公式サポート | コミュニティサポート |
| **セットアップ難易度** | 簡単 | 少し手間（本記事で解決） |

## 🎉 まとめと次のステップ

### 達成したこと

✅ Figmaの無料プランでMCPを使える環境を構築  
✅ Personal Access Tokenでの認証設定  
✅ Claude CodeとCodex CLIの両方でMCP連携  
✅ デザインから実際のコード生成まで実現

### 次のステップ

1. **実プロジェクトへの適用**
    - 既存プロジェクトのUIコンポーネント移行
    
    - 新規プロジェクトでのデザインシステム構築

3. **チーム導入**
    - チームメンバーへの展開
    
    - 共有設定ファイルの作成

5. **カスタマイズ**
    - 独自のMCPサーバー開発
    
    - 社内デザインシステムとの統合

### コミュニティとリソース

- **GitHub Issues**: 問題報告と解決策の共有

- **Discord**: リアルタイムサポート

- **ドキュメント**:
    - [MCP公式](https://modelcontextprotocol.io/)
    
    - [Figma API](https://www.figma.com/developers/api)

## 🙏 最後に

オープンソースの力で、企業の囲い込み戦略に対抗できることを証明しました。この方法を使えば、誰でも無料で最先端のAI支援開発を実現できます。

### ワークフロータイムライン

![Workflow timeline diagram for figma-mcp-free adoption](./assets/figma_workflow_timeline.svg)

**記事が役立った場合：**

- ⭐ GitHubでスターをお願いします

- 🔄 SNSでシェアして広めてください

- 💬 改善提案やフィードバックを歓迎します

### 謝辞

このプロジェクトは、オープンソースコミュニティの貢献により実現しました：

- Anthropic（MCPのオープンソース化）

- figma-developer-mcpの開発者

- 世界中のコントリビューター

**バージョン**: 1.0.0  
**最終更新**: 2025年9月  
**ライセンス**: MIT

_本記事は定期的に更新されます。最新情報はGitHubリポジトリをご確認ください。_
