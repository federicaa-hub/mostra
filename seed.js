#!/usr/bin/env node
// Uso: node seed.js <email> <contraseña>
// Ejemplo: node seed.js admin@mibar.com mipassword123

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDocs } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

// ── Config ────────────────────────────────────────────────────────────────────
// ⚠️  Completá con los mismos valores que en js/firebase-config.js

const firebaseConfig = {
  apiKey:            "AIzaSyAjxfYqvF4-sF-6gY2f7INgp2Gs2adcf98",
  authDomain:        "tribu-mostra.firebaseapp.com",
  projectId:         "tribu-mostra",
  storageBucket:     "tribu-mostra.firebasestorage.app",
  messagingSenderId: "835616814810",
  appId:             "1:835616814810:web:942597d49975f29422d7e3"
};

// ── Datos ─────────────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'tragos',         name: 'Tragos',           description: 'Con jugo, soda, pomelo o tónica', category: 'BEBIDAS', order: 1 },
  { id: 'aperitivos',     name: 'Aperitivos',       description: 'Con jugo, soda, pomelo o tónica', category: 'BEBIDAS', order: 2 },
  { id: 'cervezas-lata',  name: 'Cervezas · Lata',  description: null,                              category: 'BEBIDAS', order: 3 },
  { id: 'cervezas-litro', name: 'Cervezas · Litro', description: null,                              category: 'BEBIDAS', order: 4 },
  { id: 'vinos',          name: 'Vinos',            description: null,                              category: 'BEBIDAS', order: 5 },
  { id: 'sin-alcohol',    name: 'Sin Alcohol',      description: null,                              category: 'BEBIDAS', order: 6 },
  { id: 'comida',         name: 'Comida',           description: null,                              category: 'COMIDA',  order: 1 },
];

