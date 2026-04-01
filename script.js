let selectedPet = '';
let horariosOcupados = [];
let horarioSelecionado = "";

// 👉 COLE SUA URL DO APPS SCRIPT AQUI
const API_URL = "https://script.google.com/macros/s/AKfycbwE8I4T1FtPBEt7VZ6jJ_06mRBuQPxSKMQE5USswJ2jvnEErhtN5oQAB3cdjiM788wDVw/exec";

function goTo(screen) {
  document.querySelectorAll('.screen')
    .forEach(el => el.classList.add('hidden'));

  document.getElementById(screen).classList.remove('hidden');

  if (screen === 'agendamento') {
    atualizarPet();
    carregarHorarios();
  }
}

function selectPet(name, el) {
  selectedPet = name;

  document.querySelectorAll('.pet-card')
    .forEach(c => c.classList.remove('border-blue-500','border-2'));

  el.classList.add('border-blue-500','border-2');
}

function salvarPet() {
  const nome = document.getElementById('petNome').value;
  const raca = document.getElementById('petRaca').value;

  selectedPet = nome + " (" + raca + ")";
  goTo('pet');
}

function atualizarPet() {
  document.getElementById('petSelecionado').innerText = selectedPet;
}

// 🔥 GERAR HORÁRIOS
function gerarHorarios() {
  const container = document.getElementById('horarios');
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

    btn.className = "p-2 border rounded";

    if (horariosOcupados.includes(agendamento)) {
      btn.disabled = true;
      btn.classList.add("bg-gray-300");
    } else {
      btn.onclick = () => selecionarHorario(btn, hora);
    }

    container.appendChild(btn);
  });
}

// 🎯 SELECIONAR
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

  } catch {
    gerarHorarios();
  }
}

// 🔒 FINALIZAR
async function finalizar() {
  const date = document.getElementById('date').value;

  if (!date || !horarioSelecionado || !selectedPet) {
    alert("Preencha tudo!");
    return;
  }

  const agendamento = date + " " + horarioSelecionado;

  if (horariosOcupados.includes(agendamento)) {
    alert("Horário ocupado!");
    return;
  }

  await fetch(API_URL, {
    method: "POST",
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
}

// atualizar horários ao mudar data
document.addEventListener("change", (e) => {
  if (e.target.id === "date") gerarHorarios();
});

// splash
setTimeout(() => goTo('login'), 1500);