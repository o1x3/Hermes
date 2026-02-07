import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

export type Theme = "dark" | "light" | "system";

interface Settings {
  theme: Theme;
  historyRetentionDays: number;
  timeoutMs: number;
  proxyUrl: string;
  verifySsl: boolean;
}

const DEFAULTS: Settings = {
  theme: "dark",
  historyRetentionDays: 30,
  timeoutMs: 30000,
  proxyUrl: "",
  verifySsl: true,
};

const THEME_CACHE_KEY = "hermes-theme";

function applyThemeClass(theme: Theme) {
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  document.documentElement.classList.toggle("dark", isDark);
  localStorage.setItem(THEME_CACHE_KEY, theme);
}

interface SettingsState extends Settings {
  loaded: boolean;

  loadSettings: () => Promise<void>;
  setTheme: (theme: Theme) => Promise<void>;
  setHistoryRetentionDays: (days: number) => Promise<void>;
  setTimeoutMs: (ms: number) => Promise<void>;
  setProxyUrl: (url: string) => Promise<void>;
  setVerifySsl: (verify: boolean) => Promise<void>;
}

async function getSetting(key: string): Promise<string | null> {
  return invoke<string | null>("get_setting", { key });
}

async function setSetting(key: string, value: string): Promise<void> {
  await invoke("set_setting", { key, value });
}

export const useSettingsStore = create<SettingsState>((set) => ({
  ...DEFAULTS,
  loaded: false,

  loadSettings: async () => {
    const [theme, retention, timeout, proxy, ssl] = await Promise.all([
      getSetting("theme"),
      getSetting("history_retention_days"),
      getSetting("timeout_ms"),
      getSetting("proxy_url"),
      getSetting("verify_ssl"),
    ]);

    const resolved: Settings = {
      theme: (theme as Theme) || DEFAULTS.theme,
      historyRetentionDays: retention ? parseInt(retention, 10) : DEFAULTS.historyRetentionDays,
      timeoutMs: timeout ? parseInt(timeout, 10) : DEFAULTS.timeoutMs,
      proxyUrl: proxy ?? DEFAULTS.proxyUrl,
      verifySsl: ssl !== null ? ssl === "true" : DEFAULTS.verifySsl,
    };

    applyThemeClass(resolved.theme);
    set({ ...resolved, loaded: true });
  },

  setTheme: async (theme) => {
    await setSetting("theme", theme);
    applyThemeClass(theme);
    set({ theme });
  },

  setHistoryRetentionDays: async (days) => {
    await setSetting("history_retention_days", String(days));
    set({ historyRetentionDays: days });
  },

  setTimeoutMs: async (ms) => {
    await setSetting("timeout_ms", String(ms));
    set({ timeoutMs: ms });
  },

  setProxyUrl: async (url) => {
    await setSetting("proxy_url", url);
    set({ proxyUrl: url });
  },

  setVerifySsl: async (verify) => {
    await setSetting("verify_ssl", String(verify));
    set({ verifySsl: verify });
  },
}));

// Listen for system theme changes when in "system" mode
if (typeof window !== "undefined") {
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", () => {
      const { theme } = useSettingsStore.getState();
      if (theme === "system") {
        applyThemeClass("system");
      }
    });
}

// Apply cached theme immediately (before React mounts) to avoid FOUC
export function applyCachedTheme() {
  const cached = localStorage.getItem(THEME_CACHE_KEY) as Theme | null;
  if (cached) {
    applyThemeClass(cached);
  }
}
