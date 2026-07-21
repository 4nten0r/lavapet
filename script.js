// VARIÁVEIS GLOBAIS
let tutorDados = { nome: '', telefone: '' };
let petDados = { nome: '', raca: '', servico: '' };
let horariosOcupados = [];
let horarioSelecionado = "";

// 👉 URL DO SEU APPS SCRIPT (MANTIDA)
const API_URL = "https://script.google.com/macros/s/AKfycbwE8I4T1FtPBEt7VZ6jJ_06mRBuQPxSKMQE5USswJ2jvnEErhtN5oQAB3cdjiM788wDVw/exec";

// --- FUNÇÃO DE LOGIN / IDENTIFICAÇÃO ---
function validarLogin() {
  const nome = document.getElementById('tutorNome').value.trim();
  const telefone = document.getElementById('tutorTelefone').value.trim();

  if (nome !== "" && telefone !== "") {
    tutorDados.nome = nome;
    tutorDados.telefone = telefone;
    goTo('novoPet');
  } else {
    alert("Por favor, preencha seu nome e telefone para continuar.");
  }
}

// --- FUNÇÃO DE NAVEGAÇÃO ---
function goTo(screen) {
  document.querySelectorAll('.screen')
    .forEach(el => {
      // Usando opacidade para transições mais suaves, se desejar no CSS, ou apenas hide/show
      el.classList.add('hidden');
    });

  const target = document.getElementById(screen);
  if (target) target.classList.remove('hidden');

  if (screen === 'agendamento') {
    document.getElementById('displayPetNome').innerText = petDados.nome;
    carregarHorarios();
  }
}

// --- SALVAR DADOS DO PET E SERVIÇO ---
function salvarPet() {
  const nome = document.getElementById('petNome').value.trim();
  const raca = document.getElementById('petRaca').value.trim();
  const servico = document.getElementById('petServico').value;

  if (nome !== "" && servico !== "") {
    petDados.nome = nome;
    petDados.raca = raca;
    petDados.servico = servico;
    goTo('agendamento');
  } else {
    alert("Por favor, digite o nome do pet e selecione o serviço desejado.");
  }
}

// --- GERAR HORÁRIOS ---
function gerarHorarios() {
  const container = document.getElementById('horarios');
  if (!container) return;
  container.innerHTML = '';
  horarioSelecionado = ""; // Reseta o horário ao trocar a data

  // Definição do expediente (Você pode ajustar conforme o negócio)
  const horarios = [
    "08:00", "09:00", "10:00", "11:00",
    "13:00", "14:00", "15:00", "16:00", "17:00"
  ];

  const dataInput = document.getElementById('date').value;
  
  if(!dataInput) {
    container.innerHTML = '<p class="text-sm text-gray-400 col-span-3 text-center mt-2">Selecione uma data primeiro.</p>';
    return;
  }

  horarios.forEach(hora => {
    const btn = document.createElement('button');
    btn.innerText = hora;
    const agendamento = dataInput + " " + hora;
    
    // Estilo base do botão
    btn.className = "p-3 border rounded-xl font-medium transition-all text-sm";

    if (horariosOcupados.includes(agendamento)) {
      btn.disabled = true;
      btn.classList.add("bg-gray-100", "border-gray-200", "text-gray-400", "line-through", "cursor-not-allowed");
    } else {
      btn.classList.add("bg-white", "border-gray-200", "text-gray-700", "hover:border-indigo-400", "hover:text-indigo-600");
      btn.onclick = () => selecionarHorario(btn, hora);
    }
    container.appendChild(btn);
  });
}

