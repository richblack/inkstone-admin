// 回傳前端可公開的 LINE 設定（channel id，不含 secret）

interface Env {
  LINE_CHANNEL_ID: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;
  return new Response(
    JSON.stringify({ lineChannelId: env.LINE_CHANNEL_ID }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
};
