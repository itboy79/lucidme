/**
 * Ambient shims per i plugin Capacitor (§S4-3).
 *
 * I pacchetti `@capacitor/*` vivono in `native/package.json` (non in
 * `apps/app/package.json`): il bundle web NON deve dipendere da loro. Importiamo
 * i plugin solo dinamicamente (`await import(...)`) e sempre dietro
 * `isNative()`, così il path web non risolve mai questi moduli a build time.
 *
 * Per avere i tipi in TypeScript senza installare i pacchetti nell'app,
 * dichiariamo qui i sottoinsiemi delle API che usiamo. I tipi sono minimali e
 * fedeli all'SDK Capacitor 6 (LocalNotifications, Haptics, App, Core).
 */

declare module '@capacitor/core' {
  export interface CapacitorGlobal {
    isNativePlatform(): boolean;
    getPlatform(): 'web' | 'ios' | 'android';
    convertFileSrc(filePath: string): string;
  }
  export const Capacitor: CapacitorGlobal;
  export function registerPlugin<T>(name: string, impl?: unknown): T;
}

declare module '@capacitor/local-notifications' {
  export interface LocalNotificationSchema {
    id: number;
    title?: string;
    body?: string;
    /** Millisecondi dall'epoca. */
    schedule: {
      at?: Date;
      repeats?: boolean;
      every?: 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';
      count?: number;
    };
    sound?: string | null;
    /** Identificatore del canale (Android). */
    channelId?: string;
    extra?: Record<string, unknown>;
  }
  export interface ScheduleOptions {
    notifications: LocalNotificationSchema[];
  }
  export interface ScheduleResult {
    notifications: { id: number }[];
  }
  export interface EnabledResult {
    value: boolean;
  }
  export interface PermissionStatus {
    display: 'granted' | 'denied' | 'prompt';
  }
  export interface Channel {
    id: string;
    name: string;
    description?: string;
    importance: 1 | 2 | 3 | 4 | 5;
    visibility?: -1 | 0 | 1;
    sound?: string | null;
    vibration?: boolean;
    lights?: boolean;
    lightColor?: string;
  }
  export interface PendingResult {
    notifications: { id: number }[];
  }
  export interface LocalNotifications {
    schedule(opts: ScheduleOptions): Promise<ScheduleResult>;
    cancel(opts: { notifications: { id: number }[] }): Promise<void>;
    getPending(): Promise<PendingResult>;
    checkPermissions(): Promise<PermissionStatus>;
    requestPermissions(): Promise<PermissionStatus>;
    areEnabled(): Promise<EnabledResult>;
    createChannel(opts: { channel: Channel }): Promise<void>;
    listChannels(): Promise<{ channels: Channel[] }>;
  }
  // Named export (come nell'SDK reale: `import { LocalNotifications }`).
  export const LocalNotifications: LocalNotifications;
}

declare module '@capacitor/haptics' {
  export interface VibrateOptions {
    duration?: number;
  }
  export interface ImpactOptions {
    style?: 'HEAVY' | 'MEDIUM' | 'LIGHT' | 'SOFT' | 'RIGID';
  }
  export interface Haptics {
    vibrate(opts?: VibrateOptions): Promise<void>;
    impact(opts?: ImpactOptions): Promise<void>;
  }
  export const Haptics: Haptics;
}

declare module '@capacitor/app' {
  export interface AppState {
    isActive: boolean;
  }
  export interface AppPlugin {
    getState(): Promise<AppState>;
    addListener(
      eventName: 'appStateChange',
      listener: (state: AppState) => void,
    ): Promise<PluginListenerHandle>;
    addListener(
      eventName: string,
      listener: (...args: unknown[]) => void,
    ): Promise<PluginListenerHandle>;
    exitApp(): never;
  }
  export interface PluginListenerHandle {
    remove(): Promise<void>;
  }
  export const App: AppPlugin;
}
