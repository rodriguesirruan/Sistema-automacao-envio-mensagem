const productForm = document.getElementById('product-form');
const scheduleForm = document.getElementById('schedule-form');
const productsList = document.getElementById('products-list');
const schedulesList = document.getElementById('schedules-list');
const productSelect = document.getElementById('schedule-product');
const productType = document.getElementById('product-type');
const scheduleFilters = document.getElementById('schedule-filters');
const productModal = document.getElementById('product-modal');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const modalClose = document.getElementById('modal-close');
const statProducts = document.getElementById('stat-products');
const statPending = document.getElementById('stat-pending');
const statSent = document.getElementById('stat-sent');
const statFailed = document.getElementById('stat-failed');
const newPriceField = document.querySelector('[data-field="preco-novo"]');
const toast = document.getElementById('toast');
const whatsappStatus = document.getElementById('whatsapp-status');
let allSchedules = [];
let allProducts = [];

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 2800);
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json'
    },
    ...options
  });

  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    throw new Error(body?.error || 'Falha na requisicao.');
  }

  return body;
}

function formatMoney(value) {
  return Number(value || 0).toFixed(2);
}

function formatDateTime(value) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date);
}

function renderProducts(products) {
  if (!products.length) {
    productsList.innerHTML = '<p class="empty-state">Nenhum produto cadastrado ainda.</p>';
    return;
  }

  productsList.innerHTML = products
    .map(
      (product) => `
        <article class="product-card">
          <img src="${product.imagem}" alt="${product.nome}" />
          <div class="product-content">
            <span class="product-chip">${product.tipo === 'loja' ? 'Produto da loja' : 'Lancamento'}</span>
            <h3>${product.nome}</h3>
            <p class="price-tag">
              ${
                product.preco_antigo
                  ? `De R$ ${formatMoney(product.preco_antigo)} por R$ ${formatMoney(product.preco_atual || product.preco)}`
                  : `R$ ${formatMoney(product.preco_atual || product.preco)}`
              }
            </p>
            ${product.desconto ? `<p class="product-highlight">Desconto: ${product.desconto}</p>` : ''}
            ${product.ativacao ? `<p class="product-detail">Ativacao: ${product.ativacao}</p>` : ''}
            ${product.dlcs ? `<p class="product-detail">DLCs: ${product.dlcs}</p>` : ''}
            ${product.estoque ? `<p class="product-detail">Estoque: ${product.estoque}</p>` : ''}
            <a class="product-link" href="${product.link}" target="_blank" rel="noreferrer">${product.link}</a>
             <div class="product-actions">
              <button type="button" class="btn-secondary product-action" data-action="details" data-id="${product.id}">
                Ver detalhes
              </button>
              <button type="button" class="btn-danger product-action" data-action="delete" data-id="${product.id}">
                Excluir
              </button>
            </div>
          </div>
        </article>
      `
    )
    .join('');
}

function toggleProductFields() {
  const isStoreProduct = productType.value === 'loja';
  storeFields.style.display = isStoreProduct ? 'grid' : 'none';
  newPriceField.style.display = isStoreProduct ? 'none' : 'grid';

  const newPriceInput = productForm.querySelector('input[name="preco"]');
  const oldPriceInput = productForm.querySelector('input[name="preco_antigo"]');
  const currentPriceInput = productForm.querySelector('input[name="preco_atual"]');

  newPriceInput.required = !isStoreProduct;
  oldPriceInput.required = false;
  currentPriceInput.required = isStoreProduct;
}

function renderProductOptions(products) {
  if (!products.length) {
    productSelect.innerHTML = '<option value="">Cadastre um produto primeiro</option>';
    return;
  }

  productSelect.innerHTML = `
    <option value="">Selecione um produto</option>
    ${products.map((product) => `<option value="${product.id}">${product.nome}</option>`).join('')}
  `;
}

function renderSchedules(schedules) {
  if (!schedules.length) {
    schedulesList.innerHTML = '<p class="empty-state">Nenhum agendamento cadastrado.</p>';
    return;
  }

  schedulesList.innerHTML = schedules
    .map(
      (schedule) => `
        <article class="schedule-item">
          <div class="schedule-meta">
            <strong>${schedule.produto_nome}</strong>
            <span>Horario agendado: ${schedule.horario}</span>
            <span>Tipo: ${schedule.produto_tipo === 'loja' ? 'Produto da loja' : 'Lancamento'}</span>
            <span>Preco atual: R$ ${formatMoney(schedule.produto_preco_atual || schedule.produto_preco)}</span>
            <span>Tentativas: ${schedule.attempts}</span>
            <span>Enviado em: ${formatDateTime(schedule.sent_at)}</span>
            <span>Ultimo erro: ${schedule.last_error || '-'}</span>
          </div>
          <span class="badge badge-${schedule.status}">${schedule.status}</span>
        </article>
      `
    )
    .join('');
}

