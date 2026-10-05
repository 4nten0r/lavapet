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
    // MODO CLARO
    body.classList.remove('dark-theme');
    
    if (lampGlow) { lampGlow.classList.remove('opacity-0'); lampGlow.classList.add('opacity-100'); }
    if (lampBeam) { lampBeam.classList.remove('opacity-0'); lampBeam.classList.add('opacity-95'); }
    
    if (badgeTema) {
      badgeTema.innerText = "Modo claro";
      badgeTema.className = "lp-chip";
    }
  } else {
    // MODO ESCURO
    body.classList.add('dark-theme');
    
    if (lampGlow) { lampGlow.classList.remove('opacity-100'); lampGlow.classList.add('opacity-0'); }
    if (lampBeam) { lampBeam.classList.remove('opacity-95'); lampBeam.classList.add('opacity-0'); }
    
    if (badgeTema) {
      badgeTema.innerText = "Modo escuro";
      badgeTema.className = "lp-chip";
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
//   4. ÓRBITA UNIFICADA (portal + painel) — WIND_UP_BRAKE
//   Geometria: origin no hub + rotate() = círculo exato.
//   Durações padrão: splash 1300ms, botão 900ms, mini 1600ms.
// ===================================================
const WIND_UP_BRAKE = 'cubic-bezier(0.16, 1, 0.3, 1)';
function animarOrbitaSlot(slotElement, { voltas = 360, duracao = 1300, raio = 21 } = {}) {
  if (!slotElement || !slotElement.animate) return null;
  try { slotElement.getAnimations().forEach(a => a.cancel()); } catch (e) {}
  return slotElement.animate([
    { transform: `rotate(0deg) translate(${raio}px, 0px)` },
    { transform: `rotate(${voltas}deg) translate(${raio}px, 0px)` }
  ], {
    duration: duracao,
    iterations: Infinity,
    easing: WIND_UP_BRAKE
  });
}

// Lâmpada como STATUS (além do tema): ok / atendimento / erro.
// Base neutra vinho/creme; --ok/--bad só para veredito.
function definirStatusLampada(status) {
  const cord = document.getElementById('lampCord');
  if (!cord) return;
  cord.dataset.status = status || '';
  try {
    const hub = document.querySelector('#splash .orbit__hub');
    if (hub) {
      if (status === 'erro') { hub.style.background = 'var(--bad)'; hub.style.boxShadow = '0 0 12px var(--bad), 0 0 24px var(--bad)'; }
      else if (status === 'atendimento') { hub.style.background = '#f59e0b'; hub.style.boxShadow = '0 0 12px #f59e0b, 0 0 24px #f59e0b'; }
      else { hub.style.background = 'var(--ok)'; hub.style.boxShadow = '0 0 12px var(--ok), 0 0 24px var(--ok)'; }
    }
  } catch (e) {}
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
    inputEl.classList.add('border-[--bad]', 'input-error', 'shake-error');
    inputEl.classList.remove('border-slate-200');
    setTimeout(() => inputEl.classList.remove('shake-error'), 350);
  } else {
    msgEl.classList.add('hidden');
    inputEl.classList.remove('border-[--bad]', 'input-error', 'shake-error');
    inputEl.classList.add('border-slate-200');
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
    if (chip) chip.innerText = petDados.nome || 'Pet';
    inicializarTelaAgendamento();
  }
}

function voltarPara(screen) {
  if (screen === 'login') goTo('login', 1);
  if (screen === 'novoPet') goTo('novoPet', 2);
}

function atualizarProgresso(step) {
  const fill = document.getElementById('progressFill');
  if (fill) {
    if (step === 1) fill.style.width = '0%';
    if (step === 2) fill.style.width = '50%';
    if (step === 3) fill.style.width = '100%';
  }

  // Stepper novo (orbit.css): .lp-step.done / .now
  for (let i = 1; i <= 4; i++) {
    const bar = document.getElementById(`lpStep${i}`);
    if (bar) {
      bar.classList.toggle('done', i < step || (step === 4 && i <= 4));
      bar.classList.toggle('now', i === step && step < 4);
    }
  }

  for (let i = 1; i <= 3; i++) {
    const el = document.getElementById(`step${i}`);
    if (el) {
      if (i <= step) {
        el.style.background = 'linear-gradient(135deg, var(--lavapet-wine), var(--lavapet-wine-dark))';
        el.style.color = '#fff';
        el.classList.remove('bg-slate-100', 'text-slate-400');
      } else {
        el.style.background = '';
        el.style.color = '';
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

  // LGPD: consentimento obrigatório antes de coletar dados
  const consent = document.getElementById('consentLGPD');
  const errConsent = document.getElementById('errConsentLGPD');
  if (consent && !consent.checked) {
    if (errConsent) errConsent.classList.remove('hidden');
    hasError = true;
  } else if (errConsent) {
    errConsent.classList.add('hidden');
  }

  if (!hasError) {
    tutorDados.nome = nome;
    tutorDados.telefone = telefone;
    localStorage.setItem('lavapet_user', JSON.stringify(tutorDados));
    // Registro de consentimento (LGPD)
    localStorage.setItem('lavapet_consentimento', JSON.stringify({
      aceito: true,
      dataHora: new Date().toISOString(),
      telefone: telefone
    }));
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

  const estados = ['Calmo', 'Atento', 'Curioso', 'Pronto', 'Cuidado'];
  if (nome.length > 0) {
    const indice = Math.abs(nome.charCodeAt(0)) % estados.length;
    mascote.innerText = estados[indice];
    mascote.classList.add('scale-125');
    setTimeout(() => mascote.classList.remove('scale-125'), 200);
  } else {
    mascote.innerText = 'Pet';
  }
}

function selecionarServico(nome, preco, elemento) {
  somPopSuave();
  petDados.servico = nome;
  petDados.preco = preco;
  mostrarErro('servicosContainer', 'errPetServico', false);

  document.querySelectorAll('.servico-card').forEach(card => {
    card.style.borderColor = '';
    card.style.boxShadow = '';
    card.style.transform = '';
    card.setAttribute('aria-checked', 'false');
    card.classList.remove('scale-[1.01]');
  });

  elemento.style.borderColor = 'var(--lavapet-wine)';
  elemento.style.boxShadow = '0 12px 28px rgba(132,54,76,.18), inset 0 0 0 1px rgba(132,54,76,.10)';
  elemento.classList.add('scale-[1.01]');
  elemento.setAttribute('aria-checked', 'true');
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
        ? 'text-white border-transparent shadow-md font-black scale-[1.02]'
        : 'text-slate-700 font-bold'
    }`;
    if (isAtivo) {
      pilula.style.background = 'linear-gradient(135deg, var(--lavapet-wine), var(--lavapet-wine-dark))';
      pilula.style.boxShadow = '0 8px 18px rgba(132,54,76,.3)';
      pilula.style.borderColor = 'transparent';
    } else {
      pilula.style.background = '#fff';
      pilula.style.borderColor = 'var(--lavapet-line)';
    }
    pilula.setAttribute('role', 'tab');
    pilula.setAttribute('aria-selected', isAtivo ? 'true' : 'false');
    pilula.setAttribute('aria-label', `${nomeSemana}, dia ${diaMes}${isAtivo ? ', selecionado' : ''}`);
    
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

  const cfg = obterConfig();
  const listaHoras = cfg.horarios;
  const dataAtual = dataSelecionada || getHojeLocalString();
  const aberto = dataDisponivel(dataAtual, cfg);

  listaHoras.forEach(hora => {
    const btn = document.createElement('button');
    
    const ocupado = horariosOcupados.some(item => {
      return item.includes(dataAtual) && item.includes(hora);
    });
    const indisponivel = !aberto;

    const isSelecionado = (hora === horarioSelecionado);

    if ((ocupado || indisponivel) && !isSelecionado) {
      btn.disabled = true;
      btn.innerText = hora;
      btn.className = "slot-btn busy card-touch";
      btn.setAttribute('aria-disabled', 'true');
    } else if (isSelecionado) {
      btn.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-white"></span> <span>${hora}</span>`;
      btn.className = "slot-btn sel card-touch scale-[1.02] flex items-center justify-center gap-1.5";
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', 'true');
      btn.setAttribute('aria-label', `Horário ${hora}, selecionado`);
      btn.onclick = () => selecionarHorario(hora);
    } else {
      btn.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-[--ok]"></span> <span>${hora}</span>`;
      btn.className = "slot-btn card-touch flex items-center justify-center gap-1.5";
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', 'false');
      btn.setAttribute('aria-label', `Horário ${hora}, livre`);
      btn.onclick = () => selecionarHorario(hora);
    }

    container.appendChild(btn);
  });

  // Aviso de dia fechado/bloqueado
  const aviso = document.getElementById('avisoDataBloqueada');
  if (aviso) {
    if (!aberto) {
      aviso.innerText = 'Dia fechado ou bloqueado pela empresa. Escolha outra data.';
      aviso.classList.remove('hidden');
    } else {
      aviso.classList.add('hidden');
    }
  }
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
    resumoEl.className = "font-black text-xs flex items-center gap-1";
    resumoEl.style.color = 'var(--lavapet-wine)';
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

  // MODO 1 CLIENTE: horários ocupados vêm do backend próprio.
  try {
    const base = obterSaasBase();
    const dataISO = dataSelecionada || getHojeLocalString();
    const controllerSaaS = new AbortController();
    const timeoutSaaS = setTimeout(() => controllerSaaS.abort(), 2500);
    const res = await fetch(`${base}/public/slots?data=${encodeURIComponent(dataISO)}`, { signal: controllerSaaS.signal });
    clearTimeout(timeoutSaaS);
    if (res.ok) {
      const payload = await res.json();
      (payload.ocupados || []).forEach(hora => {
        const itemStr = `${payload.data || dataISO} ${hora}`;
        if (!horariosOcupados.includes(itemStr)) horariosOcupados.push(itemStr);
      });
      gerarHorarios();
    }
  } catch (e) {}

  // Fallback legado: Google Sheets (só se configurado).

  const apiUrl = obterApiUrl();
  if (!apiUrl) return;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2500);

  try {
    const url = new URL(apiUrl);
    const token = obterApiToken();
    if (token) url.searchParams.set('token', token);
    const res = await fetch(url, { signal: controller.signal });
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

  // Revalidar disponibilidade (data fechada ou horário já ocupado)
  const cfg = obterConfig();
  if (!dataDisponivel(dataFinal, cfg)) {
    alert('Este dia está fechado. Escolha outra data.');
    gerarHorarios();
    return;
  }
  const jaOcupado = horariosOcupados.some(item => item.includes(dataFinal) && item.includes(horarioSelecionado));
  if (jaOcupado) {
    alert('Este horário acabou de ser ocupado. Escolha outro.');
    gerarHorarios();
    return;
  }

  // Consentimento LGPD
  const consent = document.getElementById('consentLGPD');
  if (consent && !consent.checked) {
    alert('Para agendar, é necessário aceitar a Política de Privacidade.');
    return;
  }

  const btnFinalizar = document.getElementById('btnConfirmarAgendamento');
  const textoOriginal = btnFinalizar.innerHTML;
  
  btnFinalizar.innerHTML = `
    <div class="orbit orbit--mini -my-2 mr-1">
      <svg class="orbit__ring" viewBox="0 0 100 100">
        <circle class="orbit__path" cx="50" cy="50" r="42"/>
      </svg>
      <span class="orbit__hub"></span>
      <span class="orbit__slot" id="orbitBtn"></span>
    </div>
    <span>Garantindo seu horário...</span>
  `;
  btnFinalizar.disabled = true;
  definirStatusLampada('atendimento');
  animarOrbitaSlot(document.getElementById('orbitBtn'), { duracao: 900, raio: 12 });

  try {
    const codigoReserva = "#PET-" + Math.floor(1000 + Math.random() * 9000);
    let nomeFormatadoPet = petDados.nome + (petDados.raca ? ` (${petDados.raca})` : "");
    let nomeCliente = tutorDados.nome + " / " + tutorDados.telefone;

    // MODO 1 CLIENTE: reserva com trava anti-conflito no backend próprio.
    let codigoFinal = codigoReserva;
    try {
      const base = obterSaasBase();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${base}/public/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          pet: petDados.nome,
          raca: petDados.raca,
          tutor: tutorDados.nome,
          telefone: tutorDados.telefone,
          servico: petDados.servico,
          preco: petDados.preco || 90,
          data: dataFinal,
          hora: horarioSelecionado,
          codigo: codigoReserva
        })
      });
      clearTimeout(timeoutId);
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        definirStatusLampada('erro');
        alert(payload.error || 'Este horário acabou de ser ocupado. Escolha outro.');
        gerarHorarios();
        return;
      }
      if (payload.appointment && payload.appointment.codigo) codigoFinal = payload.appointment.codigo;
    } catch (e) {
      // Sem backend alcançável: segue com confirmação local (modo offline).
      definirStatusLampada('erro');
    }

    const codigoReservaFinal = codigoFinal;

    const apiUrl = obterApiUrl();
    if (apiUrl) fetch(apiUrl, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        token: obterApiToken(),
        pet: nomeFormatadoPet,
        cliente: nomeCliente,
        servico: petDados.servico,
        data: dataFinal,
        hora: horarioSelecionado
      })
    }).catch(() => {});

    const novoAgendamentoReal = {
      id: Date.now(),
      codigo: codigoReservaFinal,
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
      consentimentoLGPD: consent ? { aceito: consent.checked, dataHora: new Date().toISOString() } : null,
      criadoEm: new Date().toISOString()
    };

    ultimoAgendamento = novoAgendamentoReal;

    const existentes = JSON.parse(localStorage.getItem('lavapet_real_appointments') || '[]');
    existentes.push(novoAgendamentoReal);
    localStorage.setItem('lavapet_real_appointments', JSON.stringify(existentes));

    const partes = dataFinal.split('-');
    const dataFormatada = `${partes[2]}/${partes[1]}`;

    document.getElementById('cPet').innerText = petDados.nome + (petDados.raca ? ` (${petDados.raca})` : '');
    document.getElementById('cCodigo').innerText = codigoReservaFinal;
    document.getElementById('cServico').innerText = `${petDados.servico} (R$ ${petDados.preco || 90})`;
    document.getElementById('cDataHora').innerText = `${dataFormatada} às ${horarioSelecionado}`;
    
    // Nome da empresa + resumo de Pix (sinal de reserva)
    const cEmpresa = document.getElementById('cEmpresa');
    if (cEmpresa) cEmpresa.innerText = cfg.nome;
    const boxPix = document.getElementById('boxPixSinal');
    if (boxPix) {
      if (cfg.pix.chave) {
        const sinal = Math.round((petDados.preco || 90) * (cfg.pix.sinal / 100) * 100) / 100;
        boxPix.innerHTML = `
          <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Sinal de reserva (Pix)</p>
          <p class="text-xs text-slate-700 font-semibold">R$ ${sinal} para ${cfg.pix.nome || cfg.nome}</p>
          <p class="text-[11px] font-mono font-bold mt-0.5 break-all" style="color: var(--lavapet-wine);">${cfg.pix.chave}</p>
          <button onclick="copiarChavePix()" class="lp-btn-wine mt-1.5 text-[10px] px-2.5 py-1">Copiar chave</button>`;
        boxPix.classList.remove('hidden');
      } else {
        boxPix.classList.add('hidden');
      }
    }
    
    goTo('confirmacao');
    definirStatusLampada('ok');
    renderizarOtpCodigo(codigoReservaFinal);

    setTimeout(() => {
      dispararChuvaDeConfetes();
    }, 250);

  } catch (e) {
    definirStatusLampada('erro');
    alert("Erro ao confirmar horário. Tente novamente.");
  } finally {
    btnFinalizar.innerHTML = textoOriginal;
    btnFinalizar.disabled = false;
  }
}

