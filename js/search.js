// ── Search module ─────────────────────────────────────────────────────────────
// Provides initSearch() + applyFilter(query) for the public menu.

// ── Highlight helpers ─────────────────────────────────────────────────────────
function escHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildHighlightedHtml(original, terms) {
  const lc = original.toLowerCase();
  const ranges = [];
  for (const term of terms) {
    if (!term) continue;
    let i = 0;
    while ((i = lc.indexOf(term, i)) !== -1) {
      ranges.push([i, i + term.length]);
      i += term.length;
    }
  }
  if (!ranges.length) return escHtml(original);

  ranges.sort((a, b) => a[0] - b[0]);
  const merged = [[...ranges[0]]];
  for (let i = 1; i < ranges.length; i++) {
    const last = merged[merged.length - 1];
    if (ranges[i][0] <= last[1]) last[1] = Math.max(last[1], ranges[i][1]);
    else merged.push([...ranges[i]]);
  }

  let html = '', pos = 0;
  for (const [s, e] of merged) {
    html += escHtml(original.slice(pos, s));
    html += `<mark class="search-hl">${escHtml(original.slice(s, e))}</mark>`;
    pos = e;
  }
  return html + escHtml(original.slice(pos));
}

function highlightEl(el) {
  if (!el.dataset.orig) el.dataset.orig = el.textContent;
  el.innerHTML = buildHighlightedHtml(el.dataset.orig, _terms);
}

function clearHighlights() {
  document.querySelectorAll(
    '.item-name, .item-desc, .cat-title, .section-name, .subsection-name, .subsection-name--solo span'
  ).forEach(el => {
    if (el.dataset.orig !== undefined) el.textContent = el.dataset.orig;
  });
}

// Sinónimos y equivalentes en inglés: clave (o prefijo de clave) → término canónico español
const SYNONYMS = {
  // Informal español
  'birra':      'cerveza',
  'birras':     'cerveza',
  // Inglés → español
  'beer':       'cerveza',
  'beers':      'cerveza',
  'wine':       'vino',
  'wines':      'vino',
  'cocktail':   'trago',
  'cocktails':  'trago',
  'drink':      'bebida',
  'drinks':     'bebida',
  'food':       'comida',
  'toast':      'tostón',
  'toasts':     'tostón',
  'dessert':    'postre',
  'desserts':   'postre',
  'appetizer':  'aperitivo',
  'appetizers': 'aperitivo',
  'non-alcoholic': 'sin alcohol',
};

// Devuelve el array de términos a buscar: el texto literal más cualquier
// sinónimo cuya clave empiece con lo escrito (prefijo).
function resolveTerms(raw) {
  if (!raw) return [];
  const terms = new Set([raw]);
  for (const [key, val] of Object.entries(SYNONYMS)) {
    if (key.startsWith(raw)) terms.add(val);
  }
  return [...terms];
}

let _rawQuery = '';
let _terms    = [];

export function getCurrentQuery() {
  return _rawQuery;
}

