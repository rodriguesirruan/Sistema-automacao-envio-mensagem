# Sistema de Automacao de Produtos para WhatsApp

Sistema administrativo em `Node.js` com `Express`, `SQLite`, `HTML/CSS/JavaScript` puro e integracao com WhatsApp via `Baileys`.

O projeto foi pensado para cadastrar produtos, agendar horarios de envio e disparar mensagens automaticamente para um grupo de WhatsApp.

## Visao geral

Com este sistema, voce consegue:

- fazer login no painel administrativo
- cadastrar produtos com imagem, link, precos e informacoes extras
- separar produtos entre `novo` e `loja`
- agendar envios por horario
- enviar mensagens automaticamente para grupo de WhatsApp
- acompanhar historico de envios, tentativas e erros
- excluir produtos e limpar os agendamentos ligados a eles
- visualizar detalhes completos do produto em modal
- cadastrar produtos externamente pela API

## Stack utilizada

- `Node.js`
- `Express`
- `sql.js` com persistencia em arquivo SQLite
- `Baileys`
- `node-cron`
- `express-session`
- `HTML`, `CSS` e `JavaScript` puro

## Funcionalidades

### Painel administrativo

- login simples com usuario e senha fixos no codigo
- dashboard com cards de resumo
- formulario de cadastro de produtos
- lista de produtos cadastrados
- exclusao de produto
- visualizacao detalhada em janela suspensa

### Produtos

Cada produto pode conter:

- `tipo`
- `nome`
- `preco_antigo`
- `preco_atual`
- `desconto`
- `ativacao`
- `dlcs`
- `estoque`
- `observacao`
- `link`
- `imagem`

Tipos disponiveis:

- `novo`
- `loja`

### Agendamento

- selecao do produto
- horario no formato `HH:mm`
- salvamento com status `pendente`
- bloqueio de duplicidade para o mesmo produto no mesmo horario enquanto o envio estiver pendente ou processando

### Envio automatico

- `node-cron` roda a cada minuto
- verifica agendamentos com horario correspondente
- envia para o grupo configurado no WhatsApp
- marca como `enviado` quando concluir
- registra `last_error` e `attempts` em caso de falha

### WhatsApp

- conexao com `Baileys`
- QR Code exibido no terminal
- sessao salva localmente em `data/baileys_auth`
- envio com `imagem + legenda` quando a imagem estiver preenchida

### Historico

Cada agendamento armazena:

- `status`
- `sent_at`
- `last_error`
- `attempts`

No painel, e possivel filtrar:

- `Todos`
- `Pendentes`
- `Enviados`
- `Falhas`

### API externa

Endpoint disponivel:

- `POST /api/produtos`

Permite cadastrar produtos via integracao externa enviando JSON.

## Estrutura do projeto

