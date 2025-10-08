// planos.js - CÓDIGO FINAL CORRIGIDO PARA A NUVEM

// 1. CONFIGURAÇÃO BASE DO SUPABASE
const SUPABASE_URL = "https://dvvfwmsbjmewrlvoqmue.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2dmZ3bXNiam1ld3Jsdm9xbXVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1MzI2MDYsImV4cCI6MjA3NTEwODYwNn0.cVGSCAg-imHwQN-Iycz8DjOZ810bv3WUlrhEOIPKZrQ";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// URL DA EDGE FUNCTION NA NUVEM: Resolveu o problema de autenticação 401.
const EDGE_FUNCTION_URL =
  "https://dvvfwmsbjmewrlvoqmue.supabase.co/functions/v1/criar-checkout";

// ----------------------------------------------------------------------
// FUNÇÃO PARA INICIAR A ASSINATURA
// ----------------------------------------------------------------------

async function iniciarAssinatura(plano) {
  // 1. OBTEM A SESSÃO COMPLETA para pegar o Token JWT
  const { data: sessionData } = await supabaseClient.auth.getSession();
  const jwtToken = sessionData.session?.access_token;

  // 2. OBTEM O USUÁRIO (para pegar o ID)
  const { data: userData } = await supabaseClient.auth.getUser();
  const user = userData.user;

  // Se não tiver o usuário OU o token, bloqueia
  if (!user || !jwtToken) {
    alert("Sua sessão expirou. Por favor, faça login novamente.");
    window.location.href = "login.html";
    return;
  }

  alert(`Iniciando checkout para o plano ${plano.toUpperCase()}...`);

  try {
    // CORREÇÃO: Aponta para a URL da nuvem
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Envia o Token JWT no formato Bearer
        Authorization: `Bearer ${jwtToken}`,
      },
      body: JSON.stringify({
        plano: plano,
        user_id: user.id, // ID do usuário para o Stripe associar a compra
      }),
    });

    const data = await response.json();

    // 3. Verifica o Status de Retorno da Edge Function
    if (response.ok && data.url) {
      // Sucesso! Redireciona para o Stripe
      window.location.href = data.url;
    } else {
      // Mostra o erro retornado pela Edge Function (se houver)
      alert(
        `Erro de Servidor: ${data.error || "Resposta de função desconhecida"}`
      );
    }
  } catch (e) {
    console.error("Falha na comunicação com a Edge Function:", e);
    alert("Ocorreu um erro na comunicação. Tente novamente.");
  }
}
