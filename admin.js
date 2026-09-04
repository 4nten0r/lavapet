// ===================================================
// LAVA PET - PORTAL DO GESTOR & ENGINE ADMINISTRATIVA
// ===================================================

// CONFIGURAÇÃO DO BACKEND GOOGLE APPS SCRIPT
const API_URL = "https://script.google.com/macros/s/AKfycbwE8I4T1FtPBEt7VZ6jJ_06mRBuQPxSKMQE5USswJ2jvnEErhtN5oQAB3cdjiM788wDVw/exec";

// ESTADO GLOBAL DO PAINEL DO DONO
let agendamentosReais = [];
let statusFiltroAtual = 'todos';
let notificacoesAtivas = false;
let audioCtx = null;

// ===================================================
//   1. SEGURANÇA & CRIPTOGRAFIA (WEB CRYPTO SHA-256)
// ===================================================

async function hashSenha(senha) {
  const enc = new TextEncoder();
  const data = enc.encode(senha + "_lavapet_salt_2026");
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Inicializa a credencial padrão de fábrica se não existir
async function inicializarCredencialDono() {
  if (!localStorage.getItem('lavapet_admin_auth')) {
    const hashPadrao = await hashSenha("admin123");
    const adminConfig = {
      email: "admin@lavapet.com",
      hash: hashPadrao,
      criadoEm: new Date().toISOString()
    };
    localStorage.setItem('lavapet_admin_auth', JSON.stringify(adminConfig));
  }
}

async function realizarLogin(e) {
  e.preventDefault();
  const emailInput = document.getElementById('adminEmail').value.trim();
  const senhaInput = document.getElementById('adminSenha').value;
  const msgErro = document.getElementById('msgErroLogin');
  const btn = document.getElementById('btnEntrarAdmin');

  btn.innerHTML = `<span class="animate-pulse">Validando credenciais...</span>`;
  btn.disabled = true;

  try {
    const authData = JSON.parse(localStorage.getItem('lavapet_admin_auth'));
    const inputHash = await hashSenha(senhaInput);

    if (authData && authData.email.toLowerCase() === emailInput.toLowerCase() && authData.hash === inputHash) {
      // Criar token de sessão com expiração
      const sessionToken = {
        token: "tok_" + Math.random().toString(36).substring(2) + Date.now(),
        email: authData.email,
        expiraEm: Date.now() + (8 * 60 * 60 * 1000) // 8 horas de sessão ativa
      };
      sessionStorage.setItem('lavapet_admin_session', JSON.stringify(sessionToken));

      msgErro.classList.add('hidden');
      mostrarDashboard();
    } else {
      msgErro.classList.remove('hidden');
    }
  } catch (err) {
    console.error("Erro na autenticação:", err);
    msgErro.classList.remove('hidden');
  } finally {
    btn.innerHTML = `<span>Entrar no Painel</span> <span>→</span>`;
    btn.disabled = false;
  }
}

function alternarVisibilidadeSenha() {
  const senhaEl = document.getElementById('adminSenha');
  const iconEl = document.getElementById('txtIconEye');
  if (senhaEl.type === 'password') {
    senhaEl.type = 'text';
    iconEl.innerText = '🙈';
  } else {
    senhaEl.type = 'password';
    iconEl.innerText = '👁️';
  }
}

function verificarSessaoAtiva() {
  const sessionStr = sessionStorage.getItem('lavapet_admin_session');
  if (!sessionStr) return false;

  try {
    const session = JSON.parse(sessionStr);
    if (Date.now() < session.expiraEm) {
      return true;
    } else {
      sessionStorage.removeItem('lavapet_admin_session');
      return false;
    }
  } catch (e) {
    return false;
  }
}

function realizarLogout() {
  sessionStorage.removeItem('lavapet_admin_session');
  document.getElementById('dashboardScreen').classList.add('hidden');
  document.getElementById('authScreen').classList.remove('hidden');
}

function mostrarDashboard() {
  document.getElementById('authScreen').classList.add('hidden');
  document.getElementById('dashboardScreen').classList.remove('hidden');
  
  // Iniciar relógio e carregar dados reais
  iniciarRelogio();
  carregarAgendamentosReais();
}


// ===================================================
//   2. SINTETIZADOR DE SOM HARMÔNICO & NOTIFICAÇÕES
// ===================================================

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

function somChimeNotificacao() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const agora = ctx.currentTime;
    [659.25, 987.77].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, agora + (i * 0.09));
      gain.gain.setValueAtTime(0, agora + (i * 0.09));
      gain.gain.linearRampToValueAtTime(0.2, agora + (i * 0.09) + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, agora + (i * 0.09) + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(agora + (i * 0.09));
      osc.stop(agora + (i * 0.09) + 0.65);
    });
  } catch (e) {}
}

