# Testcontainers Loki統合テスト設計書

## 📋 概要

現在のLoki統合テストをMSWモック方式からTestcontainersを使用した実際のLokiサーバー方式に移行する設計書。

## 🎯 目的

1. **真の統合テスト実現**: MSWモックではなく実際のLokiサーバーでのテスト
2. **テスト環境自動化**: テスト実行時にLokiサーバーを自動起動/停止
3. **開発体験向上**: 手動でのDocker操作不要
4. **CI/CD対応**: パイプラインでの自動テスト実行

## 🏗️ アーキテクチャ設計

### 現在の構成（問題点）

```
[MSW Mock Server] ← HTTP Request Interception
     ↑
[Integration Tests]
```

**問題点:**

- 実際のHTTP通信なし
- Lokiサーバーの動作検証不可
- ネットワークレベルの問題を検出不可

### 新しい構成（Testcontainers）

```
[Testcontainers] → [Real Loki Container] ← Real HTTP Requests
                                ↑
                    [Integration Tests]
```

**利点:**

- 実際のHTTP通信
- Lokiサーバーの動作検証
- ネットワーク・認証・パフォーマンステスト可能

## 🔧 技術スタック

### 依存関係

- **testcontainers**: `^11.5.1` - コンテナライフサイクル管理
- **vitest**: 既存 - テスト実行フレームワーク
- **grafana/loki**: `latest` - Lokiサーバーイメージ

### インフラ構成

```yaml
# テスト用Lokiコンテナ
Image: grafana/loki:latest
Ports: 動的割り当て（3100）
Config: シンプル設定（認証なし、メモリストレージ）
Health Check: /ready エンドポイント
```

## 📁 ファイル構造

```
tests/
├── integration/
│   └── logger/
│       ├── loki-testcontainers.integration.test.ts  # 新規メインファイル
│       ├── loki-integration.test.ts                 # 既存（MSW）- 削除予定
│       ├── loki-e2e.integration.test.ts            # 既存（MSW）- 削除予定
│       └── loki-real-server.integration.test.ts    # 既存（手動）- 削除予定
├── setup/
│   ├── loki-testcontainer-setup.ts                 # コンテナ設定
│   └── vitest-global-setup.ts                      # グローバル設定
└── utils/
    └── loki-test-helpers.ts                        # テストヘルパー関数
```

## 🧪 テストケース設計

### 1. 基本接続テスト

```typescript
describe('Loki Basic Connectivity', () => {
  test('should connect to Loki container');
  test('should send logs successfully');
  test('should handle batch operations');
});
```

### 2. 認証テスト

```typescript
describe('Loki Authentication', () => {
  test('should work without authentication');
  test('should handle API key authentication'); // 将来の拡張
  test('should handle Basic authentication'); // 将来の拡張
});
```

### 3. エラーハンドリングテスト

```typescript
describe('Loki Error Handling', () => {
  test('should retry on temporary failures');
  test('should handle network timeouts');
  test('should gracefully degrade when Loki is down');
});
```

### 4. パフォーマンステスト

```typescript
describe('Loki Performance', () => {
  test('should handle high-volume logging (100+ logs)');
  test('should batch logs efficiently');
  test('should meet performance benchmarks (>50 logs/sec)');
});
```

### 5. コンテキスト伝搬テスト

```typescript
describe('Loki Context Propagation', () => {
  test('should propagate AsyncLocalStorage context');
  test('should include request/trace/user IDs in logs');
  test('should handle nested contexts');
});
```

## ⚙️ 実装詳細

### 1. Global Setup（グローバル設定）

**ファイル**: `tests/setup/vitest-global-setup.ts`

```typescript
import { GenericContainer } from 'testcontainers';

export async function setup() {
  // Lokiコンテナ起動
  const lokiContainer = await new GenericContainer('grafana/loki:latest')
    .withExposedPorts(3100)
    .withCommand(['-config.file=/etc/loki/local-config.yaml'])
    .withWaitStrategy(Wait.forHttp('/ready', 3100))
    .start();

  // テストで使用できるようにコンテナ情報を提供
  const lokiUrl = `http://${lokiContainer.getHost()}:${lokiContainer.getMappedPort(3100)}`;

  return { lokiContainer, lokiUrl };
}

export async function teardown({ lokiContainer }) {
  await lokiContainer.stop();
}
```

### 2. Container Setup（コンテナ設定）

**ファイル**: `tests/setup/loki-testcontainer-setup.ts`

```typescript
interface LokiTestContainer {
  url: string;
  container: StartedTestContainer;
  health: () => Promise<boolean>;
}

