# Docker Compose設計ドキュメント

## 1. 設計背景と課題認識

### 1.1 現状の課題

本プロジェクトは現在、ネイティブNode.js環境での開発・テスト・デプロイが行われているが、以下の課題が存在する：

**開発環境の課題**：

- 環境差異による「ローカルでは動く」問題の発生リスク
- 新規開発者のセットアップ時間とトラブル
- 依存関係の管理とバージョン不整合

**テスト環境の課題**：

- CI/CD環境とローカル環境の差異
- テスト実行環境の再現性不足
- 並列テスト実行時のリソース競合

**デプロイ・運用の課題**：

- 本番環境での環境差異リスク
- スケーリング時の複雑性
- 監視・ログ管理の分散

### 1.2 既存資産の評価

**保持すべき価値のある資産**：

1. **Lokiログシステム**（`docker-compose.loki.yml`）
   - 既に稼働中の監視・ログ可視化環境
   - Grafanaダッシュボードによる可視化
   - 開発チームの運用ノウハウ蓄積

2. **包括的テストスイート**
   - Unit Tests（Vitest）
   - Integration Tests（Vitest + Testcontainers）
   - E2E Tests（Playwright）
   - 高いテストカバレッジと品質保証

3. **開発フロー**
   - ホットリロード・デバッグ環境
   - 型チェック・リンティング・フォーマット
   - Git hooks による品質管理

**技術スタック**：

- Next.js 15.4.6 (App Router) + TypeScript
- Tailwind CSS 4.0
- pnpm パッケージマネージャー
- ESLint + Prettier + Husky

## 2. 設計哲学と基本方針

### 2.1 設計哲学

**「漸進的コンテナ化」**
既存の価値を破壊することなく、段階的にコンテナ化の利益を享受する。革命ではなく進化のアプローチを取る。

**「開発者体験ファースト」**
コンテナ化により開発効率が低下してはならない。むしろ開発体験を向上させる手段としてDockerを活用する。

**「テスト互換性の絶対保証」**
既存のテストスイートは100%の互換性を保つ。品質保証プロセスに一切の断絶を起こさない。

### 2.2 設計原則

#### 原則1: 段階的移行（Gradual Migration）

```
現在のワークフロー → ハイブリッド運用 → 完全コンテナ化
```

- 既存環境とDocker環境の並行運用期間を設ける
- 各フェーズで十分な検証を行う
- ロールバック可能性を常に保持

#### 原則2: 環境等価性（Environment Parity）

```
開発環境 ≈ テスト環境 ≈ 本番環境
```

- 12-Factor Appの「Dev/Prod Parity」原則に従う
- 環境差異によるバグを根本的に排除
- 設定の外部化とシークレット管理

#### 原則3: 単一責任とサービス分離

```
アプリケーション | データベース | キャッシュ | 監視
      ↓              ↓           ↓       ↓
   app container | postgres | redis | loki+grafana
```

- 各サービスは独立してスケール可能
- 障害の局所化とデバッグの容易性
- 依存関係の明示化

#### 原則4: 設定の階層化と再利用性

```
base config → environment override → runtime config
```

- DRY原則に基づく設定の共通化
- 環境固有の設定のみをオーバーライド
- 設定変更の影響範囲の最小化

## 3. アーキテクチャ設計

### 3.1 全体アーキテクチャ

```mermaid
graph TB
    subgraph "開発環境"
        Dev[開発者マシン]
        DevApp[app:dev]
        DevDB[(postgres:dev)]
        DevRedis[(redis:dev)]
    end

    subgraph "テスト環境"
        CI[CI/CD Pipeline]
        TestApp[app:test]
        TestDB[(postgres:test)]
        Playwright[playwright]
    end

    subgraph "本番環境"
        LB[Load Balancer]
        ProdApp1[app:prod-1]
        ProdApp2[app:prod-2]
        ProdDB[(postgres:prod)]
        ProdRedis[(redis:prod)]
    end

    subgraph "監視環境（既存保持）"
        Loki[Loki]
        Grafana[Grafana]
    end

    Dev --> DevApp
    DevApp --> DevDB
    DevApp --> DevRedis

    CI --> TestApp
    CI --> Playwright
    TestApp --> TestDB

    LB --> ProdApp1
    LB --> ProdApp2
    ProdApp1 --> ProdDB
    ProdApp2 --> ProdDB
    ProdApp1 --> ProdRedis
    ProdApp2 --> ProdRedis

    DevApp -.-> Loki
    TestApp -.-> Loki
    ProdApp1 -.-> Loki
    ProdApp2 -.-> Loki
    Loki --> Grafana
```

### 3.2 サービス設計方針

#### アプリケーションサービス（app）

**責務**: Next.jsアプリケーションの実行
**設計判断**:

- Multi-stage buildによる環境別最適化
- 開発時のホットリロード保持
- 本番時のセキュリティ強化

#### データ永続化サービス

**責務**: アプリケーションデータの永続化
**設計判断**:

- PostgreSQL採用（スケーラビリティとACID特性）
- 環境別データベース分離
- バックアップ・復旧戦略の組み込み

