# 構造化ログ実装設計書

## 1. 概要

本ドキュメントは、Next.js 15 アプリケーションにおける構造化ログシステムの設計と実装について定義します。  
Pinoを使用した高性能な構造化ログ機能を、client/server双方で利用可能な形で実装し、OpenTelemetryとの統合によるトレーサビリティの向上を図ります。

## 2. 要件定義

### 2.1 機能要件

- **統一されたログインターフェース**: Client/Server双方で同一のAPIでログ出力可能
- **構造化ログ**: JSON形式での構造化ログ出力
- **パフォーマンス**: 本番環境で高性能なログ処理
- **セキュリティ**: 機密情報の自動マスキング（PII保護）
- **トレーサビリティ**: OpenTelemetryとの統合による分散トレーシング対応
- **環境別設定**: 開発/本番環境での適切なログレベル・フォーマット切り替え
- **ミドルウェア**: Next.js API Routesでのリクエスト・レスポンスログ

### 2.2 非機能要件

- **レスポンス性能**: ログ処理によるアプリケーション性能への影響最小化
- **メモリ効率**: メモリ使用量の最適化
- **可用性**: ログ出力の失敗がアプリケーションの動作に影響しない
- **拡張性**: 将来的なログ集約システム（Loki、Datadog等）への対応

## 3. アーキテクチャ設計

### 3.1 全体構成

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   Client Side       │    │   Server Side       │    │   Edge Runtime      │
│   (Browser)         │    │   (Node.js)         │    │   (V8 Isolate)      │
│                     │    │                     │    │                     │
│ ┌─────────────────┐ │    │ ┌─────────────────┐ │    │ ┌─────────────────┐ │
│ │  Console Logger │ │    │ │   Pino Logger   │ │    │ │ Console Logger  │ │
│ │  (Browser API)  │ │    │ │ (High Perf)     │ │    │ │ (Lightweight)   │ │
│ └─────────────────┘ │    │ └─────────────────┘ │    │ └─────────────────┘ │
│                     │    │                     │    │                     │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
           │                           │                           │
           └─────────┐     ┌───────────┼───────────┐     ┌─────────┘
                     │     │           │           │     │
              ┌─────────────────────────────────────────────────┐
              │         Runtime Detection & Routing            │
              │                                                 │
              │  if (typeof EdgeRuntime !== 'undefined')       │
              │    → Edge Logger                                │
              │  else if (typeof window === 'undefined')       │
              │    → Server Logger (Pino)                      │
              │  else                                           │
              │    → Client Logger (Console)                   │
              └─────────────────────────────────────────────────┘
                                      │
              ┌─────────────────────────────────────────────────┐
              │              Unified Logger Interface          │
              │                                                 │
              │  - Schema Versioning (log_schema_version)      │
              │  - OpenTelemetry Integration                   │
              │  - Security & Privacy Protection               │
              │  - Child Logger Support (AsyncLocalStorage)   │
              └─────────────────────────────────────────────────┘
