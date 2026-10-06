import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.turnoflash.app",
  appName: "Turno Flash",
  webDir: "out",
  android: {
    // Tailwind v4 needs Chrome 111+. Older WebViews (common in Cuba, phones
    // without Play Store) render the app unstyled, so show errorPath instead
    // asking to update Android System WebView (D-08).
    minWebViewVersion: 111,
  },
  server: {
    androidScheme: "https",
    errorPath: "webview-update.html",
    // Para desarrollo local con hot reload, descomenta estas líneas:
    // url: "http://192.168.1.100:3000", // Cambia por tu IP local
    // cleartext: true,
  },
  plugins: {
    // Configuración del Status Bar
    StatusBar: {
      style: "default", // 'default' | 'light' | 'dark'
      backgroundColor: "#ffffff", // Color por defecto (se sobrescribe en useCapacitor.ts)
    },
  },
};

export default config;