function compartilharWhatsApp() {
  if (!ultimoAgendamento) return;
  const cfg = obterConfig();
  const foneLimpo = (ultimoAgendamento.telefone || '').replace(/\D/g, "");
  const msg = preencherTemplate(cfg.templates.confirmacao, {
    tutor: ultimoAgendamento.tutor,
    pet: ultimoAgendamento.pet,
    servico: ultimoAgendamento.servico,
    data: formatarDataBr(ultimoAgendamento.data),
    hora: ultimoAgendamento.hora,
    codigo: ultimoAgendamento.codigo,
    empresa: cfg.nome,
    valor: ultimoAgendamento.preco
  });
  window.open(`https://api.whatsapp.com/send?phone=55${foneLimpo}&text=${encodeURIComponent(msg)}`, '_blank');
}

function copiarChavePix() {
  const cfg = obterConfig();
  if (navigator.clipboard && cfg.pix.chave) {
    navigator.clipboard.writeText(cfg.pix.chave);
  }
}

function novoAgendamentoCliente() {
  petDados = { nome: '', raca: '', servico: 'Banho e Tosa', preco: 90 };
  horarioSelecionado = "";
  document.getElementById('petNome').value = '';
  document.getElementById('petRaca').value = '';
  definirStatusLampada('');
  goTo('novoPet', 2);
}

