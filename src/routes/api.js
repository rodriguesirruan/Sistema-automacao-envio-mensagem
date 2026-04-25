const express = require('express');
const { getDatabase } = require('../database');
const { ensureAuthenticated } = require('../middlewares/auth');
const { whatsappGroupId } = require('../config');
const { isWhatsAppConnected } = require('../services/whatsapp');

const router = express.Router();

function validateProduct(payload) {
  const tipo = String(payload.tipo || 'novo').trim();
  const nome = String(payload.nome || '').trim();
  const link = String(payload.link || '').trim();
  const imagem = String(payload.imagem || '').trim();
  const preco =
    payload.preco !== undefined && payload.preco !== ''
      ? Number(payload.preco)
      : null;
  const precoAntigo =
    payload.preco_antigo !== undefined && payload.preco_antigo !== ''
      ? Number(payload.preco_antigo)
      : null;
  const precoAtual =
  payload.preco_atual !== undefined && payload.preco_atual !== ''
    ? Number(payload.preco_atual)
    : null;
  const desconto = String(payload.desconto || '').trim();
  const ativacao = String(payload.ativacao || '').trim();
  const dlcs = String(payload.dlcs || '').trim();
  const estoque = String(payload.estoque || '').trim();
  const observacao = String(payload.observacao || '').trim();

  if (!['novo', 'loja'].includes(tipo)) {
    return { valid: false, error: 'Tipo de produto invalido.' };
  }

  if (!nome || !link || !imagem) {
    return { valid: false, error: 'Preencha nome, link e imagem corretamente.' };
  }

  if (precoAtual === null || Number.isNaN(precoAtual)) {
    return { valid: false, error: 'Informe um preco atual valido.' };
  }

  if (precoAntigo !== null && Number.isNaN(precoAntigo)) {
    return { valid: false, error: 'Informe um preco antigo valido.' };
  }

  return {
    valid: true,
    data: {
      tipo,
      nome,
      preco: precoAtual ?? preco,
      link,
      imagem,
      preco_antigo: precoAntigo,
      preco_atual: precoAtual,
      desconto,
      ativacao,
      dlcs,
      estoque,
      observacao
    }
  };
}



router.get('/api/status', ensureAuthenticated, (req, res) => {
  return res.json({
    whatsappConnected: isWhatsAppConnected(),
    whatsappGroupId
  });
});

router.get('/api/produtos', ensureAuthenticated, (req, res) => {
  const db = getDatabase();
  const products = db.all('SELECT * FROM produtos ORDER BY id DESC');
  return res.json(products);
});

router.post('/api/produtos', (req, res) => {
  const validation = validateProduct(req.body);

  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  const db = getDatabase();
  const result = db.run(
    `
    INSERT INTO produtos (
      tipo,
      nome,
      preco,
      link,
      imagem,
      preco_antigo,
      preco_atual,
      desconto,
      ativacao,
      dlcs,
      estoque,
      observacao
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      validation.data.tipo,
      validation.data.nome,
      validation.data.preco,
      validation.data.link,
      validation.data.imagem,
      validation.data.preco_antigo,
      validation.data.preco_atual,
      validation.data.desconto,
      validation.data.ativacao,
      validation.data.dlcs,
      validation.data.estoque,
      validation.data.observacao
    ]
  );

  const product = db.get('SELECT * FROM produtos WHERE id = ?', [result.lastInsertRowid]);
  return res.status(201).json(product);
});

router.delete('/api/produtos/:id', ensureAuthenticated, (req, res) => {
  const productId = Number(req.params.id);

  if (!productId) {
    return res.status(400).json({ error: 'Produto invalido.' });
  }

  const db = getDatabase();
  const product = db.get('SELECT * FROM produtos WHERE id = ?', [productId]);

  if (!product) {
    return res.status(404).json({ error: 'Produto nao encontrado.' });
  }

  db.run('DELETE FROM agendamentos WHERE produto_id = ?', [productId]);
  db.run('DELETE FROM produtos WHERE id = ?', [productId]);

  return res.json({ success: true });
});


router.get('/api/agendamentos', ensureAuthenticated, (req, res) => {
  const db = getDatabase();
  const schedules = db.all(
    `
      SELECT
        agendamentos.id,
        agendamentos.produto_id,
        agendamentos.horario,
        agendamentos.status,
        agendamentos.sent_at,
        agendamentos.last_error,
        agendamentos.attempts,
        produtos.tipo AS produto_tipo,
        produtos.nome AS produto_nome,
        produtos.preco AS produto_preco,
        produtos.preco_antigo AS produto_preco_antigo,
        produtos.preco_atual AS produto_preco_atual,
        produtos.desconto AS produto_desconto,
        produtos.ativacao AS produto_ativacao,
        produtos.dlcs AS produto_dlcs,
        produtos.estoque AS produto_estoque,
        produtos.link AS produto_link,
        produtos.imagem AS produto_imagem
      FROM agendamentos
      INNER JOIN produtos ON produtos.id = agendamentos.produto_id
      ORDER BY agendamentos.id DESC
      `
  );

  return res.json(schedules);
});

router.post('/api/agendamentos', ensureAuthenticated, (req, res) => {
  const produtoId = Number(req.body.produto_id);
  const horario = String(req.body.horario || '').trim();
  const horarioValido = /^([01]\d|2[0-3]):([0-5]\d)$/.test(horario);

  if (!produtoId || !horarioValido) {
    return res.status(400).json({ error: 'Selecione um produto e informe um horario valido.' });
  }

  const db = getDatabase();
  const product = db.get('SELECT * FROM produtos WHERE id = ?', [produtoId]);

  if (!product) {
    return res.status(404).json({ error: 'Produto nao encontrado.' });
  }

  const duplicate = db.get(
    `
      SELECT id
      FROM agendamentos
      WHERE produto_id = ?
        AND horario = ?
        AND status IN ('pendente', 'processando')
      `,
    [produtoId, horario]
  );

  if (duplicate) {
    return res.status(409).json({ error: 'Ja existe um agendamento pendente para esse produto nesse horario.' });
  }

  const result = db.run(
    "INSERT INTO agendamentos (produto_id, horario, status) VALUES (?, ?, 'pendente')",
    [produtoId, horario]
  );

  const schedule = db.get(
    `
      SELECT
        agendamentos.id,
        agendamentos.produto_id,
        agendamentos.horario,
        agendamentos.status,
        agendamentos.sent_at,
        agendamentos.last_error,
        agendamentos.attempts,
        produtos.tipo AS produto_tipo,
        produtos.nome AS produto_nome,
        produtos.preco AS produto_preco,
        produtos.preco_antigo AS produto_preco_antigo,
        produtos.preco_atual AS produto_preco_atual,
        produtos.desconto AS produto_desconto,
        produtos.ativacao AS produto_ativacao,
        produtos.dlcs AS produto_dlcs,
        produtos.estoque AS produto_estoque,
        produtos.link AS produto_link,
        produtos.imagem AS produto_imagem
      FROM agendamentos
      INNER JOIN produtos ON produtos.id = agendamentos.produto_id
      WHERE agendamentos.id = ?
      `,
    [result.lastInsertRowid]
  );

  return res.status(201).json(schedule);
});

module.exports = router;
