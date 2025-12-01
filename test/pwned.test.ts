import { checkPwnedPasswordCount } from '../src/pwned';

describe('checkPwnedPasswordCount', () => {
  test('makes a request with only the SHA1 prefix and does not send the password', async () => {
    // Mock fetch
    const fetchSpy = jest.spyOn(global as any, 'fetch').mockImplementation(async (...args: any[]) => {
      const url = args[0] as string;
      const opts = args[1];
      // verify url contains prefix only (5 hex chars)
      expect(url.startsWith('https://api.pwnedpasswords.com/range/')).toBeTruthy();
      const prefix = url.split('/').slice(-1)[0];
      // prefix length 5 and hex only
      expect(prefix.length).toBe(5);
      expect(/^[A-F0-9]{5}$/.test(prefix)).toBeTruthy();
      // don't echo password anywhere
      if (opts && opts.body) {
        throw new Error('Request body should be empty');
      }
      return {
        ok: true,
        text: async () => 'ABCDEF1234567890:2\n'
      } as any;
    });

    const testPassword = 'mypassword123';
    const count = await checkPwnedPasswordCount(testPassword);
    // Ensure we did not leak the raw password in the fetch args/headers
    expect(JSON.stringify((fetchSpy as any).mock.calls)).not.toContain(testPassword);
    expect(typeof count).toBe('number');
    fetchSpy.mockRestore();
  });
});