#### キャッシュサービス

**責務**: セッション・キャッシュデータの高速アクセス
**設計判断**:

- Redis採用（パフォーマンスと柔軟性）
- 揮発性データの適切な管理
- クラスタリング対応

#### 監視・ログサービス（既存保持）

**責務**: システム監視とログ管理
**設計判断**:

- 既存Loki環境の完全保持
- 新システムとの統合アプローチ
- ダッシュボード・アラートの継続運用

### 3.3 ネットワーク設計

```mermaid
graph LR
    subgraph "フロントエンドネットワーク"
        Nginx[Nginx]
        App[Next.js App]
    end

    subgraph "バックエンドネットワーク（内部専用）"
        DB[(PostgreSQL)]
        Redis[(Redis)]
    end

    subgraph "監視ネットワーク"
        Loki[Loki]
        Grafana[Grafana]
    end

    Internet --> Nginx
    Nginx --> App
    App --> DB
    App --> Redis
    App -.-> Loki
    Loki --> Grafana
```

**ネットワーク分離の設計判断**:

- **フロントエンド**: 外部アクセス可能
- **バックエンド**: 内部通信のみ（`internal: true`）
- **監視**: 独立ネットワークで運用継続

## 4. 環境戦略と設定管理

### 4.1 環境分離戦略

#### 開発環境の設計思想

**目標**: 開発効率の最大化と学習コストの最小化

**特徴的な設計判断**:

- ホットリロードの完全保持
- デバッグポート開放（9229）
- ボリュームマウントによる即座の反映
- 開発用データベース・Redisの軽量化

#### テスト環境の設計思想

**目標**: CI/CDパイプラインとの完全統合

**特徴的な設計判断**:

- 既存Testcontainers戦略の保持
- Playwright公式イメージ活用
- 並列テスト実行対応
- テストデータの分離と管理

#### 本番環境の設計思想

**目標**: 可用性・セキュリティ・パフォーマンスの最適化

**特徴的な設計判断**:

- Multi-replica対応
- Docker Secretsによるシークレット管理
- ヘルスチェックと自動復旧
- リソース制限と監視

### 4.2 設定継承モデル

```
基盤設定（docker-compose.yml）
    ↓ 継承
環境別オーバーライド
    ↓ 実行時
実際の動作環境
```

**設計の利点**:

- 設定の重複排除（DRY原則）
- 環境差異の明示化
- 変更影響の局所化
- メンテナンス性の向上

## 5. 品質保証戦略

### 5.1 テスト互換性保証

**基本方針**: 既存テストスイートの100%動作保証

**具体的保証内容**:

1. **Unit Tests**: Vitestの完全動作
2. **Integration Tests**: Testcontainers環境の保持
3. **E2E Tests**: Playwright環境の最適化
4. **Loki Tests**: 既存統合テストの継続

**実現アプローチ**:

- 段階的移行による互換性検証
- 既存テスト環境とDocker環境の並行運用
- パフォーマンス劣化の監視と最適化

### 5.2 品質ゲート

```mermaid
graph LR
    Code[コード変更] --> Build[Docker Build]
    Build --> UnitTest[Unit Tests]
    UnitTest --> IntegTest[Integration Tests]
    IntegTest --> E2ETest[E2E Tests]
    E2ETest --> Security[セキュリティスキャン]
    Security --> Deploy[デプロイ許可]
```

**各ゲートの基準**:

- Build: 5分以内での完了
- Tests: 既存実行時間の150%以内
- Security: 既知脆弱性ゼロ
- Performance: レスポンス時間維持

## 6. セキュリティ設計

### 6.1 多層防御アプローチ

**ネットワークレベル**:

- 内部ネットワークの分離
- 最小権限の原則適用
- ファイアウォールルール

**アプリケーションレベル**:

- 非rootユーザーでの実行
- 読み取り専用ファイルシステム
- セキュリティヘッダー設定

**データレベル**:

- 暗号化通信（TLS）
- シークレット外部管理
- 定期的なパスワードローテーション

### 6.2 シークレット管理戦略

```
開発環境: .env ファイル（リポジトリ管理）
    ↓
テスト環境: CI/CD変数（プラットフォーム管理）
    ↓
本番環境: Docker Secrets（ランタイム管理）
```

**段階的セキュリティ強化**:

- 環境に応じた適切なセキュリティレベル
- 開発効率とセキュリティのバランス
- 監査証跡の確保

## 7. パフォーマンス設計

### 7.1 ビルド最適化戦略

**Multi-stage Build**:

```
base → dependencies → development
           ↓
      test → production
```

**最適化ポイント**:

- レイヤーキャッシュの最大活用
- 不要ファイルの除外（.dockerignore）
- 依存関係インストールの分離

### 7.2 実行時最適化

**リソース配分**:

- 開発環境: 応答性重視
- テスト環境: 並列性重視
- 本番環境: 安定性重視

**ボリューム戦略**:

- Named volumeによるデータ永続化
- Bind mountによる開発効率
- tmpfsによる一時データ高速化

