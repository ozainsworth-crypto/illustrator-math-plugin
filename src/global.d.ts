/**
 * Global type declarations for CEP environment
 * Phase 5 Task 19.7 - Font Pack Tool Entry Button
 */

interface Window {
  cep?: {
    util?: {
      openURLInDefaultBrowser(url: string): void;
    };
    process?: {
      createProcess: (command: string, callback: (result: any) => void) => void;
    };
  };
}
