import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor 6 config.
 * - appId PROVVISORIO `me.vigilia.app.dev` → bloccato da D-008 (naming definitivo).
 *   NON scegliere un altro appId in autonomia (regola roadmap/README.md).
 * - webDir punta al build statico di apps/app (adapter-static → apps/app/build).
 * - androidScheme https per quei plugin che lo richiedono.
 */
const config: CapacitorConfig = {
  appId: 'me.vigilia.app.dev',
  appName: 'Lucid Me',
  webDir: '../apps/app/build',
  server: {
    androidScheme: 'https',
    // nessun cleartext: tutto https
    cleartext: false,
  },
  ios: {
    contentInset: 'always',
    backgroundColor: '#0a0a14',
    // limite minimo iOS 16 (regola Step 0 §S0-4)
    // (il target vero si setta in Xcode; qui solo metadato)
    scrollEnabled: true,
  },
  android: {
    backgroundColor: '#0a0a14',
    // minSdk 26, targetSdk ultima stabile → si materializzano in AndroidManifest/build.gradle dopo `cap add android`
    allowMixedContent: false,
  },
  plugins: {
    LocalNotifications: {
      // Icona notifica piccola: usa maskable esistente come fallback.
      smallIcon: 'icons/icon-192.png',
      iconColor: '#0a0a14',
      sound: 'notification.wav',
    },
    Haptics: {},
    Filesystem: {},
    App: {},
  },
};

export default config;
