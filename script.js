// ===================================================
// LAVA PET - MOTOR CLIENTE ROBUSTO & ULTRA-MODERNO
// ===================================================

let tutorDados = { nome: '', telefone: '' };
let petDados = { nome: '', raca: '', servico: 'Banho e Tosa', preco: 90 };
let horariosOcupados = [];
let horarioSelecionado = "";
let dataSelecionada = "";
let lampOn = true; // true = Luz Acesa (Modo Claro) | false = Luz Apagada (Modo Escuro)
let ultimoAgendamento = null;

// 👉 URL DO SEU GOOGLE APPS SCRIPT (MANTIDA)
const API_URL = "https://script.google.com/macros/s/AKfycbwE8I4T1FtPBEt7VZ6jJ_06mRBuQPxSKMQE5USswJ2jvnEErhtN5oQAB3cdjiM788wDVw/exec";

// ===================================================
//   1. UTILITÁRIOS DE DATA LOCAL & SINTETIZADOR DE ÁUDIO
// ===================================================

function getHojeLocalString() {
  const d = new Date();
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) audioCtx = new AudioContext();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function somClickMecanico() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.06);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.06);
  } catch (e) {}
}

function somPopSuave() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.04);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.04);
  } catch (e) {}
}


// ===================================================
//   2. LÂMPADA COMO INTERRUPTOR DE MODO CLARO / ESCURO
// ===================================================

function alternarLuzETema(forcarEstado) {
  lampOn = forcarEstado !== undefined ? forcarEstado : !lampOn;
  
  const lampGlow = document.getElementById('lampGlow');
  const lampBeam = document.getElementById('lampBeam');
  const badgeTema = document.getElementById('badgeTema');
  const body = document.body;

  if (lampOn) {
    // ☀️ LUZ ACESA = MODO CLARO
    body.classList.remove('dark-theme');
    
    if (lampGlow) { lampGlow.classList.remove('opacity-0'); lampGlow.classList.add('opacity-100'); }
    if (lampBeam) { lampBeam.classList.remove('opacity-0'); lampBeam.classList.add('opacity-95'); }
    
    if (badgeTema) {
      badgeTema.innerText = "☀️ Modo Claro";
      badgeTema.className = "text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 transition-colors";
    }
  } else {
    // 🌙 LUZ APAGADA = MODO ESCURO
    body.classList.add('dark-theme');
    
    if (lampGlow) { lampGlow.classList.remove('opacity-100'); lampGlow.classList.add('opacity-0'); }
    if (lampBeam) { lampBeam.classList.remove('opacity-95'); lampBeam.classList.add('opacity-0'); }
    
    if (badgeTema) {
      badgeTema.innerText = "🌙 Modo Escuro";
      badgeTema.className = "text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-slate-800 text-indigo-300 border border-slate-700 transition-colors";
    }
  }

  // Salva a preferência
  localStorage.setItem('lavapet_theme', lampOn ? 'light' : 'dark');
}

function puxarCordinha() {
  somClickMecanico();
  alternarLuzETema();

  // Esconder a dica após o primeiro puxão
  const dica = document.getElementById('dicaLampada');
  if (dica) {
    dica.style.opacity = '0';
    setTimeout(() => dica.remove(), 700);
  }
}

function inicializarTema() {
  const temaSalvo = localStorage.getItem('lavapet_theme');
  if (temaSalvo === 'dark') {
    alternarLuzETema(false);
  } else {
    alternarLuzETema(true);
  }

  // Dica sutil some automaticamente após 4.5 segundos
  setTimeout(() => {
    const dica = document.getElementById('dicaLampada');
    if (dica) {
      dica.style.opacity = '0';
      setTimeout(() => dica.remove(), 700);
    }
  }, 4500);
}


