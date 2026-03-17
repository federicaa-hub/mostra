// ── Search module ─────────────────────────────────────────────────────────────
// Provides initSearch() + applyFilter(query) for the public menu.

let _query = '';

export function getCurrentQuery() {
  return _query;
}

export function applyFilter(query) {
  _query = (query || '').trim().toLowerCase();

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

  document.querySelectorAll('.menu-section').forEach(section => {
    let sectionHasMatch = false;

    // Regular items (with or without subsection)
    section.querySelectorAll('.menu-item').forEach(item => {
      const name = item.querySelector('.item-name')?.textContent?.toLowerCase() ?? '';
      const matches = name.includes(_query);
      item.style.display = matches ? '' : 'none';
      if (matches) sectionHasMatch = true;
    });

    // Solo subsections (no .menu-item child, name is in the header row)
    section.querySelectorAll('.subsection-name--solo').forEach(soloEl => {
      const name = soloEl.querySelector('span')?.textContent?.toLowerCase() ?? '';
      const matches = name.includes(_query);
      const subsectionEl = soloEl.closest('.subsection');
      if (subsectionEl) subsectionEl.style.display = matches ? '' : 'none';
      if (matches) sectionHasMatch = true;
    });

    // Hide regular subsections whose items are all hidden
    section.querySelectorAll('.subsection').forEach(sub => {
      if (sub.querySelector('.subsection-name--solo')) return; // already handled above
      const hasVisible = [...sub.querySelectorAll('.menu-item')]
        .some(i => i.style.display !== 'none');
      sub.style.display = hasVisible ? '' : 'none';
    });

    section.style.display = sectionHasMatch ? '' : 'none';
    if (sectionHasMatch) anyVisible = true;
  });

  // Hide whole category block if all its sections are hidden
  document.querySelectorAll('.category-block').forEach(block => {
    const content = block.querySelector('[id$="-content"]');
    if (!content) return;
    const hasVisible = [...content.querySelectorAll('.menu-section')]
      .some(s => s.style.display !== 'none');
    block.style.display = hasVisible ? '' : 'none';
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
