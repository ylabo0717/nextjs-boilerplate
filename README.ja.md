# 🚧 Next.js ボイラープレート（積極的な開発中）

> **⚠️ このプロジェクトは現在積極的な開発中であり、まだプロダクション対応ではありません。機能とAPIは変更される可能性があります。**

TypeScript、Tailwind CSS、shadcn/ui、包括的な開発ツールを備えたプロダクション対応の Next.js ボイラープレート。

## 📋 前提条件

- **Node.js 20.x 以上**
- **pnpm 8.x 以上**
- **Gitleaks**（シークレットスキャニング用）
- **Docker & Docker Compose**（コンテナ化開発用）

## 🚀 機能

### コア技術

- **Next.js 15.4.6** - App Router を使用した React フレームワーク
- **React 19.1.0** - Server Components を使用した最新の React
- **TypeScript** - 厳格モードを使用した型安全な開発
- **Tailwind CSS v4** - ユーティリティファーストの CSS フレームワーク
- **shadcn/ui** - 高品質な React コンポーネント

### 開発体験

- **Turbopack** - 高速な HMR
- **ESLint & Prettier** - コード品質とフォーマッティング
- **Husky & lint-staged** - コード品質のためのプレコミットフック
- **Commitlint** - 従来のコミットメッセージ
- **パスエイリアス** - `@/` プレフィックスを使用したクリーンなインポート

### UI コンポーネント（shadcn/ui）

- React Hook Form 統合を使用したフォームコンポーネント
- Sonner を使用したトースト通知
- Dialog、Card、Button、Input、Select など
- CSS 変数を使用したダークモードサポート
- 自動クラスソートのための Tailwind CSS プラグイン

## 🚀 クイックスタート

このセクションでは、プロジェクトを迅速にセットアップし、正しく動作することを確認する方法を説明します。

### 🐳 Docker バージョン（推奨）

