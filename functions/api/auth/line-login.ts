// LINE OAuth 登入起始點 — redirect 到 LINE Authorization URL

interface Env {
  LINE_CHANNEL_ID: string;
  LINE_CALLBACK_URL: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;

  const channelId = env.LINE_CHANNEL_ID;
  const callbackUrl = env.LINE_CALLBACK_URL;

  if (!channelId || !callbackUrl) {
    return new Response(
      JSON.stringify({ error: 'LINE_CHANNEL_ID or LINE_CALLBACK_URL not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // 隨機 state 防 CSRF
  const state = crypto.randomUUID();

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: channelId,
    redirect_uri: callbackUrl,
    state,
    scope: 'openid profile email',
    prompt: 'consent',
  });

  const lineAuthUrl = `https://access.line.me/oauth2/v2.1/authorize?${params}`;

  // state 存在 cookie（短效，驗證用）
  return new Response(null, {
    status: 302,
    headers: {
      Location: lineAuthUrl,
      'Set-Cookie': `line_oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Max-Age=600; Path=/`,
    },
  });
};
