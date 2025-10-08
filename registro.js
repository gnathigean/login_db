// registro.js

// 1. CONFIGURAÇÃO (Use suas próprias chaves Supabase!)
const SUPABASE_URL = "https://dvvfwmsbjmewrlvoqmue.supabase.co"; // Seu URL
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2dmZ3bXNiam1ld3Jsdm9xbXVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1MzI2MDYsImV4cCI6MjA3NTEwODYwNn0.cVGSCAg-imHwQN-Iycz8DjOZ810bv3WUlrhEOIPKZrQ"; // Sua Chave ANÔNIMA

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2. CAPTURA DO FORMULÁRIO (Usando o ID que definimos)
const registerForm = document.getElementById("registerForm");

if (registerForm) {
  registerForm.addEventListener("submit", handleRegister);
} else {
  console.error("Erro: Elemento 'registerForm' não encontrado no HTML.");
}

// ----------------------------------------------------------------------
// FUNÇÃO PRINCIPAL DE REGISTRO
// ----------------------------------------------------------------------

async function handleRegister(event) {
  // Impede o envio padrão e o recarregamento da página
  event.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("senha").value;

  try {
    const { error } = await supabaseClient.auth.signUp({
      email: email,
      password: password,
      options: {
        // Adiciona o redirecionamento. O Supabase enviará o token para este endereço.
        emailRedirectTo: "http://127.0.0.1:5500/auth_callback.html",
      },
    });
    if (error) {
      // Exibe o erro (ex: senha muito curta, e-mail já registrado, e-mail inválido)
      alert(`Erro no registro: ${error.message}`);
      return;
    }

    // Se não houver erro, o Supabase envia um e-mail de confirmação
    alert(
      "Registro efetuado com sucesso! Verifique seu e-mail para confirmar a conta antes de fazer o login."
    );

    // Redireciona para a página de login para que o usuário confirme e acesse.
    window.location.href = "login.html";
  } catch (e) {
    alert("Ocorreu um erro inesperado. Tente novamente.");
    console.error(e);
  }
}
