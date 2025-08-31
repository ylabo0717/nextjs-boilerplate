# 設定ファイル構成ガイド

このプロジェクトでは、設定ファイルが機能別に整理された`config/`ディレクトリに配置されています。このドキュメントでは、各設定ファイルの場所と用途について説明します。

## 📁 ディレクトリ構成

```
config/
├── security/           # セキュリティ関連設定
│   ├── .gitleaks.toml  # シークレット検出設定
│   └── .semgrep.yml    # 静的解析設定
├── quality/            # コード品質関連設定
│   ├── eslint.config.mjs       # ESLint設定
│   ├── .lintstagedrc.js       # lint-staged設定
│   ├── .prettierrc.js         # Prettier設定
│   ├── .prettierignore        # Prettier除外設定
│   └── .jscpd.json            # コード複製検出設定
├── performance/        # パフォーマンス関連設定
│   ├── .lighthouserc.json        # Lighthouse CI設定（デスクトップ）
│   └── .lighthouserc.mobile.json # Lighthouse CI設定（モバイル）
├── build/              # ビルド関連設定
│   └── postcss.config.mjs      # PostCSS設定
├── .mcp.json           # MCP（Model Context Protocol）設定
├── vitest.*.config.ts  # Vitest設定ファイル群
├── playwright.*.config.ts # Playwright設定ファイル群
├── typedoc.json        # TypeDoc設定
├── commitlint.config.js # Commitlint設定
├── components.json     # shadcn/ui コンポーネント設定
└── test-env.js         # テスト環境設定
```

## 🔧 設定ファイル詳細

### セキュリティ関連 (`config/security/`)

#### `.gitleaks.toml`

- **用途**: Git履歴とステージングエリアでのシークレット検出
- **実行タイミング**:
  - pre-pushフック
  - CI/CDパイプライン
  - 手動スキャン
- **カスタマイズ**: 偽陽性を避けるため、プロジェクト固有のパターンを除外

```bash
# 使用例
gitleaks detect --config config/security/.gitleaks.toml
gitleaks protect --staged --config config/security/.gitleaks.toml
```

#### `.semgrep.yml`

- **用途**: セキュリティ脆弱性とコード品質問題の静的解析
- **実行タイミング**: CI/CDパイプライン
- **カスタマイズ**: プロジェクト固有のルール追加可能

### 品質管理関連 (`config/quality/`)

#### `eslint.config.mjs`

- **用途**: コードスタイル、品質、セキュリティルールの統合設定
- **特徴**:
  - Next.js公式推奨設定ベース
  - TypeScript完全サポート
  - セキュリティルール内蔵
  - Tailwind CSS v4対応
- **プロキシファイル**: プロジェクトルートの`eslint.config.mjs`から参照

#### `.lintstagedrc.js`

- **用途**: Git commitフック時の段階的チェック設定
- **対象**: ステージされたファイルのみ
- **プロキシファイル**: プロジェクトルートの`.lintstagedrc.js`から参照

#### `.prettierrc.js` & `.prettierignore`

- **用途**: コードフォーマット設定
- **プロキシファイル**: プロジェクトルートの対応ファイルから参照

#### `.jscpd.json`

- **用途**: コード複製検出設定
- **メトリクス**: 品質ゲートの一部として実行

### パフォーマンス関連 (`config/performance/`)

#### `.lighthouserc.json`

- **用途**: Lighthouse CI設定（デスクトップ環境）
- **測定対象**: Core Web Vitals、アクセシビリティ、SEO
- **実行**: CI/CDパイプライン自動実行

#### `.lighthouserc.mobile.json`

- **用途**: Lighthouse CI設定（モバイル環境）
- **実行**: 必要時に手動実行

```bash
# モバイル測定例
pnpm dlx @lhci/cli autorun --config=config/performance/.lighthouserc.mobile.json
```

### ビルド関連 (`config/build/`)

#### `postcss.config.mjs`

- **用途**: PostCSS設定（Tailwind CSS v4統合）
- **プロキシファイル**: プロジェクトルートの`postcss.config.mjs`から参照

## 🔄 プロキシファイル システム

多くの設定ファイルは、ツールが期待するプロジェクトルートにプロキシファイルを配置し、実際の設定を`config/`ディレクトリから読み込む構成になっています。

### プロキシファイルの例

```javascript
// プロジェクトルートの .lintstagedrc.js
module.exports = require('./config/quality/.lintstagedrc.js');
```

```javascript
// プロジェクトルートの .prettierrc.js
module.exports = require('./config/quality/.prettierrc.js');
```

## 📝 設定ファイル追加・変更時のガイドライン

### 1. 新しい設定ファイルの追加

1. 適切なカテゴリディレクトリに配置
2. 必要に応じてプロキシファイルを作成
3. ドキュメントを更新
4. CI/CDワークフローを更新

### 2. 既存設定ファイルの変更

1. 変更理由を明確化
2. 他のツールへの影響を検証
3. チーム全体への変更通知

### 3. パス参照の更新

設定ファイルを移動した場合は、以下の箇所を更新：

- GitHub Actions ワークフロー
- npm/pnpm scripts
- ドキュメント
- README.md
- 他の設定ファイルからの参照

## 🔍 トラブルシューティング

### 設定ファイルが見つからない場合

1. プロキシファイルの存在確認
2. パス参照の正確性確認
3. 大文字小文字の一致確認

### ツールが設定を認識しない場合

1. ツール固有の設定ファイル命名規則確認
2. 設定ファイルの構文エラー確認
3. 必要に応じて`--config`オプションで明示的にパス指定

## 📚 関連ドキュメント

- [TypeScript Guidelines](./typescript-guidelines.md)
- [Testing Guidelines](./testing-guidelines.md)
- [Security Guidelines](./security-guidelines.md)
- [Review Checklist](./review-checklist.md)
