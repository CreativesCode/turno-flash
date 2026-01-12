import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.turnoflash.app",
  appName: "Turno Flash",
  webDir: "out",
  server: {
    androidScheme: "https",
  },
};

export default config;