// Slot OTP do código #PET-XXXX (mesma linguagem da órbita).
// Permite revisar/ditar o código sem sair do ticket.
function renderizarOtpCodigo(codigo) {
  const box = document.getElementById('otpCodigoBox');
  if (!box) return;
  const digitos = String(codigo || '').replace(/[^A-Za-z0-9]/g, '').slice(-4).padStart(4, '0').split('');
  box.innerHTML = digitos.map((d, i) =>
    `<input class="otp-slot" maxlength="1" inputmode="text" autocomplete="one-time-code" data-otp="${i}" value="${d}" aria-label="Dígito ${i + 1} do código">`
  ).join('');
  const inputs = [...box.querySelectorAll('[data-otp]')];
  inputs.forEach((inp, i) => {
    inp.addEventListener('input', () => {
      inp.value = inp.value.replace(/[^A-Za-z0-9]/g, '').slice(-1);
      if (inp.value && inputs[i + 1]) inputs[i + 1].focus();
    });
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !inp.value && inputs[i - 1]) inputs[i - 1].focus();
    });
  });
}

// ===================================================
//   11. WHITE-LABEL & SERVIÇOS DINÂMICOS (config.js)
// ===================================================

function aplicarIdentidadePortal() {
  const cfg = obterConfig();
  document.querySelectorAll('[data-empresa-nome]').forEach(el => el.innerText = cfg.nome);
  document.querySelectorAll('[data-empresa-slogan]').forEach(el => el.innerText = cfg.slogan);
  const r = document.documentElement.style;
  r.setProperty('--brand', cfg.corPrimaria);
}