```text
.
|-- public/
|   |-- app.js
|   |-- index.html
|   |-- login.html
|   `-- styles.css
|-- src/
|   |-- middlewares/
|   |   `-- auth.js
|   |-- routes/
|   |   |-- api.js
|   |   |-- auth.js
|   |   `-- pages.js
|   |-- services/
|   |   |-- scheduler.js
|   |   `-- whatsapp.js
|   |-- config.js
|   `-- database.js
|-- data/
|   |-- database.sqlite
|   `-- baileys_auth/
|-- package.json
`-- server.js
```

## Banco de dados

O sistema usa duas tabelas principais:

### `produtos`

- `id`
- `tipo`
- `nome`
- `preco`
- `link`
- `imagem`
- `preco_antigo`
- `preco_atual`
- `desconto`
- `ativacao`
- `dlcs`
- `estoque`
- `observacao`

### `agendamentos`

- `id`
- `produto_id`
- `horario`
- `status`
- `sent_at`
- `last_error`
- `attempts`

## Credenciais padrao

Definidas em `src/config.js`:

- Usuario: `admin`
- Senha: `123456`

## Configuracao

Edite `src/config.js` para ajustar:

- `port`
- `adminUser`
- `adminPassword`
- `sessionSecret`
- `whatsappGroupId`
- `timezone`

Exemplo:

```js
module.exports = {
  port: 3000,
  adminUser: 'admin',
  adminPassword: '123456',
  sessionSecret: 'painel-whatsapp-produtos-seguro',
  whatsappGroupId: '120363000000000000@g.us',
  timezone: 'America/Sao_Paulo'
};
```

## Instalacao

### 1. Instalar dependencias

```bash
npm install
```

### 2. Iniciar o sistema

```bash
npm start
```

### 3. Acessar o painel

```text
http://localhost:3000/login
```

## Como usar

### Login

1. Abra o painel
2. Informe usuario e senha
3. Entre no dashboard

### Conectar o WhatsApp

1. Rode o servidor
2. Aguarde o QR Code no terminal
3. Escaneie com o WhatsApp
4. Verifique o status no painel

### Cadastrar produto

1. Escolha o tipo do produto
2. Preencha os campos
3. Clique em `Adicionar produto`

### Agendar envio

1. Escolha um produto no select
2. Defina o horario
3. Clique em `Salvar agendamento`

### Ver detalhes do produto

1. Clique em `Ver detalhes`
2. O sistema abre um modal com todas as informacoes do item

### Excluir produto

1. Clique em `Excluir`
2. Confirme a acao
3. O sistema remove o produto e os agendamentos relacionados

## Templates de mensagem

O sistema possui template diferente para cada tipo:

### Produto `loja`

- promocao
- preco antigo e preco atual
- desconto
- ativacao
- DLCs
- estoque
- link do produto

### Produto `novo`

- destaque de lancamento
- preco antigo e preco atual
- desconto de lancamento
- ativacao
- DLCs
- estoque
- chamada de compra

## API

### `POST /api/produtos`

Endpoint publico para integracao externa.

Exemplo:

```json
{
  "tipo": "loja",
  "nome": "Hell is Us",
  "preco_antigo": 209.99,
  "preco_atual": 39.99,
  "desconto": "80% OFF",
  "ativacao": "Steam PC",
  "dlcs": "Nao possui",
  "estoque": "Aproveite enquanto tem estoque!",
  "observacao": "Compra segura",
  "link": "https://site.com/produto/hell-is-us",
  "imagem": "https://site.com/imagem.jpg"
}
```

Resposta esperada:

- `201 Created` em caso de sucesso
- `400 Bad Request` se os dados forem invalidos

## Fluxo interno do sistema

1. O produto e salvo no banco
2. O agendamento e criado com status `pendente`
3. O cron verifica os horarios a cada minuto
4. Ao encontrar um item elegivel, tenta o envio
5. Se der certo, salva `status = enviado`
6. Se der erro, salva a mensagem em `last_error` e incrementa `attempts`

## Persistencia de dados

Os dados ficam em:

- banco: `data/database.sqlite`
- sessao do WhatsApp: `data/baileys_auth`

Essas pastas precisam ser preservadas em deploy/hospedagem.

## Deploy

Para manter o sistema online 24h, prefira:

- VPS Linux com `pm2`
- Railway com volume persistente
- Render pago com disco persistente

Requisitos importantes:

- manter a pasta `data/`
- manter a sessao do Baileys
- deixar o processo ativo continuamente

## Limites atuais

- login simples com credenciais fixas
- grupo do WhatsApp configurado manualmente
- sem edicao de produtos pelo painel
- select de agendamento ainda usa componente nativo do navegador

## Melhorias futuras sugeridas

- editar produto
- cancelar agendamento individualmente
- preview da mensagem antes do envio
- upload local de imagem
- descoberta automatica de grupos do WhatsApp
- autenticacao mais robusta
- banco externo para producao

## Scripts

```bash
npm start
```

## Licenca

Uso interno / projeto personalizado.