function alternarNotificacoesDono() {
  if (!("Notification" in window)) {
    alert("Seu navegador não possui suporte a notificações de desktop.");
    return;
  }

  if (Notification.permission === "granted") {
    notificacoesAtivas = true;
    somChimeNotificacao();
    atualizarBotaoNotificacao(true);
    new Notification("Lava Pet Gestor", {
      body: "Alertas sonoros e notificações ativados com sucesso!",
      icon: "https://fav.farm/🛁"
    });
  } else {
    Notification.requestPermission().then(permission => {
      if (permission === "granted") {
        notificacoesAtivas = true;
        somChimeNotificacao();
        atualizarBotaoNotificacao(true);
      } else {
        atualizarBotaoNotificacao(false);
      }
    });
  }
}

function atualizarBotaoNotificacao(ativo) {
  const btn = document.getElementById('btnAlertaDono');
  const txt = document.getElementById('textoAlertaSino');
  if (ativo) {
    btn.className = "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/20 text-[--ok] border border-emerald-500/30 transition-all card-touch";
    txt.innerText = "Alertas Ativos";
  } else {
    btn.className = "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-white/10 transition-all card-touch";
    txt.innerText = "Ativar Alertas";
  }
}


// ===================================================
//   3. GESTÃO DOS AGENDAMENTOS REAIS (SEM MOCKS)
// ===================================================

function carregarAgendamentosReais() {
  // Ler os dados gravados genuinamente pelo site ou manualmente pelo gestor
  const gravados = localStorage.getItem('lavapet_real_appointments');
  agendamentosReais = gravados ? JSON.parse(gravados) : [];

  renderizarListaFiltrada();
}

function salvarAgendamentosReais() {
  localStorage.setItem('lavapet_real_appointments', JSON.stringify(agendamentosReais));
  renderizarListaFiltrada();
}

function alterarStatus(id, novoStatus) {
  const index = agendamentosReais.findIndex(a => a.id === id);
  if (index !== -1) {
    agendamentosReais[index].status = novoStatus;
    salvarAgendamentosReais();
  }
}

function excluirAgendamento(id) {
  if (confirm("Deseja realmente remover este agendamento da agenda?")) {
    agendamentosReais = agendamentosReais.filter(a => a.id !== id);
    salvarAgendamentosReais();
  }
}


// ===================================================
//   4. RENDERIZAÇÃO DO DASHBOARD & MÉTRICAS
// ===================================================

