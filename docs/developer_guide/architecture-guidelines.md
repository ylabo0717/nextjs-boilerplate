# アーキテクチャ設計ガイドライン

このドキュメントは、Next.js 15.x + React 19 + TypeScript プロジェクトにおけるアーキテクチャ設計のベストプラクティスを定義します。

## 目次

1. [基本理念：純粋関数ファースト](#基本理念純粋関数ファースト)
2. [なぜ純粋関数型を強く推奨するのか](#なぜ純粋関数型を強く推奨するのか)
3. [アーキテクチャ層別の設計方針](#アーキテクチャ層別の設計方針)
4. [ドメイン層の設計戦略](#ドメイン層の設計戦略)
5. [サービス・ユースケース層](#サービスユースケース層)
6. [APIクライアント設計](#apiクライアント設計)
7. [シリアライゼーション境界の対応](#シリアライゼーション境界の対応)

---

## 基本理念：純粋関数ファースト

**このプロジェクトの中核となる設計思想**

このプロジェクトでは、**純粋関数を中心とした関数型プログラミング**を基本的な設計パラダイムとして採用します。オブジェクト指向的なクラス設計は、極めて限定的な場面でのみ検討する例外的な選択肢として位置付けます。

### 基本原則

**目的**: ステートレスで純粋関数を**最優先**とした実装を基本とし、**極めて特殊な場合にのみ**オブジェクト指向の利点を慎重に活用する。

**効果**:

- テスタビリティの向上
- 保守性とスケーラビリティの確保
- Next.jsのシリアライゼーション境界との適合性

---

## なぜ純粋関数型を強く推奨するのか

### 1. テスタビリティの圧倒的な向上

- 同じ入力に対して常に同じ出力を返す
- 副作用がないため、単体テストが簡潔で信頼性が高い
- モック不要でテストが高速に実行される

### 2. 予測可能性とデバッグの容易さ

- 関数の振る舞いが入力のみに依存し、予期しない動作が発生しない
- スタックトレースが理解しやすく、問題の特定が迅速

### 3. 並行処理の安全性

- 不変性により、競合状態やデッドロックが発生しない
- Next.jsのReact Server Componentsとの親和性が高い

### 4. メンテナンス性の向上

- 関数間の依存関係が明確で、変更の影響範囲が限定的
- リファクタリングが安全で、機能追加が容易

### 5. TypeScriptとの高い親和性

- 型推論が効果的に働き、コンパイル時エラー検出が充実
- 純粋関数は型安全性を最大限に活用できる

---

## アーキテクチャ層別の設計方針

**🚨 重要**: すべての層において純粋関数型アプローチを最優先とし、クラス使用は最後の手段として検討する。

### プレゼンテーション層（絶対原則）

React関数コンポーネント + Hooks のみ使用し、ステートレス実装を強制します。

```typescript
// ✅ Good - 関数コンポーネントによるプレゼンテーション層
interface UserProfileProps {
  user: User;
  onEdit: (user: User) => void;
}

export const UserProfile = ({ user, onEdit }: UserProfileProps) => {
  return (
    <div className="user-profile">
      <img src={user.avatar} alt={`${user.name}のプロフィール画像`} />
      <h2>{user.name}</h2>
      <p>{user.email}</p>
      <button onClick={() => onEdit(user)} type="button">
        編集
      </button>
    </div>
  );
};

// ❌ Bad - UIコンポーネントでのクラス使用（完全禁止）
class UserProfile extends Component<UserProfileProps> {
  render() {
    // React Hooksの恩恵を受けられない
  }
}
```

---

## ドメイン層の設計戦略

**🎯 原則**: **純粋関数型を最優先**とし、99%のケースで型定義 + 純粋関数による実装を選択する。

### 基本アプローチ（99%のケースで適用）

```typescript
// ✅ Good - 型定義 + 純粋関数アプローチ
interface User {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly createdAt: Date;
}

// Result型を使用したエラーハンドリング
type Result<T, E> = { success: true; data: T } | { success: false; error: E };

// 純粋関数によるビジネスロジック
export const createUser = (name: string, email: string): Result<User, ValidationError> => {
  if (!isValidEmail(email)) {
    return { success: false, error: new ValidationError('無効なメールアドレスです') };
  }

  if (name.trim().length === 0) {
    return { success: false, error: new ValidationError('名前は必須です') };
  }

  return {
    success: true,
    data: {
      id: generateId(),
      name: name.trim(),
      email: email.toLowerCase(),
      createdAt: new Date(),
    },
  };
};

export const updateUserEmail = (user: User, newEmail: string): Result<User, ValidationError> => {
  if (!isValidEmail(newEmail)) {
    return { success: false, error: new ValidationError('無効なメールアドレスです') };
  }

  return {
    success: true,
    data: {
      ...user,
      email: newEmail.toLowerCase(),
    },
  };
};

// 純粋関数によるユーティリティ
export const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const generateId = (): string => {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};
```

### ビジネスルールの組み合わせ

```typescript
// ✅ Good - 純粋関数の組み合わせによる複雑なビジネスロジック
interface Order {
  readonly id: string;
  readonly customerId: string;
  readonly items: OrderItem[];
  readonly status: OrderStatus;
  readonly createdAt: Date;
}

interface OrderItem {
  readonly productId: string;
  readonly quantity: number;
  readonly price: number;
}

type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

// 純粋関数による注文処理
export const calculateOrderTotal = (items: OrderItem[]): number => {
  return items.reduce((total, item) => total + item.price * item.quantity, 0);
};

export const validateOrderItems = (items: OrderItem[]): Result<void, ValidationError> => {
  if (items.length === 0) {
    return { success: false, error: new ValidationError('注文には最低1つの商品が必要です') };
  }

  for (const item of items) {
    if (item.quantity <= 0) {
      return {
        success: false,
        error: new ValidationError('商品の数量は1以上である必要があります'),
      };
    }
    if (item.price <= 0) {
      return {
        success: false,
        error: new ValidationError('商品の価格は0より大きい必要があります'),
      };
    }
  }

  return { success: true, data: undefined };
};

export const createOrder = (
  customerId: string,
  items: OrderItem[]
): Result<Order, ValidationError> => {
  // バリデーション
  const itemsValidation = validateOrderItems(items);
  if (!itemsValidation.success) {
    return itemsValidation;
  }

  // 合計金額チェック
  const total = calculateOrderTotal(items);
  if (total > 1000000) {
    // 100万円上限
    return { success: false, error: new ValidationError('注文金額が上限を超えています') };
  }

  // 注文作成
  return {
    success: true,
    data: {
      id: generateOrderId(),
      customerId,
      items: [...items], // 不変性を保証
      status: 'pending',
      createdAt: new Date(),
    },
  };
};

export const confirmOrder = (order: Order): Result<Order, ValidationError> => {
  if (order.status !== 'pending') {
    return { success: false, error: new ValidationError('確定済みの注文は変更できません') };
  }

  return {
    success: true,
    data: {
      ...order,
      status: 'confirmed',
    },
  };
};
```

---

## サービス・ユースケース層

**🎯 原則**: **まず純粋関数による実装を検討**し、状態管理や依存性注入が真に必要な場合のみクラスを使用する。

```typescript
// ✅ Good - 純粋関数 + 依存性注入でのサービス実装
interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<User>;
}

interface EmailService {
  sendWelcomeEmail(user: User): Promise<void>;
}

interface Logger {
  info(message: string, context?: any): void;
  error(message: string, error?: any): void;
}

// 依存関係を注入する関数ファクトリー
export const createUserService = (
  userRepository: UserRepository,
  emailService: EmailService,
  logger: Logger
) => {
  const registerUser = async (
    userData: CreateUserRequest
  ): Promise<Result<User, RegistrationError>> => {
    try {
      // バリデーション（純粋関数に委譲）
      const validationResult = validateCreateUserRequest(userData);
      if (!validationResult.success) {
        return { success: false, error: new RegistrationError(validationResult.error.message) };
      }

      // 重複チェック
      const existingUser = await userRepository.findByEmail(userData.email);
      if (existingUser) {
        return {
          success: false,
          error: new RegistrationError('メールアドレスは既に使用されています'),
        };
      }

      // ユーザー作成（純粋関数）
      const userResult = createUser(userData.name, userData.email);
      if (!userResult.success) {
        return { success: false, error: new RegistrationError(userResult.error.message) };
      }

      // 永続化
      const savedUser = await userRepository.save(userResult.data);

      // ウェルカムメール送信（副作用）
      await emailService.sendWelcomeEmail(savedUser);

      logger.info('新規ユーザー登録完了', { userId: savedUser.id });

      return { success: true, data: savedUser };
    } catch (error) {
      logger.error('ユーザー登録エラー', error);
      return { success: false, error: new RegistrationError('ユーザー登録に失敗しました') };
    }
  };

  return {
    registerUser,
  };
};

// 使用例
const userService = createUserService(userRepository, emailService, logger);
const result = await userService.registerUser(userData);
```

---

## APIクライアント設計

**🎯 原則**: APIクライアントも**純粋関数で実装**し、Next.js 15の最新パターンを活用する。

```typescript
// ✅ Good - 純粋関数によるAPIクライアント
import { API_CONFIG } from '@/constants';

interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
}

// 基本的なfetch関数
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<Result<T, ApiError>> {
  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      return {
        success: false,
        error: new ApiError(`API Error: ${response.status}`, response.status),
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: new ApiError('ネットワークエラーが発生しました'),
    };
  }
}

// ユーザー関連のAPI関数群
export const getUserById = async (id: string): Promise<Result<User, ApiError>> => {
  const result = await apiRequest<UserResponse>(`/users/${id}`);

  if (!result.success) {
    return result;
  }

  return { success: true, data: mapResponseToUser(result.data) };
};

export const createUser = async (
  userData: CreateUserRequest
): Promise<Result<User, ApiError>> => {
  const result = await apiRequest<UserResponse>('/users', {
    method: 'POST',
    body: JSON.stringify(userData),
  });

  if (!result.success) {
    return result;
  }

  return { success: true, data: mapResponseToUser(result.data) };
};

// 純粋関数によるデータマッピング
const mapResponseToUser = (response: UserResponse): User => ({
  id: response.id,
  name: response.name,
  email: response.email,
  createdAt: new Date(response.created_at),
});

// Server Component での使用例（Next.js 15 推奨パターン）
export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userResult = await getUserById(id);

  if (!userResult.success) {
    return <div>Error: {userResult.error.message}</div>;
  }

  return <UserProfile user={userResult.data} />;
}
```

---

## シリアライゼーション境界の対応

**原則**: Next.js App Routerのシリアライゼーション制約に対応した設計を行う。

```typescript
// ✅ Good - シリアライゼーション境界を意識した設計

// プレーンオブジェクト型定義
interface PlainOrder {
  id: string;
  customerId: string;
  items: PlainOrderItem[];
  status: string;
  createdAt: string; // Date は文字列でシリアライズ
  total: number;
}

interface PlainOrderItem {
  productId: string;
  quantity: number;
  price: number;
}

// サーバーサイド（API Route / Server Action）
export async function createOrderAction(formData: FormData): Promise<ActionResult> {
  try {
    // 1. フォームデータの解析
    const orderRequest = {
      customerId: formData.get('customerId') as string,
      items: JSON.parse(formData.get('items') as string),
    };

    // 2. サーバーサイドでビジネスロジックを実行（純粋関数）
    const orderResult = createOrder(orderRequest.customerId, orderRequest.items);

    if (!orderResult.success) {
      return { success: false, error: orderResult.error.message };
    }

    // 3. 永続化
    const savedOrder = await saveOrder(orderResult.data);

    // 4. プレーンオブジェクトとしてクライアントに送信
    const plainOrder: PlainOrder = {
      id: savedOrder.id,
      customerId: savedOrder.customerId,
      items: savedOrder.items,
      status: savedOrder.status,
      createdAt: savedOrder.createdAt.toISOString(),
      total: calculateOrderTotal(savedOrder.items),
    };

    return {
      success: true,
      data: plainOrder, // シリアライズ可能
    };
  } catch (error) {
    return { success: false, error: 'システムエラーが発生しました' };
  }
}

// クライアントサイド（Client Component）
'use client';

export const OrderForm = () => {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      // サーバーアクションを呼び出し（シリアライゼーション境界を越える）
      const result = await createOrderAction(formData);

      if (result.success) {
        // プレーンオブジェクトを受け取り
        console.log('注文作成成功:', result.data);

        // 必要に応じてDateオブジェクトに復元
        const order = {
          ...result.data,
          createdAt: new Date(result.data.createdAt),
        };
      } else {
        console.error('注文作成失敗:', result.error);
      }
    });
  };

  return (
    <form action={handleSubmit}>
      {/* フォーム要素 */}
    </form>
  );
};
```

---

## 構造化ロギング設計パターン

**🎯 原則**: ロギングシステムも**純粋関数ベース**で実装し、サイドエフェクトを制御された範囲に限定する。

### 基本アーキテクチャ

```typescript
// ✅ Good - 純粋関数ベースのロガー設計
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface Logger {
  trace(message: string, ...args: LogArgument[]): void;
  debug(message: string, ...args: LogArgument[]): void;
  info(message: string, ...args: LogArgument[]): void;
  warn(message: string, ...args: LogArgument[]): void;
  error(message: string, ...args: LogArgument[]): void;
  fatal(message: string, ...args: LogArgument[]): void;
  isLevelEnabled(level: LogLevel): boolean;
}

// 設定オブジェクト（不変）
export interface ClientLoggerConfig {
  readonly level: LogLevel;
  readonly baseProperties: Readonly<Record<string, unknown>>;
}

// ✅ 純粋関数による設定作成
export function createClientLoggerConfig(): ClientLoggerConfig {
  const level = process.env.NEXT_PUBLIC_LOG_LEVEL || 'info';
  const baseProperties = {
    app: 'nextjs-boilerplate',
    env: process.env.NODE_ENV || 'development',
    version: '1.0.0',
  };

  return Object.freeze({
    level: level as LogLevel,
    baseProperties: Object.freeze(baseProperties),
  });
}

// ✅ 純粋関数による前処理 + 制御されたサイドエフェクト
export function log(
  config: ClientLoggerConfig,
  level: LogLevel,
  message: string,
  ...args: LogArgument[]
): void {
  // 純粋関数による事前処理
  const isEnabled = isLevelEnabled(config, level);
  if (!isEnabled) return;

  const processedArgs = processLogArguments(args);
  const sanitizedMessage = sanitizeControlCharacters(message);

  // 制御されたサイドエフェクト（最小限に限定）
  outputToConsole(level, sanitizedMessage, processedArgs);
}
```

### セキュリティ機能の実装

```typescript
// ✅ GDPR準拠IPハッシュ化（純粋関数）
export function createIPHashConfig(): IPHashConfig {
  const secret = process.env.LOG_IP_HASH_SECRET || generateSecret();
  return Object.freeze({ secret });
}

export function hashIP(config: IPHashConfig, ipAddress: string): string {
  if (!ipAddress || typeof ipAddress !== 'string') {
    return 'ip_invalid';
  }

  try {
    const normalizedIP = normalizeIPv6(ipAddress);
    const hmac = createHmac('sha256', config.secret);
    hmac.update(normalizedIP);
    const hash = hmac.digest('hex');
    return `ip_${hash.substring(0, 8)}`;
  } catch (error) {
    return 'ip_hash_error';
  }
}

// ✅ ログインジェクション攻撃防止（純粋関数）
export function sanitizeControlCharacters(input: unknown): unknown {
  if (typeof input === 'string') {
    return input.replace(/[\x00-\x1F\x7F-\x9F]/g, (char) => {
      return `\\u${char.charCodeAt(0).toString(16).padStart(4, '0').toUpperCase()}`;
    });
  }

  if (Array.isArray(input)) {
    return input.map((item) => sanitizeControlCharacters(item));
  }

  if (input && typeof input === 'object') {
    const seen = new Set<object>();
    return sanitizeObjectWithCircularCheck(input, seen);
  }

  return input;
}
```

### エラーハンドリング統合

```typescript
// ✅ エラーハンドラーとの統合（純粋関数＋制御された副作用）
export interface ErrorHandlerConfig {
  readonly logger: Logger;
}

export function createErrorHandlerConfig(logger: Logger): ErrorHandlerConfig {
  return { logger } as const;
}

export function handleError(
  config: ErrorHandlerConfig,
  error: Error | unknown,
  context: ErrorContext = {}
): StructuredError {
  // 純粋関数による分類
  const classifierConfig = {};
  const structuredError = classifyError(classifierConfig, error, context);

  // 純粋関数による前処理
  const logLevel = getLogLevel(structuredError.severity);
  const logEntry = createLogEntry(structuredError);

  // 制御されたサイドエフェクト（ログ出力のみ）
  logWithLevel(config.logger, logLevel, logEntry.message, logEntry.data);

  return structuredError;
}

// ✅ フォールバック機能（純粋関数パターン）
export const defaultErrorHandlerConfig = (() => {
  let _config: ErrorHandlerConfig | null = null;

  return () => {
    if (!_config) {
      try {
        const { serverLoggerWrapper } = require('./server');
        _config = createErrorHandlerConfig(serverLoggerWrapper);
      } catch {
        // フォールバック: クライアントロガーを使用
        const { clientLoggerWrapper } = require('./client');
        _config = createErrorHandlerConfig(clientLoggerWrapper);
      }
    }
    return _config;
  };
})();
```

### Next.js統合パターン

```typescript
// ✅ ミドルウェア統合（Edge Runtime対応）
export function logForEdgeRuntime(
  level: 'info' | 'warn' | 'error',
  entry: MiddlewareLogEntry
): void {
  // 純粋関数による前処理
  const sanitized = sanitizeLogEntry(
    `${entry.event_name}: ${entry.method} ${entry.url}`,
    limitObjectSize(entry, 5, 30)
  );

  // 制御されたサイドエフェクト（Edge Runtime制約対応）
  const logData = {
    level,
    timestamp: entry.timestamp,
    message: sanitized.message,
    data: sanitized.data,
  };

  switch (level) {
    case 'error':
      console.error(JSON.stringify(logData));
      break;
    case 'warn':
      console.warn(JSON.stringify(logData));
      break;
    case 'info':
    default:
      console.log(JSON.stringify(logData));
      break;
  }
}

// ✅ リクエストコンテキスト生成
export function createRequestContext(request: NextRequest): LoggerContext {
  const requestId = generateRequestId();
  const ip = 'ip' in request ? (request as { ip?: string }).ip || 'unknown' : 'unknown';

  // 純粋関数でIPハッシュ化
  const { hashIPWithDefault } = require('./crypto') as typeof import('./crypto');
  const hashedIP = hashIPWithDefault(ip);

  return {
    requestId,
    hashedIP,
    method: request.method,
    url: request.url,
    userAgent: request.headers.get('user-agent') || undefined,
    timestamp: new Date().toISOString(),
  } as LoggerContext;
}
```

### テスト戦略

```typescript
// ✅ 純粋関数テスト（モック不要）
describe('Logger Pure Functions', () => {
  it('should sanitize control characters', () => {
    const input = 'Hello\x00\x1FWorld';
    const result = sanitizeControlCharacters(input);
    expect(result).toBe('Hello\\u0000\\u001FWorld');
  });

  it('should hash IP addresses consistently', () => {
    const config = createTestIPHashConfig('test-secret-32-chars');
    const result1 = hashIP(config, '192.168.1.1');
    const result2 = hashIP(config, '192.168.1.1');

    expect(result1).toBe(result2);
    expect(result1).toMatch(/^ip_[a-f0-9]{8}$/);
  });

  it('should create immutable configurations', () => {
    const config = createClientLoggerConfig();

    expect(() => {
      (config as any).level = 'debug';
    }).toThrow();

    expect(() => {
      (config.baseProperties as any).newProp = 'value';
    }).toThrow();
  });
});

// ✅ 統合テスト（エフェクト分離）
describe('Logger Integration', () => {
  it('should handle server logger fallback', () => {
    // サーバーモジュール不可用時のフォールバック
    const config = defaultErrorHandlerConfig();
    expect(config).toBeDefined();
    expect(config.logger).toBeDefined();
  });
});
```

この構造化ロギング設計により以下が実現されます：

- **🔒 セキュリティ**: GDPR準拠とログインジェクション攻撃防止
- **⚡ パフォーマンス**: 純粋関数による最適化とEdge Runtime対応
- **🧪 テスタビリティ**: モック不要の包括的テストスイート
- **🔄 保守性**: 不変性とフォールバック機能による堅牢性

## まとめ

この**純粋関数型優先アーキテクチャ**により、以下の利点を実現します：

### 実現される利点

1. **🎯 純粋関数型の最優先**: テスタビリティと予測可能性の圧倒的な向上
2. **🔒 明確な設計原則**: 一貫したアーキテクチャによる開発効率の向上
3. **⚡ Next.js最適化**: シリアライゼーション境界との完全な整合性
4. **🚀 チーム開発の効率化**: 明確で一貫した設計原則による生産性向上

### 重要な心構え

新しい機能を実装する際は、常に「これを純粋関数で実装できないか？」を最初に自問し、関数型アプローチを徹底する文化を確立します。

### クラス化の検討基準

- **99%のケース**: 純粋関数 + 型定義で実装
- **<1%のケース**: 極めて複雑な内部状態 / パフォーマンスチューニングが純粋関数合成で過度に複雑化する場合のみ（根拠コメント必須）

---

## エラーハンドリング指針（Result型 & 例外）

**目的**: 失敗制御フローの一貫性を高め再現性と観測性を向上させる。

### 分類

| 種別            | 例                              | 表現                      | ログ             | リトライ       |
| --------------- | ------------------------------- | ------------------------- | ---------------- | -------------- |
| ValidationError | 入力不備 / スキーマ違反         | Result 失敗               | WARN (構造化)    | 不要           |
| DomainError     | ビジネス制約違反 (上限超過等)   | Result 失敗               | INFO/WARN        | 条件付き       |
| InfraError      | DB / 外部API失敗 / ネットワーク | Result 失敗 or 例外ラップ | ERROR            | 冪等なら再試行 |
| UnexpectedError | バグ / 想定外状態               | 例外送出                  | ERROR + アラート | 原則不可       |

### ポリシー

1. ドメイン/ユースケース境界: `Result<T, E>` を戻り値で返し早期 return
2. 外部 I/O ラッパー: 低レベル例外を `InfraError` に変換（メッセージ + 原因保持）
3. UI 層: Result を解釈しユーザー向けメッセージと技術ログを分離
4. 予期せぬ例外は最上位 Error Boundary / 監視基盤に送出
5. ログは (timestamp, category, correlationId, errorType, message, metadata) を JSON 形式で構造化

### Result ヘルパー例

```ts
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });
```

### サンプル利用

```ts
const r = createOrder(customerId, items);
if (!r.ok) {
  logger.warn({ errorType: r.error.name, message: r.error.message }, 'order.create.validation');
  return r;
}
```

この方針により、TypeScriptとNext.jsの恩恵を最大限に活用し、長期的に保守可能なアーキテクチャを実現します。

---

**関連ガイドライン:**

- [概要](./coding-guidelines-overview.md) - 基本方針とSSOT原則
- [TypeScript](./typescript-guidelines.md) - 型安全なアーキテクチャ実装
- [Next.js パターン](./nextjs-patterns.md) - Server/Client Components設計
- [セキュリティ](./security-guidelines.md) - セキュアなアーキテクチャパターン