const ITEMS = [
  // ── TRAGOS ──────────────────────────────────────────────────────────────────
  { sectionId: 'tragos', subsection: 'Whisky (medida)', name: 'Red Label',        description: null, price: 0, order: 10  },
  { sectionId: 'tragos', subsection: 'Whisky (medida)', name: 'Jameson',          description: null, price: 0, order: 20  },
  { sectionId: 'tragos', subsection: 'Whisky (medida)', name: 'Black Label',      description: null, price: 0, order: 30  },
  { sectionId: 'tragos', subsection: 'Ron',             name: 'Havana Añejo',     description: null, price: 0, order: 40  },
  { sectionId: 'tragos', subsection: 'Fernet',          name: 'Branca',           description: null, price: 0, order: 50  },
  { sectionId: 'tragos', subsection: 'Gin Tonic',       name: 'Nacional',         description: null, price: 0, order: 60  },
  { sectionId: 'tragos', subsection: 'Gin Tonic',       name: 'Beefeater',        description: null, price: 0, order: 70  },
  { sectionId: 'tragos', subsection: 'Vodka',           name: 'Smirnoff',         description: null, price: 0, order: 80  },
  { sectionId: 'tragos', subsection: 'Vodka',           name: 'Absolut',          description: null, price: 0, order: 90  },
  { sectionId: 'tragos', subsection: 'Vermut',          name: 'Cinzano',          description: null, price: 0, order: 100 },
  { sectionId: 'tragos', subsection: 'Vermut',          name: 'Vecino',           description: null, price: 0, order: 110 },
  { sectionId: 'tragos', subsection: 'Vermut',          name: 'La Fuerza',        description: null, price: 0, order: 120 },

  // ── APERITIVOS ──────────────────────────────────────────────────────────────
  { sectionId: 'aperitivos', subsection: null, name: 'Cynar',         description: null, price: 0, order: 10 },
  { sectionId: 'aperitivos', subsection: null, name: 'Aperol',        description: null, price: 0, order: 20 },
  { sectionId: 'aperitivos', subsection: null, name: 'Amargo Obrero', description: null, price: 0, order: 30 },
  { sectionId: 'aperitivos', subsection: null, name: 'Campari',       description: null, price: 0, order: 40 },

  // ── CERVEZAS LATA ────────────────────────────────────────────────────────────
  { sectionId: 'cervezas-lata', subsection: 'Rubia',    name: 'Corona',           description: null, price: 0, order: 10  },
  { sectionId: 'cervezas-lata', subsection: 'Rubia',    name: 'Grolsch',          description: null, price: 0, order: 20  },
  { sectionId: 'cervezas-lata', subsection: 'Rubia',    name: 'Warsteiner',       description: null, price: 0, order: 30  },
  { sectionId: 'cervezas-lata', subsection: 'Rubia',    name: 'Amstel',           description: null, price: 0, order: 40  },
  { sectionId: 'cervezas-lata', subsection: 'Rubia',    name: 'Schneider',        description: null, price: 0, order: 50  },
  { sectionId: 'cervezas-lata', subsection: 'IPA',      name: 'Imperial IPA',     description: null, price: 0, order: 60  },
  { sectionId: 'cervezas-lata', subsection: 'IPA',      name: 'Andes IPA',        description: null, price: 0, order: 70  },
  { sectionId: 'cervezas-lata', subsection: 'APA',      name: 'Imperial APA',     description: null, price: 0, order: 80  },
  { sectionId: 'cervezas-lata', subsection: 'Roja',     name: 'Imperial Roja',    description: null, price: 0, order: 90  },
  { sectionId: 'cervezas-lata', subsection: 'Roja',     name: 'Andes Roja',       description: null, price: 0, order: 100 },
  { sectionId: 'cervezas-lata', subsection: 'Negra',    name: 'Andes Negra',      description: null, price: 0, order: 110 },
  { sectionId: 'cervezas-lata', subsection: 'Negra',    name: 'Peñon del Aguila', description: null, price: 0, order: 120 },
  { sectionId: 'cervezas-lata', subsection: 'Negra',    name: 'Imperial Negra',   description: null, price: 0, order: 130 },
  { sectionId: 'cervezas-lata', subsection: 'Negra',    name: 'Stella Noir',      description: null, price: 0, order: 140 },
  { sectionId: 'cervezas-lata', subsection: 'Sin TACC', name: 'Michelob',         description: null, price: 0, order: 150 },

  // ── CERVEZAS LITRO ───────────────────────────────────────────────────────────
  { sectionId: 'cervezas-litro', subsection: 'Rubia', name: 'Heineken', description: null, price: 0, order: 10 },
  { sectionId: 'cervezas-litro', subsection: 'Rubia', name: 'Imperial', description: null, price: 0, order: 20 },

  // ── VINOS ────────────────────────────────────────────────────────────────────
  { sectionId: 'vinos', subsection: 'Botella', name: 'Postales',    description: null, price: 0, order: 10 },
  { sectionId: 'vinos', subsection: 'Botella', name: 'Esmeralda',   description: null, price: 0, order: 20 },
  { sectionId: 'vinos', subsection: 'Botella', name: 'Santa Julia', description: null, price: 0, order: 30 },
  { sectionId: 'vinos', subsection: 'Botella', name: 'Rucamalen',   description: null, price: 0, order: 40 },
  { sectionId: 'vinos', subsection: 'Vaso',    name: 'Postales',    description: null, price: 0, order: 50 },
  { sectionId: 'vinos', subsection: 'Vaso',    name: 'Esmeralda',   description: null, price: 0, order: 60 },
  { sectionId: 'vinos', subsection: 'Vaso',    name: 'Santa Julia', description: null, price: 0, order: 70 },
  { sectionId: 'vinos', subsection: 'Vaso',    name: 'Rucamalen',   description: null, price: 0, order: 80 },

  // ── SIN ALCOHOL ──────────────────────────────────────────────────────────────
  { sectionId: 'sin-alcohol', subsection: 'Cerveza sin alcohol', name: 'Imperial',      description: null, price: 0, order: 10  },
  { sectionId: 'sin-alcohol', subsection: 'Cerveza sin alcohol', name: 'Heineken',      description: null, price: 0, order: 20  },
  { sectionId: 'sin-alcohol', subsection: 'Cerveza sin alcohol', name: 'Quilmes',       description: null, price: 0, order: 30  },
  { sectionId: 'sin-alcohol', subsection: 'Gaseosa',             name: 'Coca Cola',     description: null, price: 0, order: 40  },
  { sectionId: 'sin-alcohol', subsection: 'Gaseosa',             name: 'Coca Cola Zero',description: null, price: 0, order: 50  },
  { sectionId: 'sin-alcohol', subsection: 'Gaseosa',             name: 'Paniza',        description: null, price: 0, order: 60  },
  { sectionId: 'sin-alcohol', subsection: 'Gaseosa',             name: 'Pomelo',        description: null, price: 0, order: 70  },
  { sectionId: 'sin-alcohol', subsection: 'Gaseosa',             name: 'Naranja',       description: null, price: 0, order: 80  },
  { sectionId: 'sin-alcohol', subsection: 'Gaseosa',             name: 'Lima Limón',    description: null, price: 0, order: 90  },
  { sectionId: 'sin-alcohol', subsection: 'Gaseosa',             name: 'Granadina',     description: null, price: 0, order: 100 },
  { sectionId: 'sin-alcohol', subsection: null,                   name: 'Soda',          description: null, price: 0, order: 110 },
  { sectionId: 'sin-alcohol', subsection: null,                   name: 'Agua',          description: null, price: 0, order: 120 },

  // ── COMIDA ───────────────────────────────────────────────────────────────────
  { sectionId: 'comida', subsection: null,        name: 'Sopa Paraguaya',           description: 'Con ensalada',                               price: 0, order: 10  },
  { sectionId: 'comida', subsection: null,        name: 'Tortilla de Papas',        description: 'Con ensalada',                               price: 0, order: 20  },
  { sectionId: 'comida', subsection: null,        name: 'Pizza',                    description: 'Mozzarella / Vegana',                        price: 0, order: 30  },
  { sectionId: 'comida', subsection: null,        name: 'Papizza',                  description: 'Mozzarella / Vegana',                        price: 0, order: 40  },
  { sectionId: 'comida', subsection: null,        name: 'Faína a la pizza',         description: 'Salsa de tomate y Mozzarella / Quesofu',     price: 0, order: 50  },
  { sectionId: 'comida', subsection: null,        name: 'Hamburguesa Vegana',       description: 'Soja, poroto mung · Tomate, rúcula y queso', price: 0, order: 60  },
  { sectionId: 'comida', subsection: null,        name: 'Sandwich Milanesa Vegano', description: 'Con tomate y rúcula',                        price: 0, order: 70  },
  { sectionId: 'comida', subsection: null,        name: 'Tequeños',                 description: null,                                         price: 0, order: 80  },
  { sectionId: 'comida', subsection: null,        name: 'Super Panchos',            description: 'Comunes / Veganos',                          price: 0, order: 90  },
  { sectionId: 'comida', subsection: 'Empanadas', name: 'Carne',                   description: null,                                         price: 0, order: 100 },
  { sectionId: 'comida', subsection: 'Empanadas', name: 'Cebolla y Queso',         description: 'Vegeta',                                     price: 0, order: 110 },
  { sectionId: 'comida', subsection: 'Empanadas', name: 'Roquefort, Cebolla y Queso', description: 'Vegeta',                                  price: 0, order: 120 },
  { sectionId: 'comida', subsection: 'Empanadas', name: 'Puerro y Hongos',         description: 'Vegeta',                                     price: 0, order: 130 },
  { sectionId: 'comida', subsection: 'Empanadas', name: 'Soja al Curry',           description: 'Vegana',                                     price: 0, order: 140 },
  { sectionId: 'comida', subsection: 'Empanadas', name: 'Knishe',                  description: 'Vegana',                                     price: 0, order: 150 },
  { sectionId: 'comida', subsection: 'Empanadas', name: 'Calabaza y Choclo',       description: 'Vegana',                                     price: 0, order: 160 },
];

