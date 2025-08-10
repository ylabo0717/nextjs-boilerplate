/// <reference types="vitest/globals" />

describe('GET /api/users (mocked)', () => {
  it('returns users from MSW', async () => {
    const res = await fetch('/api/users');
    expect(res.ok).toBe(true);
    const users = (await res.json()) as Array<{ id: string; name: string; email: string }>;
    expect(users).toHaveLength(1);
    expect(users[0]).toMatchObject({ name: 'Alice' });
  });
});