// Renderizar cards de serviço a partir da configuração da empresa
function renderizarServicosPortal() {
  const cfg = obterConfig();
  const container = document.getElementById('servicosContainer');
  if (!container) return;
  const iniciais = ['BANHO', 'TOSA', 'COMBO'];
  container.innerHTML = cfg.servicos.map((s, i) => `
    <div onclick="selecionarServico('${s.nome.replace(/'/g, "\\'")}', ${s.preco}, this)" role="radio" aria-checked="false" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();selecionarServico('${s.nome.replace(/'/g, "\\'")}', ${s.preco}, this)}" class="servico-card card-touch p-3.5 rounded-2xl bg-white flex items-center justify-between cursor-pointer relative overflow-hidden group" style="border: 1px solid var(--lavapet-line);">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center text-[9px] font-black shadow-inner group-hover:scale-110 transition-transform" style="background: var(--lavapet-rose); color: var(--lavapet-wine);">
          ${iniciais[i % iniciais.length]}
        </div>
        <div>
          <p class="font-extrabold text-slate-800 text-xs">${s.nome}</p>
          <p class="text-slate-400 text-[10px]">${s.descricao || ''}${s.duracao ? ` - ${s.duracao} min` : ''}</p>
        </div>
      </div>
      <span class="text-xs font-black px-2.5 py-1 rounded-full whitespace-nowrap lp-chip">R$ ${s.preco}</span>
    </div>`).join('');
}


// ===================================================
//   11. INICIALIZAÇÃO DA APLICAÇÃO (MODO 1 CLIENTE)
//   Config oficial vem do backend; portal reflete o painel.
// ===================================================
document.addEventListener("DOMContentLoaded", async () => {
  dataSelecionada = getHojeLocalString();
  checarSessao();
  inicializarTema();
  try {
    const base = obterSaasBase();
    const res = await fetch(`${base}/public/config`);
    if (res.ok) {
      const payload = await res.json();
      if (payload && payload.config) {
        localStorage.setItem(LAVAPET_CONFIG_KEY, JSON.stringify(payload.config));
      } else if (payload && payload.petshop_name) {
        const cfg = obterConfig();
        cfg.nome = payload.petshop_name;
        salvarConfig(cfg);
      }
    }
  } catch (e) {}
  aplicarIdentidadePortal();
  renderizarServicosPortal();

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
