// ── Translations ─────────────────────────────────────────────────────────────

const TRANSLATIONS = {
  es: {
    loading:          'Cargando carta…',
    catPromos:        'Promos',
    catBebidas:       'Bebidas',
    catComida:        'Comida',
    legendVegan:      'también hay opción vegana',
    legendSinTacc:    'sin TACC',
    searchPlaceholder:'Buscar en el menú…',
    searchEmpty:      'No se encuentra',
    emptyBebidas:     'Sin bebidas disponibles por ahora.',
    emptyComida:      'Sin comidas disponibles por ahora.',
    errorLoad:        'No se pudo cargar el menú. Recargá la página.',
    sinTaccTitle:     'Sin TACC / Sin Gluten',
    veganTitle:       'Vegano',
    langBtn:          'EN',
  },
  en: {
    loading:          'Loading menu…',
    catPromos:        'Specials',
    catBebidas:       'Drinks',
    catComida:        'Food',
    legendVegan:      'vegan option available',
    legendSinTacc:    'gluten-free',
    searchPlaceholder:'Search the menu…',
    searchEmpty:      'Not found',
    emptyBebidas:     'No drinks available right now.',
    emptyComida:      'No food available right now.',
    errorLoad:        'Could not load the menu. Please reload.',
    sinTaccTitle:     'Gluten-free',
    veganTitle:       'Vegan',
    langBtn:          'ES',
  }
};

// Section name translations by Firestore document ID
const SECTION_NAMES_EN = {
  'tragos':         'Cocktails',
  'aperitivos':     'Aperitifs',
  'cervezas-lata':  'Canned Beers',
  'cervezas-litro': 'Draft Beers',
  'vinos':          'Wines',
  'sin-alcohol':    'Non-alcoholic',
  'sandwiches':     'Sandwiches',
  'tostones':       'Toasts',
  'empanadas':      'Empanadas',
  'minutas':        'Quick Bites',
  'postres':        'Desserts',
};

// ── State ────────────────────────────────────────────────────────────────────

let _lang = localStorage.getItem('mostra-lang') || 'es';

export function getLang() { return _lang; }

export function t(key) {
  return TRANSLATIONS[_lang]?.[key] ?? TRANSLATIONS.es[key] ?? key;
}

export function sectionName(section) {
  if (_lang === 'es') return section.name;
  return SECTION_NAMES_EN[section.id] ?? section.name;
}

// ── Apply static translations ─────────────────────────────────────────────────

export function applyStatic() {
  document.documentElement.lang = _lang;

  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });

  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.placeholder = t('searchPlaceholder');

  const langBtn = document.getElementById('lang-toggle');
  if (langBtn) langBtn.textContent = t('langBtn');
}

// ── Set language ──────────────────────────────────────────────────────────────

export function setLang(lang) {
  if (lang === _lang) return;
  _lang = lang;
  localStorage.setItem('mostra-lang', lang);
  applyStatic();
  window.dispatchEvent(new CustomEvent('langchange'));
}

// ── Init button ───────────────────────────────────────────────────────────────

export function initLang() {
  applyStatic();

  const btn = document.getElementById('lang-toggle');
  if (btn) {
    btn.addEventListener('click', () => setLang(_lang === 'es' ? 'en' : 'es'));
  }
}
