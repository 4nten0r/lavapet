/**
 * Lava Pet - API simples para uma instalação por pet shop.
 *
 * 1. Crie uma planilha exclusiva para o cliente.
 * 2. Abra Extensoes > Apps Script e cole este arquivo.
 * 3. Execute configurar() uma vez e autorize o projeto.
 * 4. Defina as propriedades SHEET_ID, SHEET_NAME e API_TOKEN.
 * 5. Implante como aplicativo da Web e use a URL em api-config.js.
 */

const CABECALHO = [
  'id', 'codigo', 'pet', 'raca', 'tutor', 'telefone', 'servico',
  'preco', 'data', 'hora', 'status', 'origem', 'criadoEm'
];

function propriedades_() {
  return PropertiesService.getScriptProperties();
}

function configuracao_() {
  const props = propriedades_();
  const sheetId = props.getProperty('SHEET_ID');
  const sheetName = props.getProperty('SHEET_NAME') || 'Agendamentos';
  const token = props.getProperty('API_TOKEN');
  if (!sheetId || !token) {
    throw new Error('Defina SHEET_ID e API_TOKEN nas propriedades do script.');
  }
  return { sheetId, sheetName, token };
}

function planilha_() {
  const cfg = configuracao_();
  const spreadsheet = SpreadsheetApp.openById(cfg.sheetId);
  const sheet = spreadsheet.getSheetByName(cfg.sheetName) || spreadsheet.insertSheet(cfg.sheetName);
  if (sheet.getLastRow() === 0) sheet.appendRow(CABECALHO);
  return { cfg, sheet };
}

function resposta_(dados) {
  return ContentService
    .createTextOutput(JSON.stringify(dados))
    .setMimeType(ContentService.MimeType.JSON);
}

function autorizado_(token, cfg) {
  return token && cfg && token === cfg.token;
}

function doGet(e) {
  try {
    const { cfg, sheet } = planilha_();
    if (!autorizado_(e.parameter.token, cfg)) return resposta_({ erro: 'Não autorizado.' });

    const valores = sheet.getDataRange().getValues();
    if (valores.length <= 1) return resposta_([]);

    const agendamentos = valores.slice(1).map(linha => {
      const item = {};
      CABECALHO.forEach((campo, indice) => item[campo] = linha[indice]);
      return item;
    });
    return resposta_(agendamentos);
  } catch (erro) {
    return resposta_({ erro: erro.message });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const payload = JSON.parse(e.postData.contents || '{}');
    const { cfg, sheet } = planilha_();
    if (!autorizado_(payload.token, cfg)) return resposta_({ erro: 'Não autorizado.' });

    const data = String(payload.data || '').trim();
    const hora = String(payload.hora || '').trim();
    if (!data || !hora || !payload.pet || !payload.cliente) {
      return resposta_({ erro: 'Campos obrigatórios ausentes.' });
    }

    lock.waitLock(5000);
    const valores = sheet.getDataRange().getValues();
    const dataIndex = CABECALHO.indexOf('data');
    const horaIndex = CABECALHO.indexOf('hora');
    const statusIndex = CABECALHO.indexOf('status');
    const conflito = valores.slice(1).some(linha =>
      String(linha[dataIndex]) === data &&
      String(linha[horaIndex]) === hora &&
      String(linha[statusIndex]) !== 'Cancelado'
    );
    if (conflito) return resposta_({ erro: 'Horário já reservado.' });

    const partesCliente = String(payload.cliente).split(' / ');
    const agora = new Date().toISOString();
    const registro = [
      Utilities.getUuid(), payload.codigo || '', payload.pet || '', payload.raca || '',
      partesCliente[0] || '', partesCliente.slice(1).join(' / '), payload.servico || '',
      Number(payload.preco) || 0, data, hora, 'Confirmado', payload.origem || 'Site Oficial', agora
    ];
    sheet.appendRow(registro);
    return resposta_({ ok: true, id: registro[0] });
  } catch (erro) {
    return resposta_({ erro: erro.message });
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function configurar() {
  const props = propriedades_();
  const sheetId = props.getProperty('SHEET_ID');
  const sheetName = props.getProperty('SHEET_NAME') || 'Agendamentos';
  if (!sheetId) throw new Error('Defina SHEET_ID antes de executar configurar().');
  const spreadsheet = SpreadsheetApp.openById(sheetId);
  const sheet = spreadsheet.getSheetByName(sheetName) || spreadsheet.insertSheet(sheetName);
  if (sheet.getLastRow() === 0) sheet.appendRow(CABECALHO);
  sheet.setFrozenRows(1);
}
