export type InstalledApp = {
  packageName: string;
  appName: string;
  /** Base64 encoded PNG (no data-URI prefix). */
  icon: string;
  isSystem: boolean;
  /** OS-declared category (e.g. "GAME", "SOCIAL"); null if unset or unavailable (API < 26). */
  osCategory: string | null;
};
