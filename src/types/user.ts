import { z } from 'zod';

// ユーザーのスキーマ定義
export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

// 複数ユーザーのスキーマ
export const UsersSchema = z.array(UserSchema);

// 型のエクスポート
export type User = z.infer<typeof UserSchema>;
export type Users = z.infer<typeof UsersSchema>;
