import { db, auth } from './firebase-config.js';
import {
  collection,
  doc,
  onSnapshot,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ── State ────────────────────────────────────────────────────────────────────

let allItems    = [];
let sections    = [];
let unsubItems  = null;
let filters     = { sectionId: '', available: 'all' };

// Convierte un nombre de usuario simple en un email válido para Firebase Auth.
// Ej: "barra" → "barra@mostra.admin"
// Si ya contiene "@" lo usa tal cual (compatibilidad).
function toFirebaseEmail(username) {
  return username.includes('@') ? username : `${username}@mostra.admin`;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

onAuthStateChanged(auth, user => {
  if (user) {
    showPanel();
    loadData();
  } else {
    showLogin();
    if (unsubItems) { unsubItems(); unsubItems = null; }
    allItems = [];
    sections = [];
  }
});

// Login form
document.getElementById('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const btn      = document.getElementById('login-btn');
  const errEl    = document.getElementById('login-error');

  btn.disabled       = true;
  btn.textContent    = 'Entrando…';
  errEl.textContent  = '';

  try {
    await signInWithEmailAndPassword(auth, toFirebaseEmail(email), password);
  } catch {
    errEl.textContent = 'Usuario o contraseña incorrectos.';
    btn.disabled      = false;
    btn.textContent   = 'Entrar';
  }
});

// Logout
document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));

// ── Data loading ─────────────────────────────────────────────────────────────

async function loadData() {
  // Fetch sections once
  const snap = await getDocs(query(collection(db, 'sections'), orderBy('order')));
  sections = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  populateSectionFilter();
  renderPromoSections();

  // Real-time items
  unsubItems = onSnapshot(
    query(collection(db, 'items')),
    snapshot => {
      allItems = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      renderList();
      renderPromoSections();
    },
    err => {
      console.error('Error loading items:', err);
      showToast('Error al cargar ítems', true);
    }
  );
}

function populateSectionFilter() {
  const sel = document.getElementById('filter-section');
  sel.innerHTML = '<option value="">Todas las secciones</option>';
  sections.forEach(s => {
    sel.innerHTML += `<option value="${s.id}">${s.name}</option>`;
  });
}

// ── Filters ───────────────────────────────────────────────────────────────────

document.getElementById('filter-section').addEventListener('change', e => {
  filters.sectionId = e.target.value;
  renderList();
});
document.getElementById('filter-available').addEventListener('change', e => {
  filters.available = e.target.value;
  renderList();
});

// ── Render list ───────────────────────────────────────────────────────────────

function renderList() {
  const container = document.getElementById('admin-list');
  container.innerHTML = '';

  // Apply filters
  let items = [...allItems];
  if (filters.sectionId)
    items = items.filter(i => i.sectionId === filters.sectionId);
  if (filters.available === 'available')
    items = items.filter(i => i.available);
  else if (filters.available === 'unavailable')
    items = items.filter(i => !i.available);

  if (items.length === 0) {
    container.innerHTML = '<p class="empty-state">Sin ítems para mostrar.</p>';
    return;
  }

  // Group by section: PROMOCIONES first, then the rest in order
  const sectionOrder = [
    ...sections.filter(s => s.category === 'PROMOCIONES'),
    ...sections.filter(s => s.category !== 'PROMOCIONES'),
  ].map(s => s.id);

  // Build map: sectionId → items[]
  const bySec = new Map();
  items.forEach(item => {
    if (!bySec.has(item.sectionId)) bySec.set(item.sectionId, []);
    bySec.get(item.sectionId).push(item);
  });

  // Render in section order
  sectionOrder
    .filter(id => bySec.has(id))
    .forEach(sectionId => {
      const section = sections.find(s => s.id === sectionId);
      const sectionItems = bySec.get(sectionId).sort((a, b) => a.order - b.order);

      // Section header
      const hdr = document.createElement('div');
      hdr.className = 'admin-section-title';
      hdr.textContent = section?.name?.toUpperCase() ?? sectionId;
      container.appendChild(hdr);

      // Group by subsection preserving order
      let currentSub    = Symbol('init');
      let currentSubEl  = null;

      sectionItems.forEach(item => {
        const sub = item.subsection ?? null;

        if (sub !== currentSub) {
          currentSub = sub;
          if (sub) {
            const subHdr = document.createElement('div');
            subHdr.className    = 'admin-subsection-title';
            subHdr.textContent  = sub;
            container.appendChild(subHdr);
            currentSubEl = null; // items go directly to container after sub header
          }
        }

        container.appendChild(makeAdminItemEl(item));
      });
    });
}

