import { firebaseConfig } from "./config.js";
export function initFirebase() {
  if (!window.firebase.apps.length) window.firebase.initializeApp(firebaseConfig);
  return { auth: window.firebase.auth(), db: window.firebase.firestore() };
}
