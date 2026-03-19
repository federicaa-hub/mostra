import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ⚠️  COMPLETÁ ESTOS VALORES CON LOS DE TU PROYECTO FIREBASE
// Pasos:
//   1. Andá a https://console.firebase.google.com
//   2. Creá un proyecto (o abrí el existente)
//   3. Configuración del proyecto → General → Tus apps → </> Web app
//   4. Copiá el objeto firebaseConfig y pegalo acá abajo

const firebaseConfig = {
  apiKey:            "AIzaSyAjxfYqvF4-sF-6gY2f7INgp2Gs2adcf98",
  authDomain:        "tribu-mostra.firebaseapp.com",
  projectId:         "tribu-mostra",
  storageBucket:     "tribu-mostra.firebasestorage.app",
  messagingSenderId: "835616814810",
  appId:             "1:835616814810:web:942597d49975f29422d7e3"
};

const app = initializeApp(firebaseConfig);

// Persistent offline cache: sirve datos desde IndexedDB en la segunda visita
// (carga casi instantánea mientras sincroniza en background con Firestore)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentSingleTabManager() })
});
export const auth = getAuth(app);
