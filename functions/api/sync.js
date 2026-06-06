// Cloudflare Pages Function — sincroniza a carteira na nuvem (KV)
// Endpoint: /api/sync
//   GET  /api/sync?key=SUACHAVE            → lê os dados salvos
//   POST /api/sync?key=SUACHAVE  (body=JSON) → grava os dados
//
// Segurança: o acesso exige uma "chave" (SYNC_KEY) guardada na variável
// de ambiente do Cloudflare. Só quem souber a chave lê/grava os dados.
// O binding do KV deve se chamar CARTEIRA_KV.

export async function onRequest(context) {
  const { request, env } = context;
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  try {
    // valida a chave de acesso
    const url = new URL(request.url);
    const provided = url.searchParams.get('key') || '';
    const expected = env.SYNC_KEY;

    if (!expected) {
      return new Response(JSON.stringify({ error: 'SYNC_KEY nao configurada no servidor' }), { status: 500, headers });
    }
    if (!provided || provided !== expected) {
      return new Response(JSON.stringify({ error: 'chave invalida' }), { status: 401, headers });
    }

    // verifica se o KV está ligado
    if (!env.CARTEIRA_KV) {
      return new Response(JSON.stringify({ error: 'KV (CARTEIRA_KV) nao conectado ao projeto' }), { status: 500, headers });
    }

    const STORAGE_KEY = 'portfolio'; // uma única carteira por chave

    if (request.method === 'GET') {
      const data = await env.CARTEIRA_KV.get(STORAGE_KEY);
      return new Response(JSON.stringify({ ok: true, data: data ? JSON.parse(data) : null }), { status: 200, headers });
    }

    if (request.method === 'POST') {
      const body = await request.text();
      // valida que é JSON antes de gravar
      try { JSON.parse(body); } catch (_) {
        return new Response(JSON.stringify({ error: 'corpo nao e JSON valido' }), { status: 400, headers });
      }
      await env.CARTEIRA_KV.put(STORAGE_KEY, body);
      return new Response(JSON.stringify({ ok: true, saved: true }), { status: 200, headers });
    }

    return new Response(JSON.stringify({ error: 'metodo nao suportado' }), { status: 405, headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e && e.message) || e) }), { status: 500, headers });
  }
}
