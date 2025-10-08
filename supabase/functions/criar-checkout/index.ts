// supabase/functions/criar-checkout/index.ts
// ... (Linhas 1 a 63: Todas as configurações e o PRICE_MAP) ...

// ** REMOVIDO: Bloco CORS_HEADERS estático para evitar conflito. **
// ----------------------------------------------------------------------
// LÓGICA PRINCIPAL - Serve
// ----------------------------------------------------------------------

serve(async (req: Request) => {
  // 1. AJUSTE FINAL DE CORS: Cria os headers dinamicamente para refletir a origem.
  const origin = req.headers.get("Origin");
  const responseHeaders = {
    "Access-Control-Allow-Origin": origin || CLIENT_URL,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    // O Content-Type será adicionado ao retorno final (Response) para evitar problemas de OPTIONS.
  };

  // 2. LIDAR COM REQUISIÇÕES PRÉ-VOO (OPTIONS)
  if (req.method === "OPTIONS") {
    // Retorno OPTIONS usa o header de permissão, mas não o Content-Type: application/json
    return new Response(null, { headers: responseHeaders, status: 204 });
  }

  try {
    // 3. VALIDAÇÃO DE AUTENTICAÇÃO (RESOLVE O ERRO 401)
    const authHeader = req.headers.get("Authorization");
    const userToken = authHeader ? authHeader.replace("Bearer ", "") : null;

    if (!userToken) {
      return new Response(
        JSON.stringify({ error: "Token de autorização ausente." }),
        {
          headers: { ...responseHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    // Valida o Token JWT usando o cliente Admin com o JWT_SECRET
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(userToken);

    if (authError || !user) {
      console.error("Erro de validação JWT:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Token JWT inválido ou expirado." }),
        {
          headers: { ...responseHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    // 4. PROCESSAR REQUISIÇÃO E CHECKOUT
    const { plano } = await req.json();
    const priceId = PRICE_MAP[plano];

    if (!priceId) {
      return new Response(
        JSON.stringify({
          error: `Plano '${plano}' não encontrado ou inválido.`,
        }),
        {
          headers: { ...responseHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // 5. CRIAÇÃO DA SESSÃO DE CHECKOUT
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],

      // Redireciona de volta para a URL do Vercel
      success_url: `${
        origin || CLIENT_URL
      }/sucesso.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin || CLIENT_URL}/planos.html`,

      // Associa a sessão ao ID do usuário validado
      client_reference_id: user.id,
    });

    // 6. RETORNA A URL DO CHECKOUT
    return new Response(JSON.stringify({ url: session.url }), {
      headers: {
        ...responseHeaders, // Usa os headers dinâmicos
        "Content-Type": "application/json",
      },
      status: 200,
    });
  } catch (error) {
    console.error("Erro geral na Edge Function:", error);

    return new Response(
      JSON.stringify({ error: "Erro interno do servidor ao criar checkout." }),
      {
        headers: {
          ...responseHeaders, // Usa os headers dinâmicos no erro
          "Content-Type": "application/json",
        },
        status: 500,
      }
    );
  }
});
