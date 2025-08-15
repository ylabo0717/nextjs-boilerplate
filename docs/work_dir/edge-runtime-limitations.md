# Edge Runtime制限事項とベストプラクティス

## 📋 概要

このドキュメントでは、Vercel Edge RuntimeおよびNext.js Edge Runtime環境における構造化ログシステムの制限事項と、それらに対する対応策を説明します。

## 🚨 主要な制限事項

### 1. AsyncLocalStorageの制限

#### 問題

```typescript
// ❌ Edge Runtimeでは動作しない
import { AsyncLocalStorage } from 'async_hooks';
const asyncLocalStorage = new AsyncLocalStorage();

asyncLocalStorage.run(context, async () => {
  await someAsyncOperation();
  // コンテキストが失われる可能性がある
  console.log(asyncLocalStorage.getStore()); // undefined
});
```

#### 解決策

```typescript
// ✅ Edge Runtime対応の代替実装
import { createCompatibleStorage } from '@/lib/logger/utils';

const storage = createCompatibleStorage();
const boundOperation = storage.bind(async () => {
  await someAsyncOperation();
  return storage.getStore(); // コンテキストが保持される
}, context);

await boundOperation();
```

### 2. 非同期コンテキスト継承の制限

#### 問題

```typescript
// ❌ Edge Runtimeでコンテキストが失われる
contextManager.runWithContext(context, async () => {
  await Promise.resolve().then(() => {
    // ここでコンテキストは undefined
    const currentContext = contextManager.getContext();
  });
});
```

#### 解決策

```typescript
// ✅ 明示的なコンテキストバインディング
import { withEdgeContext } from '@/lib/logger/edge-runtime-helpers';

const result = await withEdgeContext(context, async () => {
  await Promise.resolve();
  // コンテキストが保持される
  return contextManager.getContext();
});
```

### 3. Promise.allでの制限

#### 問題

```typescript
// ❌ 並行処理でコンテキストが失われる
const results = await Promise.all([fetch('/api/data1'), fetch('/api/data2'), fetch('/api/data3')]);
```

#### 解決策

```typescript
// ✅ Edge Runtime対応の並行処理
import { promiseAllWithContext } from '@/lib/logger/edge-runtime-helpers';

const results = await promiseAllWithContext(context, [
  () => fetch('/api/data1'),
  () => fetch('/api/data2'),
  () => fetch('/api/data3'),
]);
```

### 4. タイマー関数での制限

#### 問題

```typescript
// ❌ setTimeout/setIntervalでコンテキストが失われる
contextManager.runWithContext(context, () => {
  setTimeout(() => {
    // コンテキストは undefined
    const currentContext = contextManager.getContext();
  }, 1000);
});
```

#### 解決策

```typescript
// ✅ Edge Runtime対応のタイマー
import { setTimeoutWithContext } from '@/lib/logger/edge-runtime-helpers';

setTimeoutWithContext(
  context,
  () => {
    // コンテキストが保持される
    const currentContext = contextManager.getContext();
  },
  1000
);
```

## 🔧 ベストプラクティス

### 1. 環境検出とフォールバック

```typescript
import { detectRuntimeEnvironment } from '@/lib/logger/utils';

const runtime = detectRuntimeEnvironment();

if (runtime === 'edge') {
  // Edge Runtime固有の処理
} else {
  // Node.js環境の処理
}
```

### 2. 診断機能の活用

```typescript
import { getEdgeRuntimeDiagnostics } from '@/lib/logger/edge-runtime-helpers';

const diagnostics = getEdgeRuntimeDiagnostics();
console.log('Runtime:', diagnostics.runtime);
console.log('Context Storage:', diagnostics.contextStorageType);
console.log('Recommendations:', diagnostics.recommendations);
```

### 3. コンプライアンス分析

```typescript
import { analyzeEdgeRuntimeCompliance } from '@/lib/logger/edge-runtime-helpers';

const analysis = analyzeEdgeRuntimeCompliance({
  hasAsyncOperations: true,
  usesPromiseAll: true,
  usesSetTimeout: false,
  usesSetInterval: false,
  hasContextDependency: true,
});

if (!analysis.compliant) {
  console.warn('Edge Runtime issues:', analysis.issues);
  console.log('Suggestions:', analysis.suggestions);
}
```

