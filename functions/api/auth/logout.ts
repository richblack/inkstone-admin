// 清除 admin_token cookie

export const onRequestPost: PagesFunction = async () => {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': 'admin_token=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/',
    },
  });
};
