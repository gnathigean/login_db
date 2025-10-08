// protecao.js

// Use as mesmas chaves
const SUPABASE_URL = "https://dvvfwmsbjmewrlvoqmue.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2dmZ3bXNiam1ld3Jsdm9xbXVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1MzI2MDYsImV4cCI6MjA3NTEwODYwNn0.cVGSCAg-imHwQN-Iycz8DjOZ810bv3WUlrhEOIPKZrQ";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Função principal de proteção
async function protegerRota() {
  // 1. Tenta pegar o usuário logado (armazenado no Local Storage pelo Supabase)
  const {
    data: { user },
  } = await supabaseClient.auth.getUser();

  if (!user) {
    // Se não houver sessão ativa, redireciona para o login
    alert("Acesso negado. Você precisa estar logado.");
    window.location.href = "login.html";
    return;
  }

  // 2. Se logado, verifica a validade da assinatura (reaproveitando a lógica)
  await checkSubscriptionValidity(user.id);
}

async function checkSubscriptionValidity(userId) {
  const { data, error } = await supabaseClient
    .from("assinaturas")
    .select("data_expiracao")
    .eq("user_id", userId)
    .single();

  if (error || !data || !data.data_expiracao) {
    alert("Sua assinatura não está registrada ou não está ativa.");
    window.location.href = "planos.html";
    return;
  }

  const expirationDate = new Date(data.data_expiracao);
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);
  expirationDate.setHours(0, 0, 0, 0);

  if (expirationDate < currentDate) {
    alert(
      `Sua assinatura expirou em ${expirationDate.toLocaleDateString()}. Por favor, renove.`
    );
    window.location.href = "planos.html";
  }
  // Se a data for válida, a função termina e o usuário permanece na página.
}

// Função de Logout (para o botão)
async function logout() {
  const { error } = await supabaseClient.auth.signOut();
  if (error) {
    console.error("Erro ao fazer logout:", error);
  } else {
    alert("Você saiu da sua conta.");
    window.location.href = "login.html";
  }
}

// Executa a proteção assim que o script é carregado
protegerRota();
