/* eslint-disable @typescript-eslint/no-empty-object-type */
// App-wide ambient types. Le interfacce vuote sono placeholder previsti da SvelteKit,
// riempite negli step successivi (Locals in Step 7, PageData dai load(), etc.).

declare global {
  namespace App {
    // eslint-disable-next-line no-var
    var __lucidmeUpdateSW: (() => Promise<void>) | undefined;
    interface Error {
      message: string;
    }
    interface Locals {
      /* popolato in Step 7 (auth/session) */
    }
    interface PageData {
      /* popolato dai load() delle route */
    }
    interface PageState {
      /* popolato da push/replace state */
    }
    interface Platform {
      /* popolato da adapter (Capacitor) se serve */
    }
    interface PageProps {
      data: PageData;
      state: PageState;
    }
    interface LayoutProps {
      data: PageData;
      children: import('svelte').Snippet;
    }
  }
}

export {};