## 8. 運用・保守性設計

### 8.1 監視・ログ戦略

**既存Loki環境の活用**:

- 運用ノウハウの継続活用
- ダッシュボード・アラートの保持
- ログフォーマットの標準化

**新規監視要素**:

- コンテナヘルスチェック
- リソース使用量監視
- サービス間通信監視

### 8.2 バックアップ・災害復旧

**データ保護**:

- データベースの定期バックアップ
- 設定ファイルのバージョン管理
- 秘密情報の安全な保管

**復旧戦略**:

- RTO（Recovery Time Objective）: 15分
- RPO（Recovery Point Objective）: 1時間
- 自動復旧メカニズムの組み込み

## 9. 技術的制約と前提条件

### 9.1 実装前提条件

本設計の実装には以下の前提条件が必要です：

#### アプリケーション要件

**ヘルスチェックエンドポイント**:

- `/api/health`エンドポイントの実装が必須
- 全てのサービス依存関係制御の基盤
- Next.js App Routerでの実装: `src/app/api/health/route.ts`

**環境変数対応**:

- Playwright設定の統一（`PLAYWRIGHT_BASE_URL`対応）
- テスト環境での適切な変数注入

#### インフラ要件

**Docker Compose技術制約**:

- `deploy:`セクションはSwarm専用（単体Composeでは無効）
- リソース制限は`mem_limit`/`cpus`を使用
- スケーリングは`--scale`コマンドで実行

**既存設定との整合性**:

- Grafanaポート競合の解決（現在3000→3001への変更）
- Nginx設定パスの公式イメージ対応

### 9.2 技術的制約事項

#### Docker Secrets制約

**ファイルベースSecrets**:

```yaml
# 正しいSecrets参照方法
command: ['sh', '-c', 'redis-server --requirepass "$(cat /run/secrets/redis_password)"']
healthcheck:
  test: ['CMD-SHELL', 'pg_isready -U "$(cat /run/secrets/postgres_user)"']
```

**制約**:

- 環境変数とSecrets参照の使い分けが必要
- healthcheckでのSecrets参照は特別な記法が必要

#### テスト環境制約

**ボリュームマウント制約**:

- テスト用コンテナでの`node_modules`マウントは依存関係を破壊
- イメージ内依存関係の活用が必要

**実行環境分離**:

- Testcontainers（Integration Tests）とCompose（E2E Tests）の併用
- ポート競合回避とリソース分離が必要

#### セキュリティ制約

**実行ユーザー**:

- 本番環境では非rootユーザー実行が必須
- ファイルアクセス権限の適切な設定

**ネットワーク分離**:

- 内部ネットワークの完全分離
- 最小権限の原則適用

### 9.3 依存関係マトリックス

| コンポーネント | 依存先          | 制約                       |
| -------------- | --------------- | -------------------------- |
| app            | `/api/health`   | 実装必須                   |
| nginx          | app healthcheck | ヘルスチェック成功が前提   |
| postgres       | Secrets管理     | ファイルベースアクセス必須 |
| redis          | Secrets管理     | コマンドライン注入方式     |
| playwright     | app-e2e         | 外部サーバー接続方式       |
| grafana        | ポート3001      | 既存設定との競合回避       |

### 9.4 実装時考慮事項

#### パフォーマンス制約

**ビルド時間制約**:

- Multi-stage buildでのレイヤーキャッシュ最適化
- `.dockerignore`の適切な設定（`node_modules`, `.next`等）

**実行時制約**:

- Alpine linuxでの`curl`/`wget`可用性確認
- ヘルスチェック間隔の適切な設定

#### 互換性制約

**バージョン整合性**:

- Playwrightコンテナと依存関係の整合（v1.54.2）
- Node.jsバージョンの統一

**設定ファイル制約**:

- 公式イメージの標準パス準拠
- 環境別設定の適切な継承

## 10. リスク軽減戦略

### 10.1 実装リスク対策

**段階的検証アプローチ**:

```
Phase 0: 前提条件整備 → 制約事項解消
Phase 1: 基盤構築 → 最小構成での動作確認
Phase 2: テスト統合 → 既存テスト互換性確認
Phase 3: 本番対応 → セキュリティ・パフォーマンス検証
```

**ロールバック戦略**:

- 各フェーズでの独立動作確認
- 既存環境との並行運用期間確保
- 設定変更の段階的適用

### 10.2 品質保証強化

**事前チェックリスト**:

- [ ] `/api/health`エンドポイント実装・テスト
- [ ] ポート競合の完全解消
- [ ] Secrets参照方式の動作確認
- [ ] テスト環境の依存関係検証

**継続監視項目**:

- ヘルスチェック成功率
- コンテナ起動時間
- テスト実行成功率
- セキュリティスキャン結果

---

## 次のステップ

この設計ドキュメントと技術制約を基に、**Phase 0（前提条件整備）**から着手し、制約事項を解消した後に段階的な実装を進める。実装計画（implementation-plan.md）と環境別設定詳細（environment-configurations.md）にこれらの制約事項を反映させる。
