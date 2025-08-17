# 構造化ログシステム トラブルシューティングガイド

## 📋 目次

- [概要](#概要)
- [よくある問題と解決策](#よくある問題と解決策)
- [デバッグ手順](#デバッグ手順)
- [エラーメッセージリファレンス](#エラーメッセージリファレンス)
- [パフォーマンス問題の診断](#パフォーマンス問題の診断)
- [環境別トラブルシューティング](#環境別トラブルシューティング)
- [監視とアラート](#監視とアラート)

---

## 概要

このガイドでは、構造化ログシステムで発生する可能性のある問題の診断と解決方法を詳しく説明します。問題の早期発見と迅速な解決のためのベストプラクティスを含みます。

---

## よくある問題と解決策

### 🚫 ログが出力されない

#### 症状

- コンソールにログが表示されない
- Lokiにログが送信されない
- ファイルにログが記録されない

#### 考えられる原因と解決策

**1. ログレベル設定の問題**

```bash
# 問題の確認
echo "現在のログレベル: $LOG_LEVEL"
echo "クライアントログレベル: $NEXT_PUBLIC_LOG_LEVEL"

# 解決策：ログレベルを下げる
export LOG_LEVEL=debug
export NEXT_PUBLIC_LOG_LEVEL=debug
```

**2. レート制限に引っかかっている**

```typescript
// デバッグ用のレート制限確認
import { logger } from '@/lib/logger';

// レート制限状態の確認
logger.info('レート制限テスト', {
  rateLimit: 'testing',
  timestamp: Date.now(),
});
```

```bash
# 解決策：レート制限を緩和
export LOG_RATE_LIMIT_MAX_TOKENS=1000
export LOG_RATE_LIMIT_ADAPTIVE=false
```

**3. 環境変数の設定ミス**

```bash
# 設定確認スクリプト
pnpm run dev 2>&1 | grep -E "(LOG_|LOKI_)" | head -20
```

### 🔌 Loki接続問題

#### 症状

- ログがGrafanaに表示されない
- Loki接続エラーが発生する
- タイムアウトエラーが発生する

#### 診断手順

**1. Loki接続テスト**

```bash
# 基本接続テスト
curl -X GET "${LOKI_URL}/ready"

# ログ送信テスト
curl -X POST "${LOKI_URL}/loki/api/v1/push" \
  -H "Content-Type: application/json" \
  -H "X-Scope-OrgID: ${LOKI_TENANT_ID}" \
  -d '{
    "streams": [
      {
        "stream": {
          "service": "test",
          "level": "info"
        },
        "values": [
          ["'$(date +%s)000000000'", "テスト接続メッセージ"]
        ]
      }
    ]
  }'
```

**2. 認証設定の確認**

```bash
# Basic認証の場合
curl -u "${LOKI_USERNAME}:${LOKI_PASSWORD}" \
  -X GET "${LOKI_URL}/ready"

# API Key認証の場合
curl -H "Authorization: Bearer ${LOKI_API_KEY}" \
  -X GET "${LOKI_URL}/ready"
```

#### 解決策

**設定ファイルの修正例**:

```bash
# 接続設定の見直し
LOKI_ENABLED=true
LOKI_URL=http://localhost:3100  # プロトコル確認
LOKI_TIMEOUT=15000              # タイムアウト延長
LOKI_MAX_RETRIES=5              # リトライ回数増加

# バッチ設定の調整
LOKI_BATCH_SIZE=50              # バッチサイズ削減
LOKI_FLUSH_INTERVAL=10000       # フラッシュ間隔延長
```

### 🔒 セキュリティ関連問題

#### 症状

- IPハッシュ化が機能しない
- 機密情報がログに漏洩する
- HMAC生成エラーが発生する

#### 診断と解決

**1. IPハッシュ化の問題**

```bash
# 秘密鍵設定の確認
if [ -z "$LOG_IP_HASH_SECRET" ]; then
  echo "❌ LOG_IP_HASH_SECRET が設定されていません"
else
  echo "✅ LOG_IP_HASH_SECRET 設定済み (長さ: ${#LOG_IP_HASH_SECRET})"
fi

# 最小長確認
if [ ${#LOG_IP_HASH_SECRET} -lt 64 ]; then
  echo "⚠️  推奨: 64文字以上の秘密鍵を使用してください"
fi
```

**解決策**:

```bash
# 安全な秘密鍵生成
openssl rand -base64 64 | tr -d "\\n"

# 環境変数設定
export LOG_IP_HASH_SECRET="生成された64文字以上の秘密鍵"
```

**2. 機密情報Redactionの問題**

```typescript
// デバッグ用のRedactionテスト
import { logger } from '@/lib/logger';

logger.info('Redactionテスト', {
  password: 'secret123', // 自動でマスクされるはず
  token: 'bearer-token', // 自動でマスクされるはず
  normalField: 'normal-value', // そのまま出力されるはず
});
```

### ⚡ パフォーマンス問題

#### 症状

- ログ出力が遅い
- メモリ使用量が増加する
- CPU使用率が高い

#### 診断手順

**1. パフォーマンス測定**

```typescript
// パフォーマンステスト用コード
import { logger, measurePerformance } from '@/lib/logger';

const result = measurePerformance('ログ性能テスト', () => {
  for (let i = 0; i < 1000; i++) {
    logger.info(`テストログ ${i}`, {
      iteration: i,
      timestamp: Date.now(),
    });
  }
});

console.log(`1000ログ出力時間: ${result.duration}ms`);
```

**2. メモリ使用量確認**

```bash
# Node.js プロセスのメモリ監視
node --max-old-space-size=1024 --inspect your-app.js

# メモリリーク検出
node --trace-gc your-app.js 2>&1 | grep -E "Scavenge|Mark-Sweep"
```

#### 解決策

**高負荷対応設定**:

```bash
# レート制限強化
LOG_RATE_LIMIT_MAX_TOKENS=50
LOG_RATE_LIMIT_REFILL_RATE=5
LOG_RATE_LIMIT_ADAPTIVE=true

# ログレベル制限
LOG_LEVEL=warn
NEXT_PUBLIC_LOG_LEVEL=error

# Loki最適化
LOKI_BATCH_SIZE=200
LOKI_FLUSH_INTERVAL=10000
LOKI_MIN_LEVEL=warn
```

---

## デバッグ手順

### 🔍 段階的デバッグプロセス

#### 1. 基本設定確認

```bash
#!/bin/bash
# デバッグスクリプト: debug-logger.sh

echo "=== 構造化ログシステム デバッグ ==="

# 環境変数確認
echo "1. 環境変数確認"
echo "LOG_LEVEL: ${LOG_LEVEL:-未設定}"
echo "NEXT_PUBLIC_LOG_LEVEL: ${NEXT_PUBLIC_LOG_LEVEL:-未設定}"
echo "LOG_IP_HASH_SECRET: ${LOG_IP_HASH_SECRET:+設定済み}"
echo "LOKI_ENABLED: ${LOKI_ENABLED:-未設定}"
echo "LOKI_URL: ${LOKI_URL:-未設定}"
echo ""

# Node.js環境確認
echo "2. 実行環境確認"
echo "NODE_ENV: ${NODE_ENV:-未設定}"
echo "NEXT_RUNTIME: ${NEXT_RUNTIME:-未設定}"
echo "Node.js バージョン: $(node --version)"
echo ""

# 接続テスト
echo "3. Loki接続テスト"
if [ -n "$LOKI_URL" ]; then
  curl -s -o /dev/null -w "Loki接続: %{http_code} (応答時間: %{time_total}s)" "$LOKI_URL/ready"
  echo ""
else
  echo "LOKI_URL が設定されていません"
fi
```

#### 2. ログ出力テスト

```typescript
// デバッグ用テストスイート
// ファイル: debug/logger-test.ts

import { logger } from '@/lib/logger';

export async function runLoggerDebugTest() {
  console.log('=== ログシステム デバッグテスト開始 ===');

  // 1. 基本ログレベルテスト
  console.log('1. ログレベルテスト');
  logger.trace('TRACEレベルテスト');
  logger.debug('DEBUGレベルテスト');
  logger.info('INFOレベルテスト');
  logger.warn('WARNレベルテスト');
  logger.error('ERRORレベルテスト');
  logger.fatal('FATALレベルテスト');

  // 2. 構造化ログテスト
  console.log('2. 構造化ログテスト');
  logger.info('構造化ログテスト', {
    userId: '12345',
    action: 'debug_test',
    metadata: {
      timestamp: new Date().toISOString(),
      testData: {
        password: 'secret', // Redactionテスト
        token: 'bearer-token', // Redactionテスト
        normalField: 'normal-value',
      },
    },
  });

  // 3. エラーログテスト
  console.log('3. エラーログテスト');
  try {
    throw new Error('テスト用エラー');
  } catch (error) {
    logger.error('エラー処理テスト', { error, context: 'debug_test' });
  }

  // 4. パフォーマンステスト
  console.log('4. パフォーマンステスト');
  const start = Date.now();
  for (let i = 0; i < 100; i++) {
    logger.info(`パフォーマンステスト ${i}`, { iteration: i });
  }
  const duration = Date.now() - start;
  console.log(`100ログ出力時間: ${duration}ms (平均: ${duration / 100}ms/log)`);

  console.log('=== デバッグテスト完了 ===');
}
```

#### 3. ネットワーク診断

```bash
# ネットワーク診断スクリプト
#!/bin/bash
# network-debug.sh

echo "=== ネットワーク診断 ==="

# DNS解決確認
echo "1. DNS解決テスト"
LOKI_HOST=$(echo $LOKI_URL | sed 's|.*://||' | sed 's|:.*||' | sed 's|/.*||')
nslookup $LOKI_HOST

# ポート接続確認
echo "2. ポート接続テスト"
LOKI_PORT=$(echo $LOKI_URL | sed 's|.*:||' | sed 's|/.*||')
nc -zv $LOKI_HOST ${LOKI_PORT:-3100}

# HTTP応答確認
echo "3. HTTP応答テスト"
curl -v -X GET "${LOKI_URL}/ready" 2>&1 | head -20

# SSL証明書確認（HTTPS の場合）
if [[ $LOKI_URL == https* ]]; then
  echo "4. SSL証明書確認"
  openssl s_client -connect $LOKI_HOST:${LOKI_PORT:-443} -servername $LOKI_HOST < /dev/null 2>&1 | grep -E "(Certificate|Verify)"
fi
```

---

## エラーメッセージリファレンス

### ❌ 設定関連エラー

| エラーメッセージ                              | 原因                     | 解決策                                              |
| --------------------------------------------- | ------------------------ | --------------------------------------------------- |
| `LOG_IP_HASH_SECRET not set in production`    | 本番環境で秘密鍵未設定   | `LOG_IP_HASH_SECRET`を64文字以上で設定              |
| `Invalid log level: unknown`                  | 無効なログレベル         | `trace,debug,info,warn,error,fatal`のいずれかを設定 |
| `LOKI_URL is required when LOKI_ENABLED=true` | Loki有効なのにURL未設定  | `LOKI_URL`を正しいエンドポイントで設定              |
| `Rate limit exceeded`                         | レート制限に引っかかった | レート制限設定を緩和するか待機                      |

### 🌐 ネットワーク関連エラー

| エラーメッセージ    | 原因                     | 解決策                                 |
| ------------------- | ------------------------ | -------------------------------------- |
| `ECONNREFUSED`      | Lokiサーバーへの接続拒否 | Lokiサーバーの起動状態とURL確認        |
| `ETIMEDOUT`         | 接続タイムアウト         | `LOKI_TIMEOUT`の延長、ネットワーク確認 |
| `ENOTFOUND`         | DNS解決失敗              | ホスト名確認、DNS設定確認              |
| `Certificate error` | SSL証明書エラー          | 証明書の有効性確認、CA設定確認         |

### 🔒 セキュリティ関連エラー

| エラーメッセージ         | 原因         | 解決策                                           |
| ------------------------ | ------------ | ------------------------------------------------ |
| `HMAC generation failed` | HMAC生成失敗 | 秘密鍵の形式確認、文字エンコーディング確認       |
| `Unauthorized`           | 認証失敗     | `LOKI_USERNAME/PASSWORD`または`LOKI_API_KEY`確認 |
| `Forbidden`              | 認可失敗     | アクセス権限、テナントID確認                     |

### ⚡ パフォーマンス関連エラー

| エラーメッセージ        | 原因             | 解決策                               |
| ----------------------- | ---------------- | ------------------------------------ |
| `Memory limit exceeded` | メモリ不足       | レート制限強化、ログレベル調整       |
| `CPU usage too high`    | CPU使用率過多    | サンプリング率調整、非同期処理最適化 |
| `Batch size too large`  | バッチサイズ過大 | `LOKI_BATCH_SIZE`の削減              |

---

## パフォーマンス問題の診断

### 📊 監視メトリクス

#### 1. ログ出力性能

```typescript
// パフォーマンス監視コード
import { logger, measurePerformanceAsync } from '@/lib/logger';

export async function monitorLogPerformance() {
  const metrics = {
    totalLogs: 0,
    totalDuration: 0,
    errorCount: 0,
    averageLatency: 0,
  };

  const testCount = 1000;
  const startTime = Date.now();

  for (let i = 0; i < testCount; i++) {
    try {
      const result = await measurePerformanceAsync(`ログテスト${i}`, async () => {
        logger.info(`パフォーマンステスト`, {
          iteration: i,
          timestamp: Date.now(),
        });
      });

      metrics.totalLogs++;
      metrics.totalDuration += result.duration;
    } catch (error) {
      metrics.errorCount++;
      logger.error('パフォーマンステストエラー', { error, iteration: i });
    }
  }

  metrics.averageLatency = metrics.totalDuration / metrics.totalLogs;

  logger.info('パフォーマンステスト結果', {
    ...metrics,
    totalTime: Date.now() - startTime,
    throughput: (metrics.totalLogs / (Date.now() - startTime)) * 1000,
  });

  return metrics;
}
```

#### 2. メモリ使用量監視

```typescript
// メモリ監視
export function monitorMemoryUsage() {
  const usage = process.memoryUsage();

  logger.info('メモリ使用状況', {
    rss: Math.round(usage.rss / 1024 / 1024), // MB
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
    external: Math.round(usage.external / 1024 / 1024), // MB
    arrayBuffers: Math.round(usage.arrayBuffers / 1024 / 1024), // MB
  });

  // 警告しきい値チェック
  const heapUsedMB = usage.heapUsed / 1024 / 1024;
  if (heapUsedMB > 512) {
    logger.warn('メモリ使用量が高い', { heapUsedMB });
  }
}
```

### 🔧 最適化設定

#### 高負荷環境用

```bash
# 高負荷環境設定
LOG_LEVEL=warn
NEXT_PUBLIC_LOG_LEVEL=error
LOG_RATE_LIMIT_MAX_TOKENS=25
LOG_RATE_LIMIT_REFILL_RATE=2
LOG_RATE_LIMIT_ADAPTIVE=true
LOKI_BATCH_SIZE=200
LOKI_FLUSH_INTERVAL=15000
LOKI_MIN_LEVEL=warn
```

#### 低リソース環境用

```bash
# 低リソース環境設定
LOG_LEVEL=error
NEXT_PUBLIC_LOG_LEVEL=fatal
LOG_RATE_LIMIT_MAX_TOKENS=10
LOG_RATE_LIMIT_REFILL_RATE=1
LOKI_BATCH_SIZE=50
LOKI_FLUSH_INTERVAL=30000
LOKI_ENABLED=false  # 必要に応じてLoki無効化
```

---

## 環境別トラブルシューティング

### 🧪 開発環境

#### よくある問題

**1. ログが多すぎる**

```bash
# 解決策：ログレベル調整
export LOG_LEVEL=info
export NEXT_PUBLIC_LOG_LEVEL=info
```

**2. Lokiコンテナが起動しない**

```bash
# Docker Compose確認
docker-compose -f docker-compose.loki.yml ps
docker-compose -f docker-compose.loki.yml logs loki

# ポート確認
lsof -i :3100
```

### 🏗️ ステージング環境

#### よくある問題

**1. 本番データの機密情報漏洩**

```bash
# Redaction設定強化
LOG_IP_HASH_SECRET=staging-specific-secret
# コードレベルでの追加Redactionルール設定
```

**2. パフォーマンス問題**

```bash
# 監視強化
LOG_RATE_LIMIT_ADAPTIVE=true
LOKI_MIN_LEVEL=info
```

### 🚀 本番環境

#### よくある問題

**1. ログ集約の遅延**

```bash
# Loki設定最適化
LOKI_BATCH_SIZE=100
LOKI_FLUSH_INTERVAL=5000
LOKI_MAX_RETRIES=5
```

**2. アラート過多**

```bash
# しきい値調整
LOG_RATE_LIMIT_ERROR_THRESHOLD=200
LOKI_MIN_LEVEL=warn
```

---

## 監視とアラート

### 📈 Grafanaダッシュボード監視

#### 主要パネル監視項目

1. **ログレート**: 分あたりのログエントリ数
2. **エラー率**: エラーレベルログの割合
3. **レスポンス時間**: ログ出力レイテンシ
4. **メモリ使用量**: プロセスメモリ使用状況

#### アラート条件

```yaml
# Grafanaアラート設定例
alerts:
  - name: '高エラー率'
    condition: 'エラー率 > 5% for 5分間'
    action: 'Slack通知'

  - name: 'ログ遅延'
    condition: 'ログレイテンシ > 100ms for 3分間'
    action: 'Email通知'

  - name: 'メモリリーク'
    condition: 'メモリ使用量 > 80% for 10分間'
    action: 'PagerDuty'
```

### 🚨 自動復旧設定

```bash
# ヘルスチェックスクリプト
#!/bin/bash
# health-check.sh

HEALTH_ENDPOINT="http://localhost:3000/api/health"
LOKI_HEALTH="${LOKI_URL}/ready"

# アプリケーションヘルスチェック
if ! curl -s "$HEALTH_ENDPOINT" > /dev/null; then
  echo "アプリケーション応答なし - 再起動が必要"
  # 自動再起動ロジック
fi

# Lokiヘルスチェック
if ! curl -s "$LOKI_HEALTH" > /dev/null; then
  echo "Loki接続失敗 - フォールバックモード"
  export LOKI_ENABLED=false
fi
```

---

## 緊急時対応手順

### 🆘 重大問題発生時

#### 1. 即座の対応

```bash
# 1. ログ出力停止（緊急時）
export LOG_LEVEL=fatal
export LOKI_ENABLED=false

# 2. レート制限強化
export LOG_RATE_LIMIT_MAX_TOKENS=5
export LOG_RATE_LIMIT_REFILL_RATE=1

# 3. アプリケーション再起動
pm2 restart all
```

#### 2. 問題調査

```bash
# システムリソース確認
top -p $(pgrep node)
iostat 1 5
netstat -an | grep 3100

# ログファイル確認
tail -f /var/log/nextjs-app.log
journalctl -u nextjs-app -f
```

#### 3. 復旧手順

```bash
# 段階的復旧
# 1. 最小限の設定で再開
export LOG_LEVEL=error
export LOKI_ENABLED=true
export LOKI_BATCH_SIZE=10

# 2. 監視しながら段階的に設定復元
export LOG_LEVEL=warn
export LOKI_BATCH_SIZE=50

# 3. 通常設定に復元
export LOG_LEVEL=info
export LOKI_BATCH_SIZE=100
```

---

## 関連ドキュメント

- [システム概要](./logging-system-overview.md)
- [設定ガイド](./logging-configuration-guide.md)
- [API リファレンス](../api/logger/)
- [統合計画書](../work_dir/structured-logging-unified-plan.md)
