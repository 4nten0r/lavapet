let selectedPet = '';
let horariosOcupados = [];
let horarioSelecionado = "";

// 👉 URL DO SEU APPS SCRIPT
const API_URL = "https://script.google.com/macros/s/AKfycbwE8I4T1FtPBEt7VZ6jJ_06mRBuQPxSKMQE5USswJ2jvnEErhtN5oQAB3cdjiM788wDVw/exec";

// --- NOVO: FUNÇÃO DE LOGIN ---
function validarLogin() {
  const email = document.getElementById('email').value;
  const senha = document.getElementById('senha').value;

  // Validação simples: se houver algo escrito nos dois campos, ele entra
  if (email !== "" && senha !== "") {
    goTo('pet');
  } else {
    alert("Por favor, preencha o e-mail e a senha para entrar.");
  }
}

function goTo(screen) {
  document.querySelectorAll('.screen')
    .forEach(el => el.classList.add('hidden'));

  const target = document.getElementById(screen);
  if (target) target.classList.remove('hidden');

  if (screen === 'agendamento') {
    atualizarPet();
    carregarHorarios();
  }
}

function selectPet(name, el) {
  selectedPet = name;
  document.querySelectorAll('.pet-card')
    .forEach(c => c.classList.remove('border-blue-500','border-2', 'bg-blue-50'));

  el.classList.add('border-blue-500','border-2', 'bg-blue-50');
}

function salvarPet() {
  const nome = document.getElementById('petNome').value;
  const raca = document.getElementById('petRaca').value;

  if (nome) {
    selectedPet = nome + (raca ? " (" + raca + ")" : "");
    atualizarPet();
    goTo('agendamento');
  } else {
    alert("Digite pelo menos o nome do pet.");
  }
}

function atualizarPet() {
  const display = document.getElementById('petSelecionado');
  if (display) display.innerText = selectedPet;
}

// 🔥 GERAR HORÁRIOS
function gerarHorarios() {
  const container = document.getElementById('horarios');
  if (!container) return;
  container.innerHTML = '';

  const horarios = [
    "08:00","09:00","10:00","11:00",
    "13:00","14:00","15:00","16:00"
  ];

  const data = document.getElementById('date').value;

  horarios.forEach(hora => {
    const btn = document.createElement('button');
    btn.innerText = hora;
    const agendamento = data + " " + hora;
    btn.className = "p-2 border rounded-xl transition-all";

    if (horariosOcupados.includes(agendamento)) {
      btn.disabled = true;
      btn.classList.add("bg-gray-200", "text-gray-400", "cursor-not-allowed");
    } else {
      btn.onclick = () => selecionarHorario(btn, hora);
    }
    container.appendChild(btn);
  });
}

// 🎯 SELECIONAR HORÁRIO
function selecionarHorario(el, hora) {
  horarioSelecionado = hora;
  document.querySelectorAll('#horarios button')
    .forEach(b => b.classList.remove('bg-blue-500','text-white'));

  el.classList.add('bg-blue-500','text-white');
}

// 🔄 CARREGAR DA PLANILHA
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

// 🔒 FINALIZAR
async function finalizar() {
  const date = document.getElementById('date').value;

  if (!date || !horarioSelecionado || !selectedPet) {
    alert("Preencha tudo (Pet, Data e Hora)!");
    return;
  }

  const agendamento = date + " " + horarioSelecionado;

  if (horariosOcupados.includes(agendamento)) {
    alert("Este horário acabou de ser ocupado!");
    return;
  }

  // Feedback de carregamento
  const btnFinalizar = document.querySelector('button[onclick="finalizar()"]');
  btnFinalizar.innerText = "Agendando...";
  btnFinalizar.disabled = true;

  try {
    await fetch(API_URL, {
      method: "POST",
      mode: "no-cors", // Necessário para evitar erro de CORS com Apps Script
      body: JSON.stringify({
        pet: selectedPet,
        servico: "Banho",
        data: date,
        hora: horarioSelecionado
      })
    });

    document.getElementById('cPet').innerText = selectedPet;
    document.getElementById('cDate').innerText = date;
    document.getElementById('cTime').innerText = horarioSelecionado;
    goTo('confirmacao');

  } catch (e) {
    alert("Erro ao salvar. Verifique sua conexão.");
  } finally {
    btnFinalizar.innerText = "Finalizar";
    btnFinalizar.disabled = false;
  }
}

// Atualizar horários ao mudar data
document.addEventListener("change", (e) => {
  if (e.target.id === "date") gerarHorarios();
});

// Splash (3 segundos)
setTimeout(() => goTo('login'), 3000);
