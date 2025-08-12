/// <reference types="vitest/globals" />
import { assert } from 'vitest';

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

    // TypeScriptの型ガードとして assert を使用
    // これにより parseResult.data が安全に使用可能になる
    assert(parseResult.success, 'Schema validation should succeed');

    // 検証済みの型安全なデータを使用
    const users = parseResult.data;
    expect(users).toHaveLength(1);
    expect(users[0]).toMatchObject({ name: 'Alice' });
  });
});
