// Cloudflare Pages Function — busca cotações na brapi.dev
// Endpoint: /api/quotes?tickers=PETR4,VALE3,...
// O token fica na variável de ambiente BRAPI_TOKEN (escondido do navegador).

export async function onRequest(context) {
  const { request, env } = context;
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=300'
  };

  try {
    const url = new URL(request.url);
    const tickers = url.searchParams.get('tickers') || '';
    if (!tickers) {
      return new Response(JSON.stringify({ error: 'sem tickers informados' }), { status: 400, headers });
    }

    const token = env.BRAPI_TOKEN;
    if (!token) {
      return new Response(JSON.stringify({ error: 'BRAPI_TOKEN nao configurado nas variaveis de ambiente' }), { status: 500, headers });
    }

    const apiUrl = 'https://brapi.dev/api/quote/' + encodeURIComponent(tickers) +
                   '?token=' + encodeURIComponent(token);
    const resp = await fetch(apiUrl);
    const raw = await resp.text();
    let data = {};
    try { data = JSON.parse(raw); } catch (_) {}

    if (resp.status !== 200) {
      const msg = (data && data.message) ? data.message : ('brapi retornou status ' + resp.status);
      return new Response(JSON.stringify({ error: msg }), { status: resp.status, headers });
    }

    const results = (data.results || []).map(q => ({
      symbol: q.symbol,
      price: q.regularMarketPrice,
      change: q.regularMarketChangePercent
    }));

    if (results.length === 0) {
      return new Response(JSON.stringify({ results: [], error: 'nenhum resultado — token invalido ou tickers incorretos' }), { status: 200, headers });
    }

    return new Response(JSON.stringify({ results }), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e && e.message) || e) }), { status: 500, headers });
  }
}
