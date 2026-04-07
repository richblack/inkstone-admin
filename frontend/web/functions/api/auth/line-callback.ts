// LINE OAuth Callback — 交換 code → access_token → user profile → JWT → cookie

interface Env {
  LINE_CHANNEL_ID: string;
  LINE_CHANNEL_SECRET: string;
  LINE_CALLBACK_URL: string;
  ADMIN_JWT_SECRET: string;
}

interface LineTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  id_token?: string;
}

interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
}

// --- JWT HS256（Web Crypto API，zero deps） ---

function base64url(data: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(data)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlStr(str: string): string {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function createJwt(payload: Record<string, unknown>, secret: string): Promise<string> {
  const header = base64urlStr(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64urlStr(JSON.stringify(payload));
  const signingInput = `${header}.${body}`;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signingInput));
  return `${signingInput}.${base64url(sig)}`;
}

// --- id_token decode（取 email，不驗 sig，已從 LINE HTTPS endpoint 直接取得） ---

function decodeIdTokenPayload(idToken: string): Record<string, unknown> {
  try {
    const parts = idToken.split('.');
    if (parts.length !== 3) return {};
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(payload.padEnd(payload.length + (4 - payload.length % 4) % 4, '='));
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return {};
  }
}

// --- Handler ---

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const errorParam = url.searchParams.get('error');

  if (errorParam) {
    return new Response(`LINE 登入失敗：${errorParam}`, { status: 400 });
  }

  if (!code) {
    return new Response('缺少 code 參數', { status: 400 });
  }

  // 驗證 state（防 CSRF）
  const cookies = parseCookies(request.headers.get('Cookie') ?? '');
  const savedState = cookies['line_oauth_state'];
  if (!savedState || savedState !== state) {
    return new Response('State 驗證失敗', { status: 400 });
  }

  try {
    // 1. 交換 access_token
    const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: env.LINE_CALLBACK_URL,
        client_id: env.LINE_CHANNEL_ID,
        client_secret: env.LINE_CHANNEL_SECRET,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      return new Response(`取得 token 失敗：${err}`, { status: 502 });
    }

    const tokenData = await tokenRes.json() as LineTokenResponse;
    const accessToken = tokenData.access_token;

    // 2. 取得 LINE 用戶資料
    const profileRes = await fetch('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!profileRes.ok) {
      return new Response('取得 LINE 用戶資料失敗', { status: 502 });
    }

    const profile = await profileRes.json() as LineProfile;

    // 3. 從 id_token 取 email（需 scope=openid email）
    const idClaims = tokenData.id_token ? decodeIdTokenPayload(tokenData.id_token) : {};
    const email = typeof idClaims['email'] === 'string' ? idClaims['email'] : null;

    // 4. 產生 JWT（7天）
    const exp = Math.floor(Date.now() / 1000) + 86400 * 7;
    const jwt = await createJwt(
      {
        lineUserId: profile.userId,
        displayName: profile.displayName,
        pictureUrl: profile.pictureUrl ?? null,
        email,
        exp,
      },
      env.ADMIN_JWT_SECRET,
    );

    // 5. 設 cookie + redirect 首頁
    // 注意：Set-Cookie 必須用 Headers.append 分開設定，不能 join 成一個字串
    const headers = new Headers({ Location: '/' });
    headers.append('Set-Cookie', `admin_token=${jwt}; HttpOnly; Secure; SameSite=Lax; Max-Age=${86400 * 7}; Path=/`);
    headers.append('Set-Cookie', `line_oauth_state=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/`);
    return new Response(null, { status: 302, headers });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(`伺服器錯誤：${msg}`, { status: 500 });
  }
};

function parseCookies(cookieHeader: string): Record<string, string> {
  return Object.fromEntries(
    cookieHeader.split(';').map(c => c.trim().split('=').map(s => s.trim())).filter(p => p.length === 2) as [string, string][]
  );
}
