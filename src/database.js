const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const dataDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'database.sqlite');

let db;
let SQL;

function persistDatabase() {
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

function all(sql, params = []) {
  const statement = db.prepare(sql);
  statement.bind(params);

  const rows = [];
  while (statement.step()) {
    rows.push(statement.getAsObject());
  }

  statement.free();
  return rows;
}

function get(sql, params = []) {
  return all(sql, params)[0] || null;
}

function ensureColumn(tableName, columnName, definition) {
  const columns = all(`PRAGMA table_info(${tableName})`);
  const exists = columns.some((column) => column.name === columnName);

  if (!exists) {
    db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
    persistDatabase();
  }
}

async function initDatabase() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  SQL = await initSqlJs({
    locateFile: (file) => path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', file)
  });

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS produtos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo TEXT NOT NULL DEFAULT 'novo',
      nome TEXT NOT NULL,
      preco REAL NOT NULL,
      link TEXT NOT NULL,
      imagem TEXT NOT NULL,
      preco_antigo REAL,
      preco_atual REAL,
      desconto TEXT,
      ativacao TEXT,
      dlcs TEXT,
      estoque TEXT,
      observacao TEXT
    );

    CREATE TABLE IF NOT EXISTS agendamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      produto_id INTEGER NOT NULL,
      horario TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pendente',
      sent_at TEXT,
      last_error TEXT,
      attempts INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (produto_id) REFERENCES produtos(id)
    );
  `);

  ensureColumn('produtos', 'tipo', "TEXT NOT NULL DEFAULT 'novo'");
  ensureColumn('produtos', 'preco_antigo', 'REAL');
  ensureColumn('produtos', 'preco_atual', 'REAL');
  ensureColumn('produtos', 'desconto', 'TEXT');
  ensureColumn('produtos', 'ativacao', 'TEXT');
  ensureColumn('produtos', 'dlcs', 'TEXT');
  ensureColumn('produtos', 'estoque', 'TEXT');
  ensureColumn('produtos', 'observacao', 'TEXT');
  ensureColumn('agendamentos', 'sent_at', 'TEXT');
  ensureColumn('agendamentos', 'last_error', 'TEXT');
  ensureColumn('agendamentos', 'attempts', 'INTEGER NOT NULL DEFAULT 0');

  persistDatabase();
}

function run(sql, params = []) {
  db.run(sql, params);
  const changes = get('SELECT changes() AS count');
  const lastInserted = get('SELECT last_insert_rowid() AS id');
  persistDatabase();

  return {
    changes: Number(changes?.count || 0),
    lastInsertRowid: Number(lastInserted?.id || 0)
  };
}

function getDatabase() {
  if (!db) {
    throw new Error('Banco de dados nao inicializado.');
  }

  return {
    all,
    get,
    run
  };
}

module.exports = {
  initDatabase,
  getDatabase
};