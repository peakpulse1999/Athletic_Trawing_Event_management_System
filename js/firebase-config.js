// ====== FIREBASE SETTINGS ======
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyADi0H-MZXpCS0kD3WyR8Q3IO6rtF7hdQA",
  authDomain: "athletic-trawing-management.firebaseapp.com",
  projectId: "athletic-trawing-management",
  storageBucket: "athletic-trawing-management.firebasestorage.app",
  messagingSenderId: "695954950628",
  appId: "1:695954950628:web:c925d50f71e4b878435ff1",
  // Paste the Realtime Database URL here ONLY if it is not the default one.
  // Firebase console -> Build -> Realtime Database -> the URL shown at the top. Examples:
  //   "https://athletic-trawing-management-default-rtdb.firebaseio.com"
  //   "https://athletic-trawing-management-default-rtdb.asia-southeast1.firebasedatabase.app"
  databaseURL: "https://athletic-trawing-management-default-rtdb.asia-southeast1.firebasedatabase.app"
};
// true  = Control room + Mobile entry need an email/password login (recommended; scoreboard stays public)
// false = anyone with the link can edit (only use together with the "open" rules)
const REQUIRE_LOGIN = true;
