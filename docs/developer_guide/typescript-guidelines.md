# TypeScript ガイドライン

このドキュメントは、Next.js + React + TypeScript プロジェクトにおけるTypeScript関連のベストプラクティスを定義します。

## 目次

1. [型定義の原則](#型定義の原則)
2. [命名規則](#命名規則)
3. [エクスポート規約](#エクスポート規約)
4. [型ガード](#型ガード)
5. [Zodによるスキーマ検証](#zodによるスキーマ検証)
6. [インポート・エクスポート規約](#インポートエクスポート規約)

---

## 型定義の原則

**目的**: 実行時エラーを防ぎ、開発者体験を向上させる。

**効果**:

- コンパイル時でのバグ検出
- IDEによる自動補完とリファクタリング支援
- 仕様の明文化

```typescript
// ✅ Good - 明示的で具体的な型定義
interface User {
  readonly id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'viewer';
  createdAt: Date;
  settings?: UserSettings;
}

interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  language: 'ja' | 'en';
  notifications: {
    email: boolean;
    push: boolean;
  };
}

// ❌ Bad - any の使用
interface User {
  id: any;
  data: any;
  metadata: any;
}
```

---

## 命名規則

**目的**: コードの可読性と一貫性を確保する。

```typescript
// ✅ Good - 一貫した命名規則
// 型名: PascalCase
interface UserProfile {}
type ApiResponse<T> = {};

// 変数・関数: camelCase
const userName = 'john';
const getUserProfile = () => {};

// 定数: UPPER_SNAKE_CASE
const MAX_UPLOAD_SIZE = 1024;
const API_ENDPOINTS = {};

// コンポーネント: PascalCase
const UserProfileCard = () => {};

// ファイル名: kebab-case または camelCase
// user-profile.tsx または userProfile.tsx
```

---

## エクスポート規約

**目的**: モジュール境界を明確にし、リファクタリングを安全にする。

```typescript
// ✅ Good - named exports を優先
// utils/format.ts
export const formatCurrency = (amount: number) => {};
export const formatDate = (date: Date) => {};

// コンポーネントも named export を推奨
// components/Button.tsx
export const Button = ({ children }: ButtonProps) => {};

// ❌ Bad - default export (リファクタリング時に名前が不安定)
export default function Button() {}
```

---

## 型ガード

**目的**: 型安全性を実行時まで保証する。

### 基本的な型ガード

```typescript
// ✅ Good - 厳密な型ガードの実装
function isUser(obj: unknown): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'name' in obj &&
    'email' in obj &&
    typeof (obj as any).id === 'string' &&
    typeof (obj as any).name === 'string' &&
    typeof (obj as any).email === 'string' &&
    (obj as any).id.length > 0 &&
    (obj as any).name.length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((obj as any).email)
  );
}

// 使用例
const data: unknown = await fetchUser();
if (isUser(data)) {
  // dataは確実にUser型
  console.log(data.name); // 型安全
}

// ❌ Bad - 型アサーション
const data = (await fetchUser()) as User; // 危険！
```

---

## Zodによるスキーマ検証

**目的**: より複雑な型の場合は、Zodを使用して型安全性とバリデーションを同時に実現する。

```typescript
// ✅ Good - Zodによるスキーマ定義
import { z } from 'zod';

const UserSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['admin', 'user', 'viewer']),
  createdAt: z.date(),
  settings: z
    .object({
      theme: z.enum(['light', 'dark', 'system']),
      language: z.enum(['ja', 'en']),
      notifications: z.object({
        email: z.boolean(),
        push: z.boolean(),
      }),
    })
    .optional(),
});

// 型の生成
type User = z.infer<typeof UserSchema>;

// 型ガード関数
function isValidUser(obj: unknown): obj is User {
  try {
    UserSchema.parse(obj);
    return true;
  } catch {
    return false;
  }
}

// API routeでの使用例
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userData = UserSchema.parse(body); // 検証とサニタイゼーション

    // 検証済みデータのみ処理
    const user = await createUser(userData);
    return NextResponse.json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### Zodスキーマのベストプラクティス

```typescript
// ✅ Good - 段階的なスキーマ構築
const BaseUserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  email: z.string().email(),
});

const CreateUserSchema = BaseUserSchema.omit({ id: true });
const UpdateUserSchema = BaseUserSchema.partial().required({ id: true });

// Enum値の管理
const USER_ROLES = ['admin', 'user', 'viewer'] as const;
const UserRoleSchema = z.enum(USER_ROLES);

// 配列とオブジェクトの検証
const UsersListSchema = z.array(UserSchema);
const UserResponseSchema = z.object({
  data: UserSchema,
  meta: z.object({
    total: z.number(),
    page: z.number(),
  }),
});
```

---

## インポート・エクスポート規約

### インポート順序

**目的**: 依存関係を明確にし、コードの可読性を向上させる。

```tsx
// ✅ Good - 推奨インポート順序
// 1. React関連
import React, { useState, useEffect } from 'react';

// 2. Next.js関連
import Link from 'next/link';
import Image from 'next/image';

// 3. 外部ライブラリ
import { z } from 'zod';
import { clsx } from 'clsx';

// 4. 内部モジュール（@/から始まる）
import { Button } from '@/components/ui/button';
import { useUser } from '@/hooks/useUser';
import { formatDate } from '@/utils/format';

// 5. 相対インポート
import './component.css';

// 6. 型インポート（最後）
import type { User } from '@/types/user';
import type { ComponentProps } from 'react';
```

### エクスポート規約

```typescript
// ✅ Good - Named Exports（推奨）
// utils/validation.ts
export const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const validatePassword = (password: string): boolean => {
  return password.length >= 8;
};

// コンポーネントもnamed exportを推奨
// components/UserCard.tsx
interface UserCardProps {
  user: User;
  onClick?: (user: User) => void;
}

export const UserCard = ({ user, onClick }: UserCardProps) => {
  return (
    <div onClick={() => onClick?.(user)}>
      <h3>{user.name}</h3>
      <p>{user.email}</p>
    </div>
  );
};

// 型も一緒にエクスポート
export type { UserCardProps };

// ❌ Avoid - Default Exports
export default function UserCard() {} // リファクタリング時に名前が不安定
```

### 再エクスポート

```typescript
// ✅ Good - インデックスファイルでの再エクスポート
// components/ui/index.ts
export { Button } from './button';
export { Input } from './input';
export { Card } from './card';
export { Dialog } from './dialog';

export type { ButtonProps } from './button';
export type { InputProps } from './input';
export type { CardProps } from './card';
export type { DialogProps } from './dialog';

// 使用側
import { Button, Input, Card } from '@/components/ui';
```

---

## まとめ

このTypeScriptガイドラインに従うことで：

1. **型安全性の向上** - 実行時エラーの削減
2. **開発効率の向上** - IDEサポートとリファクタリングの安全性
3. **コード品質の向上** - 一貫した命名規則とモジュール構造
4. **保守性の向上** - 明確な型定義による仕様の文書化

特にZodを活用することで、型安全性とランタイムバリデーションを同時に実現し、より堅牢なアプリケーションを構築できます。

---

**関連ガイドライン:**

- [概要](./coding-guidelines-overview.md) - 基本方針とSSOT原則
- [Next.js パターン](./nextjs-patterns.md) - TypeScriptを活用したNext.js開発
- [セキュリティ](./security-guidelines.md) - 型安全なセキュリティ実装
