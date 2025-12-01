import { sanitizeForLog } from '../src/log-utils';

describe('sanitizeForLog', () => {
  test('redacts password fields and token/jwt', () => {
    const input = {
      username: 'testuser',
      password: 'super-secret',
      nested: {
        Authorization: 'Bearer abcdefg',
        jwtToken: 'shouldnotseethis',
        userToken: 'alsoshouldberedacted',
        random: 'value'
      },
      token: 'mytoken'
    };
    const out = sanitizeForLog(input as any);
    expect(out.password).toBe('[REDACTED]');
    expect(out.token).toBe('[REDACTED]');
    expect(out.nested.Authorization).toBe('[REDACTED]');
    expect(out.nested.jwtToken).toBe('[REDACTED]');
    expect(out.nested.userToken).toBe('[REDACTED]');
    // The random field should be preserved
    expect(out.nested.random).toBe('value');
  });

  test('does not alter non-sensitive fields', () => {
    const input = { foo: 'bar', baz: 2 };
    const out = sanitizeForLog(input as any);
    expect(out.foo).toBe('bar');
    expect(out.baz).toBe(2);
  });
});