## 📚 実装パターン

### Middleware実装

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createRequestContext, createLoggerContextManager } from '@/lib/logger/context';
import { withEdgeContext } from '@/lib/logger/edge-runtime-helpers';

export async function middleware(request: NextRequest) {
  const context = createRequestContext(request);
  const contextManager = createLoggerContextManager();

  // Edge Runtime対応のコンテキスト実行
  return await withEdgeContext(context, async () => {
    // ここでコンテキストが利用可能
    const response = NextResponse.next();

    // ログ処理
    contextManager.runWithContext(context, () => {
      console.log('Request processed:', context.requestId);
    });

    return response;
  });
}
```

### API Route実装

```typescript
import { NextRequest } from 'next/server';
import { withEdgeContext } from '@/lib/logger/edge-runtime-helpers';

export async function GET(request: NextRequest) {
  const context = createRequestContext(request);

  return await withEdgeContext(context, async () => {
    // 非同期処理でもコンテキストが保持される
    const data = await fetchExternalData();
    const processedData = await processData(data);

    return Response.json(processedData);
  });
}
```

### 複雑な非同期フロー

```typescript
import { promiseAllWithContext, wrapWithContext } from '@/lib/logger/edge-runtime-helpers';

async function complexDataProcessing(context: LoggerContext) {
  // 複数の並行処理
  const [userData, settingsData, preferencesData] = await promiseAllWithContext(context, [
    () => fetchUserData(),
    () => fetchUserSettings(),
    () => fetchUserPreferences(),
  ]);

  // 関数のラッピング
  const wrappedProcessor = wrapWithContext(processUserData, context);
  return await wrappedProcessor(userData, settingsData, preferencesData);
}
```

## ⚠️ 注意事項

### 1. パフォーマンスへの影響

- EdgeContextStorageはWeakMapベースの実装のため、AsyncLocalStorageと比較してわずかなオーバーヘッドがあります
- 明示的なバインディングは関数呼び出しのオーバーヘッドを増加させます
- 大量の並行処理では、バインディングコストを考慮してください

### 2. メモリ使用量

- WeakMapベースの実装は適切なガベージコレクションに依存します
- 長時間実行されるプロセスでは、コンテキストの適切なクリーンアップが重要です

### 3. デバッグの複雑性

- Edge Runtime環境では、通常のNode.jsデバッグツールが使用できない場合があります
- ログベースのデバッグに依存する必要があります

## 🧪 テスト戦略

### 統合テスト

```typescript
import { describe, it, expect } from 'vitest';
import { withEdgeContext } from '@/lib/logger/edge-runtime-helpers';

describe('Edge Runtime Integration', () => {
  it('should maintain context in async operations', async () => {
    const context = { requestId: 'test-123', timestamp: new Date().toISOString() };

    const result = await withEdgeContext(context, async () => {
      await Promise.resolve();
      return contextManager.getContext();
    });

    expect(result).toEqual(context);
  });
});
```

### ユニットテスト

```typescript
describe('Edge Runtime Helpers', () => {
  it('should detect runtime environment correctly', () => {
    // Edge Runtime環境のシミュレーション
    (globalThis as any).EdgeRuntime = 'edge-runtime';

    const diagnostics = getEdgeRuntimeDiagnostics();
    expect(diagnostics.runtime).toBe('edge');
    expect(diagnostics.contextStorageType).toBe('EdgeContextStorage');
  });
});
```

## 📖 関連リソース

- [Edge Runtime実装ファイル](../src/lib/logger/edge-runtime-helpers.ts)
- [統合テスト](../tests/integration/logger/edge-runtime-context.integration.test.ts)
- [コンテキスト管理](../src/lib/logger/context.ts)
- [ユーティリティ関数](../src/lib/logger/utils.ts)

## 🔄 更新履歴

- **2024-08-15**: Edge Runtime制限対応の実装とドキュメント作成
- **統合テスト**: 制限事項の包括的なテストスイート追加
- **ヘルパー関数**: 実用的な回避策とベストプラクティスの実装