```

### 3.2 コンポーネント設計

#### 3.2.1 Logger Interface

```typescript
interface Logger {
  trace(message: string, ...args: LogArgument[]): void;
  debug(message: string, ...args: LogArgument[]): void;
  info(message: string, ...args: LogArgument[]): void;
  warn(message: string, ...args: LogArgument[]): void;
  error(message: string, ...args: LogArgument[]): void;
  fatal(message: string, ...args: LogArgument[]): void;
  isLevelEnabled(level: LogLevel): boolean;
}
```

#### 3.2.2 Server Side Logger (Pino)

- **Base**: Pinoインスタンス（Node.js Runtime）
- **Features**: 高性能JSON出力、structured logging、advanced redaction
- **Transport**: 開発環境ではpino-pretty、本番環境では標準出力
- **OpenTelemetry**: trace_id、span_idの自動付与
- **Child Logger**: AsyncLocalStorageによるリクエストスコープロガー

#### 3.2.3 Edge Runtime Logger

- **Base**: Console API（V8 Isolate制約対応）
- **Features**: 軽量構造化ログ、基本的なredaction
- **Transport**: 標準出力（JSON形式）
- **Limitations**: Pinoの高度機能は利用不可
- **Fallback**: Pino不可環境での代替実装

#### 3.2.4 Client Side Logger

- **Base**: ブラウザConsole API
- **Features**: サーバーライクなフォーマット、ログレベル制御
- **Transport**: ブラウザのDevTools Console
- **Security**: 機密情報の自動フィルタリング
- **Fallback**: 重要なエラーのサーバー送信（オプション）

#### 3.2.5 Logging Middleware

- **Target**: Next.js API Routes（全Runtime対応）
- **Features**: リクエスト・レスポンス・エラーログ
- **Correlation**: UUID v7によるリクエストID生成とトレーシング
- **Performance**: 実行時間測定とパフォーマンス監視
- **Security**: Allowlistベースヘッダーフィルタリング

## 4. 技術仕様

### 4.1 依存ライブラリ

| ライブラリ                          | バージョン | 用途                     |
| ----------------------------------- | ---------- | ------------------------ |
| pino                                | ^9.0.0     | サーバーサイド構造化ログ |
| pino-pretty                         | ^11.0.0    | 開発環境用フォーマッター |
| @opentelemetry/instrumentation-pino | ^0.41.0    | OpenTelemetry統合        |
| uuid                                | ^10.0.0    | UUID v7リクエストID生成  |

### 4.2 環境変数

```bash
# ログレベル設定
LOG_LEVEL=info                    # サーバーサイドログレベル
NEXT_PUBLIC_LOG_LEVEL=warn        # クライアントサイドログレベル（セキュリティ考慮）

# 機能フラグ
LOG_HEADERS=true                  # リクエストヘッダーログ出力
LOG_BODY=false                   # リクエストボディログ出力（開発時のみ推奨）

# セキュリティ設定
IP_HASH_SECRET=your-secret-key    # IPアドレスハッシュ化用秘密鍵
PII_TOKEN_SECRET=another-secret   # PII トークン化用秘密鍵

# OpenTelemetry設定
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_SERVICE_NAME=nextjs-boilerplate
OTEL_RESOURCE_ATTRIBUTES=deployment.environment=development
```

### 4.3 ログフォーマット

#### 4.3.1 標準ログエントリ

```json
{
  "log_schema_version": "1.0.0",
  "level": 30,
  "time": "2024-12-14T10:30:00.000Z",
  "pid": 12345,
  "hostname": "app-server-01",
  "app": "nextjs-boilerplate",
  "env": "production",
  "msg": "User login successful",
  "trace_id": "abc123def456...",
  "traceId": "abc123def456...",
  "span_id": "def456789abc...",
  "spanId": "def456789abc...",
  "user_id": "usr_789",
  "request_id": "01JEGK8K3X7ZMK9N2P1Q3R4S5T"
}
```

#### 4.3.2 エラーログエントリ

```json
{
  "log_schema_version": "1.0.0",
  "level": 50,
  "time": "2024-12-14T10:30:00.000Z",
  "app": "nextjs-boilerplate",
  "env": "production",
  "msg": "Database connection failed",
  "err": {
    "type": "ConnectionError",
    "message": "ECONNREFUSED",
    "stack": "ConnectionError: ECONNREFUSED\n    at /app/src/lib/database.ts:45:12"
  },
  "trace_id": "abc123def456...",
  "traceId": "abc123def456...",
  "span_id": "def456789abc...",
  "spanId": "def456789abc..."
}
```

### 4.4 セキュリティ仕様

#### 4.4.1 セキュリティ設定

##### a) ヘッダーフィルタリング（Allowlist方式）

```typescript
// セキュアなヘッダーのみを許可するAllowlist方式
const SAFE_HEADERS = [
  'user-agent',
  'content-type',
  'content-length',
  'accept',
  'accept-language',
  'accept-encoding',
  'x-request-id',
  'x-correlation-id',
  'x-forwarded-for',
  'x-real-ip',
  'cf-connecting-ip',
  'cache-control',
];

