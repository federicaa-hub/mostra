import { db } from './firebase-config.js';
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Map of sectionId → section data (fetched once)
const sections = new Map();

// ── Initialization ──────────────────────────────────────────────────────────

async function init() {
  try {
    // Fetch sections once (they rarely change)
    const snap = await getDocs(query(collection(db, 'sections'), orderBy('order')));
    snap.forEach(d => sections.set(d.id, { id: d.id, ...d.data() }));

    // Real-time listener: only available items
    const q = query(collection(db, 'items'), where('available', '==', true));

    onSnapshot(q, snapshot => {
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      renderMenu(items);
      hideLoading();
    }, err => {
      console.error('Error loading items:', err);
      showError('No se pudo cargar el menú. Recargá la página.');
    });

  } catch (err) {
    console.error('Error initializing:', err);
    showError('No se pudo conectar. Revisá tu conexión y recargá.');
  }
}

// ── Render ───────────────────────────────────────────────────────────────────

function renderMenu(items) {
  const bebidasEl = document.getElementById('bebidas-content');
  const comidaEl  = document.getElementById('comida-content');

  bebidasEl.innerHTML = '';
  comidaEl.innerHTML  = '';

  // Sort sections by category/order
  const bebidasSections = [...sections.values()]
    .filter(s => s.category === 'BEBIDAS')
    .sort((a, b) => a.order - b.order);

  const comidaSections = [...sections.values()]
    .filter(s => s.category === 'COMIDA')
    .sort((a, b) => a.order - b.order);

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
  const catClass = section.category ? `category--${section.category.toLowerCase()}` : '';
  sectionEl.className = `menu-section section--${section.id} ${catClass}`.trim();

  // Section header
  const headerEl = document.createElement('div');
  headerEl.className = 'section-header';
  headerEl.innerHTML = `
    <div class="section-name">${section.name}</div>
    ${section.description ? `<div class="section-desc">${section.description}</div>` : ''}
  `;
  sectionEl.appendChild(headerEl);

  // Group items into subsections while preserving order
  let currentSub = Symbol('init'); // unique sentinel
  let currentSubEl = null;

  items.forEach(item => {
    const sub = item.subsection ?? null;

    if (sub !== currentSub) {
      currentSub = sub;
      if (sub) {
        currentSubEl = document.createElement('div');
        currentSubEl.className = 'subsection';
        currentSubEl.innerHTML = `<div class="subsection-name">${sub}</div>`;
        sectionEl.appendChild(currentSubEl);
      } else {
        currentSubEl = null;
      }
    }

    (currentSubEl || sectionEl).appendChild(makeItemEl(item));
  });

  container.appendChild(sectionEl);
}

function makeItemEl(item) {
  const el = document.createElement('div');
  el.className = 'menu-item';

  const priceHtml = item.price
    ? `<span class="item-price">$${Number(item.price).toLocaleString('es-AR')}</span>`
    : `<span class="item-price-empty">—</span>`;

  const descHtml = item.description
    ? `<span class="item-desc">${item.description}</span>`
    : '';

  el.innerHTML = `
    <div class="item-info">
      <span class="item-name">${item.name}</span>
      ${descHtml}
    </div>
    ${priceHtml}
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