// ── Admin item element ────────────────────────────────────────────────────────

function makeAdminItemEl(item) {
  const el = document.createElement('div');
  el.className = `admin-item${item.available ? '' : ' unavailable'}`;
  el.dataset.id = item.id;

  const secName = sections.find(s => s.id === item.sectionId)?.name ?? item.sectionId;
  const metaParts = [secName];
  if (item.subsection)   metaParts.push(item.subsection);
  if (item.description)  metaParts.push(item.description);

  el.innerHTML = `
    <label class="toggle">
      <input type="checkbox" ${item.available ? 'checked' : ''}>
      <span class="toggle-slider"></span>
    </label>
    <div class="admin-item-info">
      <div class="admin-item-name">${item.name}</div>
      <div class="admin-item-meta">${metaParts.join(' · ')}</div>
    </div>
    <span class="price-display" title="Tap para editar precio">
      ${item.price ? '$' + Number(item.price).toLocaleString('es-AR') : '—'}
    </span>
    <button class="btn-icon delete-btn" title="Eliminar ítem">🗑</button>
  `;

  // Toggle availability
  el.querySelector('input[type="checkbox"]').addEventListener('change', async e => {
    const available = e.target.checked;
    el.classList.toggle('unavailable', !available);
    try {
      await updateDoc(doc(db, 'items', item.id), { available });
      showToast(available ? '✓ Disponible' : '✗ No disponible');
    } catch (err) {
      console.error(err);
      showToast('Error al actualizar', true);
      e.target.checked = !available; // revert
      el.classList.toggle('unavailable', available);
    }
  });

  // Edit price (click-to-edit)
  el.querySelector('.price-display').addEventListener('click', function () {
    startEditPrice(item.id, item.price, this);
  });

  // Delete
  el.querySelector('.delete-btn').addEventListener('click', () => doDelete(item));

  return el;
}

// ── Price inline edit ────────────────────────────────────────────────────────

function startEditPrice(id, currentPrice, displayEl) {
  const input = document.createElement('input');
  input.type      = 'number';
  input.className = 'price-input';
  input.value     = currentPrice || '';
  input.placeholder = '0';
  input.min = '0';
  displayEl.replaceWith(input);
  input.focus();
  input.select();

  async function save() {
    const newPrice = parseInt(input.value) || 0;
    // Restore display element first
    const newDisplay = document.createElement('span');
    newDisplay.className = 'price-display';
    newDisplay.title     = 'Tap para editar precio';
    newDisplay.textContent = newPrice ? '$' + newPrice.toLocaleString('es-AR') : '—';
    input.replaceWith(newDisplay);

    // Re-bind click on new display
    newDisplay.addEventListener('click', function () {
      startEditPrice(id, newPrice, this);
    });

    try {
      await updateDoc(doc(db, 'items', id), { price: newPrice });
      showToast('Precio actualizado');
    } catch (err) {
      console.error(err);
      showToast('Error al guardar precio', true);
    }
  }

  input.addEventListener('blur', save);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') input.blur();
    if (e.key === 'Escape') {
      // Revert without saving
      const orig = document.createElement('span');
      orig.className = 'price-display';
      orig.title     = 'Tap para editar precio';
      orig.textContent = currentPrice ? '$' + Number(currentPrice).toLocaleString('es-AR') : '—';
      orig.addEventListener('click', function () { startEditPrice(id, currentPrice, this); });
      input.removeEventListener('blur', save);
      input.replaceWith(orig);
    }
  });
}

// ── Delete ────────────────────────────────────────────────────────────────────

async function doDelete(item) {
  if (!confirm(`¿Eliminar "${item.name}"?\nEsta acción no se puede deshacer.`)) return;
  try {
    await deleteDoc(doc(db, 'items', item.id));
    showToast('Ítem eliminado');
  } catch (err) {
    console.error(err);
    showToast('Error al eliminar', true);
  }
}

