// 驗證 admin_token cookie，回傳用戶資訊

interface Env {
  ADMIN_JWT_SECRET: string;
}

interface JwtPayload {
  lineUserId: string;
  displayName: string;
  pictureUrl?: string | null;
  exp: number;
}

// --- JWT 驗證（Web Crypto API） ---

function base64urlDecode(str: string): string {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - b64.length % 4) % 4);
  return atob(padded);
}

async function verifyJwt(token: string, secret: string): Promise<JwtPayload | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, body, sig] = parts;
  const signingInput = `${header}.${body}`;

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );

    const sigBytes = Uint8Array.from(atob(sig.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(signingInput));
    if (!valid) return null;

    const payload = JSON.parse(base64urlDecode(body)) as JwtPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function parseCookies(cookieHeader: string): Record<string, string> {
  return Object.fromEntries(
    cookieHeader.split(';').map(c => c.trim().split('=').map(s => s.trim())).filter(p => p.length === 2) as [string, string][]
  );
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const cookies = parseCookies(request.headers.get('Cookie') ?? '');
  const token = cookies['admin_token'];

  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const payload = await verifyJwt(token, env.ADMIN_JWT_SECRET);
  if (!payload) {
    return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(
    JSON.stringify({
      lineUserId: payload.lineUserId,
      displayName: payload.displayName,
      pictureUrl: payload.pictureUrl ?? undefined,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
};
