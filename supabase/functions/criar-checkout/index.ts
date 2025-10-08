// supabase/functions/criar-checkout/index.ts

import Stripe from "npm:stripe@14.12.0";
import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// ----------------------------------------------------------------------
// 1. CONFIGURAÇÃO E CLIENTES DE SERVIÇO
// ----------------------------------------------------------------------

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const CLIENT_URL = Deno.env.get("CLIENT_URL") || "http://127.0.0.1:5500";
const JWT_SECRET = Deno.env.get("JWT_SECRET"); // NOVO: Chave Secreta para validar JWTs da nuvem

if (
  !STRIPE_SECRET_KEY ||
  !SUPABASE_SERVICE_ROLE_KEY ||
  !SUPABASE_URL ||
  !JWT_SECRET
) {
  // Se faltar alguma chave, o script irá parar e relatar o erro no terminal
  throw new Error(
    "Chaves de ambiente Stripe, Supabase ou JWT_SECRET não estão configuradas."
  );
}

// Cliente Stripe
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

// Cliente Supabase com permissão de Administrador (para validar o token JWT da nuvem)
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    // ESSENCIAL: Usa o JWT_SECRET da nuvem para validar o token que vem do navegador
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
    jwtSecret: JWT_SECRET,
  },
});

// 2. CONFIGURAÇÃO DE CORS (CRUCIAL)
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": CLIENT_URL,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// 3. MAPEMANTO DE PLANOS (SUBSTITUA PELOS IDs DO STRIPE!)
const PRICE_MAP: { [key: string]: string } = {
  mensal: "price_SEU_ID_MENSAL",
  anual: "price_SEU_ID_ANUAL",
};

// ----------------------------------------------------------------------
// LÓGICA PRINCIPAL - Serve
// ----------------------------------------------------------------------

serve(async (req: Request) => {
  // 4. LIDAR COM REQUISIÇÕES PRÉ-VOO (OPTIONS) para o CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS, status: 204 });
  }

  try {
    // 5. VALIDAÇÃO DE AUTENTICAÇÃO (RESOLVE O ERRO 401)
    const authHeader = req.headers.get("Authorization");
    const userToken = authHeader ? authHeader.replace("Bearer ", "") : null;

    if (!userToken) {
      return new Response(
        JSON.stringify({ error: "Token de autorização ausente." }),
        {
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
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
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    // 6. PROCESSAR REQUISIÇÃO E CHECKOUT
    const { plano } = await req.json();
    const priceId = PRICE_MAP[plano];

    if (!priceId) {
      return new Response(
        JSON.stringify({
          error: `Plano '${plano}' não encontrado ou inválido.`,
        }),
        {
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // 7. CRIAÇÃO DA SESSÃO DE CHECKOUT
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],

      // Redireciona de volta para o seu Live Server
      success_url: `${CLIENT_URL}/sucesso.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${CLIENT_URL}/planos.html`,

      // Associa a sessão ao ID do usuário validado
      client_reference_id: user.id,
    });

    // 8. RETORNA A URL DO CHECKOUT
    return new Response(JSON.stringify({ url: session.url }), {
      headers: {
        ...CORS_HEADERS,
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
          ...CORS_HEADERS,
          "Content-Type": "application/json",
        },
        status: 500,
      }
    );
  }
});