function openProductModal(product) {
  modalTitle.textContent = product.nome;
  modalBody.innerHTML = `
    <img class="modal-image" src="${product.imagem}" alt="${product.nome}" />
    <div class="modal-grid">
      <div class="modal-row"><strong>Tipo:</strong><span>${product.tipo === 'loja' ? 'Produto da loja' : 'Lancamento'}</span></div>
      <div class="modal-row"><strong>Preco antigo:</strong><span>${product.preco_antigo ? `R$ ${formatMoney(product.preco_antigo)}` : '-'}</span></div>
      <div class="modal-row"><strong>Preco atual:</strong><span>R$ ${formatMoney(product.preco_atual || product.preco)}</span></div>
      <div class="modal-row"><strong>Desconto:</strong><span>${product.desconto || '-'}</span></div>
      <div class="modal-row"><strong>Ativacao:</strong><span>${product.ativacao || '-'}</span></div>
      <div class="modal-row"><strong>DLCs:</strong><span>${product.dlcs || '-'}</span></div>
      <div class="modal-row"><strong>Estoque:</strong><span>${product.estoque || '-'}</span></div>
      <div class="modal-row"><strong>Observacao:</strong><span>${product.observacao || '-'}</span></div>
      <div class="modal-row modal-row-link"><strong>Link:</strong><a href="${product.link}" target="_blank" rel="noreferrer">${product.link}</a></div>
    </div>
  `;
  productModal.hidden = false;
}

function closeProductModal() {
  productModal.hidden = true;
    modalBody.innerHTML = '';
}

function applyScheduleFilter(filter) {
  if (filter === 'falha') {
    renderSchedules(allSchedules.filter((schedule) => Boolean(schedule.last_error) && schedule.status !== 'enviado'));
    return;
  }

  if (filter === 'todos') {
    renderSchedules(allSchedules);
    return;
  }

  renderSchedules(allSchedules.filter((schedule) => schedule.status === filter));
}

function updateStats() {
  statProducts.textContent = String(allProducts.length);
  statPending.textContent = String(allSchedules.filter((schedule) => schedule.status === 'pendente').length);
  statSent.textContent = String(allSchedules.filter((schedule) => schedule.status === 'enviado').length);
  statFailed.textContent = String(
    allSchedules.filter((schedule) => Boolean(schedule.last_error) && schedule.status !== 'enviado').length
  );
}

async function loadStatus() {
  const status = await request('/api/status');
  whatsappStatus.textContent = status.whatsappConnected
    ? `WhatsApp conectado | Grupo: ${status.whatsappGroupId}`
    : `WhatsApp aguardando conexao | Grupo: ${status.whatsappGroupId}`;
}

async function loadProducts() {
  allProducts = await request('/api/produtos');
  renderProducts(allProducts);
  renderProductOptions(allProducts);
  updateStats();
}

async function loadSchedules() {
  allSchedules = await request('/api/agendamentos');
  const activeFilter = scheduleFilters.querySelector('.active')?.dataset.filter || 'todos';
  applyScheduleFilter(activeFilter);
  updateStats();
}

async function deleteProduct(productId) {
  const product = allProducts.find((item) => Number(item.id) === Number(productId));
  const confirmed = window.confirm(
    `Excluir o produto "${product?.nome || 'selecionado'}"? Os agendamentos ligados a ele tambem serao removidos.`
  );

  if (!confirmed) {
    return;
  }

  try {
    await request(`/api/produtos/${productId}`, { method: 'DELETE' });
    closeProductModal();
    showToast('Produto excluido com sucesso.');
    await Promise.all([loadProducts(), loadSchedules()]);
  } catch (error) {
    showToast(error.message);
  }
}


productForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = new FormData(productForm);
  const payload = Object.fromEntries(formData.entries());
  payload.tipo = productType.value;

  if (payload.preco_antigo) {
    payload.preco_antigo = Number(payload.preco_antigo);
  }

  if (payload.preco_atual) {
  payload.preco_atual = Number(payload.preco_atual);
}

  try {
    await request('/api/produtos', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    productForm.reset();
    productType.value = 'novo';
    showToast('Produto cadastrado com sucesso.');
    await loadProducts();
  } catch (error) {
    showToast(error.message);
  }
});
;

scheduleForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = new FormData(scheduleForm);
  const payload = Object.fromEntries(formData.entries());

  try {
    await request('/api/agendamentos', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    scheduleForm.reset();
    showToast('Agendamento salvo como pendente.');
    await loadSchedules();
  } catch (error) {
    showToast(error.message);
  }
});

scheduleFilters.addEventListener('click', (event) => {
  const button = event.target.closest('[data-filter]');

  if (!button) {
    return;
  }

  scheduleFilters.querySelectorAll('.filter-btn').forEach((item) => {
    item.classList.remove('active');
  });

  button.classList.add('active');
  applyScheduleFilter(button.dataset.filter);
});

productsList.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-action]');

  if (!button) {
    return;
  }

  const productId = Number(button.dataset.id);
  const product = allProducts.find((item) => Number(item.id) === productId);

  if (!product) {
    showToast('Produto nao encontrado.');
    return;
  }

  if (button.dataset.action === 'details') {
    openProductModal(product);
    return;
  }

  if (button.dataset.action === 'delete') {
    await deleteProduct(productId);
  }
});

modalClose.addEventListener('click', closeProductModal);

productModal.addEventListener('click', (event) => {
  if (event.target === productModal) {
    closeProductModal();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !productModal.hidden) {
    closeProductModal();
  }
});

async function init() {
  try {
    toggleProductFields();
    await Promise.all([loadStatus(), loadProducts(), loadSchedules()]);
  } catch (error) {
    showToast(error.message);
  }
}

productType.addEventListener('change', toggleProductFields);

init();
setInterval(loadStatus, 30000);
setInterval(loadSchedules, 30000);
