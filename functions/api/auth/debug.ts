// GET /api/auth/debug — 驗證 JWT token，回傳驗證結果（不暴露 secret）
interface Env {
  ADMIN_JWT_SECRET: string;
  LINE_CHANNEL_ID: string;
  LINE_CHANNEL_SECRET: string;
  LINE_CALLBACK_URL: string;
}

async function tryVerifyJwt(token: string, secret: string): Promise<{ valid: boolean; reason?: string; payload?: unknown }> {
  const parts = token.split('.');
  if (parts.length !== 3) return { valid: false, reason: `JWT 格式錯誤：parts=${parts.length}，期望 3` };

  const [header, body, sig] = parts;
  try {
    const clean = (s: string) => s.replace(/\s/g, '').replace(/-/g, '+').replace(/_/g, '/');
    const pad = (s: string) => s + '='.repeat((4 - s.length % 4) % 4);

    // 解碼 payload
    const payloadJson = atob(pad(clean(body)));
    const payload = JSON.parse(payloadJson) as { e?: number; exp?: number; role?: string; sub?: string };

    // 驗簽
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    const sigBytes = Uint8Array.from(
      atob(pad(clean(sig))),
      c => c.charCodeAt(0),
    );
    const sigValid = await crypto.subtle.verify(
      'HMAC', key, sigBytes, new TextEncoder().encode(`${header}.${body}`),
    );

    if (!sigValid) return { valid: false, reason: '簽名驗證失敗（secret 不匹配或 token 被竄改）', payload };

    // 驗過期
    const expiry = payload.e ?? payload.exp ?? 0;
    const now = Math.floor(Date.now() / 1000);
    if (expiry < now) {
      return { valid: false, reason: `token 已過期：exp=${expiry}, now=${now}, 差=${now - expiry}s`, payload };
    }

    return { valid: true, payload };
  } catch (err) {
    return { valid: false, reason: `驗證例外：${err instanceof Error ? err.message : String(err)}` };
  }
}

export async function onRequestGet(context: { request: Request; env: Env }) {
  const { request, env } = context;

  // 從 Authorization header 或 cookie 取 token
  const authHeader = request.headers.get('Authorization');
  const cookieHeader = request.headers.get('Cookie') ?? '';

  let tokenSource = 'none';
  let token: string | null = null;

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
    tokenSource = 'Authorization header';
  } else {
    const match = cookieHeader.match(/admin_token=([^;]+)/);
    if (match) {
      token = match[1];
      tokenSource = 'cookie';
    }
  }

  const envInfo = {
    hasAdminJwtSecret: !!env.ADMIN_JWT_SECRET,
    adminJwtSecretLength: env.ADMIN_JWT_SECRET?.length ?? 0,
    hasLineChannelId: !!env.LINE_CHANNEL_ID,
    hasLineChannelSecret: !!env.LINE_CHANNEL_SECRET,
    hasLineCallbackUrl: !!env.LINE_CALLBACK_URL,
    lineCallbackUrl: env.LINE_CALLBACK_URL || null,
  };

  if (!token) {
    return Response.json({
      ...envInfo,
      tokenSource,
      tokenFound: false,
      cookieHeader: cookieHeader.substring(0, 200),
      authHeader: authHeader ?? null,
      verifyResult: null,
    });
  }

  const verifyResult = await tryVerifyJwt(token, env.ADMIN_JWT_SECRET ?? '');

  return Response.json({
    ...envInfo,
    tokenSource,
    tokenFound: true,
    tokenPreview: token.substring(0, 30) + '...',
    tokenLength: token.length,
    verifyResult,
  });
}
