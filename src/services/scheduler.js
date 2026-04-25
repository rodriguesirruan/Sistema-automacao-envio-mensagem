const cron = require('node-cron');
const { getDatabase } = require('../database');
const { whatsappGroupId, timezone } = require('../config');
const { isWhatsAppConnected, sendProductMessage } = require('./whatsapp');

function getCurrentTimeLabel() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone
  });

  return formatter.format(now);
}

function getCurrentTimestamp() {
  return new Date().toISOString();
}

async function processPendingSchedules() {
  const db = getDatabase();
  const currentTime = getCurrentTimeLabel();

  const schedules = db.all(
    `
      SELECT
        agendamentos.id,
        agendamentos.horario,
        agendamentos.status,
        agendamentos.attempts,
        produtos.id AS produto_id,
        produtos.tipo,
        produtos.nome,
        produtos.preco,
        produtos.preco_antigo,
        produtos.preco_atual,
        produtos.desconto,
        produtos.ativacao,
        produtos.dlcs,
        produtos.estoque,
        produtos.observacao,
        produtos.link,
        produtos.imagem
      FROM agendamentos
      INNER JOIN produtos ON produtos.id = agendamentos.produto_id
      WHERE agendamentos.status = 'pendente'
        AND agendamentos.horario = ?
      `,
    [currentTime]
  );

  if (!schedules.length) {
    return;
  }

  if (!isWhatsAppConnected()) {
    console.log(`[AGENDADOR] ${currentTime} - WhatsApp desconectado. Nenhum envio foi realizado.`);
    return;
  }

  for (const schedule of schedules) {
    const locked = db.run(
      "UPDATE agendamentos SET status = 'processando' WHERE id = ? AND status = 'pendente'",
      [schedule.id]
    );

    if (locked.changes === 0) {
      continue;
    }

    try {
      await sendProductMessage(whatsappGroupId, schedule);
      db.run(
        "UPDATE agendamentos SET status = 'enviado', sent_at = ?, last_error = NULL, attempts = attempts + 1 WHERE id = ?",
        [getCurrentTimestamp(), schedule.id]
      );
      console.log(
        `[ENVIO] Produto "${schedule.nome}" enviado para o grupo ${whatsappGroupId} no horario ${schedule.horario}.`
      );
    } catch (error) {
      db.run("UPDATE agendamentos SET status = 'pendente' WHERE id = ?", [schedule.id]);db.run(
        "UPDATE agendamentos SET status = 'pendente', last_error = ?, attempts = attempts + 1 WHERE id = ?",
        [error.message, schedule.id]
      );
      console.error(`[ENVIO] Falha ao enviar o produto "${schedule.nome}":`, error.message);
    }
  }
}

function startScheduler() {
  cron.schedule(
    '* * * * *',
    async () => {
      await processPendingSchedules();
    },
    {
      timezone
    }
  );

  console.log('Agendador iniciado. Verificacao executada a cada minuto.');
}

module.exports = {
  startScheduler,
  processPendingSchedules
};