export function applyFilter(query) {
  const raw = (query || '').trim().toLowerCase();
  _rawQuery = raw;
  _terms    = resolveTerms(raw);

  clearHighlights();

  const matchesAny = text => _terms.some(t => text.includes(t));

  // ── Reset all visibility ──────────────────────────────────────────────────
  document.querySelectorAll(
    '.menu-item, .subsection, .menu-section, .category-block'
  ).forEach(el => el.style.display = '');

  const emptyEl = document.getElementById('search-empty');

  if (!_rawQuery) {
    if (emptyEl) emptyEl.style.display = 'none';
    return;
  }

  // ── Filter ────────────────────────────────────────────────────────────────
  let anyVisible = false;

  document.querySelectorAll('.category-block').forEach(block => {
    // Cat-title match (ej: "Bebidas", "Comida") → show entire block as-is
    const catTitle = block.querySelector('.cat-title')?.textContent?.toLowerCase() ?? '';
    if (matchesAny(catTitle)) {
      anyVisible = true;
      return; // children already visible from reset
    }

    let blockHasMatch = false;

    block.querySelectorAll('.menu-section').forEach(section => {
      // Section name match (ej: "Tragos", "Aperitivos") → show entire section
      const sectionName = section.querySelector('.section-name')?.textContent?.toLowerCase() ?? '';
      if (matchesAny(sectionName)) {
        blockHasMatch = true;
        return; // section + children already visible from reset
      }

      let sectionHasMatch = false;

      // Check each subsection
      section.querySelectorAll('.subsection').forEach(sub => {
        // Solo subsection (name = product, no separate item row)
        const soloEl = sub.querySelector('.subsection-name--solo');
        if (soloEl) {
          const name = soloEl.querySelector('span')?.textContent?.toLowerCase() ?? '';
          const hit = matchesAny(name);
          sub.style.display = hit ? '' : 'none';
          if (hit) sectionHasMatch = true;
          return;
        }

        // Regular subsection: label match → show all items inside
        const subLabel = sub.querySelector('.subsection-name')?.textContent?.toLowerCase() ?? '';
        if (matchesAny(subLabel)) {
          sectionHasMatch = true;
          return; // subsection + items already visible from reset
        }

        // No label match → check individual items inside subsection
        let subHasMatch = false;
        sub.querySelectorAll('.menu-item').forEach(item => {
          const name = item.querySelector('.item-name')?.textContent?.toLowerCase() ?? '';
          const desc = item.querySelector('.item-desc')?.textContent?.toLowerCase() ?? '';
          const hit = matchesAny(name) || matchesAny(desc);
          item.style.display = hit ? '' : 'none';
          if (hit) subHasMatch = true;
        });
        sub.style.display = subHasMatch ? '' : 'none';
        if (subHasMatch) sectionHasMatch = true;
      });

      // Items directly in section (no subsection)
      section.querySelectorAll(':scope > .menu-item').forEach(item => {
        const name = item.querySelector('.item-name')?.textContent?.toLowerCase() ?? '';
        const desc = item.querySelector('.item-desc')?.textContent?.toLowerCase() ?? '';
        const hit = matchesAny(name) || matchesAny(desc);
        item.style.display = hit ? '' : 'none';
        if (hit) sectionHasMatch = true;
      });

      section.style.display = sectionHasMatch ? '' : 'none';
      if (sectionHasMatch) blockHasMatch = true;
    });

    block.style.display = blockHasMatch ? '' : 'none';
    if (blockHasMatch) anyVisible = true;
  });

  if (emptyEl) emptyEl.style.display = anyVisible ? 'none' : 'block';

  // ── Highlight matching text in all visible elements ───────────────────────
  if (_terms.length) {
    document.querySelectorAll('.category-block').forEach(block => {
      if (block.style.display === 'none') return;
      const el = block.querySelector('.cat-title');
      if (el) highlightEl(el);
    });

    document.querySelectorAll('.menu-section').forEach(section => {
      if (section.style.display === 'none') return;
      const el = section.querySelector('.section-name');
      if (el) highlightEl(el);
    });

    document.querySelectorAll('.subsection').forEach(sub => {
      if (sub.style.display === 'none') return;
      const label = sub.querySelector('.subsection-name:not(.subsection-name--solo)');
      const solo  = sub.querySelector('.subsection-name--solo span');
      if (label) highlightEl(label);
      if (solo)  highlightEl(solo);
    });

    document.querySelectorAll('.menu-item').forEach(item => {
      if (item.style.display === 'none') return;
      const nameEl = item.querySelector('.item-name');
      const descEl = item.querySelector('.item-desc');
      if (nameEl) highlightEl(nameEl);
      if (descEl) highlightEl(descEl);
    });
  }
}

// ── UI setup (called once after DOM is ready) ─────────────────────────────────
export function initSearch() {
  const toggle = document.getElementById('search-toggle');
  const bar    = document.getElementById('search-bar');
  const input  = document.getElementById('search-input');
  const close  = document.getElementById('search-close');

  if (!toggle || !bar || !input || !close) return;

  function openBar() {
    bar.classList.add('open');
    toggle.classList.add('active');
    toggle.setAttribute('aria-label', 'Cerrar buscador');
    setTimeout(() => input.focus(), 280);
  }

  function closeBar() {
    bar.classList.remove('open');
    toggle.classList.remove('active');
    toggle.setAttribute('aria-label', 'Buscar en el menú');
    input.value = '';
    applyFilter('');
  }

  toggle.addEventListener('click', () => {
    bar.classList.contains('open') ? closeBar() : openBar();
  });

  close.addEventListener('click', closeBar);

  input.addEventListener('input', () => applyFilter(input.value));

  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeBar();
  });
}
