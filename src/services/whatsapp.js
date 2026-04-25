const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode-terminal');
const {
  default: makeWASocket,
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');

const authDir = path.join(__dirname, '..', '..', 'data', 'baileys_auth');

let socket;
let connecting = false;

async function startWhatsApp() {
  if (connecting) {
    return socket;
  }

  connecting = true;

  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  try {
    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const { version } = await fetchLatestBaileysVersion();

    socket = makeWASocket({
      auth: state,
      version,
      printQRInTerminal: false
    });

    socket.ev.on('creds.update', saveCreds);

    socket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log('\nEscaneie o QR Code abaixo no WhatsApp:\n');
        qrcode.generate(qr, { small: true });
      }

      if (connection === 'open') {
        console.log('WhatsApp conectado com sucesso.');
      }

      if (connection === 'close') {
        const disconnectError = lastDisconnect?.error;
        const statusCode = disconnectError instanceof Boom ? disconnectError.output.statusCode : undefined;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        console.log('Conexao do WhatsApp encerrada.', shouldReconnect ? 'Tentando reconectar...' : 'Sessao encerrada.');

        if (shouldReconnect) {
          connecting = false;
          await startWhatsApp();
        }
      }
    });

    return socket;
  } catch (error) {
    connecting = false;
    console.error('Falha ao iniciar WhatsApp:', error.message);
    throw error;
  } finally {
    connecting = false;
  }
}

function isWhatsAppConnected() {
  return Boolean(socket?.user);
}

function buildProductMessage(produto) {
  if (produto.tipo === 'loja') {
    return [
      '🔥 PROMOCAO LA MAFIA 🔥',
      '',
      `🎮 ${produto.nome}`,
      `🏷️ De: R$ ${Number(produto.preco_antigo || 0).toFixed(2)}`,
      `💰 Por: R$ ${Number(produto.preco_atual || produto.preco || 0).toFixed(2)}`,
      `⬇️ Desconto: ${produto.desconto || 'Nao informado'}`,
      `🖥️ Ativacao: ${produto.ativacao || 'Nao informado'}`,
      `🧩 DLCs: ${produto.dlcs || 'Nao possui'}`,
      `📦 ${produto.estoque || 'Aproveite enquanto tem estoque!'}`,
      '',
      '🔒 Compra segura | Entrega imediata',
      `👉 Link do produto: ${produto.link}`
    ].join('\n');
  }

  return [
    '🛑✨ LANCAMENTO NA LA MAFIA ✨🛑',
    '',
    `🎮 ${produto.nome}`,
    '💎 Novo na loja',
    `🏷️ De: R$ ${Number(produto.preco_antigo || 0).toFixed(2)}`,
    `💰 Por: R$ ${Number(produto.preco_atual || produto.preco || 0).toFixed(2)}`,
    `🔥 Desconto especial de lancamento: ${produto.desconto || 'Nao informado'}`,
    '',
    `🖥️ Ativacao: ${produto.ativacao || 'Nao informado'}`,
    `🧩 DLCs: ${produto.dlcs || 'Nao informado'}`,
    `📦 ${produto.estoque || 'Estoque limitado'}`,
    '',
    '⚡ Entrega automatica',
    '🔒 Compra 100% segura',
    '',
    `👉 Garanta agora: ${produto.link}`
  ].join('\n');
}

function formatPrice(value) {
  return Number(value || 0).toFixed(2);
}

function buildProductMessage(produto) {
  const precoAtual = produto.preco_atual || produto.preco;
  const precoAntigo = produto.preco_antigo;

  if (produto.tipo === 'loja') {
    return [
      '\u{1F525} PROMOCAO LA MAFIA \u{1F525}',
      '',
      `\u{1F3AE} ${produto.nome}`,
      `\u{1F3F7}\u{FE0F} De: R$ ${formatPrice(precoAntigo)}`,
      `\u{1F4B0} Por: R$ ${formatPrice(precoAtual)}`,
      `\u2B07\u{FE0F} Desconto: ${produto.desconto || 'Nao informado'}`,
      `\u{1F5A5}\u{FE0F} Ativacao: ${produto.ativacao || 'Nao informado'}`,
      `\u{1F9E9} DLCs: ${produto.dlcs || 'Nao possui'}`,
      `\u{1F4E6} ${produto.estoque || 'Aproveite enquanto tem estoque!'}`,
      '',
      '\u{1F512} Compra segura | Entrega imediata',
      `\u{1F449} Link do produto: ${produto.link}`
    ].join('\n');
  }

  return [
    '\u{1F6D1}\u2728 LANCAMENTO NA LA MAFIA \u2728\u{1F6D1}',
    `\u{1F3AE} ${produto.nome}`,
    '\u{1F48E} Novo na loja',
    `\u{1F3F7}\u{FE0F} De: R$ ${formatPrice(precoAntigo)}`,
    `\u{1F4B0} Por: R$ ${formatPrice(precoAtual)}`,
    `\u{1F525} Desconto especial de lancamento: ${produto.desconto || 'Nao informado'}`,
    '',
    `\u{1F5A5}\u{FE0F} Ativacao: ${produto.ativacao || 'Nao informado'}`,
    `\u{1F9E9} DLCs: ${produto.dlcs || 'Nao informado'}`,
    `\u{1F4E6} ${produto.estoque || 'Estoque limitado - pode acabar a qualquer momento!'}`,
    '',
    '\u26A1 Entrega automatica',
    '\u{1F512} Compra 100% segura',
    '',
    `\u{1F449} Garanta agora: ${produto.link}`
  ].join('\n');
}

async function sendProductMessage(groupId, produto) {
  if (!socket?.user) {
    throw new Error('WhatsApp ainda nao esta conectado.');
  }

  const message = buildProductMessage(produto);

  if (produto.imagem) {
    await socket.sendMessage(groupId, {
      image: { url: produto.imagem },
      caption: message
    });
    return;
  }

  await socket.sendMessage(groupId, { text: message });
}

module.exports = {
  startWhatsApp,
  isWhatsAppConnected,
  sendProductMessage
};




