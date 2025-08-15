# 構造化ログシステム 開発者ガイド

## 📋 目次

- [概要](#概要)
- [機能一覧](#機能一覧)
- [基本的な使い方](#基本的な使い方)
- [高度な機能](#高度な機能)
- [設定とカスタマイズ](#設定とカスタマイズ)
- [パフォーマンスとセキュリティ](#パフォーマンスとセキュリティ)
- [テストとデバッグ](#テストとデバッグ)

---

## 概要

本プロジェクトでは、Next.js環境に最適化された高性能な構造化ログシステムを実装しています。サーバーサイド、クライアントサイド、Edge Runtime の全環境に対応し、OpenTelemetry統合、セキュリティ強化、パフォーマンス最適化を実現しています。

### 🎯 主要な特徴

- **📊 構造化ログ出力**: JSON形式での一貫したログ形式
- **🌐 環境対応**: Server/Client/Edge Runtime の全環境サポート
- **🔒 セキュリティ強化**: ログインジェクション防止、機密情報自動Redaction
- **📈 監視統合**: OpenTelemetry、Grafana、Loki統合
- **⚡ 高性能**: < 1ms ログ出力、< 5MB メモリ増加
- **🧪 テスト完備**: 225テスト（99.3%成功率）

---

## 機能一覧

### 1. 基本ログ機能

#### 1.1 統一ログインターフェース

**目的**: 全環境で一貫したログAPI提供  
**実装**: `src/lib/logger/index.ts`

```typescript
import { logger } from '@/lib/logger';

// 基本的なログレベル
logger.trace('詳細なデバッグ情報');
logger.debug('開発用情報');
logger.info('一般的な情報');
logger.warn('警告メッセージ');
logger.error('エラー情報');
logger.fatal('致命的エラー');

// 構造化データと併用
logger.info('ユーザーログイン', {
  userId: '12345',
  timestamp: new Date(),
  metadata: { source: 'web' },
});
```

#### 1.2 環境自動検出ロガー

**目的**: 実行環境に応じた最適なロガー選択  
**機能説明**:

- サーバーサイド: Pinoベースの高性能ロガー
- クライアントサイド: Consoleベースの開発者フレンドリーなロガー
- Edge Runtime: 制限対応済みの軽量ロガー

### 2. セキュリティ機能

#### 2.1 機密情報自動Redaction

**目的**: 機密データの誤ログを防止  
**実装**: `src/lib/logger/sanitizer.ts`

```typescript
logger.info('API呼び出し', {
  password: 'secret123', // → '[REDACTED]'
  token: 'bearer-token', // → '[REDACTED]'
  userInfo: {
    email: 'user@example.com',
    creditCard: '4111-1111', // → '[REDACTED]'
  },
});
```

**対象フィールド**:

- パスワード関連: `password`, `passwd`, `pwd`
- 認証情報: `token`, `jwt`, `auth`, `secret`
- 金融情報: `creditCard`, `bankAccount`, `ssn`
- API キー: `apiKey`, `clientSecret`

#### 2.2 ログインジェクション防止

**目的**: 制御文字を使った攻撃防止  
**機能**:

- CRLF注入防止 (`\r\n` → `\\r\\n`)
- Null byte除去 (`\0` → `\\0`)
- 制御文字エスケープ

#### 2.3 IPアドレスハッシュ化

**目的**: GDPR準拠の個人データ保護  
**実装**: HMAC-SHA256によるIPハッシュ化

```typescript
// 環境変数設定必須
LOG_IP_HASH_SECRET = your - secret - key;

// 自動ハッシュ化
logger.info('アクセスログ', {
  clientIp: '192.168.1.1', // → 'sha256:abcd1234...'
});
```

### 3. コンテキスト管理

#### 3.1 リクエストコンテキスト

**目的**: リクエスト横断でのトレース情報維持  
**実装**: `src/lib/logger/context.ts`

```typescript
import { logger } from '@/lib/logger';
import { loggerContextManager } from '@/lib/logger/context';

// リクエストコンテキスト作成
await loggerContextManager.runWithContext(
  {
    requestId: '12345',
    userId: 'user-001',
    traceId: 'trace-abc',
  },
  async () => {
    // この中のすべてのログに自動的にコンテキスト情報が付与
    logger.info('処理開始');
    await someAsyncFunction();
    logger.info('処理完了');
  }
);
```

#### 3.2 Edge Runtime制限対応

**目的**: AsyncLocalStorage制限環境での代替実装  
**実装**: `src/lib/logger/edge-runtime-helpers.ts`

**制限事項**:

- AsyncLocalStorageが利用不可
- コンテキスト情報の手動管理が必要
- メモリ制約による軽量実装

### 4. パフォーマンス機能

#### 4.1 動的サンプリング

**目的**: 高負荷時のログ量制御  
**実装**: `src/lib/logger/rate-limiter.ts`

```typescript
// 高負荷時の自動サンプリング
logger.info('高頻度イベント'); // サンプリング対象
logger.error('重要エラー'); // 常に出力（優先保持）
```

#### 4.2 レート制限機能

**目的**: ログフラッド攻撃防止  
**機能**:

- IP別レート制限
- ログレベル別制限
- バーストトラフィック対応

#### 4.3 パフォーマンス測定

**目的**: 処理時間の自動計測  
**実装**: `src/lib/logger/index.ts`

```typescript
import { measurePerformance, measurePerformanceAsync } from '@/lib/logger';

// 同期処理の測定（パフォーマンス情報は自動でログ出力）
const result = measurePerformance('計算処理', () => {
  return heavyCalculation();
});
// result は heavyCalculation() の戻り値
// パフォーマンス情報は自動的にログに記録される

// 非同期処理の測定
const result = await measurePerformanceAsync('API呼び出し', async () => {
  return await apiCall();
});
// result は apiCall() の戻り値
// パフォーマンス情報は自動的にログに記録される
```

### 5. 監視・メトリクス

#### 5.1 OpenTelemetry統合

**目的**: 分散トレーシング対応  
**実装**: `src/lib/logger/metrics.ts`, `instrumentation.ts`

**自動収集メトリクス**:

- ログエントリー数（レベル別）
- エラー発生数（カテゴリ別）
- リクエスト処理時間
- メモリ使用量

#### 5.2 Prometheus互換メトリクス

**エンドポイント**: `/api/metrics`

```typescript
// 主要メトリクス
log_entries_total{level="error"}          # エラーログ数
log_entries_total{level="info"}           # 情報ログ数
errors_total{type="validation"}           # エラー種別数
request_duration_seconds_bucket           # リクエスト時間分布
memory_usage_bytes                        # メモリ使用量
```

### 6. ミドルウェア機能

#### 6.1 HTTPログミドルウェア

**目的**: リクエスト/レスポンスの自動ログ  
**実装**: `src/lib/logger/middleware.ts`

```typescript
import { logRequestStart, logRequestEnd } from '@/lib/logger/middleware';

// Next.js middleware での使用例
export function middleware(request: NextRequest) {
  logRequestStart(request);

  const response = NextResponse.next();

  logRequestEnd(request, response);
  return response;
}
```

**自動ログ項目**:

- リクエスト開始/終了時刻
- HTTP メソッド・パス
- ステータスコード
- 処理時間
- ユーザーエージェント（サニタイズ済み）

#### 6.2 セキュリティイベントログ

```typescript
import { logSecurityEvent } from '@/lib/logger/middleware';

// セキュリティ関連イベントの記録
logSecurityEvent('SUSPICIOUS_LOGIN', {
  userId: 'user-123',
  ipAddress: '192.168.1.1',
  reason: 'Multiple failed attempts',
});
```

### 7. ストレージ連携

#### 7.1 KVストレージ対応

**目的**: Redis/Edge KV での設定管理  
**実装**: `src/lib/logger/kv-storage.ts`

```typescript
// 動的設定変更
await updateLogLevel('debug');
await updateSamplingRate(0.1);
```

#### 7.2 Lokiログ集約

**目的**: 中央集権的ログ管理  
**実装**: `src/lib/logger/loki-transport.ts`

```typescript
// 自動でLokiに送信
logger.info('本番ログ'); // → Loki → Grafana
```

---

## 基本的な使い方

### 1. 導入と初期設定

```typescript
// 1. ロガーのインポート
import { logger } from '@/lib/logger';

// 2. 基本的な使用
logger.info('アプリケーション開始');

// 3. エラーハンドリング
try {
  await riskyOperation();
} catch (error) {
  logger.error('処理エラー', { error, context: 'user-action' });
}
```

### 2. 構造化ログの活用

```typescript
// ユーザーアクション記録
logger.info('ユーザーアクション実行', {
  event_name: 'user_click',
  event_category: 'ui_interaction',
  user_id: '12345',
  component: 'header_button',
  timestamp: new Date().toISOString(),
});

// APIエラー記録
logger.error('API呼び出し失敗', {
  event_name: 'api_error',
  event_category: 'external_service',
  endpoint: '/api/users',
  status_code: 500,
  response_time_ms: 1250,
});
```

### 3. 環境別設定

```bash
# 開発環境 (.env.local)
LOG_LEVEL=debug
LOG_FORMAT=pretty

# 本番環境 (.env.production)
LOG_LEVEL=info
LOG_FORMAT=json
LOG_IP_HASH_SECRET=your-production-secret
```

---

## 高度な機能

### 1. カスタムロガー作成

```typescript
import { logger } from '@/lib/logger';
import { loggerContextManager } from '@/lib/logger/context';

// 特定コンポーネント用ロガー
const componentLogger = loggerContextManager.createContextualLogger(logger, {
  component: 'UserProfile',
  version: '1.2.0',
});

componentLogger.info('コンポーネント初期化完了');
// 出力: { ..., component: 'UserProfile', version: '1.2.0', message: '...' }
```

### 2. 条件付きログ出力

```typescript
// パフォーマンス最適化
if (logger.isLevelEnabled('debug')) {
  const expensiveData = computeExpensiveDebugInfo();
  logger.debug('詳細デバッグ情報', { data: expensiveData });
}
```

### 3. タイマーコンテキスト

```typescript
import { logWithTimerContext } from '@/lib/logger/timer-context';

// setTimeout でもコンテキスト維持
logWithTimerContext(
  () => {
    setTimeout(() => {
      logger.info('遅延実行ログ'); // 元のコンテキスト情報を保持
    }, 1000);
  },
  { operation: 'delayed_task' }
);
```

---

## 設定とカスタマイズ

### 環境変数一覧

| 変数名                        | 説明                          | デフォルト値 | 必須       |
| ----------------------------- | ----------------------------- | ------------ | ---------- |
| `LOG_LEVEL`                   | 最小ログレベル                | `info`       | No         |
| `LOG_FORMAT`                  | 出力形式 (`json`/`pretty`)    | `json`       | No         |
| `LOG_IP_HASH_SECRET`          | IPハッシュ用秘密鍵            | -            | Yes (本番) |
| `LOG_SAMPLING_RATE`           | サンプリング率 (0.0-1.0)      | `1.0`        | No         |
| `LOG_MAX_OBJECT_SIZE`         | オブジェクト最大サイズ(bytes) | `10240`      | No         |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OpenTelemetry エンドポイント  | -            | No         |

### パフォーマンスチューニング

```typescript
// 高負荷環境での設定例
LOG_LEVEL = warn;
LOG_SAMPLING_RATE = 0.1;
LOG_MAX_OBJECT_SIZE = 1024;
```

---

## パフォーマンスとセキュリティ

### パフォーマンス指標

- **ログ出力レイテンシ**: < 1ms
- **メモリ使用量増加**: < 5MB
- **CPU オーバーヘッド**: < 2%
- **スループット**: > 10,000 logs/sec

### セキュリティ機能

1. **自動Redaction**: 機密情報の自動マスキング
2. **ログインジェクション防止**: 制御文字エスケープ
3. **IPハッシュ化**: GDPR準拠のプライバシー保護
4. **レート制限**: ログフラッド攻撃防止

---

## テストとデバッグ

### デバッグモードの有効化

```bash
# 開発環境での詳細ログ
export LOG_LEVEL=trace
export LOG_FORMAT=pretty
npm run dev
```

### テスト実行

```bash
# ログ機能の単体テスト
pnpm test tests/unit/logger/

# 統合テスト
pnpm test tests/integration/logger/

# E2Eテスト（Loki連携含む）
pnpm test tests/e2e/logger/
```

### 監視ダッシュボード

Grafanaダッシュボード URL: `http://localhost:3001`

**主要パネル**:

- リアルタイムログストリーム
- エラー率トレンド
- パフォーマンスメトリクス
- ログレベル分布

---

## 関連ドキュメント

- [設定ガイド](./logging-configuration-guide.md)
- [トラブルシューティング](./logging-troubleshooting-guide.md)
- [API リファレンス](../api/logger/)
- [統合計画書](../work_dir/structured-logging-unified-plan.md)