// ── Main ──────────────────────────────────────────────────────────────────────

const [,, rawUser, password] = process.argv;

if (!rawUser || !password) {
  console.error('Uso: node seed.js <usuario> <contraseña>');
  console.error('Ej:  node seed.js barra mipassword123');
  process.exit(1);
}

// Mismo mecanismo que admin.js: "barra" → "barra@mostra.admin"
const email = rawUser.includes('@') ? rawUser : `${rawUser}@mostra.admin`;

const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

console.log('Iniciando sesión…');
await signInWithEmailAndPassword(auth, email, password);
console.log('✓ Login OK\n');

// Check for existing data
const existing = await getDocs(collection(db, 'items'));
if (!existing.empty) {
  console.warn(`⚠️  Ya hay ${existing.size} ítems en la base de datos.`);
  console.warn('   Si continuás vas a crear duplicados.\n');
  // In non-interactive mode just warn and continue.
  // To abort, kill the process manually (Ctrl+C) within 3 seconds.
  console.warn('   Ctrl+C para cancelar, o esperá 3 segundos para continuar…');
  await new Promise(r => setTimeout(r, 3000));
}

// Write sections
console.log('Creando secciones…');
for (const s of SECTIONS) {
  await setDoc(doc(db, 'sections', s.id), {
    name: s.name, description: s.description, category: s.category, order: s.order
  });
  console.log(`  ✓ ${s.name}`);
}

// Write items
console.log('\nCreando ítems…');
let count = 0;
for (const item of ITEMS) {
  await setDoc(doc(collection(db, 'items')), { ...item, available: true });
  process.stdout.write(`\r  ${++count}/${ITEMS.length} ítems…`);
}

console.log(`\n\n✓ Listo. ${SECTIONS.length} secciones y ${ITEMS.length} ítems cargados.`);
process.exit(0);