// 機密情報を含む可能性があるヘッダー（除外）
const SENSITIVE_HEADERS = [
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'x-auth-token',
  'x-access-token',
  'proxy-authorization',
];
```

##### b) Redaction設定（精緻化）

```typescript
// 正確なパスマッチングによるRedaction
const REDACT_PATHS = [
  // 認証情報（具体的フィールド名）
  'credentials.password',
  'user.password',
  'auth.password',
  'login.password',
  'registration.password',
  'changePassword.currentPassword',
  'changePassword.newPassword',

  // トークン・API キー
  'authorization',
  'access_token',
  'refresh_token',
  'api_key',
  'apiKey',
  'client_secret',
  'private_key',
  'jwt_token',

  // 決済情報
  'payment.card_number',
  'payment.cardNumber',
  'payment.cvv',
  'payment.cvc',
  'payment.expiry',
  'billing.card_number',
  'stripe.card_number',

  // 個人情報（必要に応じてハッシュ化）
  'user.ssn',
  'user.social_security_number',
  'user.credit_card',
  'user.bank_account',
  'kyc.document_number',

  // ワイルドカードパターン
  '*.password',
  '*.secret',
  '*.private_key',
  '*.api_key',
  '*.access_token',
];

// 正規表現ベースのRedaction（パフォーマンス注意）
const REDACT_PATTERNS = [
  /.*[Pp]assword.*/,
  /.*[Tt]oken.*/,
  /.*[Kk]ey$/,
  /.*[Ss]ecret.*/,
  /^(.*\.)?api[_-]?key$/i,
  /^(.*\.)?access[_-]?token$/i,
];
```

##### c) プライバシー保護機能

```typescript
// IPアドレスハッシュ化
function hashIP(ip: string): string {
  const secret = process.env.IP_HASH_SECRET || 'default-secret';
  return crypto.createHmac('sha256', secret).update(ip).digest('hex').substring(0, 8); // 短縮ハッシュ
}

// PII トークン化（可逆的な場合）
function tokenizePII(value: string, field: string): string {
  const secret = process.env.PII_TOKEN_SECRET || 'default-secret';
  return `${field}_${crypto
    .createHmac('sha256', secret)
    .update(value)
    .digest('hex')
    .substring(0, 12)}`;
}

// エラースタックフィルタリング
function filterErrorStack(stack: string): string {
  return stack
    .split('\n')
    .filter(
      (line) =>
        !line.includes('node_modules') && // サードパーティライブラリを除外
        !line.includes(process.env.HOME || '/home') && // ホームパスを除外
        !line.includes('/var/secrets/') // 機密パスを除外
    )
    .map(
      (line) => line.replace(/\/.*\/app/g, '/app') // 絶対パスを相対パスに
    )
    .join('\n');
}
```

## 5. 実装仕様

### 5.1 ディレクトリ構成

```
src/
└── lib/
    └── logger/
        ├── index.ts           # メインエントリーポイント
        ├── server.ts          # サーバーサイドLogger実装
        ├── client.ts          # クライアントサイドLogger実装
        ├── middleware.ts      # API Routeミドルウェア
        ├── utils.ts           # 共通ユーティリティ
        └── types.ts           # 型定義
```

### 5.2 主要モジュール

#### 5.2.1 index.ts - 統一インターフェース

```typescript
/**
 * 環境に応じて適切なLoggerを自動選択
 */
export const logger = typeof window === 'undefined' ? serverLogger : clientLogger;
```

#### 5.2.2 server.ts - Pinoベースサーバーロガー

```typescript
/**
 * Pinoベースの高性能サーバーサイドロガー
 * - JSON構造化出力
 * - OpenTelemetry統合
 * - セキュリティRedaction
 * - 環境別Transport設定
 */