// --- SELECIONAR HORÁRIO ---
function selecionarHorario(el, hora) {
  horarioSelecionado = hora;
  
  // Reseta todos os botões ativos
  document.querySelectorAll('#horarios button:not(:disabled)').forEach(b => {
    b.classList.remove('bg-indigo-600', 'text-white', 'border-indigo-600');
    b.classList.add('bg-white', 'text-gray-700', 'border-gray-200');
  });

  // Ativa o botão clicado
  el.classList.remove('bg-white', 'text-gray-700', 'border-gray-200', 'hover:border-indigo-400', 'hover:text-indigo-600');
  el.classList.add('bg-indigo-600', 'text-white', 'border-indigo-600', 'shadow-md');
}

// --- CARREGAR DA PLANILHA ---
async function carregarHorarios() {
  try {
    const res = await fetch(API_URL);
    const dados = await res.json();
    horariosOcupados = dados.map(d => d.data + " " + d.hora);
    gerarHorarios();
  } catch (e) {
    console.error("Erro ao carregar horários:", e);
    gerarHorarios();
  }
}

// --- FINALIZAR E ENVIAR AO GOOGLE SHEETS ---
async function finalizar() {
  const date = document.getElementById('date').value;

  if (!date || !horarioSelecionado) {
    alert("Selecione uma data e um horário disponível para finalizar.");
    return;
  }

  const agendamento = date + " " + horarioSelecionado;

  if (horariosOcupados.includes(agendamento)) {
    alert("Ops! Este horário acabou de ser ocupado. Escolha outro.");
    gerarHorarios(); // Recarrega a grade
    return;
  }

  // Feedback visual de carregamento
  const btnFinalizar = document.querySelector('button[onclick="finalizar()"]');
  const textoOriginal = btnFinalizar.innerText;
  btnFinalizar.innerHTML = `
    <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg> Confirmando...
  `;
  btnFinalizar.disabled = true;

  try {
    // Note que agora estamos enviando também o NOME DO TUTOR e o SERVIÇO DINÂMICO
    // Importante: Seu Apps Script deve estar preparado para receber e gravar essas novas colunas!
    let nomeFormatadoPet = petDados.nome + (petDados.raca ? ` (${petDados.raca})` : "");
    let nomeCliente = tutorDados.nome + " / " + tutorDados.telefone; // Agrupando para caber na sua estrutura, ou altere o Apps Script para receber separadamente.

    await fetch(API_URL, {
      method: "POST",
      mode: "no-cors", 
      body: JSON.stringify({
        pet: nomeFormatadoPet, // Nome do Pet (+ Raça)
        cliente: nomeCliente,  // Nome + Telefone (Adicionei caso você queira salvar lá)
        servico: petDados.servico, // "Banho", "Tosa", "Banho e Tosa"
        data: date,
        hora: horarioSelecionado
      })
    });

    // Formatando data para exibição na tela de sucesso (opcional)
    const dataObj = new Date(date + "T12:00:00");
    const dataFormatada = dataObj.toLocaleDateString('pt-BR');

    // Preenche tela de confirmação
    document.getElementById('cPet').innerText = petDados.nome;
    document.getElementById('cServico').innerText = petDados.servico;
    document.getElementById('cDate').innerText = dataFormatada;
    document.getElementById('cTime').innerText = horarioSelecionado;
    
    goTo('confirmacao');

  } catch (e) {
    alert("Erro ao salvar o agendamento. Verifique sua conexão com a internet.");
  } finally {
    btnFinalizar.innerHTML = textoOriginal;
    btnFinalizar.disabled = false;
  }
}

// Event Listeners adicionais
document.addEventListener("DOMContentLoaded", () => {
  // Splash Screen de 2.5 segundos com transição suave
  setTimeout(() => {
    const splash = document.getElementById('splash');
    splash.classList.add('opacity-0'); // Usando tailwind opacity transition
    setTimeout(() => goTo('login'), 500); 
  }, 2500);

  // Atualizar horários ao mudar data
  document.getElementById("date").addEventListener("change", gerarHorarios);
  
  // Setar a data mínima para HOJE no campo de agendamento
  const dataDeHoje = new Date().toISOString().split('T')[0];
  document.getElementById("date").setAttribute('min', dataDeHoje);
});
