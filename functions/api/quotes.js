// Cloudflare Pages Function — busca cotações na brapi.dev
// Endpoint: /api/quotes?tickers=PETR4,VALE3,...
// O token fica na variável de ambiente BRAPI_TOKEN (escondido do navegador).
// O plano gratuito da brapi permite 1 ticker por requisição, então
// buscamos um de cada vez e juntamos os resultados.

export async function onRequest(context) {
  const { request, env } = context;
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=300'
  };

  try {
    const url = new URL(request.url);
    const raw = url.searchParams.get('tickers') || '';
    if (!raw) {
      return new Response(JSON.stringify({ error: 'sem tickers informados' }), { status: 400, headers });
    }

    const token = env.BRAPI_TOKEN;
    if (!token) {
      return new Response(JSON.stringify({ error: 'BRAPI_TOKEN nao configurado nas variaveis de ambiente' }), { status: 500, headers });
    }

    const tickers = raw.split(',').map(t => t.trim()).filter(Boolean);
    const results = [];
    const errors = [];

    // busca 1 ticker por vez (limite do plano gratuito brapi)
    for (const tk of tickers) {
      try {
        const apiUrl = 'https://brapi.dev/api/quote/' + encodeURIComponent(tk) +
                       '?fundamental=true&token=' + encodeURIComponent(token);
        const r = await fetch(apiUrl);
        const txt = await r.text();
        let d = {};
        try { d = JSON.parse(txt); } catch (_) {}
        if (r.status === 200 && d.results && d.results[0] && d.results[0].regularMarketPrice > 0) {
          const q = d.results[0];
          results.push({
            symbol: q.symbol,
            price: q.regularMarketPrice,
            change: q.regularMarketChangePercent,
            pl: (typeof q.priceEarnings === 'number' ? q.priceEarnings : null),
            pvp: (typeof q.priceToBook === 'number' ? q.priceToBook : null)
          });
        } else {
          errors.push(tk + ': ' + ((d && d.message) ? d.message : ('status ' + r.status)));
        }
      } catch (e) {
        errors.push(tk + ': ' + String((e && e.message) || e));
      }
    }

    if (results.length === 0) {
      return new Response(JSON.stringify({ results: [], error: 'nenhum preco obtido. ' + errors.join(' | ') }), { status: 200, headers });
    }

    return new Response(JSON.stringify({ results, errors }), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e && e.message) || e) }), { status: 500, headers });
  }
}
