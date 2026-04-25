const path = require('path');
const express = require('express');
const session = require('express-session');
const { initDatabase } = require('./src/database');
const { startWhatsApp } = require('./src/services/whatsapp');
const { startScheduler } = require('./src/services/scheduler');
const pagesRouter = require('./src/routes/pages');
const authRouter = require('./src/routes/auth');
const apiRouter = require('./src/routes/api');
const { sessionSecret, port } = require('./src/config');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax'
    }
  })
);

app.use('/static', express.static(path.join(__dirname, '/public')));

app.use('/', pagesRouter);
app.use('/', authRouter);
app.use('/', apiRouter);

app.use((error, req, res, next) => {
  console.error('Erro inesperado:', error);

  if (req.path.startsWith('/api')) {
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }

  return res.status(500).send('Erro interno do servidor.');
});

async function bootstrap() {
  await initDatabase();

  app.listen(port, async () => {
    console.log(`Servidor iniciado em http://localhost:${port}`);
    await startWhatsApp();
    startScheduler();
  });
}

bootstrap().catch((error) => {
  console.error('Falha ao iniciar a aplicacao:', error);
  process.exit(1);
});