// ── Add item modal ─────────────────────────────────────────────────────────────

const modal        = document.getElementById('add-item-modal');
const addItemBtn   = document.getElementById('add-item-btn');
const closeModalBtn = document.getElementById('close-modal-btn');
const addItemForm  = document.getElementById('add-item-form');

addItemBtn.addEventListener('click', () => {
  populateModalSections();
  addItemForm.reset();
  modal.classList.remove('hidden');
});

closeModalBtn.addEventListener('click', () => modal.classList.add('hidden'));

modal.addEventListener('click', e => {
  if (e.target === modal) modal.classList.add('hidden');
});

function populateModalSections() {
  const sel = document.getElementById('new-section');
  sel.innerHTML = '';
  sections.forEach(s => {
    sel.innerHTML += `<option value="${s.id}">${s.name} (${s.category})</option>`;
  });
}

addItemForm.addEventListener('submit', async e => {
  e.preventDefault();
  const submitBtn = addItemForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;

  const sectionId   = document.getElementById('new-section').value;
  const name        = document.getElementById('new-name').value.trim();
  const subsection  = document.getElementById('new-subsection').value.trim() || null;
  const description = document.getElementById('new-description').value.trim() || null;
  const price       = parseInt(document.getElementById('new-price').value) || 0;

  if (!name || !sectionId) {
    submitBtn.disabled = false;
    return;
  }

  // Order: max order in section + 10
  const sectionItems = allItems.filter(i => i.sectionId === sectionId);
  const maxOrder = sectionItems.reduce((m, i) => Math.max(m, i.order ?? 0), 0);

  try {
    await addDoc(collection(db, 'items'), {
      name,
      sectionId,
      subsection,
      description,
      price,
      available: true,
      order: maxOrder + 10
    });
    modal.classList.add('hidden');
    showToast('✓ Ítem agregado');
  } catch (err) {
    console.error(err);
    showToast('Error al agregar ítem', true);
    submitBtn.disabled = false;
  }
});

// ── Promo section management ──────────────────────────────────────────────────

document.getElementById('promo-mgmt-toggle').addEventListener('click', () => {
  const body  = document.getElementById('promo-mgmt-body');
  const arrow = document.getElementById('promo-mgmt-arrow');
  const open  = body.classList.toggle('hidden');
  arrow.textContent = open ? '▾' : '▴';
});

function renderPromoSections() {
  const list      = document.getElementById('promo-sections-list');
  const promoSecs = sections.filter(s => s.category === 'PROMOCIONES');

  if (promoSecs.length === 0) {
    list.innerHTML = '<p class="promo-empty">Sin promos. Creá una arriba.</p>';
    return;
  }

  list.innerHTML = '';
  promoSecs.forEach(sec => {
    const el = document.createElement('div');
    el.className = 'promo-section-row';

    const priceStr  = sec.price ? `$${Number(sec.price).toLocaleString('es-AR')}` : '';
    const bebidaTag = sec.bebida ? `<span class="promo-tag">🍺 ${sec.bebida}</span>` : '';
    const comidaTag = sec.comida ? `<span class="promo-tag">🍽️ ${sec.comida}</span>` : '';
    const tagsHtml  = (bebidaTag || comidaTag) ? `<div class="promo-tags">${bebidaTag}${comidaTag}</div>` : '';

    el.innerHTML = `
      <label class="toggle" style="align-self:flex-start;margin-top:2px">
        <input type="checkbox" ${sec.available ? 'checked' : ''}>
        <span class="toggle-slider"></span>
      </label>
      <div class="promo-section-info">
        <div class="promo-section-name">
          ${sec.name}${priceStr ? ` <span class="promo-price-badge">${priceStr}</span>` : ''}
        </div>
        ${sec.description ? `<div class="promo-section-desc">${sec.description}</div>` : ''}
        ${tagsHtml}
      </div>
      <button class="btn-icon edit-promo-btn" title="Editar promo">✏️</button>
      <button class="btn-icon delete-promo-btn" title="Eliminar promo">🗑</button>
    `;

    el.querySelector('input[type="checkbox"]').addEventListener('change', async e => {
      const available = e.target.checked;
      try {
        await updateDoc(doc(db, 'sections', sec.id), { available });
        showToast(available ? `✓ ${sec.name} activada` : `✗ ${sec.name} desactivada`);
      } catch (err) {
        console.error(err);
        showToast('Error al actualizar', true);
        e.target.checked = !available;
      }
    });

    el.querySelector('.edit-promo-btn').addEventListener('click', () => openEditPromo(sec));
    el.querySelector('.delete-promo-btn').addEventListener('click', () => deletePromoSection(sec));
    list.appendChild(el);
  });
}