Docker バージョンは環境固有の問題を回避するため推奨されます。詳細なセットアップ手順については、下記の[Docker インストールガイド](#docker-installation)を参照してください。

#### クイックセットアップ

```bash
# 1. リポジトリをクローン
git clone https://github.com/ylabo0717/nextjs-boilerplate.git
cd nextjs-boilerplate

# 2. 環境ファイルをコピー
cp .env.base.example .env.base
cp .env.dev.example .env.dev

# 3. 開発環境を開始
pnpm docker:dev
# または、pnpm スクリプトが利用できない場合は Docker Compose を直接使用
# docker compose -f docker/compose/docker-compose.yml --env-file .env.base --env-file .env.dev up
```

#### 検証

```bash
# アプリケーションにアクセス（ブラウザで開く）
open http://localhost:3000

# Docker 環境ですべてのテストを実行
pnpm docker:test

# 個別のテストタイプを実行
pnpm docker:test:unit        # ユニットテスト
pnpm docker:test:integration # 統合テスト
pnpm docker:test:e2e         # E2E テスト
```

### 💻 ローカル開発

Docker を使用しないローカル開発の場合。詳細なセットアップ手順については、下記の[ツールインストールガイド](#tool-installation)を参照してください。

#### クイックセットアップ

```bash
# 1. リポジトリをクローン
git clone https://github.com/ylabo0717/nextjs-boilerplate.git
cd nextjs-boilerplate

# 2. 依存関係をインストール
pnpm install

# 3. Playwright ブラウザをインストール
pnpm exec playwright install

# 4. 環境ファイルをコピー
cp .env.base.example .env.base
cp .env.dev.example .env.dev
cp .env.test.example .env.test

# 5. 開発サーバーを開始
pnpm dev
```

#### 検証

```bash
# アプリケーションにアクセス（ブラウザで開く）
open http://localhost:3000

# コード品質チェック
pnpm precommit:check

# テストを実行
pnpm test:unit           # ユニットテスト
pnpm test:integration    # 統合テスト
pnpm test:e2e           # E2E テスト
pnpm test:coverage      # テストカバレッジ
```

### 🔍 Git フック検証

プロジェクトにはプレコミットとプレプッシュフックが設定されています：

```bash
# 1. フックを検証するためのテストファイルを作成
echo "console.log('test');" > test-file.js
git add test-file.js

# 2. コミット（プレコミットフックが実行される）
git commit -m "test: check pre-commit hooks"
# ESLint、Prettier、TypeScript チェックが自動実行される

# 3. プッシュ（プレプッシュフックが実行される）
git push
# Gitleaks シークレットスキャニングが実行される

# 4. テストファイルをクリーンアップ
git rm test-file.js
git commit -m "test: cleanup test file"
```

### ✅ セットアップ完了検証

以下がすべて成功すれば、セットアップが完了です：

- [ ] アプリケーションが http://localhost:3000 で正しく表示される
- [ ] `pnpm precommit:check` がエラーなしで完了する
- [ ] `pnpm test:unit` がすべてのテストにパスする
- [ ] `pnpm test:integration` がすべてのテストにパスする
- [ ] `pnpm test:e2e` がすべてのテストにパスする
- [ ] プレコミットフックが git commit で動作する
- [ ] プレプッシュフックが git push で動作する

### 🚨 トラブルシューティング

**Node.js バージョンの問題：**

```bash
# 現在のバージョンを確認
node --version  # 20.x.x 以上である必要があります

# pnpm が見つからない場合
npm install -g pnpm

# 必要に応じて npm/pnpm キャッシュをクリア
npm cache clean --force
pnpm store prune
```

**Docker の問題：**

```bash
# Docker ステータスを確認
docker --version
docker compose version

# Docker が動作していない
sudo systemctl start docker  # Linux
# Docker Desktop を開始 # macOS/Windows

# ポートの競合
# ポート 3000 を使用しているプロセスを終了
lsof -ti:3000 | xargs kill -9
```

**権限エラー：**

```bash
# Linux/macOS ファイル権限
sudo chown -R $USER:$USER .
chmod +x scripts/*.sh

# Docker permission denied
sudo usermod -aG docker $USER  # ログアウトが必要
```

**テスト環境の問題：**

```bash
# テスト環境をリセット
rm -rf node_modules
pnpm install
pnpm exec playwright install

# 既知のテスト制限事項
SKIP_LOKI_TESTS=true pnpm test:integration
```

詳細な FAQ と高度なトラブルシューティングについては、[docs/developer_guide/infrastructure/docker/faq.ja.md](docs/developer_guide/infrastructure/docker/faq.ja.md) を参照してください。

## 📦 利用可能なスクリプト

```bash
# 開発
pnpm dev          # Turbopack を使用した開発サーバーの開始
pnpm build        # プロダクション用ビルド
pnpm start        # プロダクションサーバーの開始

# コード品質
pnpm lint         # ESLint を実行
pnpm format       # Prettier でコードをフォーマット
pnpm format:check # コードフォーマッティングをチェック
pnpm typecheck    # TypeScript 型チェックを実行

# テスト
pnpm test:unit         # Vitest を使用したユニットテスト
pnpm test:integration  # Vitest を使用した統合テスト
pnpm test:coverage     # テストカバレッジレポートを生成
pnpm test:scripts      # スクリプトテストを実行
pnpm test:e2e          # Playwright を使用したエンドツーエンドテスト

# Docker コマンド
pnpm docker:test       # すべての Docker テストを実行
pnpm docker:dev        # 開発環境を開始
pnpm docker:prod       # プロダクション環境を開始

# 品質メトリクスと分析
pnpm metrics           # プロジェクトメトリクスを測定
pnpm quality:check     # 品質ゲートチェックを実行
pnpm quality:analyze   # コード品質を分析
pnpm quality:report    # 品質レポートを生成

# ドキュメントとリリース
pnpm docs:check        # ドキュメントの完全性をチェック
pnpm changeset         # バージョン管理用のチェンジセットを作成
pnpm changeset:version # チェンジセットに基づいてバージョンを更新
pnpm release           # リリースをビルドして公開

# Git フック（自動）
# プレコミット: ESLint、Prettier、TypeScript チェック
# コミットメッセージ: 従来のコミット検証
```

## 🧪 テスト

このプロジェクトには、複数のフレームワークとアプローチを使用した包括的なテストが含まれています。

### テストの実行

Vitest を使用したユニット/統合テストの実行：

```bash
pnpm test            # すべて（ユニット+統合）
pnpm test:unit       # ユニットのみ
pnpm test:integration # 統合のみ
pnpm test:coverage   # ユニット+統合のカバレッジ
```

Playwright を使用したエンドツーエンドテストの実行：

```bash
pnpm test:e2e        # E2E テスト
```

### テストアーキテクチャ

- **ユニットテスト**: 高速で分離されたコンポーネント/関数テスト
- **統合テスト**: Docker コンテナを使用したデータベースと API 統合テスト
- **E2E テスト**: Playwright を使用した完全なユーザーワークフローテスト
- **カバレッジレポート**: 包括的なコードカバレッジ分析

## 🐳 Docker サポート

このプロジェクトには、開発、テスト、プロダクション環境のための包括的な Docker サポートが含まれています。

### 開発環境

ホットリロードを使用した開発環境の開始：

```bash
docker compose up
```

[http://localhost:3000](http://localhost:3000) でアプリケーションにアクセスしてください。

### テスト環境

Docker コンテナですべてのテストを実行：

```bash
# すべてのテストタイプ
pnpm docker:test

# 個別のテストタイプ
pnpm docker:test:unit        # ユニットテスト
pnpm docker:test:integration # 統合テスト
pnpm docker:test:e2e         # E2E テスト

# テストコンテナをクリーンアップ
pnpm docker:test:clean
```

### プロダクション環境

監視機能付きのプロダクション環境の開始：

```bash
# pnpm スクリプトを使用（推奨）
pnpm docker:prod

# または Docker Compose を直接使用
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

**アクセスポイント：**

- **アプリケーション**: [http://localhost:8080](http://localhost:8080)
- **Grafana ダッシュボード**: [http://localhost:3001](http://localhost:3001) (admin/password)
- **Loki ログ**: [http://localhost:3100](http://localhost:3100)
- **ヘルスチェック**: [http://localhost:8080/api/health](http://localhost:8080/api/health)
- **メトリクス**: [http://localhost:8080/api/metrics](http://localhost:8080/api/metrics)

### 環境変数

このプロジェクトでは、保守性を向上させるために共通設定と環境固有の設定を分離した**統合環境変数システム**を使用しています。

**ファイル構造：**

- `.env.base.example` - すべての環境の共通設定
- `.env.dev.example` - 開発固有の設定
- `.env.prod.example` - プロダクション固有の設定
- `.env.test.example` - テスト固有の設定

**セットアップ：**

```bash
# サンプルファイルをコピー（必須）
cp .env.base.example .env.base
cp .env.dev.example .env.dev
cp .env.prod.example .env.prod
cp .env.test.example .env.test

# 実際の値でファイルを編集（特にプロダクション用の .env.prod）
```

**Docker Compose での使用：**

```bash
# 開発
docker compose --env-file .env.base --env-file .env.dev up

# プロダクション
docker compose -f docker-compose.prod.yml --env-file .env.base --env-file .env.prod up -d
```

詳細な設定オプションについては、[`docs/environment-variables.md`](docs/environment-variables.md) を参照してください。

### Docker アーキテクチャ

- **マルチステージビルド** で最適化されたイメージサイズ
- **セキュリティファーストデザイン** で非ルートユーザー
- すべてのサービスの**ヘルスチェック**
- プロダクション安定性のための**リソース制限**
- Loki と Grafana との**ログ統合**
- **OpenTelemetry メトリクス**サポート

## 📁 プロジェクト構造

```
nextjs-boilerplate/
├── src/                  # アプリケーションソースコード
│   ├── app/              # Next.js App Router
│   │   ├── layout.tsx    # プロバイダー付きルートレイアウト
│   │   ├── page.tsx      # ホームページ
│   │   └── globals.css   # グローバルスタイル
│   ├── components/       # React コンポーネント
│   │   ├── ui/           # shadcn/ui ベースコンポーネント
│   │   ├── layout/       # レイアウトコンポーネント（ヘッダー、フッターなど）
│   │   └── features/     # 機能固有のコンポーネント
│   ├── lib/              # 複雑なビジネスロジック
│   │   └── logger/       # 構造化ログシステム（純粋関数）
│   ├── utils/            # 純粋なユーティリティ関数
│   │   └── cn.ts         # クラス名ユーティリティ
│   ├── hooks/            # カスタム React フック
│   ├── services/         # ビジネスロジックと API サービス
│   ├── features/         # 機能ベースのモジュール
│   ├── types/            # TypeScript 型定義
│   ├── constants/        # アプリケーション定数
│   ├── stores/           # 状態管理
│   └── repositories/     # データアクセス層
├── public/               # 静的アセット
└── docs/                # ドキュメント
```

## 🎨 UI コンポーネント

このボイラープレートには、事前設定された shadcn/ui コンポーネントが含まれています：

### 新しいコンポーネントの追加

```bash
pnpm dlx shadcn@latest add [component-name]
```

### 利用可能なコンポーネント

- **フォーム**: Input、Label、Form（React Hook Form 付き）
- **フィードバック**: Toast（Sonner）、Alert
- **オーバーレイ**: Dialog、Dropdown Menu
- **表示**: Card、Separator、Skeleton
- **ボタン**: 複数のバリアント付きボタン

### 使用例

```tsx
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function Example() {
  return <Button onClick={() => toast.success('こんにちは！')}>クリック</Button>;
}
```

## 🔧 設定

### TypeScript

- 厳格モード有効
- パスエイリアス設定（`@/*`）
- ターゲット: ES2017

### ESLint

- Next.js 推奨ルール
- TypeScript 統合
- Prettier 統合

### Tailwind CSS

- CSS 変数を使用したバージョン 4
- ダークモードサポート
- zinc カラーパレットを使用したカスタムテーマ
- Prettier を使用した自動クラスソート

### Git フック

- **プレコミット**: ESLint、Prettier、TypeScript チェックを実行
- **プレプッシュ**: Gitleaks シークレットスキャニングを実行
- **コミットメッセージ**: Conventional Commits に対してコミットメッセージを検証

## 📝 コミット規約

このプロジェクトは [Conventional Commits](https://www.conventionalcommits.org/) に従います：

```bash
# フォーマット
<type>(<scope>): <subject>

# 例
feat: ユーザー認証を追加
fix: ログインエラーを解決
docs: README を更新
style: コードをフォーマット
refactor: API クライアントを抽出
perf: 画像読み込みを最適化
test: ユニットテストを追加
chore: 依存関係を更新
```

### コミットタイプ

- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント変更
- `style`: コードスタイル変更（フォーマッティングなど）
- `refactor`: コードリファクタリング
- `perf`: パフォーマンス改善
- `test`: テスト更新
- `chore`: メンテナンスタスク
- `build`: ビルドシステム変更
- `ci`: CI/CD 変更

## 🎯 サンプルページ

`/example` にアクセスして以下のデモンストレーションを確認してください：

- React Hook Form と Zod を使用したフォーム検証
- Sonner を使用したトースト通知
- 様々なボタンスタイルとバリアント
- Tailwind CSS を使用したレスポンシブレイアウト

## 🚢 デプロイメント

### Vercel（推奨）

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/nextjs-boilerplate)

### Docker

```dockerfile
# Dockerfile の例は Phase 3 で追加予定
```

### 環境変数

`.env.local` ファイルを作成：

```env
# ここに環境変数を追加
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

## 📚 ドキュメント

- [設計ドキュメント](./docs/work_dir/nextjs_boilerplate_design.md) - アーキテクチャと設計決定
- [Phase 1 ステータス](./docs/work_dir/phase1_implementation_status.md) - 実装進捗
- [CLAUDE.md](./CLAUDE.md) - AI アシスタントガイドライン

## 🤝 貢献

### 開発ワークフロー

1. リポジトリをフォーク
2. 機能ブランチを作成（`git checkout -b feature/amazing-feature`）
3. 変更を実装
4. **変更のためのチェンジセットを作成**（機能と修正に必須）：

   ```bash
   pnpm changeset:add
   ```

   - 適切なバージョンバンプを選択（patch/minor/major）
   - 変更内容の明確な説明を記述

5. 変更をコミット（`git commit -m 'feat: amazing feature を追加'`）
6. ブランチにプッシュ（`git push origin feature/amazing-feature`）
7. プルリクエストを開く

### チェンジセットを作成するタイミング

**必須の場合：**

- ✅ 新機能や機能追加
- ✅ バグ修正
- ✅ パフォーマンス改善
- ✅ 破壊的変更

**不要な場合：**

- ❌ 内部リファクタリング（ユーザーへの影響なし）
- ❌ テスト追加/修正
- ❌ ドキュメント更新（重要なもの以外）

詳細な手順については、[チェンジセット開発ガイド](./docs/developer_guide/development/changeset-developer-guide.ja.md) を参照してください。

## 🔐 セキュリティ

### シークレットスキャニング

このプロジェクトでは、シークレットがコミットされることを防ぐために [Gitleaks](https://github.com/gitleaks/gitleaks) を使用しています：

- **プレプッシュフック**: プッシュ前にシークレットを自動スキャン
- **CI/CD**: GitHub Actions での追加スキャニング
- **設定**: 検出ルールについては `config/security/.gitleaks.toml` を参照

## 🛠️ ツールインストール

### Docker インストール

**macOS:**

```bash
# Docker Desktop for Mac
# https://docs.docker.com/desktop/mac/install/ からダウンロード

# または Homebrew を使用
brew install --cask docker
```

**Windows:**

```bash
# Docker Desktop for Windows
# https://docs.docker.com/desktop/windows/install/ からダウンロード

# または Chocolatey を使用
choco install docker-desktop
```

**Linux（Ubuntu/Debian）:**

```bash
# Docker Engine
sudo apt update
sudo apt install docker.io docker-compose-plugin
sudo systemctl start docker
sudo systemctl enable docker

# ユーザーを docker グループに追加
sudo usermod -aG docker $USER
# ログアウトと再ログインが必要
```

### Node.js & pnpm インストール

**Node.js 20.x 以上:**

**macOS:**

```bash
# Homebrew
brew install node@20

# または nodenv を使用
brew install nodenv
nodenv install 20.x.x
nodenv global 20.x.x
```

**Windows:**

```bash
# Chocolatey
choco install nodejs --version=20.x.x

# または Node.js 公式サイトからダウンロード
# https://nodejs.org/
```

**Linux:**

```bash
# NodeSource リポジトリ（Ubuntu/Debian）
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# または nvm を使用
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20
```

**pnpm 8.x 以上:**

```bash
# npm 経由でインストール
npm install -g pnpm@latest

# または corepack を使用（Node.js 16.10+）
corepack enable
corepack prepare pnpm@latest --activate

# バージョンを確認
pnpm --version
```

### Gitleaks インストール

**macOS:**

```bash
brew install gitleaks
```

**Windows:**

```bash
# Chocolatey を使用
choco install gitleaks

# Scoop を使用
scoop install gitleaks

# または GitHub リリースからバイナリをダウンロード
```

**Linux:**

```bash
# Debian/Ubuntu
sudo apt install gitleaks

# Fedora/RHEL
sudo dnf install gitleaks

# Arch Linux（AUR）
yay -S gitleaks

# または GitHub リリースからバイナリをダウンロード
```

**Docker:**

```bash
docker pull zricethezav/gitleaks:latest
docker run -v ${PWD}:/path zricethezav/gitleaks:latest detect --source="/path"
```

**手動インストール:**

[Gitleaks Releases](https://github.com/gitleaks/gitleaks/releases) から最新のバイナリをダウンロードし、PATH に追加してください。

### シークレットスキャンの実行

```bash
# リポジトリ全体をスキャン
gitleaks detect --config config/security/.gitleaks.toml

# ステージされた変更のみをスキャン
gitleaks protect --staged --config config/security/.gitleaks.toml

# デバッグ用の詳細出力
gitleaks detect --verbose --config config/security/.gitleaks.toml
```

## 📄 ライセンス

このプロジェクトは MIT ライセンスの下でライセンスされています - 詳細は [LICENSE](LICENSE) ファイルを参照してください。

## 🙏 謝辞

- [Next.js](https://nextjs.org/) - React フレームワーク
- [shadcn/ui](https://ui.shadcn.com/) - 美しくデザインされたコンポーネント
- [Tailwind CSS](https://tailwindcss.com/) - ユーティリティファーストの CSS フレームワーク
- [Vercel](https://vercel.com/) - Next.js アプリのデプロイプラットフォーム

## 🔮 ロードマップ

### Phase 1 ✅（完了）

- ✅ App Router を使用した基本的な Next.js セットアップ
- ✅ 厳格モードを使用した TypeScript 設定
- ✅ 自動フォーマッティングを使用した ESLint/Prettier セットアップ
- ✅ CSS 変数を使用した Tailwind CSS v4
- ✅ shadcn/ui コンポーネント統合
- ✅ Husky と lint-staged を使用した Git フック
- ✅ 従来のコミット用の Commitlint
- ✅ シークレットスキャニング用の Gitleaks

### Phase 2 ✅（完了）- テストと CI/CD インフラストラクチャ

- ✅ **テストフレームワーク**
  - ユニット/統合テスト用の Vitest
  - E2E テスト用の Playwright
  - カバレッジレポート付きテストインフラストラクチャ
  - テスト定数管理システム
- ✅ **CI/CD パイプライン**
  - GitHub Actions ワークフロー自動化
  - マルチ環境テスト（Node 18/20/22）
  - セキュリティスキャニング（CodeQL、Gitleaks、Dependabot）
  - E2E スケジュール実行
  - 品質ゲートとメトリクス収集
  - Lighthouse パフォーマンス監視
  - 自動リリース管理

### Phase 3 🔄（ほぼ完了）- 高度なログと可観測性

- ✅ **構造化ログシステム** - 純粋関数ベースの Pino 統合
  - クロスプラットフォームサポート（Server/Client/Edge Runtime）
  - GDPR 準拠の IP ハッシュ化（HMAC-SHA256）
  - ログインジェクション攻撃からの保護（制御文字のサニタイゼーション）
  - KV ストレージを使用したリモート設定
  - レート制限とエラーフォールバック機構
- ✅ **OpenTelemetry 統合** - 完全な分散トレーシングとメトリクス
  - すべてのログでの自動 trace_id 相関
  - OpenTelemetry severity_number 準拠
  - 構造化イベント（event_name/event_category）
  - Next.js App Router のインストルメンテーション
- ✅ **メトリクスと監視**
  - 自動 error_count と log_entries_total 収集
  - リクエスト持続時間ヒストグラム
  - メモリ使用量監視
  - Prometheus 互換メトリクスエクスポート（/api/metrics）
  - ラベルとカスタム次元を使用した拡張メトリクス
- ✅ **エラーハンドリングシステム**
  - 自動エラー分類（21 エラーパターン）
  - フォールバック機能と回復力
  - API/コンポーネント/グローバルエラー境界サポート
- ✅ **テストカバレッジ**
  - 99%+ カバレッジを持つ 180+ ユニットテスト
  - すべてのログシナリオ用の 60+ E2E テスト
  - 外部サービス（Loki など）の統合テスト
- ⏳ **インフラストラクチャ**（残りのアイテム）
  - Docker Compose セットアップ
  - 監視と可観測性ダッシュボード

### Phase 4 🚧（進行中）- 状態管理とデータ層

- ⏳ サーバー状態管理用の **TanStack Query** セットアップ
- ⏳ クライアント状態管理用の **Zustand**
- ⏳ 型安全エンドポイント付きの **API クライアントインフラストラクチャ**
- ⏳ ランタイム型チェック用の **Zod スキーマ検証**
- ⏳ React Hook Form 統合による **フォーム管理**

### Phase 5（計画中）- 認証とセキュリティ

- ⏳ **NextAuth.js** 認証システム
- ⏳ **セキュリティヘッダー**（CSP、HSTS など）
- ⏳ **レート制限**ミドルウェア
- ⏳ セキュアクッキーによる**セッション管理**
- ⏳ **RBAC**（ロールベースアクセス制御）

### Phase 6（計画中）- プロダクションインフラストラクチャ

- ⏳ **Docker コンテナ化**
- ⏳ **監視ダッシュボード**（Grafana 統合）
- ⏳ **アラートシステム**セットアップ
- ⏳ **パフォーマンス最適化**
- ⏳ **CDN 統合**

---

Next.js と最新のウェブ技術を使用して ❤️ で構築
