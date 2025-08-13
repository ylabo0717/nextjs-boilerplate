# アーキテクチャ設計ガイドライン

このドキュメントは、Next.js + React + TypeScript プロジェクトにおけるアーキテクチャ設計のベストプラクティスを定義します。

## 目次

1. [基本理念：純粋関数優先アプローチ](#基本理念純粋関数優先アプローチ)
2. [なぜ純粋関数型を強く推奨するのか](#なぜ純粋関数型を強く推奨するのか)
3. [アーキテクチャ層別の設計方針](#アーキテクチャ層別の設計方針)
4. [ドメイン層の設計戦略](#ドメイン層の設計戦略)
5. [サービス・ユースケース層](#サービスユースケース層)
6. [APIクライアント設計](#apiクライアント設計)
7. [シリアライゼーション境界の対応](#シリアライゼーション境界の対応)

---

## 基本理念：純粋関数優先アプローチ

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

### 基本アプローチ（95%以上のケースで適用）

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
- **<1%のケース**: 極めて複雑な状態管理が必要で、純粋関数では実装困難な場合のみ

この方針により、TypeScriptとNext.jsの恩恵を最大限に活用し、長期的に保守可能なアーキテクチャを実現します。

---

**関連ガイドライン:**

- [概要](./coding-guidelines-overview.md) - 基本方針とSSOT原則
- [TypeScript](./typescript-guidelines.md) - 型安全なアーキテクチャ実装
- [Next.js パターン](./nextjs-patterns.md) - Server/Client Components設計
- [セキュリティ](./security-guidelines.md) - セキュアなアーキテクチャパターン
