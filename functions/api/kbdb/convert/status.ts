export const onRequestGet: PagesFunction<{ CONVERT_JOBS: KVNamespace }> = async (ctx) => {
  const job_id = new URL(ctx.request.url).searchParams.get("job_id")

  if (!job_id) {
    return new Response(JSON.stringify({ error: "missing job_id" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const raw = await ctx.env.CONVERT_JOBS.get(job_id)
  if (!raw) {
    return new Response(JSON.stringify({ status: "pending" }), {
      headers: { "Content-Type": "application/json" },
    })
  }

  const data = JSON.parse(raw) as { status: string; markdown?: string | null }
  return new Response(JSON.stringify({ status: data.status, markdown: data.markdown ?? undefined }), {
    headers: { "Content-Type": "application/json" },
  })
}