export async function createLokiTestContainer(): Promise<LokiTestContainer> {
  const container = await new GenericContainer('grafana/loki:latest')
    .withExposedPorts(3100)
    .withCommand(['-config.file=/etc/loki/local-config.yaml'])
    .withWaitStrategy(Wait.forHttp('/ready', 3100).withStartupTimeout(30_000))
    .withLogConsumer((stream) => {
      stream.on('data', (line) => console.log(`[Loki] ${line}`));
      stream.on('err', (line) => console.error(`[Loki Error] ${line}`));
    })
    .start();

  return {
    url: `http://${container.getHost()}:${container.getMappedPort(3100)}`,
    container,
    health: async () => checkHealth(url),
  };
}
```

### 3. Test Helpers（テストヘルパー）

**ファイル**: `tests/utils/loki-test-helpers.ts`

```typescript
export async function waitForLogs(
  lokiUrl: string,
  labels: string,
  expectedCount: number,
  timeoutMs = 5000
): Promise<LokiQueryResult> {
  // LogQL クエリでログを検索
  // リトライロジック付き
}

export async function createTestTransport(lokiUrl: string): Promise<LokiTransport> {
  return new LokiTransport({
    url: lokiUrl,
    batchSize: 1, // テスト用：即座に送信
    defaultLabels: {
      service: 'testcontainer-integration-test',
      test_run: Date.now().toString(),
    },
  });
}

export function generateUniqueTestId(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}
```

## 🚀 実装手順

### Phase 1: 基盤実装

1. ✅ testcontainers パッケージインストール
2. ⬜ Vitest設定更新（globalSetup追加）
3. ⬜ Lokiコンテナセットアップ関数実装
4. ⬜ 基本接続テスト実装

### Phase 2: コア機能テスト

1. ⬜ LokiTransport統合テスト実装
2. ⬜ コンテキスト伝搬テスト実装
3. ⬜ エラーハンドリングテスト実装
4. ⬜ バッチング機能テスト実装

### Phase 3: 高度な機能テスト

1. ⬜ パフォーマンステスト実装
2. ⬜ LogQL クエリ検証テスト実装
3. ⬜ リトライ・リカバリーテスト実装
4. ⬜ メモリ使用量・リーク検証テスト実装

### Phase 4: クリーンアップ・最適化

1. ⬜ 既存MSWテスト削除
2. ⬜ CI/CD パフォーマンス最適化
3. ⬜ ドキュメント更新
4. ⬜ テスト並列実行対応

## 🔍 品質保証

### テスト品質指標

- **カバレッジ**: 統合レイヤー 95%以上
- **実行時間**: 単一テストスイート < 30秒
- **成功率**: CI環境で 99%以上
- **並列実行**: 問題なく並列実行可能

### パフォーマンス指標

- **コンテナ起動時間**: < 10秒
- **ログ送信スループット**: > 50 logs/sec
- **メモリ使用量**: テスト用コンテナ < 256MB

### 信頼性指標

- **flaky test率**: < 1%
- **false positive率**: < 0.1%
- **再実行成功率**: > 99%

## 🚦 マイグレーション戦略

### 段階的移行

1. **新しいテストファイル作成** → 既存テストと並行実行
2. **機能完全性確認** → 全テストケースが新方式で動作
3. **CI/CD統合** → パイプラインでの動作確認
4. **既存テスト削除** → MSWベーステスト削除

### ロールバック戦略

- 新テストで問題発生時は既存MSWテストに戻る
- コンテナ起動失敗時はskipではなくfail
- CI環境でのタイムアウト対策

## 📊 期待される効果

### テスト品質向上

- ✅ 実際のHTTP通信テスト
- ✅ Lokiサーバー動作検証
- ✅ ネットワークレベル問題検出
- ✅ 認証・セキュリティテスト

### 開発体験向上

- ✅ 手動Docker操作不要
- ✅ ローカルテスト環境統一
- ✅ CI/CD自動化
- ✅ デバッグ情報充実

### 保守性向上

- ✅ テスト環境の一貫性
- ✅ 環境依存問題の解消
- ✅ スケーラブルなテスト構成

## 🚨 リスク・制約事項

### 技術的リスク

- **Docker依存**: テスト環境でDockerが必要
- **実行時間増加**: コンテナ起動分の時間増
- **リソース消費**: メモリ・CPU使用量増加
- **ネットワーク依存**: Dockerイメージプルが必要

### 運用面のリスク

- **CI環境制約**: Docker-in-Docker設定が必要な場合
- **並列実行制限**: コンテナリソース競合の可能性
- **デバッグ複雑化**: コンテナログ確認が必要

### 対策

- Docker Desktop自動起動チェック
- コンテナリソース制限設定
- タイムアウト・リトライ戦略実装
- CI環境でのリソース監視

## 📝 参考資料

### 公式ドキュメント

- [Testcontainers for Node.js](https://node.testcontainers.org/)
- [Vitest Global Setup](https://vitest.dev/config/#globalsetup)
- [Grafana Loki API](https://grafana.com/docs/loki/latest/api/)

### ベストプラクティス

- [Integration Testing with Docker Containers](https://testcontainers.com/guides/)
- [Vitest Docker Integration Patterns](https://vitest.dev/guide/environment)
- [Container Testing Best Practices](https://www.docker.com/blog/testcontainers-best-practices/)

### 既存実装参考

- tests/unit/logger/loki-client.test.ts
- tests/integration/logger/loki-integration.test.ts
- src/lib/logger/loki-transport.ts