function renderizarListaFiltrada() {
  const dataFiltro = document.getElementById('filtroDataAdmin').value;
  const busca = (document.getElementById('buscaTexto').value || '').toLowerCase().trim();
  const container = document.getElementById('containerAgendamentos');
  const estadoVazio = document.getElementById('estadoVazio');

  // Filtrar apenas agendamentos da data selecionada
  let filtrados = agendamentosReais.filter(item => {
    const bateData = !dataFiltro || item.data === dataFiltro;
    const bateStatus = statusFiltroAtual === 'todos' || item.status === statusFiltroAtual;
    const bateBusca = !busca || 
      (item.pet && item.pet.toLowerCase().includes(busca)) || 
      (item.tutor && item.tutor.toLowerCase().includes(busca)) ||
      (item.telefone && item.telefone.includes(busca));

    return bateData && bateStatus && bateBusca;
  });

  // Ordenar cronologicamente por horário (08:00, 09:00...)
  filtrados.sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));

  // Atualizar Contagem e Métricas
  document.getElementById('badgeContagem').innerText = filtrados.length;
  atualizarMetricasDoDia(dataFiltro);

  if (filtrados.length === 0) {
    container.innerHTML = '';
    estadoVazio.classList.remove('hidden');
    return;
  }

  estadoVazio.classList.add('hidden');

  container.innerHTML = filtrados.map(item => {
    const foneLimpo = (item.telefone || '').replace(/\D/g, "");
    const msgWhats = encodeURIComponent(`Olá ${item.tutor}! Aqui é da equipe Lava Pet 🛁. Confirmamos o atendimento do(a) ${item.pet} para o serviço de ${item.servico} no dia ${formatarDataBr(item.data)} às ${item.hora}. Estamos aguardando você!`);
    const linkWhats = `https://api.whatsapp.com/send?phone=55${foneLimpo}&text=${msgWhats}`;

    // Cor do status
    let corBadge = "bg-emerald-500/20 text-[--ok] border-emerald-500/30";
    let corBorda = "border-l-[--ok]";
    if (item.status === 'Em Atendimento') {
      corBadge = "bg-indigo-500/20 text-indigo-300 border-indigo-500/30";
      corBorda = "border-l-indigo-500";
    } else if (item.status === 'Concluído') {
      corBadge = "bg-slate-700/50 text-slate-300 border-white/10";
      corBorda = "border-l-slate-600";
    } else if (item.status === 'Cancelado') {
      corBadge = "bg-red-500/20 text-[--bad] border-red-500/30";
      corBorda = "border-l-[--bad]";
    }

    return `
      <div class="glass-panel p-4 rounded-2xl border border-white/5 border-l-4 ${corBorda} shadow-lg transition-all flex flex-col justify-between gap-3 card-touch">
        
        <!-- Topo do Card -->
        <div class="flex items-start justify-between">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-xl bg-slate-800/90 border border-white/10 flex flex-col items-center justify-center font-mono shadow-inner">
              <span class="text-xs font-extrabold text-white">${item.hora}</span>
              <span class="text-[9px] text-slate-400">HORA</span>
            </div>
            <div>
              <h4 class="font-extrabold text-white text-sm flex items-center gap-1.5">
                ${item.pet}
                ${item.raca ? `<span class="text-[10px] font-normal text-slate-400">(${item.raca})</span>` : ''}
              </h4>
              <p class="text-xs font-semibold text-indigo-400 mt-0.5">
                ${item.servico} • <span class="text-emerald-400">R$ ${item.preco || 50}</span>
              </p>
            </div>
          </div>

          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full border ${corBadge}">
            ${item.status}
          </span>
        </div>

        <!-- Informações do Tutor -->
        <div class="bg-slate-900/40 p-2.5 rounded-xl border border-white/5 flex items-center justify-between text-xs">
          <div>
            <span class="text-slate-400 text-[10px] block">Tutor Responsável</span>
            <span class="font-semibold text-slate-200">${item.tutor}</span>
          </div>
          <div class="text-right">
            <span class="text-slate-400 text-[10px] block">Contato</span>
            <span class="font-mono text-slate-300 text-[11px]">${item.telefone}</span>
          </div>
        </div>

        <!-- Barra de Ações Rápidas -->
        <div class="flex items-center justify-between gap-2 pt-1 border-t border-white/5">
          <!-- Botão WhatsApp -->
          <a href="${linkWhats}" target="_blank" class="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-[--ok] border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-all card-touch">
            <span>💬</span> <span>WhatsApp</span>
          </a>

          <!-- Ações de Status -->
          <div class="flex items-center gap-1">
            ${item.status !== 'Em Atendimento' && item.status !== 'Concluído' ? `
              <button onclick="alterarStatus(${item.id}, 'Em Atendimento')" class="px-2.5 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold card-touch" title="Iniciar Banho/Tosa">
                Iniciar
              </button>
            ` : ''}

            ${item.status !== 'Concluído' ? `
              <button onclick="alterarStatus(${item.id}, 'Concluído')" class="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 text-xs font-bold card-touch" title="Marcar como Concluído">
                ✓ Pronto
              </button>
            ` : `
              <button onclick="alterarStatus(${item.id}, 'Confirmado')" class="px-2 py-1 text-slate-400 text-[10px] hover:text-slate-200">
                Reabrir
              </button>
            `}

            <button onclick="excluirAgendamento(${item.id})" class="p-1.5 text-slate-500 hover:text-[--bad] rounded-lg transition-colors" title="Cancelar Agendamento">
              🗑️
            </button>
          </div>
        </div>

      </div>
    `;
  }).join('');
}

function atualizarMetricasDoDia(dataFiltro) {
  const agendadosDia = agendamentosReais.filter(item => !dataFiltro || item.data === dataFiltro);
  
  const total = agendadosDia.length;
  const receita = agendadosDia
    .filter(i => i.status !== 'Cancelado')
    .reduce((acc, curr) => acc + (Number(curr.preco) || 50), 0);
  const concluidos = agendadosDia.filter(i => i.status === 'Concluído').length;

  document.getElementById('metricaTotal').innerText = total;
  document.getElementById('metricaReceita').innerText = `R$ ${receita}`;
  document.getElementById('metricaConcluidos').innerText = concluidos;

  // Próximo agendamento pendente
  const pendentes = agendadosDia.filter(i => i.status === 'Confirmado' || i.status === 'Em Atendimento');
  if (pendentes.length > 0) {
    pendentes.sort((a, b) => a.hora.localeCompare(b.hora));
    document.getElementById('metricaProximo').innerText = pendentes[0].pet;
    document.getElementById('metricaProximoHora').innerText = `Às ${pendentes[0].hora} • ${pendentes[0].servico}`;
  } else {
    document.getElementById('metricaProximo').innerText = "Nenhum";
    document.getElementById('metricaProximoHora').innerText = "Todos atendidos ou sem fila";
  }
}

