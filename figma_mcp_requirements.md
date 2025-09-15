# figma-mcp-free 要件定義書

## 🎯 プロジェクト概要

### プロジェクト名
`figma-mcp-free` - Figma MCP Server Free Alternative

### 目的
- **問題**: Figma公式のDev Mode MCP Serverが有料プラン限定
- **解決**: MCPオープン規格を使った完全無料代替案の提供
- **訴求**: オープンソースの力で企業の囲い込み戦略に対抗

### 訴求文案（メインメッセージ）
```markdown
⚠️ **知ってましたか？MCPは無料のオープン規格です**
でもFigma公式は有料プラン限定にしています。

✅ **完全無料で同じことができます**
Personal Access Tokenだけで、Dev Mode以上の機能を。

🚀 **5分でセットアップ完了**
```sh
npx figma-mcp-free init
# → Figma token入力 → 完了
```

💡 **オープンソースが勝利する瞬間を目撃しましょう**
```

## 📋 機能要件

### Phase 1: Core MCP Server
- [ ] **MCP STDIO実装**
  - Anthropic MCP規格準拠
  - Figma REST API統合
  - Personal Access Token認証

- [ ] **基本機能**
  - ファイル/フレーム一覧取得
  - コンポーネント情報抽出
  - Design Token変換（W3C準拠）

### Phase 2: Advanced Features
- [ ] **コード生成**
  - React/Vue/Svelte/HTML対応
  - Tailwind CSS/styled-components対応
  - TypeScript型定義生成

- [ ] **Cursor/Codex統合**
  - 設定ファイル自動生成
  - プロジェクト別設定管理

### Phase 3: Developer Experience
- [ ] **CLI Tool**
  - `figma-mcp init` - 初期設定
  - `figma-mcp sync` - デザイントークン同期
  - `figma-mcp generate` - コード生成

- [ ] **VS Code Extension**
  - ワンクリックセットアップ
  - リアルタイムプレビュー

## 🏗️ 技術仕様

### アーキテクチャ
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Claude/Cursor │────│  figma-mcp-free  │────│   Figma API     │
│   (MCP Client)  │    │  (MCP Server)     │    │ (REST/GraphQL)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Tech Stack
- **Language**: TypeScript
- **Runtime**: Node.js 18+
- **Protocol**: MCP STDIO
- **API**: Figma REST API
- **Package Manager**: npm/pnpm

### ディレクトリ構造
```
figma-mcp-free/
├── packages/
│   ├── mcp-server/           # メインMCPサーバー
│   ├── figma-client/         # Figma APIクライント
│   ├── design-tokens/        # W3C Design Tokens変換
│   ├── code-generator/       # コード生成エンジン
│   └── cli/                  # CLI tool
├── examples/
│   ├── cursor-config/        # Cursor設定例
│   ├── codex-config/         # Claude Codex設定例
│   └── demo-projects/        # デモプロジェクト
├── docs/
│   ├── README.md             # メイン訴求文書
│   ├── setup-guide.md        # セットアップガイド
│   ├── why-this-exists.md    # 問題提起文書
│   ├── api-reference.md      # API仕様
│   └── comparison.md         # 公式vs無料版比較
└── tools/
    ├── health-check.js       # 接続テスト
    └── migration.js          # 公式からの移行
```

## 📦 パッケージ仕様

### Core Package: `@figma-mcp-free/server`
```typescript
interface FigmaMCPServer {
  // MCP Protocol Methods
  initialize(params: InitializeParams): Promise<void>
  listTools(): Promise<Tool[]>
  callTool(request: CallToolRequest): Promise<CallToolResult>
  
  // Figma API Methods
  getFile(fileId: string): Promise<FigmaFile>
  getComponents(fileId: string): Promise<Component[]>
  exportDesignTokens(fileId: string): Promise<DesignTokens>
  generateCode(componentId: string, framework: Framework): Promise<string>
}
```

