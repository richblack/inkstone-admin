export const onRequestPost: PagesFunction<{ CONVERT_JOBS: KVNamespace }> = async (ctx) => {
  const body = await ctx.request.json<{ job_id: string; status: string; markdown?: string }>()
  const { job_id, status, markdown } = body

  if (!job_id || !status) {
    return new Response(JSON.stringify({ error: "missing job_id or status" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  await ctx.env.CONVERT_JOBS.put(job_id, JSON.stringify({ status, markdown: markdown ?? null }), {
    expirationTtl: 86400, // 24h
  })

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  })
}
