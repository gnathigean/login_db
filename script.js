// script.js

// 1. CONFIGURAÇÃO
const SUPABASE_URL = "https://dvvfwmsbjmewrlvoqmue.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2dmZ3bXNiam1ld3Jsdm9xbXVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1MzI2MDYsImV4cCI6MjA3NTEwODYwNn0.cVGSCAg-imHwQN-Iycz8DjOZ810bv3WUlrhEOIPKZrQ";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2. CAPTURA DOS ELEMENTOS
const loginForm = document.getElementById("loginForm");
const logoutBtn = document.getElementById("logoutBtn"); // Captura o novo botão

// 3. ANEXA O LISTENER DE LOGIN
if (loginForm) {
  loginForm.addEventListener("submit", handleLogin);
} else {
  console.error(
    "Erro: Elemento 'loginForm' não encontrado. Verifique o ID no HTML."
  );
}

// ----------------------------------------------------------------------
// FUNÇÕES DE UTILIDADE DE SESSÃO
// ----------------------------------------------------------------------

// Função para checar a sessão ao carregar a página
async function checkSessionAndDisplayLogout() {
  const {
    data: { session },
  } = await supabaseClient.auth.getSession();

  if (session) {
    // Se houver uma sessão, esconde o formulário de login e mostra o logout.
    if (loginForm) loginForm.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "block";
  } else {
    // Garante que o formulário de login está visível se não houver sessão.
    if (loginForm) loginForm.style.display = "block";
    if (logoutBtn) logoutBtn.style.display = "none";
  }
}

// Função de Logout (Chamada pelo botão)
async function logout() {
  const { error } = await supabaseClient.auth.signOut();

  if (!error) {
    alert(
      "Você saiu da sua conta. Faça login novamente para acessar o conteúdo."
    );
    window.location.href = "login.html";
  } else {
    console.error("Erro ao fazer logout:", error);
    alert("Ocorreu um erro ao sair.");
  }
}

// ----------------------------------------------------------------------
// FUNÇÃO DE LOGIN
// ----------------------------------------------------------------------

async function handleLogin(event) {
  event.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("senha").value;

  try {
    const { error } = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      alert(`Erro no login: ${error.message}`);
      // IMPORTANTE: Após um erro de login (401), recarrega a página para limpar o cache de token
      checkSessionAndDisplayLogout();
      return;
    }

    // Se o login for bem-sucedido, verifica o status do plano
    checkSubscriptionStatus();
  } catch (e) {
    alert("Ocorreu um erro inesperado. Tente novamente.");
    console.error(e);
  }
}

// ----------------------------------------------------------------------
// FUNÇÃO DE VERIFICAÇÃO DE ASSINATURA E EXPIRAÇÃO
// ----------------------------------------------------------------------

async function checkSubscriptionStatus() {
  // 1. Pega o usuário logado (usando 'supabaseClient')
  const {
    data: { user },
  } = await supabaseClient.auth.getUser();

  if (!user) {
    alert("Erro de sessão. Tente logar novamente.");
    // Redireciona para o login para forçar o usuário a reautenticar
    window.location.href = "login.html";
    return;
  }

  // 2. Consulta a tabela de assinaturas pelo ID do usuário (usando 'supabaseClient')
  const { data, error } = await supabaseClient
    .from("assinaturas")
    .select("data_expiracao")
    .eq("user_id", user.id)
    .single();

  if (error || !data || !data.data_expiracao) {
    alert(
      "Não encontramos uma assinatura ativa para sua conta. Por favor, assine."
    );
    window.location.href = "planos.html";
    return;
  }

  const expirationDate = new Date(data.data_expiracao);
  const currentDate = new Date();

  // Garante que o tempo não interfira na comparação
  currentDate.setHours(0, 0, 0, 0);
  expirationDate.setHours(0, 0, 0, 0);

  // 3. Verifica a data de expiração
  if (expirationDate >= currentDate) {
    // Acesso Válido!
    alert("Login e Assinatura ativos! Bem-vindo(a).");
    window.location.href = "conteudo_exclusivo.html";
  } else {
    // Acesso Expirado!
    alert(
      `Sua assinatura expirou em ${expirationDate.toLocaleDateString()}. Por favor, renove.`
    );
    window.location.href = "planos.html";
  }
}

// Executa a checagem de sessão ao carregar a página
checkSessionAndDisplayLogout();
