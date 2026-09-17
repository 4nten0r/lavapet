// ===================================================
// LAVA PET - CAMADA DE CONFIGURAÇÃO (MULTIEMPRESA / WHITE-LABEL)
// Gerencia identidade da empresa, serviços, horários, Pix,
// templates de WhatsApp e bloqueios. Editável pelo gestor.
// ===================================================

const LAVAPET_CONFIG_KEY = 'lavapet_empresa_config';
const LAVAPET_BLOQUEIOS_KEY = 'lavapet_bloqueios';

const CONFIG_PADRAO = {
  configurado: false,
  nome: 'Lava Pet',
  slogan: 'Estética e Conforto Animal',
  whatsapp: '',
  corPrimaria: '#84364c',
  horarios: ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'],
  diasFechados: [0],
  pix: { chave: '', nome: '', sinal: 30 },
  servicos: [
    { nome: 'Banho', descricao: 'Banho hidratante com shampoo neutro', preco: 50, duracao: 60 },
    { nome: 'Tosa', descricao: 'Tosa higiênica ou geral', preco: 60, duracao: 60 },
    { nome: 'Banho e Tosa', descricao: 'Combo completo com perfume', preco: 90, duracao: 90 }
  ],
  templates: {
    confirmacao: 'Olá {tutor}! Agendamento confirmado: {pet} - {servico} em {data} às {hora}. Código {codigo}. {empresa}',
    lembrete: 'Olá {tutor}! Lembrete: {pet} tem {servico} amanhã às {hora}. {empresa}'
  }
};

function obterConfig() {
  try {
    const salva = JSON.parse(localStorage.getItem(LAVAPET_CONFIG_KEY) || 'null');
    if (!salva) return JSON.parse(JSON.stringify(CONFIG_PADRAO));
    // merge seguro com defaults para permitir novos campos
    const cfg = Object.assign({}, CONFIG_PADRAO, salva);
    cfg.pix = Object.assign({}, CONFIG_PADRAO.pix, salva.pix || {});
    cfg.templates = Object.assign({}, CONFIG_PADRAO.templates, salva.templates || {});
    if (!Array.isArray(cfg.servicos)) cfg.servicos = JSON.parse(JSON.stringify(CONFIG_PADRAO.servicos));
    if (!Array.isArray(cfg.horarios)) cfg.horarios = CONFIG_PADRAO.horarios.slice();
    if (!Array.isArray(cfg.diasFechados)) cfg.diasFechados = CONFIG_PADRAO.diasFechados.slice();
    return cfg;
  } catch (e) {
    return JSON.parse(JSON.stringify(CONFIG_PADRAO));
  }
}

function salvarConfig(cfg) {
  localStorage.setItem(LAVAPET_CONFIG_KEY, JSON.stringify(cfg));
}

function obterBloqueios() {
  try {
    return JSON.parse(localStorage.getItem(LAVAPET_BLOQUEIOS_KEY) || '{"datas":[]}');
  } catch (e) {
    return { datas: [] };
  }
}

function salvarBloqueios(b) {
  localStorage.setItem(LAVAPET_BLOQUEIOS_KEY, JSON.stringify(b));
}

// Verifica se uma data está disponível (não fechada/bloqueada)
function dataDisponivel(dataISO, config) {
  const cfg = config || obterConfig();
  const diaSemana = new Date(dataISO + 'T12:00:00').getDay();
  if (cfg.diasFechados.includes(diaSemana)) return false;
  const bloqueios = obterBloqueios();
  if ((bloqueios.datas || []).includes(dataISO)) return false;
  return true;
}

// Horários livres = config.horarios - ocupados - bloqueios
function horariosLivres(dataISO, agendamentos, config) {
  const cfg = config || obterConfig();
  const bloqueios = obterBloqueios();
  const bloqueados = (bloqueios.horarios || []).filter(b => b.data === dataISO).map(b => b.hora);
  const ocupados = (agendamentos || [])
    .filter(a => a.data === dataISO && a.status !== 'Cancelado')
    .map(a => a.hora);
  return cfg.horarios.filter(h => !ocupados.includes(h) && !bloqueados.includes(h));
}

// Formata data ISO para texto brasileiro curto
function formatarDataBr(dataISO) {
  if (!dataISO) return '';
  const p = dataISO.split('-');
  if (p.length !== 3) return dataISO;
  return `${p[2]}/${p[1]}/${p[0]}`;
}

// Preenche placeholders {tutor} {pet} {servico} {data} {hora} {codigo} {empresa} {valor}
function preencherTemplate(template, dados) {
  return (template || '')
    .replace('{tutor}', dados.tutor || '')
    .replace('{pet}', dados.pet || '')
    .replace('{servico}', dados.servico || '')
    .replace('{data}', dados.data || '')
    .replace('{hora}', dados.hora || '')
    .replace('{codigo}', dados.codigo || '')
    .replace('{empresa}', dados.empresa || '')
    .replace('{valor}', dados.valor !== undefined ? `R$ ${dados.valor}` : '');
}

// Abre WhatsApp com mensagem renderizada
function abrirWhatsApp(numero, mensagem) {
  const fone = String(numero || '').replace(/\D/g, '');
  const url = fone
    ? `https://api.whatsapp.com/send?phone=55${fone}&text=${encodeURIComponent(mensagem)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(mensagem)}`;
  window.open(url, '_blank');
}

// Mascara telefone: (11) 90000-0000
function mascaraTelefone(valor) {
  const d = String(valor || '').replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
