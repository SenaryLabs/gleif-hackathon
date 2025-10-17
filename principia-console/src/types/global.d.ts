// Global type declarations for Principia Console

declare global {
  interface Window {
    cardano?: {
      [key: string]: {
        enable: () => Promise<any>;
        isEnabled: () => Promise<boolean>;
        experimental?: {
          getKeriIdentifier: () => Promise<{ id: string; oobi: string }>;
        };
      };
    };
  }
}

export {};
