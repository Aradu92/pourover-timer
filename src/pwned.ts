import * as crypto from 'crypto';

// Uses the k-anonymity API from Have I Been Pwned (HIBP).
// We only send the first 5 hex characters (SHA1) of the password hash to HIBP; the suffix is kept locally
// so the raw password is never transmitted. This is standard practice for the k-anonymity HIBP API.
export async function checkPwnedPasswordCount(password: string): Promise<number> {
  if (!password) return 0;
  try {
    const sha1 = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);
    const resp = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, { headers: { 'User-Agent': 'pourover-timer' } });
    if (!resp.ok) return 0;
    const text = await resp.text();
    const lines = text.split('\n');
    for (const line of lines) {
      const [s, countStr] = line.split(':');
      if (!s) continue;
      if (s.trim().toUpperCase() === suffix) return parseInt((countStr || '0').trim(), 10) || 0;
    }
    return 0;
  } catch (err) {
    console.warn('Failed to check pwned password:', err);
    return 0;
  }
}
