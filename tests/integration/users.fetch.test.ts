/// <reference types="vitest/globals" />
import { UsersSchema } from '@/types/user';

describe('GET /api/users (mocked)', () => {
  it('returns users from MSW', async () => {
    const res = await fetch('/api/users');
    expect(res.ok).toBe(true);

    // 実行時の型検証を行う
    const data = await res.json();
    const parseResult = UsersSchema.safeParse(data);

    // 型検証が成功したことを確認
    expect(parseResult.success).toBe(true);

    if (!parseResult.success) {
      // 型検証に失敗した場合、エラー詳細を出力
      throw new Error(`Invalid response format: ${parseResult.error.message}`);
    }

    // 検証済みの型安全なデータを使用
    const users = parseResult.data;
    expect(users).toHaveLength(1);
    expect(users[0]).toMatchObject({ name: 'Alice' });
  });
});
