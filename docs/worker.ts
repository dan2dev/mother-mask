export default {
  async fetch(request: Request, env: { ASSETS: { fetch: typeof fetch } }): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname.endsWith('/')) {
      const indexUrl = new URL(`${url.pathname}index.html${url.search}`, url)
      const indexResponse = await env.ASSETS.fetch(new Request(indexUrl, request))
      if (indexResponse.status !== 404) return indexResponse
    }
    return env.ASSETS.fetch(request)
  },
}