```

#### 5.2.3 client.ts - ブラウザログ

```typescript
/**
 * ブラウザConsole APIベースのクライアントロガー
 * - サーバーライクなフォーマット
 * - ログレベル制御
 * - 開発体験の最適化
 */
```

#### 5.2.4 middleware.ts - HTTPログミドルウェア

```typescript
/**
 * Next.js API Route用のHTTPログミドルウェア
 * - リクエスト・レスポンス詳細ログ
 * - パフォーマンス測定
 * - エラー詳細キャプチャ
 * - リクエストID相関
 */
```

### 5.3 OpenTelemetry統合

#### 5.3.1 instrumentation.ts設定

```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { NodeSDK } = await import('@opentelemetry/sdk-node');
    const { PinoInstrumentation } = await import('@opentelemetry/instrumentation-pino');

    const sdk = new NodeSDK({
      instrumentations: [
        new PinoInstrumentation({
          logKeys: {
            traceId: 'trace_id',
            spanId: 'span_id',
            traceFlags: 'trace_flags',
          },
        }),
      ],
    });

    sdk.start();
  }
}
```

## 6. パフォーマンス考慮事項

### 6.1 サーバーサイド最適化

- **非同期ログ出力**: Pinoの非同期書き込み活用
- **Transport分離**: ワーカースレッドでのログ処理
- **Level-based早期リターン**: 不要なログレベルでの処理スキップ
- **メモリプール**: ログオブジェクトの再利用

### 6.2 クライアントサイド最適化

- **バッチ処理**: 複数ログの一括処理
- **Throttling**: 高頻度ログの制限
- **ローカルストレージ**: オフライン時のログ蓄積
- **サンプリング**: 本番環境での選択的ログ送信

### 6.3 パフォーマンス目標

| メトリクス         | 目標値 | 測定方法             |
| ------------------ | ------ | -------------------- |
| ログ出力レイテンシ | < 1ms  | ベンチマークテスト   |
| メモリ使用量増加   | < 5MB  | アプリケーション監視 |
| CPU オーバーヘッド | < 2%   | プロファイリング     |
| スループット低下   | < 1%   | 負荷テスト           |

## 7. 運用・監視

### 7.1 ログ集約

```yaml
# docker-compose.yml例
services:
  app:
    logging:
      driver: 'json-file'
      options:
        max-size: '10m'
        max-file: '3'

  promtail:
    image: grafana/promtail:latest
    volumes:
      - /var/log:/var/log:ro
    command: -config.file=/etc/promtail/config.yml

  loki:
    image: grafana/loki:latest
    ports:
      - '3100:3100'
```

### 7.2 アラート設定

```yaml
# Grafana Alert Rules例
groups:
  - name: logging
    rules:
      - alert: HighErrorRate
        expr: |
          rate(log_entries_total{level="error"}[5m]) > 0.01
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: 'High error log rate detected'

      - alert: LogVolumeSpike
        expr: |
          rate(log_entries_total[5m]) > 1000
        for: 5m
        labels:
          severity: info
        annotations:
          summary: 'Unusual log volume detected'