function formatarDataBr(dataStr) {
  if (!dataStr) return "";
  const partes = dataStr.split('-');
  return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : dataStr;
}


// ===================================================
//   5. CONTROLE DE FILTROS & MODAL MANUAL
// ===================================================

function definirDataFiltroHoje() {
  const hoje = new Date().toISOString().split('T')[0];
  document.getElementById('filtroDataAdmin').value = hoje;
  renderizarListaFiltrada();
}

function definirDataFiltroAmanha() {
  const amanhaObj = new Date();
  amanhaObj.setDate(amanhaObj.getDate() + 1);
  const amanha = amanhaObj.toISOString().split('T')[0];
  document.getElementById('filtroDataAdmin').value = amanha;
  renderizarListaFiltrada();
}

function filtrarStatus(status, botaoEl) {
  statusFiltroAtual = status;
  document.querySelectorAll('.btn-filtro-status').forEach(b => {
    b.className = "btn-filtro-status px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-400 font-semibold card-touch";
  });
  botaoEl.className = "btn-filtro-status px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-bold card-touch";
  renderizarListaFiltrada();
}

// Modal de Agendamento Manual (Balcão/Telefone)
function abrirModalManual() {
  document.getElementById('mData').value = document.getElementById('filtroDataAdmin').value;
  document.getElementById('modalManual').classList.remove('hidden');
}

function fecharModalManual() {
  document.getElementById('modalManual').classList.add('hidden');
}

function salvarAgendamentoManual(e) {
  e.preventDefault();
  const pet = document.getElementById('mPetNome').value.trim();
  const raca = document.getElementById('mPetRaca').value.trim();
  const tutor = document.getElementById('mTutorNome').value.trim();
  const telefone = document.getElementById('mTutorTelefone').value.trim();
  const selectServico = document.getElementById('mServico');
  const servico = selectServico.value;
  const preco = Number(selectServico.options[selectServico.selectedIndex].getAttribute('data-preco')) || 50;
  const hora = document.getElementById('mHora').value;
  const data = document.getElementById('mData').value;

  const novo = {
    id: Date.now(),
    pet,
    raca: raca || "Não informada",
    tutor,
    telefone,
    servico,
    preco,
    data,
    hora,
    status: 'Confirmado',
    origem: 'Balcão / Telefone',
    criadoEm: new Date().toISOString()
  };

  agendamentosReais.push(novo);
  salvarAgendamentosReais();

  // Enviar também para o Google Sheets em segundo plano
  fetch(API_URL, {
    method: "POST",
    mode: "no-cors",
    body: JSON.stringify({
      pet: pet + (raca ? ` (${raca})` : ""),
      cliente: `${tutor} / ${telefone}`,
      servico,
      data,
      hora
    })
  }).catch(() => {});

  somChimeNotificacao();
  fecharModalManual();
  document.getElementById('formManual').reset();
}


// ===================================================
//   6. RELÓGIO EM TEMPO REAL & ESCUTA DE EVENTOS
// ===================================================

function iniciarRelogio() {
  const atualizar = () => {
    const agora = new Date();
    const relogioEl = document.getElementById('relogioTopo');
    const dataEl = document.getElementById('dataTopo');
    if (relogioEl) {
      relogioEl.innerText = agora.toLocaleTimeString('pt-BR');
    }
    if (dataEl) {
      dataEl.innerText = agora.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
    }
  };
  atualizar();
  setInterval(atualizar, 1000);
}

// Escutar novos agendamentos salvos pelo cliente na mesma janela/outra aba
window.addEventListener('storage', (e) => {
  if (e.key === 'lavapet_real_appointments') {
    carregarAgendamentosReais();
    somChimeNotificacao();
    if (notificacoesAtivas && "Notification" in window && Notification.permission === "granted") {
      new Notification("Novo Agendamento Recebido! 🐾", {
        body: "Um cliente acabou de realizar um agendamento no site.",
        icon: "https://fav.farm/🛁"
      });
    }
  }
});


// ===================================================
//   7. INICIALIZAÇÃO DO SISTEMA
// ===================================================
document.addEventListener("DOMContentLoaded", async () => {
  await inicializarCredencialDono();

  const hoje = new Date().toISOString().split('T')[0];
  const filtroData = document.getElementById('filtroDataAdmin');
  if (filtroData) {
    filtroData.value = hoje;
    filtroData.addEventListener('change', renderizarListaFiltrada);
  }

  if (verificarSessaoAtiva()) {
    mostrarDashboard();
  } else {
    document.getElementById('authScreen').classList.remove('hidden');
    document.getElementById('dashboardScreen').classList.add('hidden');
  }

  // Notificações
  if ("Notification" in window && Notification.permission === "granted") {
    notificacoesAtivas = true;
    atualizarBotaoNotificacao(true);
  }
});

