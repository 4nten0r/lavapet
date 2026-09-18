/**
 * Lava Pet - API da planilha simples.
 * A aba ativa deve usar as colunas: pet | servico | data | hora.
 * Implante como aplicativo da Web com acesso para qualquer pessoa.
 */

const CABECALHO = ['pet', 'servico', 'data', 'hora'];

function planilha_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (sheet.getLastRow() === 0) sheet.appendRow(CABECALHO);
  return sheet;
}

function resposta_(dados) {
  return ContentService
    .createTextOutput(JSON.stringify(dados))
    .setMimeType(ContentService.MimeType.JSON);
}

function dataTexto_(valor) {
  if (valor instanceof Date) {
    return Utilities.formatDate(valor, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(valor || '').trim();
}

function horaTexto_(valor) {
  if (valor instanceof Date) {
    return Utilities.formatDate(valor, Session.getScriptTimeZone(), 'HH:mm');
  }
  return String(valor || '').trim();
}

function doGet(e) {
  try {
    const sheet = planilha_();
    const valores = sheet.getDataRange().getValues();
    if (valores.length <= 1) return resposta_([]);

    const agendamentos = valores.slice(1).map(linha => ({
      pet: linha[0],
      servico: linha[1],
      data: linha[2],
      hora: linha[3]
    }));
    return resposta_(agendamentos);
  } catch (erro) {
    return resposta_({ erro: erro.message });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const sheet = planilha_();
    const payload = JSON.parse(e.postData.contents || '{}');
    const data = String(payload.data || '').trim();
    const hora = String(payload.hora || '').trim();
    if (!data || !hora || !payload.pet || !payload.servico) {
      return resposta_({ erro: 'Campos obrigatórios ausentes.' });
    }

    lock.waitLock(5000);
    const valores = sheet.getDataRange().getValues();
    const conflito = valores.slice(1).some(linha =>
      dataTexto_(linha[2]) === data && horaTexto_(linha[3]) === hora
    );
    if (conflito) return resposta_({ erro: 'Horário já reservado.' });

    sheet.appendRow([payload.pet, payload.servico, data, hora]);
    return resposta_({ status: 'ok' });
  } catch (erro) {
    return resposta_({ erro: erro.message });
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function configurar() {
  const sheet = planilha_();
  sheet.setFrozenRows(1);
}