```

## 8. セキュリティガイドライン

### 8.1 機密情報保護

1. **自動Redaction**: 定義済みパターンでの自動マスキング
2. **手動Redaction**: アプリケーション層での明示的なマスキング
3. **ログローテーション**: 機密ログの定期削除
4. **アクセス制御**: ログファイルの適切な権限設定

### 8.2 GDPR/プライバシー対応

```typescript
// PII保護例
logger.info('User action completed', {
  user_id: user.id, // OK: 識別子
  action: 'profile_update', // OK: アクション情報
  // email: user.email,    // NG: PII情報は避ける
  ip_hash: hashIP(req.ip), // OK: ハッシュ化したIP
});
```

## 9. テスト戦略

### 9.1 単体テスト

- **Logger インターフェース**: メソッド呼び出しとレベル制御
- **Redaction機能**: 機密情報マスキングの検証
- **フォーマット**: ログ出力形式の確認
- **パフォーマンス**: ベンチマークテスト

### 9.2 統合テスト

- **ミドルウェア**: API Routeでのログ動作確認
- **OpenTelemetry**: trace_id相関の検証
- **環境切り替え**: 開発/本番設定の動作確認

### 9.3 E2Eテスト

- **ログ集約**: Loki/Grafanaへの配信確認
- **アラート**: 閾値超過時の通知動作
- **ダッシュボード**: Grafanaでの可視化確認

## 10. マイグレーション計画

### 10.1 段階的導入

#### Phase 1: 基盤実装（1週間）

- [ ] Logger基盤モジュール実装
- [ ] 環境変数・設定ファイル
- [ ] 単体テスト実装

#### Phase 2: サーバーサイド統合（1週間）

- [ ] Pinoサーバーロガー実装
- [ ] API Routeミドルウェア統合
- [ ] OpenTelemetry統合

#### Phase 3: クライアントサイド統合（3日）

- [ ] ブラウザロガー実装
- [ ] 統一インターフェース完成
- [ ] クロスプラットフォーム動作確認

#### Phase 4: 運用基盤（1週間）

- [ ] Docker Compose統合
- [ ] Loki/Grafana設定
- [ ] アラート・ダッシュボード構築

#### Phase 5: 検証・最適化（3日）

- [ ] パフォーマンスチューニング
- [ ] E2Eテスト実施
- [ ] ドキュメント整備

### 10.2 既存システムとの互換性

```typescript
// 既存のconsole.logから段階的移行
// Phase 1: 新規機能では logger使用
logger.info('New feature implemented');

// Phase 2: 既存console.logの置き換え
// console.log("User logged in");
logger.info('User logged in', { user_id: user.id });

// Phase 3: 完全移行と最適化
```

## 11. トラブルシューティング

### 11.1 よくある問題

#### 11.1.1 Pino Transport エラー

```bash
# 症状: "Cannot start worker thread"
# 原因: Next.js App Router環境でのワーカースレッド制限
# 解決: production環境では標準出力、development環境でのみpino-pretty使用
```

#### 11.1.2 OpenTelemetry 相関エラー

```bash
# 症状: trace_idがログに含まれない
# 原因: OpenTelemetry Instrumentation設定不備
# 解決: instrumentation.tsでのPinoInstrumentation設定確認
```

#### 11.1.3 メモリリーク

```bash
# 症状: メモリ使用量の継続的増加
# 原因: ログオブジェクトの循環参照
# 解決: serializers設定とRedaction適用
```

### 11.2 デバッグ手法

```typescript
// ログレベルでのデバッグ
process.env.LOG_LEVEL = 'debug';

// Pino内部デバッグ
process.env.DEBUG = 'pino:*';

// OpenTelemetry デバッグ
process.env.OTEL_LOG_LEVEL = 'debug';
```

## 12. 今後の拡張計画

### 12.1 短期拡張（3ヶ月）

- **ログ分析ダッシュボード**: Grafana詳細ダッシュボード
- **エラー追跡**: Sentryとの統合
- **パフォーマンス監視**: APM連携

### 12.2 中期拡張（6ヶ月）

- **機械学習分析**: 異常検知システム
- **ログ検索最適化**: Elasticsearchとの統合
- **コスト最適化**: ログ保持期間・サンプリング戦略

### 12.3 長期拡張（12ヶ月）

- **分散トレーシング拡張**: マイクロサービス対応
- **リアルタイム分析**: Stream処理パイプライン
- **自動インシデント対応**: ChatOps統合

---

**Document Version**: 1.0  
**Last Updated**: 2024-12-14  
**Author**: System Architecture Team  
**Review Status**: Draft
