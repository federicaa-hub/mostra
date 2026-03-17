// ── Search module ─────────────────────────────────────────────────────────────
// Provides initSearch() + applyFilter(query) for the public menu.

// Sinónimos: lo que escribe el usuario → término real a buscar
const SYNONYMS = {
  'birra':    'cerveza',
  'birras':   'cerveza',
};

let _query = '';

export function getCurrentQuery() {
  return _query;
}

export function applyFilter(query) {
  const raw = (query || '').trim().toLowerCase();
  _query = SYNONYMS[raw] ?? raw;

  // ── Reset all visibility ──────────────────────────────────────────────────
  document.querySelectorAll(
    '.menu-item, .subsection, .menu-section, .category-block'
  ).forEach(el => el.style.display = '');

  const emptyEl = document.getElementById('search-empty');

  if (!_query) {
    if (emptyEl) emptyEl.style.display = 'none';
    return;
  }

  // ── Filter ────────────────────────────────────────────────────────────────
  let anyVisible = false;

  document.querySelectorAll('.category-block').forEach(block => {
    // Cat-title match (ej: "Bebidas", "Comida") → show entire block as-is
    const catTitle = block.querySelector('.cat-title')?.textContent?.toLowerCase() ?? '';
    if (catTitle.includes(_query)) {
      anyVisible = true;
      return; // children already visible from reset
    }

    let blockHasMatch = false;

    block.querySelectorAll('.menu-section').forEach(section => {
      // Section name match (ej: "Tragos", "Aperitivos") → show entire section
      const sectionName = section.querySelector('.section-name')?.textContent?.toLowerCase() ?? '';
      if (sectionName.includes(_query)) {
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
          const matches = name.includes(_query);
          sub.style.display = matches ? '' : 'none';
          if (matches) sectionHasMatch = true;
          return;
        }

        // Regular subsection: label match → show all items inside
        const subLabel = sub.querySelector('.subsection-name')?.textContent?.toLowerCase() ?? '';
        if (subLabel.includes(_query)) {
          sectionHasMatch = true;
          return; // subsection + items already visible from reset
        }

        // No label match → check individual items inside subsection
        let subHasMatch = false;
        sub.querySelectorAll('.menu-item').forEach(item => {
          const name = item.querySelector('.item-name')?.textContent?.toLowerCase() ?? '';
          const matches = name.includes(_query);
          item.style.display = matches ? '' : 'none';
          if (matches) subHasMatch = true;
        });
        sub.style.display = subHasMatch ? '' : 'none';
        if (subHasMatch) sectionHasMatch = true;
      });

      // Items directly in section (no subsection)
      section.querySelectorAll(':scope > .menu-item').forEach(item => {
        const name = item.querySelector('.item-name')?.textContent?.toLowerCase() ?? '';
        const matches = name.includes(_query);
        item.style.display = matches ? '' : 'none';
        if (matches) sectionHasMatch = true;
      });

      section.style.display = sectionHasMatch ? '' : 'none';
      if (sectionHasMatch) blockHasMatch = true;
    });

    block.style.display = blockHasMatch ? '' : 'none';
    if (blockHasMatch) anyVisible = true;
  });

  if (emptyEl) emptyEl.style.display = anyVisible ? 'none' : 'block';
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
