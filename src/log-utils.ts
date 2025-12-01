export function sanitizeForLog(obj: any) {
  try {
    return JSON.parse(JSON.stringify(obj, (k, v) => {
      if (!k) return v; // top-level object
      const low = String(k).toLowerCase();
      // redact any property that looks sensitive: password, token, auth, jwt, authorization
      if (low.includes('password') || low.includes('token') || low.includes('authorization') || low.includes('auth') || low.includes('jwt')) {
        return '[REDACTED]';
      }
      return v;
    }));
  } catch (err) {
    return '[unserializable]';
  }
}
