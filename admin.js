// ===================================================
// LAVA PET - PORTAL DO GESTOR & ENGINE ADMINISTRATIVA
// ===================================================

// ESTADO GLOBAL DO PAINEL DO DONO
let agendamentosReais = [];
let statusFiltroAtual = 'todos';
let notificacoesAtivas = false;
let audioCtx = null;

// ===================================================
//   1. SEGURANÇA & AUTENTICAÇÃO (WEB CRYPTO SHA-256)
// ===================================================

const LAVAPET_AUTH_KEY = 'lavapet_admin_auth';
const LAVAPET_SESSION_KEY = 'lavapet_admin_session';

// Hash SHA-256 com salt por empresa
async function hashSenha(senha) {
  const cfg = obterConfig();
  const salt = 'lavapet_' + (cfg.nome || 'spa').toLowerCase().replace(/\s+/g, '_') + '_2026';
  const enc = new TextEncoder();
  const data = enc.encode(senha + '_' + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Login OU criação de acesso no primeiro uso (sem senha padrão de fábrica)
async function realizarLogin(e) {
  e.preventDefault();
  const emailInput = document.getElementById('adminEmail').value.trim();
  const senhaInput = document.getElementById('adminSenha').value;
  const msgErro = document.getElementById('msgErroLogin');
  const btn = document.getElementById('btnEntrarAdmin');

  if (!emailInput.includes('@') || senhaInput.length < 6) {
    msgErro.classList.remove('hidden');
    msgErro.innerText = 'Informe um e-mail válido e senha com 6+ caracteres.';
    return;
  }

  btn.innerHTML = `<span class="animate-pulse">Validando credenciais...</span>`;
  btn.disabled = true;

  try {
    const credencial = JSON.parse(localStorage.getItem(LAVAPET_AUTH_KEY) || 'null');
    const inputHash = await hashSenha(senhaInput);

    if (!credencial) {
      // PRIMEIRO ACESSO: cria o acesso do gestor (onboarding)
      const nova = { email: emailInput.toLowerCase(), hash: inputHash, criadoEm: new Date().toISOString() };
      localStorage.setItem(LAVAPET_AUTH_KEY, JSON.stringify(nova));
      msgErro.classList.add('hidden');
      criarSessao(nova.email);
      mostrarDashboard();
      if (typeof abrirConfiguracoes === 'function') abrirConfiguracoes();
      return;
    }

    if (credencial.email.toLowerCase() === emailInput.toLowerCase() && credencial.hash === inputHash) {
      criarSessao(credencial.email);
      msgErro.classList.add('hidden');
      mostrarDashboard();
      if (!obterConfig().configurado && typeof abrirConfiguracoes === 'function') abrirConfiguracoes();
    } else {
      msgErro.classList.remove('hidden');
      msgErro.innerText = 'E-mail ou senha incorretos.';
    }
  } catch (err) {
    console.error('Erro na autenticação:', err);
    msgErro.classList.remove('hidden');
  } finally {
    btn.innerHTML = `<span>Entrar no Painel</span> <span>→</span>`;
    btn.disabled = false;
  }
}

function criarSessao(email) {
  const sessionToken = {
    token: 'tok_' + Math.random().toString(36).substring(2) + Date.now(),
    email,
    expiraEm: Date.now() + (8 * 60 * 60 * 1000)
  };
  sessionStorage.setItem(LAVAPET_SESSION_KEY, JSON.stringify(sessionToken));
}

// Alterar senha nas configurações do gestor
async function alterarSenhaGestor(e) {
  e.preventDefault();
  const atual = document.getElementById('confSenhaAtual').value;
  const nova = document.getElementById('confSenhaNova').value;
  const msg = document.getElementById('msgAlterarSenha');
  const credencial = JSON.parse(localStorage.getItem(LAVAPET_AUTH_KEY) || 'null');
  if (!credencial) return;
  const hashAtual = await hashSenha(atual);
  if (hashAtual !== credencial.hash) {
    msg.innerText = 'Senha atual incorreta.';
    msg.classList.remove('hidden');
    return;
  }
  if (nova.length < 6) {
    msg.innerText = 'A nova senha precisa de 6+ caracteres.';
    msg.classList.remove('hidden');
    return;
  }
  credencial.hash = await hashSenha(nova);
  credencial.alteradaEm = new Date().toISOString();
  localStorage.setItem(LAVAPET_AUTH_KEY, JSON.stringify(credencial));
  msg.innerText = 'Senha alterada com sucesso.';
  msg.classList.remove('hidden');
  document.getElementById('formAlterarSenha').reset();
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
  sessionStorage.removeItem(LAVAPET_SESSION_KEY);
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
    const cfg = obterConfig();
    const foneLimpo = (item.telefone || '').replace(/\D/g, "");
    const msgWhats = encodeURIComponent(preencherTemplate(cfg.templates.confirmacao, {
      tutor: item.tutor,
      pet: item.pet,
      servico: item.servico,
      data: formatarDataBr(item.data),
      hora: item.hora,
      codigo: item.codigo || '',
      empresa: cfg.nome,
      valor: item.preco
    }));
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
          <div class="flex items-center gap-1.5">
            <a href="${linkWhats}" target="_blank" class="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-[--ok] border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-all card-touch">
              <span>WhatsApp</span>
            </a>
            <button onclick="enviarLembreteWhatsApp(${item.id})" class="px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-white/10 text-xs font-semibold card-touch" title="Enviar lembrete">
              Lembrete
            </button>
          </div>

          <!-- Ações de Status -->
          <div class="flex items-center gap-1">
            ${item.status !== 'Em Atendimento' && item.status !== 'Concluído' ? `
              <button onclick="alterarStatus(${item.id}, 'Em Atendimento')" class="px-2.5 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold card-touch" title="Iniciar Banho/Tosa">
                Iniciar
              </button>
            ` : ''}

            ${item.status !== 'Concluído' ? `
              <button onclick="alterarStatus(${item.id}, 'Concluído')" class="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 text-xs font-bold card-touch" title="Marcar como Concluído">
                Pronto
              </button>
            ` : `
              <button onclick="alterarStatus(${item.id}, 'Confirmado')" class="px-2 py-1 text-slate-400 text-[10px] hover:text-slate-200">
                Reabrir
              </button>
            `}

            <button onclick="excluirAgendamento(${item.id})" class="p-1.5 text-slate-500 hover:text-[--bad] rounded-lg transition-colors" title="Cancelar Agendamento">
              Excluir
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
  popularServicosManual();
  atualizarHorariosManual();
  document.getElementById('modalManual').classList.remove('hidden');
}

function fecharModalManual() {
  document.getElementById('modalManual').classList.add('hidden');
}

// Popular select de serviços a partir da configuração da empresa
function popularServicosManual() {
  const cfg = obterConfig();
  const select = document.getElementById('mServico');
  select.innerHTML = cfg.servicos.map(s =>
    `<option value="${s.nome}" data-preco="${s.preco}">${s.nome} (R$ ${s.preco})</option>`
  ).join('');
}

// Recalcular horários livres quando data muda no modal
function atualizarHorariosManual() {
  const cfg = obterConfig();
  const data = document.getElementById('mData').value;
  const selectHora = document.getElementById('mHora');
  const livres = horariosLivres(data, agendamentosReais, cfg);
  selectHora.innerHTML = (livres.length ? livres : cfg.horarios).map(h =>
    `<option value="${h}">${h}${livres.length ? '' : ' (avisar conflito)'}</option>`
  ).join('');
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
  const apiUrl = obterApiUrl();
  if (apiUrl) fetch(apiUrl, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({
      token: obterApiToken(),
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

// Enviar lembrete por WhatsApp com template configurável
function enviarLembreteWhatsApp(id) {
  const item = agendamentosReais.find(a => a.id === id);
  if (!item) return;
  const cfg = obterConfig();
  const msg = preencherTemplate(cfg.templates.lembrete, {
    tutor: item.tutor,
    pet: item.pet,
    servico: item.servico,
    data: formatarDataBr(item.data),
    hora: item.hora,
    empresa: cfg.nome
  });
  const fone = (item.telefone || '').replace(/\D/g, '');
  window.open(`https://api.whatsapp.com/send?phone=55${fone}&text=${encodeURIComponent(msg)}`, '_blank');
}

// Exportar relatório do dia filtrado em CSV
function exportarRelatorioCSV() {
  const dataFiltro = document.getElementById('filtroDataAdmin').value;
  const linhas = agendamentosReais.filter(a => !dataFiltro || a.data === dataFiltro);
  if (linhas.length === 0) {
    alert('Sem agendamentos para exportar nesta data.');
    return;
  }
  const cab = 'Data;Hora;Pet;Raca;Tutor;Telefone;Servico;Preco;Status;Origem';
  const corpo = linhas.map(a =>
    [a.data, a.hora, a.pet, a.raca, a.tutor, a.telefone, a.servico, a.preco, a.status, a.origem].join(';')
  ).join('\n');
  const blob = new Blob(['\ufeff' + cab + '\n' + corpo], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lavapet-relatorio-${dataFiltro || 'geral'}.csv`;
  a.click();
  URL.revokeObjectURL(url);
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
      new Notification("Novo agendamento recebido", {
        body: "Um cliente acabou de realizar um agendamento no site.",
      });
    }
  }
});


// ===================================================
//   7. INICIALIZAÇÃO DO SISTEMA
// ===================================================
document.addEventListener("DOMContentLoaded", async () => {
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

// ===================================================
//   8. CONFIGURAÇÕES DA EMPRESA (WHITE-LABEL / ONBOARDING)
// ===================================================

function abrirConfiguracoes() {
  const cfg = obterConfig();
  document.getElementById('confNome').value = cfg.nome;
  document.getElementById('confSlogan').value = cfg.slogan;
  document.getElementById('confWhatsapp').value = cfg.whatsapp;
  document.getElementById('confCor').value = cfg.corPrimaria;
  document.getElementById('confHorarios').value = cfg.horarios.join(', ');
  document.getElementById('confPixChave').value = cfg.pix.chave;
  document.getElementById('confPixNome').value = cfg.pix.nome;
  document.getElementById('confPixSinal').value = cfg.pix.sinal;
  document.getElementById('confTemplateConfirmacao').value = cfg.templates.confirmacao;
  document.getElementById('confTemplateLembrete').value = cfg.templates.lembrete;
  renderizarServicosConfig();
  renderizarBloqueiosConfig();
  document.getElementById('modalConfiguracoes').classList.remove('hidden');
}

function fecharConfiguracoes() {
  document.getElementById('modalConfiguracoes').classList.add('hidden');
}

function renderizarServicosConfig() {
  const cfg = obterConfig();
  const container = document.getElementById('listaServicosConfig');
  container.innerHTML = '';
  cfg.servicos.forEach((s, i) => {
    const linha = document.createElement('div');
    linha.className = 'flex items-center gap-2';
    linha.innerHTML = `
      <input type="text" value="${s.nome}" data-idx="${i}" data-campo="nome" class="srv-input flex-1 glass-input p-2.5 rounded-xl text-xs" placeholder="Nome">
      <input type="text" value="${s.descricao || ''}" data-idx="${i}" data-campo="descricao" class="srv-input flex-1 glass-input p-2.5 rounded-xl text-xs" placeholder="Descrição">
      <input type="number" value="${s.preco}" data-idx="${i}" data-campo="preco" class="srv-input w-20 glass-input p-2.5 rounded-xl text-xs" placeholder="R$">
      <input type="number" value="${s.duracao || 60}" data-idx="${i}" data-campo="duracao" class="srv-input w-20 glass-input p-2.5 rounded-xl text-xs" placeholder="min">
      <button type="button" onclick="removerServicoConfig(${i})" class="px-2 py-2.5 rounded-xl bg-red-50 text-red-500 text-xs font-bold card-touch">Remover</button>`;
    container.appendChild(linha);
  });
}

function removerServicoConfig(indice) {
  const cfg = obterConfig();
  cfg.servicos.splice(indice, 1);
  salvarConfig(cfg);
  renderizarServicosConfig();
}

function adicionarServicoConfig() {
  const cfg = obterConfig();
  cfg.servicos.push({ nome: 'Novo Serviço', descricao: '', preco: 50, duracao: 60 });
  salvarConfig(cfg);
  renderizarServicosConfig();
}

function renderizarBloqueiosConfig() {
  const bloqueios = obterBloqueios();
  const container = document.getElementById('listaBloqueiosConfig');
  container.innerHTML = (bloqueios.datas || []).length === 0
    ? '<p class="text-xs text-slate-400">Nenhuma data bloqueada.</p>'
    : '';
  (bloqueios.datas || []).forEach(d => {
    const chip = document.createElement('span');
    chip.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-bold border border-rose-100';
    chip.innerHTML = `${formatarDataBr(d)} <button type="button" onclick="desbloquearData('${d}')" class="font-black">x</button>`;
    container.appendChild(chip);
  });
}

function bloquearDataConfig() {
  const input = document.getElementById('confBloquearData');
  if (!input.value) return;
  const bloqueios = obterBloqueios();
  if (!bloqueios.datas.includes(input.value)) bloqueios.datas.push(input.value);
  salvarBloqueios(bloqueios);
  input.value = '';
  renderizarBloqueiosConfig();
}

function desbloquearData(dataISO) {
  const bloqueios = obterBloqueios();
  bloqueios.datas = bloqueios.datas.filter(d => d !== dataISO);
  salvarBloqueios(bloqueios);
  renderizarBloqueiosConfig();
}

// Salvar todas as configurações do formulário
function salvarConfiguracoesEmpresa(e) {
  if (e) e.preventDefault();
  const cfg = obterConfig();

  cfg.nome = document.getElementById('confNome').value.trim() || cfg.nome;
  cfg.slogan = document.getElementById('confSlogan').value.trim();
  cfg.whatsapp = document.getElementById('confWhatsapp').value.trim();
  cfg.corPrimaria = document.getElementById('confCor').value;
  cfg.horarios = document.getElementById('confHorarios').value
    .split(',')
    .map(h => h.trim())
    .filter(h => /^\d{1,2}:\d{2}$/.test(h));
  if (cfg.horarios.length === 0) cfg.horarios = CONFIG_PADRAO.horarios.slice();

  cfg.pix.chave = document.getElementById('confPixChave').value.trim();
  cfg.pix.nome = document.getElementById('confPixNome').value.trim();
  cfg.pix.sinal = Math.max(0, Math.min(100, Number(document.getElementById('confPixSinal').value) || 0));

  cfg.templates.confirmacao = document.getElementById('confTemplateConfirmacao').value.trim() || CONFIG_PADRAO.templates.confirmacao;
  cfg.templates.lembrete = document.getElementById('confTemplateLembrete').value.trim() || CONFIG_PADRAO.templates.lembrete;

  // Coletar serviços dos inputs
  const linhas = document.querySelectorAll('#listaServicosConfig .srv-input');
  const servicos = [];
  linhas.forEach(inp => {
    const idx = Number(inp.dataset.idx);
    if (!servicos[idx]) servicos[idx] = { nome: '', descricao: '', preco: 0, duracao: 60 };
    const campo = inp.dataset.campo;
    servicos[idx][campo] = campo === 'preco' || campo === 'duracao' ? Number(inp.value) || 0 : inp.value.trim();
  });
  cfg.servicos = servicos.filter(s => s.nome);
  if (cfg.servicos.length === 0) cfg.servicos = JSON.parse(JSON.stringify(CONFIG_PADRAO.servicos));

  cfg.configurado = true;
  salvarConfig(cfg);
  aplicarIdentidadeVisual(cfg);
  fecharConfiguracoes();
  carregarAgendamentosReais();
}

// Exportar backup completo (dados + configuração)
function exportarBackup() {
  const dados = {
    exportadoEm: new Date().toISOString(),
    config: obterConfig(),
    agendamentos: JSON.parse(localStorage.getItem('lavapet_real_appointments') || '[]'),
    bloqueios: obterBloqueios()
  };
  const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lavapet-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// LGPD: apagar todos os dados locais do navegador
function apagarDadosLGPD() {
  if (!confirm('Isso apagará permanentemente todos os agendamentos, configurações e credenciais deste navegador. Confirmar?')) return;
  [LAVAPET_AUTH_KEY, LAVAPET_SESSION_KEY, LAVAPET_CONFIG_KEY, LAVAPET_BLOQUEIOS_KEY, 'lavapet_real_appointments']
    .forEach(k => { localStorage.removeItem(k); sessionStorage.removeItem(k); });
  location.reload();
}

// Aplicar identidade visual da empresa (white-label)
function aplicarIdentidadeVisual(cfg) {
  const r = document.documentElement.style;
  r.setProperty('--lavapet-wine', cfg.corPrimaria);
  // Escurecer levemente para hover: multiplicar canais por 0.8
  const hex = cfg.corPrimaria.replace('#', '');
  const esc = (v) => Math.max(0, Math.round(parseInt(v, 16) * 0.8));
  const escuro = '#' + [0, 2, 4].map(i => esc(hex.substr(i, 2)).toString(16).padStart(2, '0')).join('');
  r.setProperty('--lavapet-wine-dark', escuro);
  // Aplicar nome/slogan em todos os elementos marcados
  document.querySelectorAll('[data-empresa-nome]').forEach(el => el.innerText = cfg.nome);
  document.querySelectorAll('[data-empresa-slogan]').forEach(el => el.innerText = cfg.slogan);
}

