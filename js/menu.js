import { db } from './firebase-config.js';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { initSearch, applyFilter, getCurrentQuery } from './search.js';

// Map of sectionId → section data (real-time)
const sections = new Map();

// ── Initialization ──────────────────────────────────────────────────────────

let latestItems  = null;
let searchReady  = false;

function maybeRender() {
  if (sections.size === 0 || latestItems === null) return;
  renderMenu(latestItems);
  hideLoading();
  if (!searchReady) {
    initSearch();
    searchReady = true;
  } else {
    applyFilter(getCurrentQuery());
  }
}

function init() {
  // Real-time sections (needed so promo availability updates instantly)
  onSnapshot(query(collection(db, 'sections'), orderBy('order')), snap => {
    sections.clear();
    snap.forEach(d => sections.set(d.id, { id: d.id, ...d.data() }));
    maybeRender();
  }, err => {
    console.error('Error loading sections:', err);
    showError('No se pudo cargar el menú. Recargá la página.');
  });

  // Real-time items (available only — bebidas & comida)
  onSnapshot(
    query(collection(db, 'items'), where('available', '==', true)),
    snapshot => {
      latestItems = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      maybeRender();
    },
    err => {
      console.error('Error loading items:', err);
      showError('No se pudo cargar el menú. Recargá la página.');
    }
  );
}

// ── Render ───────────────────────────────────────────────────────────────────

function renderMenu(items) {
  const promosEl    = document.getElementById('promociones-content');
  const promosBlock = document.getElementById('promociones-block');
  const bebidasEl   = document.getElementById('bebidas-content');
  const comidaEl    = document.getElementById('comida-content');

  if (promosEl)  promosEl.innerHTML  = '';
  bebidasEl.innerHTML = '';
  comidaEl.innerHTML  = '';

  // Sort sections by category/order
  const promosSections = [...sections.values()]
    .filter(s => s.category === 'PROMOCIONES')
    .sort((a, b) => a.order - b.order);

  const bebidasSections = [...sections.values()]
    .filter(s => s.category === 'BEBIDAS')
    .sort((a, b) => a.order - b.order);

  const comidaSections = [...sections.values()]
    .filter(s => s.category === 'COMIDA')
    .sort((a, b) => a.order - b.order);

  // Render promos — each promo is self-contained in the section document
  if (promosEl && promosBlock) {
    promosSections.forEach(s => renderPromoCard(promosEl, s));
    promosBlock.style.display = promosEl.hasChildNodes() ? '' : 'none';
  }

  bebidasSections.forEach(s => renderSection(bebidasEl, s, items));
  comidaSections.forEach(s  => renderSection(comidaEl,  s, items));

  if (!bebidasEl.hasChildNodes())
    bebidasEl.innerHTML = '<p class="empty-state">Sin bebidas disponibles por ahora.</p>';

  if (!comidaEl.hasChildNodes())
    comidaEl.innerHTML = '<p class="empty-state">Sin comidas disponibles por ahora.</p>';
}

function renderSection(container, section, allItems) {
  // Items for this section, sorted by order
  const items = allItems
    .filter(i => i.sectionId === section.id)
    .sort((a, b) => a.order - b.order);

  if (items.length === 0) return;

  const sectionEl = document.createElement('div');
  sectionEl.className = `menu-section section--${section.id}`;

  // Section header
  const headerEl = document.createElement('div');
  headerEl.className = 'section-header';
  headerEl.innerHTML = `
    <div class="section-name">${section.name}</div>
    ${section.description ? `<div class="section-desc">${section.description}</div>` : ''}
  `;
  sectionEl.appendChild(headerEl);

  // Detect solo subsections: subsection name = item name, solo item in group
  // These render as an inline header row (name + price), no separate item row
  const subGroups = new Map();
  items.forEach(item => {
    const sub = item.subsection ?? null;
    if (sub) {
      if (!subGroups.has(sub)) subGroups.set(sub, []);
      subGroups.get(sub).push(item);
    }
  });
  const soloSubs = new Set(
    [...subGroups.entries()]
      .filter(([sub, si]) =>
        si.length === 1 && si[0].name.toLowerCase() === sub.toLowerCase()
      )
      .map(([sub]) => sub)
  );

  let currentSub = Symbol('init');
  let currentSubEl = null;

  items.forEach(item => {
    const sub = item.subsection ?? null;

    if (sub !== currentSub) {
      currentSub = sub;
      currentSubEl = null;
      if (sub) {
        currentSubEl = document.createElement('div');
        currentSubEl.className = 'subsection';

        if (soloSubs.has(sub)) {
          // Inline: subsection name + price on same row, no item row
          const priceHtml = item.price
            ? `<span class="item-price">$${Number(item.price).toLocaleString('es-AR')}</span>`
            : '';
          currentSubEl.innerHTML = `
            <div class="subsection-name subsection-name--solo">
              <span>${sub}</span>${priceHtml}
            </div>`;
          sectionEl.appendChild(currentSubEl);
          return; // skip item row
        } else {
          currentSubEl.innerHTML = `<div class="subsection-name">${sub}</div>`;
          sectionEl.appendChild(currentSubEl);
        }
      }
    } else if (soloSubs.has(sub)) {
      return; // safety: skip extra items in solo subs
    }

    (currentSubEl || sectionEl).appendChild(makeItemEl(item));
  });

  container.appendChild(sectionEl);
}

function renderPromoCard(container, section) {
  if (!section.available) return;

  const el = document.createElement('div');
  el.className = 'promo-card';

  const priceHtml = section.price
    ? `<span class="promo-price-tag">$${Number(section.price).toLocaleString('es-AR')}</span>`
    : '';
  const descHtml = section.description
    ? `<div class="promo-desc">${section.description}</div>`
    : '';
  const bebidaHtml = section.bebida
    ? `<div class="promo-component">🍺 ${section.bebida}</div>`
    : '';
  const comidaHtml = section.comida
    ? `<div class="promo-component">🍽️ ${section.comida}</div>`
    : '';
  const componentsHtml = (bebidaHtml || comidaHtml)
    ? `<div class="promo-components">${bebidaHtml}${comidaHtml}</div>`
    : '';

  el.innerHTML = `
    <div class="promo-header-row">
      <span class="promo-title">${section.name}</span>
      ${priceHtml}
    </div>
    ${descHtml}
    ${componentsHtml}
  `;

  container.appendChild(el);
}

function makeItemEl(item) {
  const el = document.createElement('div');
  el.className = 'menu-item' + (!item.subsection ? ' menu-item--no-sub' : '');

  const priceHtml = item.price
    ? `<span class="item-price">$${Number(item.price).toLocaleString('es-AR')}</span>`
    : `<span class="item-price-empty">—</span>`;

  const descHtml = item.description
    ? `<span class="item-desc">${item.description}</span>`
    : '';

  el.innerHTML = `
    <div class="item-name-row">
      <span class="item-name">${item.name}</span>
      <span class="item-dots" aria-hidden="true"></span>
      ${priceHtml}
    </div>
    ${descHtml}
  `;
  return el;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function hideLoading() {
  const loading = document.getElementById('loading');
  const content = document.getElementById('content');
  if (loading) loading.style.display = 'none';
  if (content) content.style.display = 'block';
}

function showError(msg) {
  const loading = document.getElementById('loading');
  if (loading) loading.innerHTML = `<p class="empty-state">${msg}</p>`;
}

// ── Boot ─────────────────────────────────────────────────────────────────────

init();