### CLI Package: `figma-mcp-free`
```bash
# セットアップ
figma-mcp-free init
figma-mcp-free config set token <FIGMA_TOKEN>

# 機能実行
figma-mcp-free sync <FILE_ID>
figma-mcp-free generate component <COMPONENT_ID> --framework react
figma-mcp-free export tokens <FILE_ID> --output ./tokens.json

# Cursor/Codex統合
figma-mcp-free setup cursor
figma-mcp-free setup codex
```

## 🎨 UX Requirements

### セットアップフロー
1. `npm install -g figma-mcp-free`
2. `figma-mcp-free init`
3. Figma Personal Access Token入力
4. Cursor/Codex設定自動生成
5. 完了

### エラーハンドリング
- [ ] わかりやすいエラーメッセージ
- [ ] トークン権限不足の自動検出
- [ ] 接続テスト機能

## 📊 成功指標

### Technical KPIs
- [ ] GitHub Stars > 1000 (6ヶ月以内)
- [ ] npm週間ダウンロード > 5000
- [ ] Issue解決率 > 95%

### Impact KPIs
- [ ] Figma公式の価格政策変更誘発
- [ ] 他社の類似囲い込み戦略への抑制効果
- [ ] オープンソース代替案のモデルケース確立

## 🚀 開発スケジュール

### Week 1-2: Foundation
- [ ] プロジェクト初期化
- [ ] MCP Server基本実装
- [ ] Figma API Client実装

### Week 3-4: Core Features
- [ ] Design Token変換
- [ ] 基本的なコード生成
- [ ] CLI Tool作成

### Week 5-6: Integration & Polish
- [ ] Cursor/Codex統合
- [ ] ドキュメント整備
- [ ] テスト実装

### Week 7-8: Launch
- [ ] パフォーマンス最適化
- [ ] リリース準備
- [ ] コミュニティ公開

## 💡 マーケティング戦略

### コンテンツ戦略
1. **Problem Statement Blog Post**
   - "Figmaはいつからオープンソースを有料化したのか"
   - HackerNews, Reddit投稿

2. **Technical Demo Video**
   - "5分でFigma Dev Modeを無料化する方法"
   - YouTube, Twitter

3. **Developer Community Outreach**
   - Discord/Slack コミュニティでの紹介
   - 関連OSSプロジェクトとの連携

### ターゲット
- Figma Dev Mode課金に不満を持つ開発者
- オープンソース支持者
- スタートアップ・個人開発者

## 🤝 Claude Code 協働フロー

### セットアップ
```bash
# Claude Codeでプロジェクト作成
mkdir figma-mcp-free
cd figma-mcp-free
claude-code init

# 要件に基づく実装開始
claude-code implement "MCP Server基本実装"
claude-code implement "Figma API Client"
```

### 実装優先順位
1. **packages/mcp-server/** - MCP Protocol実装
2. **packages/figma-client/** - API wrapper
3. **packages/cli/** - セットアップ自動化
4. **docs/README.md** - 訴求文書
5. **examples/** - 設定例とデモ

## 🚀 ロードマップ：OSS解放運動

### Phase 1: figma-mcp-free (現在)
- Figmaの囲い込み解除
- コミュニティ構築
- 技術実証

### Phase 2: 第2弾プロジェクト (3-6ヶ月後)
- **supabase-free**: PostgreSQL + PostgREST + Realtime直接構成
- **docker-desktop-free**: Podman + GUI wrapper
- **terraform-cloud-free**: OpenTofu + GitOps pipeline

### Phase 3: 統合フレームワーク (6-12ヶ月後)
- **oss-liberation-toolkit**: 囲い込み解放用汎用フレームワーク
- 新しい囲い込みの自動検出・対抗案生成
- コミュニティ主導の持続的対抗システム

### Phase 4: 業界標準変革 (1-2年後)
- 企業の囲い込み戦略標準的抑制
- OSS本来の価値体系復活
- **健全な競争サイクル**の確立

この要件定義で、Claude Codeと協働してプロジェクトを進めましょう！

---

**重要**: このプロジェクトは単なるツール開発ではありません。**業界の悪質な商慣行に対する技術的反抗**であり、**オープンソースの本来の精神を取り戻す運動**です。