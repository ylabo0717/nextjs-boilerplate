/// <reference types="vitest/globals" />
import { UsersSchema } from '@/types/user';

describe('GET /api/users (mocked)', () => {
  it('returns users from MSW', async () => {
    const res = await fetch('/api/users');
    expect(res.ok).toBeTruthy();

    // 実行時の型検証を行う
    const data = await res.json();
    const parseResult = UsersSchema.safeParse(data);

    // 型検証が成功したことを確認
    expect(parseResult.success).toBeTruthy();

    // 検証済みの型安全なデータを使用
    // Type guard を assert で置き換え
    // eslint-disable-next-line vitest/no-conditional-in-test -- Type guard is necessary for TypeScript
    if (parseResult.success) {
      const users = parseResult.data;
      expect(users).toHaveLength(1);
      expect(users[0]).toMatchObject({ name: 'Alice' });
    }
  });
});