// ===================================================
//   3. MOTOR DE CONFETES NATIVO EM CANVAS (60 FPS)
// ===================================================
function dispararChuvaDeConfetes() {
  const canvas = document.getElementById('confettiCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const cores = ['#6366f1', '#a855f7', '#2ee6a8', '#f59e0b', '#3b82f6', '#ec4899'];
  const totalConfetes = 65;
  const confetes = [];

  for (let i = 0; i < totalConfetes; i++) {
    confetes.push({
      x: canvas.width / 2 + (Math.random() * 80 - 40),
      y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 14,
      vy: (Math.random() - 0.8) * 16,
      tamanho: Math.random() * 8 + 4,
      cor: cores[Math.floor(Math.random() * cores.length)],
      rotacao: Math.random() * 360,
      vRotacao: (Math.random() - 0.5) * 10,
      opacidade: 1
    });
  }

  let animId;
  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let vivos = 0;

    confetes.forEach(c => {
      c.x += c.vx;
      c.y += c.vy;
      c.vy += 0.35;
      c.rotacao += c.vRotacao;
      c.opacidade -= 0.009;

      if (c.opacidade > 0) {
        vivos++;
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate((c.rotacao * Math.PI) / 180);
        ctx.fillStyle = c.cor;
        ctx.globalAlpha = Math.max(0, c.opacidade);
        ctx.fillRect(-c.tamanho / 2, -c.tamanho / 2, c.tamanho, c.tamanho * 0.6);
        ctx.restore();
      }
    });

    if (vivos > 0) {
      animId = requestAnimationFrame(loop);
    } else {
      cancelAnimationFrame(animId);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  loop();
}


// ===================================================
//   4. ANIMAÇÃO DE ÓRBITA GEOMÉTRICA (WIND_UP_BRAKE)
// ===================================================
function animarOrbitaSlot(slotElement) {
  if (!slotElement) return;
  slotElement.animate([
    { transform: 'rotate(0deg) translate(21px, 0px)' },
    { transform: 'rotate(360deg) translate(21px, 0px)' }
  ], {
    duration: 1300,
    iterations: Infinity,
    easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
  });
}


// ===================================================
//   5. MÁSCARA INTELIGENTE & VALIDAÇÕES
// ===================================================
function mascaraTelefone(valor) {
  if (!valor) return "";
  valor = valor.replace(/\D/g, "");
  if (valor.length > 11) valor = valor.slice(0, 11);
  if (valor.length > 6) {
    valor = valor.replace(/^(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
  } else if (valor.length > 2) {
    valor = valor.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
  } else {
    valor = valor.replace(/^(\d*)/, "($1");
  }
  return valor;
}

function mostrarErro(inputId, msgId, show) {
  const msgEl = document.getElementById(msgId);
  const inputEl = document.getElementById(inputId);
  if (!msgEl || !inputEl) return;

  if (show) {
    msgEl.classList.remove('hidden');
    inputEl.classList.add('border-[--bad]', 'focus:ring-[--bad]/20', 'shake-error');
    inputEl.classList.remove('border-slate-200', 'focus:ring-indigo-500/15');
    setTimeout(() => inputEl.classList.remove('shake-error'), 350);
  } else {
    msgEl.classList.add('hidden');
    inputEl.classList.remove('border-[--bad]', 'focus:ring-[--bad]/20', 'shake-error');
    inputEl.classList.add('border-slate-200', 'focus:ring-indigo-500/15');
  }
}


// ===================================================
//   6. CONTROLE DE NAVEGAÇÃO ENTRE TELAS
// ===================================================
function goTo(screen, stepIndex) {
  somPopSuave();
  
  document.querySelectorAll('.screen').forEach(el => {
    el.classList.remove('active-screen');
    el.classList.add('hidden-screen');
  });

  const target = document.getElementById(screen);
  if (target) {
    target.classList.remove('hidden-screen');
    target.classList.add('active-screen');
  }

  const progressBar = document.getElementById('progressBar');
  if (screen === 'splash' || screen === 'confirmacao') {
    if (progressBar) progressBar.classList.add('hidden');
  } else {
    if (progressBar) progressBar.classList.remove('hidden');
  }

  if (stepIndex) {
    atualizarProgresso(stepIndex);
  }

  if (screen === 'agendamento') {
    const chip = document.getElementById('chipPetSelecionado');
    if (chip) chip.innerText = `🐾 ${petDados.nome || 'Pet'}`;
    inicializarTelaAgendamento();
  }
}

function voltarPara(screen) {
  if (screen === 'login') goTo('login', 1);
  if (screen === 'novoPet') goTo('novoPet', 2);
}

function atualizarProgresso(step) {
  const fill = document.getElementById('progressFill');
  if (!fill) return;

  if (step === 1) fill.style.width = '0%';
  if (step === 2) fill.style.width = '50%';
  if (step === 3) fill.style.width = '100%';

  for (let i = 1; i <= 3; i++) {
    const el = document.getElementById(`step${i}`);
    if (el) {
      if (i <= step) {
        el.classList.add('bg-gradient-to-r', 'from-indigo-600', 'to-violet-600', 'text-white');
        el.classList.remove('bg-slate-100', 'text-slate-400');
      } else {
        el.classList.remove('bg-gradient-to-r', 'from-indigo-600', 'to-violet-600', 'text-white');
        el.classList.add('bg-slate-100', 'text-slate-400');
      }
    }
  }
}


// ===================================================
//   7. IDENTIFICAÇÃO DO TUTOR (LOGIN)
// ===================================================
function validarLogin() {
  const nome = document.getElementById('tutorNome').value.trim();
  const telefone = document.getElementById('tutorTelefone').value.trim();
  let hasError = false;

  if (!nome || nome.length < 3) {
    mostrarErro('tutorNome', 'errNome', true);
    hasError = true;
  } else {
    mostrarErro('tutorNome', 'errNome', false);
  }

  const telLimpo = telefone.replace(/\D/g, "");
  if (telLimpo.length < 10) {
    mostrarErro('tutorTelefone', 'errTelefone', true);
    hasError = true;
  } else {
    mostrarErro('tutorTelefone', 'errTelefone', false);
  }

  if (!hasError) {
    tutorDados.nome = nome;
    tutorDados.telefone = telefone;
    localStorage.setItem('lavapet_user', JSON.stringify(tutorDados));
    goTo('novoPet', 2);
  }
}

function limparSessao() {
  localStorage.removeItem('lavapet_user');
  document.getElementById('tutorNome').value = '';
  document.getElementById('tutorTelefone').value = '';
  document.getElementById('welcomeTitle').innerText = "Seja bem-vindo!";
  document.getElementById('welcomeDesc').innerText = "Identifique-se para garantir o melhor horário do seu pet.";
  document.getElementById('btnLogout').classList.add('hidden');
}

function checarSessao() {
  const user = localStorage.getItem('lavapet_user');
  if (user) {
    try {
      tutorDados = JSON.parse(user);
      document.getElementById('tutorNome').value = tutorDados.nome;
      document.getElementById('tutorTelefone').value = tutorDados.telefone;
      
      const primeiroNome = tutorDados.nome.split(' ')[0];
      document.getElementById('welcomeTitle').innerText = `Olá de volta, ${primeiroNome}!`;
      document.getElementById('welcomeDesc').innerText = "Seus dados estão preenchidos. Vamos agendar seu amigo?";
      document.getElementById('btnLogout').classList.remove('hidden');
    } catch (e) {}
  }
}


// ===================================================
//   8. CADASTRO DO PET & SERVIÇOS
// ===================================================
function reagirNomePet(nome) {
  const mascote = document.getElementById('petMascote');
  if (!mascote) return;

  const emojis = ['🐶', '🐕', '🐩', '🐾', '✨', '🦴'];
  if (nome.length > 0) {
    const indice = Math.abs(nome.charCodeAt(0)) % emojis.length;
    mascote.innerText = emojis[indice];
    mascote.classList.add('scale-125');
    setTimeout(() => mascote.classList.remove('scale-125'), 200);
  } else {
    mascote.innerText = '🐶';
  }
}

function selecionarServico(nome, preco, elemento) {
  somPopSuave();
  petDados.servico = nome;
  petDados.preco = preco;
  mostrarErro('servicosContainer', 'errPetServico', false);

  document.querySelectorAll('.servico-card').forEach(card => {
    card.classList.remove('border-indigo-600', 'bg-indigo-50/70', 'ring-2', 'ring-indigo-600/30', 'scale-[1.01]');
    card.classList.add('border-slate-200');
  });

  elemento.classList.remove('border-slate-200');
  elemento.classList.add('border-indigo-600', 'bg-indigo-50/70', 'ring-2', 'ring-indigo-600/30', 'scale-[1.01]');
}

function salvarPet() {
  const nome = document.getElementById('petNome').value.trim();
  const raca = document.getElementById('petRaca').value.trim();
  let hasError = false;

  if (!nome) {
    mostrarErro('petNome', 'errPetNome', true);
    hasError = true;
  } else {
    mostrarErro('petNome', 'errPetNome', false);
  }

  if (!petDados.servico) {
    mostrarErro('servicosContainer', 'errPetServico', true);
    hasError = true;
  } else {
    mostrarErro('servicosContainer', 'errPetServico', false);
  }

  if (!hasError) {
    petDados.nome = nome;
    petDados.raca = raca;
    goTo('agendamento', 3);
  }
}


// ===================================================
//   9. ENGINE DE DATA & HORÁRIO
// ===================================================

function inicializarTelaAgendamento() {
  const hojeLocal = getHojeLocalString();
  
  if (!dataSelecionada) {
    dataSelecionada = hojeLocal;
  }

  const dateInput = document.getElementById('date');
  if (dateInput) {
    dateInput.value = dataSelecionada;
    dateInput.min = hojeLocal;
  }

  gerarPilulasDias();
  gerarHorarios();
  atualizarTextoResumo();
  sincronizarHorariosAssincrono();
}

function gerarPilulasDias() {
  const container = document.getElementById('pilulasDiasContainer');
  if (!container) return;
  container.innerHTML = '';

  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const hoje = new Date();

  for (let i = 0; i < 6; i++) {
    const dataObj = new Date();
    dataObj.setDate(hoje.getDate() + i);
    
    const ano = dataObj.getFullYear();
    const mes = String(dataObj.getMonth() + 1).padStart(2, '0');
    const dia = String(dataObj.getDate()).padStart(2, '0');
    const dataIso = `${ano}-${mes}-${dia}`;

    const diaMes = dataObj.getDate();
    const nomeSemana = i === 0 ? 'Hoje' : (i === 1 ? 'Amanhã' : diasSemana[dataObj.getDay()]);
    const isAtivo = dataIso === dataSelecionada;

    const pilula = document.createElement('button');
    pilula.className = `flex flex-col items-center justify-center min-w-[58px] py-2 px-1.5 rounded-2xl border transition-all text-xs card-touch ${
      isAtivo 
        ? 'bg-gradient-to-tr from-indigo-600 to-violet-600 text-white border-transparent shadow-md shadow-indigo-500/25 font-black scale-[1.02]' 
        : 'border-slate-200 text-slate-700 font-bold hover:border-indigo-300'
    }`;
    
    pilula.innerHTML = `
      <span class="text-[9px] uppercase tracking-tighter opacity-80">${nomeSemana}</span>
      <span class="text-sm font-extrabold mt-0.5">${diaMes}</span>
    `;

    pilula.onclick = () => {
      somPopSuave();
      dataSelecionada = dataIso;
      
      const dateInput = document.getElementById('date');
      if (dateInput) dateInput.value = dataIso;

      gerarPilulasDias();
      gerarHorarios();
      atualizarTextoResumo();
    };

    container.appendChild(pilula);
  }
}

function aoMudarDataManual(novaData) {
  if (!novaData) return;
  somPopSuave();
  dataSelecionada = novaData;
  gerarPilulasDias();
  gerarHorarios();
  atualizarTextoResumo();
}

function gerarHorarios() {
  const container = document.getElementById('horarios');
  if (!container) return;
  container.innerHTML = '';
  
  const errEl = document.getElementById('errHorario');
  if (errEl) errEl.classList.add('hidden');

  const listaHoras = [
    "08:00", "09:00", "10:00", "11:00",
    "13:00", "14:00", "15:00", "16:00", "17:00"
  ];

  const dataAtual = dataSelecionada || getHojeLocalString();

  listaHoras.forEach(hora => {
    const btn = document.createElement('button');
    
    const ocupado = horariosOcupados.some(item => {
      return item.includes(dataAtual) && item.includes(hora);
    });

    const isSelecionado = (hora === horarioSelecionado);

    if (ocupado) {
      btn.disabled = true;
      btn.innerText = hora;
      btn.className = "py-2.5 px-2 border rounded-2xl font-bold text-xs bg-slate-100/80 border-slate-200 text-slate-300 line-through cursor-not-allowed opacity-50";
    } else if (isSelecionado) {
      btn.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-white"></span> <span>${hora}</span>`;
      btn.className = "py-2.5 px-2 border rounded-2xl font-black text-xs bg-gradient-to-r from-indigo-600 to-violet-600 text-white border-transparent shadow-md scale-[1.02] flex items-center justify-center gap-1.5 card-touch";
    } else {
      btn.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-[--ok]"></span> <span>${hora}</span>`;
      btn.className = "py-2.5 px-2 border rounded-2xl font-bold text-xs border-slate-200 text-slate-700 hover:border-indigo-400 hover:text-indigo-600 flex items-center justify-center gap-1.5 card-touch shadow-sm";
      btn.onclick = () => selecionarHorario(hora);
    }

    container.appendChild(btn);
  });
}

function selecionarHorario(hora) {
  somPopSuave();
  horarioSelecionado = hora;
  
  const errEl = document.getElementById('errHorario');
  if (errEl) errEl.classList.add('hidden');

  gerarHorarios();
  atualizarTextoResumo();
}

function atualizarTextoResumo() {
  const resumoEl = document.getElementById('txtResumoAgendamento');
  if (!resumoEl) return;

  if (horarioSelecionado) {
    const partes = (dataSelecionada || getHojeLocalString()).split('-');
    const dataFormatada = partes.length === 3 ? `${partes[2]}/${partes[1]}` : dataSelecionada;
    resumoEl.innerText = `Data: ${dataFormatada} às ${horarioSelecionado}`;
    resumoEl.className = "font-black text-indigo-600 text-xs flex items-center gap-1";
  } else {
    resumoEl.innerText = "Toque em um dos horários livres acima";
    resumoEl.className = "font-bold text-slate-400 text-[11px]";
  }
}

async function sincronizarHorariosAssincrono() {
  try {
    const locais = JSON.parse(localStorage.getItem('lavapet_real_appointments') || '[]');
    locais.forEach(l => {
      if (l.data && l.hora) {
        const itemStr = `${l.data} ${l.hora}`;
        if (!horariosOcupados.includes(itemStr)) {
          horariosOcupados.push(itemStr);
        }
      }
    });
    gerarHorarios();
  } catch (e) {}

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2500);

  try {
    const res = await fetch(API_URL, { signal: controller.signal });
    clearTimeout(timeoutId);
    const dados = await res.json();
    
    if (Array.isArray(dados)) {
      dados.forEach(d => {
        let dataStr = typeof d.data === 'string' ? d.data.split('T')[0] : "";
        let horaStr = typeof d.hora === 'string' ? d.hora : "";
        if (dataStr && horaStr) {
          const itemStr = `${dataStr} ${horaStr}`;
          if (!horariosOcupados.includes(itemStr)) {
            horariosOcupados.push(itemStr);
          }
        }
      });
      gerarHorarios();
    }
  } catch (err) {}
}


// ===================================================
//   10. FINALIZAR AGENDAMENTO REAL & TICKET VIP
// ===================================================
async function finalizar() {
  const dataFinal = dataSelecionada || document.getElementById('date').value || getHojeLocalString();

  if (!horarioSelecionado) {
    const errEl = document.getElementById('errHorario');
    if (errEl) {
      errEl.innerText = "Por favor, clique em um dos horários disponíveis acima.";
      errEl.classList.remove('hidden');
    }
    return;
  }

  const btnFinalizar = document.getElementById('btnConfirmarAgendamento');
  const textoOriginal = btnFinalizar.innerHTML;
  
  btnFinalizar.innerHTML = `
    <div class="orbit scale-50 -my-2 mr-1">
      <svg class="orbit__ring" viewBox="0 0 100 100">
        <circle class="orbit__path" cx="50" cy="50" r="42" style="stroke: #000;"/>
      </svg>
      <span class="orbit__hub" style="background: #000;"></span>
      <span class="orbit__slot" id="orbitBtn"></span>
    </div>
    <span>Garantindo seu horário...</span>
  `;
  btnFinalizar.disabled = true;
  animarOrbitaSlot(document.getElementById('orbitBtn'));

  try {
    const codigoReserva = "#PET-" + Math.floor(1000 + Math.random() * 9000);
    let nomeFormatadoPet = petDados.nome + (petDados.raca ? ` (${petDados.raca})` : "");
    let nomeCliente = tutorDados.nome + " / " + tutorDados.telefone;

    fetch(API_URL, {
      method: "POST",
      mode: "no-cors",
      body: JSON.stringify({
        pet: nomeFormatadoPet,
        cliente: nomeCliente,
        servico: petDados.servico,
        data: dataFinal,
        hora: horarioSelecionado
      })
    }).catch(() => {});

    const novoAgendamentoReal = {
      id: Date.now(),
      codigo: codigoReserva,
      pet: petDados.nome,
      raca: petDados.raca || "Não informada",
      tutor: tutorDados.nome,
      telefone: tutorDados.telefone,
      servico: petDados.servico,
      preco: petDados.preco || 90,
      data: dataFinal,
      hora: horarioSelecionado,
      status: 'Confirmado',
      origem: 'Site Oficial',
      criadoEm: new Date().toISOString()
    };

    ultimoAgendamento = novoAgendamentoReal;

    const existentes = JSON.parse(localStorage.getItem('lavapet_real_appointments') || '[]');
    existentes.push(novoAgendamentoReal);
    localStorage.setItem('lavapet_real_appointments', JSON.stringify(existentes));

    const partes = dataFinal.split('-');
    const dataFormatada = `${partes[2]}/${partes[1]}`;

    document.getElementById('cPet').innerText = petDados.nome + (petDados.raca ? ` (${petDados.raca})` : '');
    document.getElementById('cCodigo').innerText = codigoReserva;
    document.getElementById('cServico').innerText = `${petDados.servico} (R$ ${petDados.preco || 90})`;
    document.getElementById('cDataHora').innerText = `${dataFormatada} às ${horarioSelecionado}`;
    
    goTo('confirmacao');

    setTimeout(() => {
      dispararChuvaDeConfetes();
    }, 250);

  } catch (e) {
    alert("Erro ao confirmar horário. Tente novamente.");
  } finally {
    btnFinalizar.innerHTML = textoOriginal;
    btnFinalizar.disabled = false;
  }
}

function compartilharWhatsApp() {
  if (!ultimoAgendamento) return;
  const foneLimpo = (ultimoAgendamento.telefone || '').replace(/\D/g, "");
  const texto = encodeURIComponent(
    `🛁 *COMPROVANTE LAVA PET*\n` +
    `Código: ${ultimoAgendamento.codigo}\n` +
    `Pet: ${ultimoAgendamento.pet}\n` +
    `Serviço: ${ultimoAgendamento.servico}\n` +
    `Data e Hora: ${ultimoAgendamento.data} às ${ultimoAgendamento.hora}\n` +
    `Tutor: ${ultimoAgendamento.tutor}\n\n` +
    `Seu amigo vai receber o melhor cuidado! ✨`
  );
  window.open(`https://api.whatsapp.com/send?phone=55${foneLimpo}&text=${texto}`, '_blank');
}

function novoAgendamentoCliente() {
  petDados = { nome: '', raca: '', servico: 'Banho e Tosa', preco: 90 };
  horarioSelecionado = "";
  document.getElementById('petNome').value = '';
  document.getElementById('petRaca').value = '';
  goTo('novoPet', 2);
}


// ===================================================
//   11. INICIALIZAÇÃO DA APLICAÇÃO
// ===================================================
document.addEventListener("DOMContentLoaded", () => {
  dataSelecionada = getHojeLocalString();
  checarSessao();
  inicializarTema();

  const splashSlot = document.getElementById('splashSlot');
  if (splashSlot) animarOrbitaSlot(splashSlot);

  const inputTel = document.getElementById('tutorTelefone');
  if (inputTel) {
    inputTel.addEventListener('input', (e) => {
      e.target.value = mascaraTelefone(e.target.value);
    });
  }

  const inputs = ['tutorNome', 'tutorTelefone', 'petNome', 'petRaca'];
  inputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => {
        if (id === 'tutorNome') mostrarErro(id, 'errNome', false);
        if (id === 'tutorTelefone') mostrarErro(id, 'errTelefone', false);
        if (id === 'petNome') mostrarErro(id, 'errPetNome', false);
      });
    }
  });

  setTimeout(() => {
    goTo('login', 1);
  }, 2200);
});