async function reloadSections() {
  const snap = await getDocs(query(collection(db, 'sections'), orderBy('order')));
  sections = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  populateSectionFilter();
  renderPromoSections();
}

document.getElementById('add-promo-section-form').addEventListener('submit', async e => {
  e.preventDefault();
  const name = document.getElementById('promo-section-name').value.trim();
  if (!name) return;

  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;

  try {
    await addDoc(collection(db, 'sections'), {
      name,
      description: document.getElementById('promo-section-desc').value.trim() || '',
      price:       parseInt(document.getElementById('promo-section-price').value) || 0,
      bebida:      document.getElementById('promo-section-bebida').value.trim() || null,
      comida:      document.getElementById('promo-section-comida').value.trim() || null,
      available:   true,
      category:    'PROMOCIONES',
      order:       0
    });
    e.target.reset();
    await reloadSections();
    showToast('✓ Promo creada');
  } catch (err) {
    console.error(err);
    showToast('Error al crear promo', true);
  }
  btn.disabled = false;
});

async function deletePromoSection(sec) {
  if (!confirm(`¿Eliminar la promo "${sec.name}"?\nEsta acción no se puede deshacer.`)) return;
  try {
    await deleteDoc(doc(db, 'sections', sec.id));
    await reloadSections();
    showToast('Promo eliminada');
  } catch (err) {
    console.error(err);
    showToast('Error al eliminar', true);
  }
}

// ── Edit promo modal ──────────────────────────────────────────────────────────

let editingPromoId = null;

function openEditPromo(sec) {
  editingPromoId = sec.id;
  document.getElementById('edit-promo-name').value   = sec.name        || '';
  document.getElementById('edit-promo-desc').value   = sec.description || '';
  document.getElementById('edit-promo-price').value  = sec.price       || '';
  document.getElementById('edit-promo-bebida').value = sec.bebida      || '';
  document.getElementById('edit-promo-comida').value = sec.comida      || '';
  document.getElementById('edit-promo-modal').classList.remove('hidden');
}

document.getElementById('close-edit-promo-btn').addEventListener('click', () => {
  document.getElementById('edit-promo-modal').classList.add('hidden');
  editingPromoId = null;
});

document.getElementById('edit-promo-modal').addEventListener('click', e => {
  if (e.target === document.getElementById('edit-promo-modal')) {
    document.getElementById('edit-promo-modal').classList.add('hidden');
    editingPromoId = null;
  }
});

document.getElementById('edit-promo-form').addEventListener('submit', async e => {
  e.preventDefault();
  if (!editingPromoId) return;

  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;

  const name = document.getElementById('edit-promo-name').value.trim();
  if (!name) { btn.disabled = false; return; }

  try {
    await updateDoc(doc(db, 'sections', editingPromoId), {
      name,
      description: document.getElementById('edit-promo-desc').value.trim()   || '',
      price:       parseInt(document.getElementById('edit-promo-price').value) || 0,
      bebida:      document.getElementById('edit-promo-bebida').value.trim()  || null,
      comida:      document.getElementById('edit-promo-comida').value.trim()  || null,
    });
    document.getElementById('edit-promo-modal').classList.add('hidden');
    editingPromoId = null;
    await reloadSections();
    showToast('✓ Promo actualizada');
  } catch (err) {
    console.error(err);
    showToast('Error al guardar', true);
  }
  btn.disabled = false;
});

// ── UI helpers ────────────────────────────────────────────────────────────────

function showLogin() {
  document.getElementById('login-wrap').style.display  = 'flex';
  document.getElementById('admin-wrap').classList.remove('visible');
}

function showPanel() {
  document.getElementById('login-wrap').style.display  = 'none';
  document.getElementById('admin-wrap').classList.add('visible');
}

let toastTimer;
function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className   = `toast show${isError ? ' error' : ''}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}
