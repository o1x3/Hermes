import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type {
  HttpMethod,
  HeaderEntry,
  ParamEntry,
  RequestBody,
  RequestAuth,
  HttpResponse,
} from "@/types/request";

type BodyType = RequestBody["type"];

interface BodyCache {
  raw?: Extract<RequestBody, { type: "raw" }>;
  "form-data"?: Extract<RequestBody, { type: "form-data" }>;
  "x-www-form-urlencoded"?: Extract<RequestBody, { type: "x-www-form-urlencoded" }>;
  binary?: Extract<RequestBody, { type: "binary" }>;
}
import type { SavedRequest } from "@/types/collection";
import type { HistoryEntry } from "@/types/history";
import {
  parseQueryParams,
  buildUrlWithParams,
  serializeBody,
  injectAuth,
} from "@/lib/request-utils";
import { resolveRequest } from "@/lib/variables";
import { useHistoryStore } from "@/stores/historyStore";
import { useSettingsStore } from "@/stores/settingsStore";
import {
  serializeHeaders,
  serializeParams,
  serializeBody as serializeBodyJson,
  serializeAuth,
} from "@/lib/workspace-utils";

export interface TabRequestState {
  method: HttpMethod;
  url: string;
  headers: HeaderEntry[];
  params: ParamEntry[];
  bodyConfig: RequestBody;
  bodyCache: BodyCache;
  auth: RequestAuth;
  response: HttpResponse | null;
  loading: boolean;
  error: string | null;
}

export interface Tab {
  id: string;
  savedRequestId: string | null;
  historyEntryId: string | null;
  readOnly: boolean;
  title: string;
  state: TabRequestState;
  savedSnapshot: TabRequestState | null;
}

function defaultTabState(): TabRequestState {
  return {
    method: "GET",
    url: "",
    headers: [],
    params: [],
    bodyConfig: { type: "none" },
    bodyCache: {},
    auth: { type: "none" },
    response: null,
    loading: false,
    error: null,
  };
}

function stateFromSavedRequest(req: SavedRequest): TabRequestState {
  const cache: BodyCache = {};
  if (req.body.type !== "none") {
    cache[req.body.type] = req.body as never;
  }
  return {
    method: req.method,
    url: req.url,
    headers: req.headers,
    params: req.params,
    bodyConfig: req.body,
    bodyCache: cache,
    auth: req.auth,
    response: null,
    loading: false,
    error: null,
  };
}

function generateId(): string {
  return crypto.randomUUID();
}

/** Compare two TabRequestStates ignoring transient fields (response, loading, error) */
function stateEqual(a: TabRequestState, b: TabRequestState): boolean {
  return (
    a.method === b.method &&
    a.url === b.url &&
    JSON.stringify(a.headers) === JSON.stringify(b.headers) &&
    JSON.stringify(a.params) === JSON.stringify(b.params) &&
    JSON.stringify(a.bodyConfig) === JSON.stringify(b.bodyConfig) &&
    JSON.stringify(a.auth) === JSON.stringify(b.auth)
  );
}

interface TabState {
  tabs: Tab[];
  activeTabId: string | null;

  // Tab lifecycle
  openNewTab: () => void;
  openSavedRequest: (request: SavedRequest) => void;
  openHistoryEntry: (entry: HistoryEntry) => void;
  restoreFromHistory: () => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;

  // Active tab mutations
  setMethod: (method: HttpMethod) => void;
  setUrl: (url: string, source?: "params" | "url") => void;
  setHeaders: (headers: HeaderEntry[]) => void;
  setParams: (params: ParamEntry[], source?: "params" | "url") => void;
  setBodyConfig: (body: RequestBody) => void;
  setBodyType: (type: BodyType) => void;
  setAuth: (auth: RequestAuth) => void;
  sendRequest: (resolveAuth?: () => RequestAuth, variableScope?: Map<string, string>) => Promise<void>;

  // Persistence helpers
  linkTabToSaved: (tabId: string, savedRequestId: string, title: string) => void;
  updateSavedSnapshot: (tabId: string) => void;

  // Computed
  isTabDirty: (tabId: string) => boolean;
  getActiveTab: () => Tab | null;
}

function updateActiveTab(
  tabs: Tab[],
  activeTabId: string | null,
  updater: (state: TabRequestState) => Partial<TabRequestState>,
): Tab[] {
  if (!activeTabId) return tabs;
  return tabs.map((t) =>
    t.id === activeTabId
      ? { ...t, state: { ...t.state, ...updater(t.state) } }
      : t,
  );
}

export const useTabStore = create<TabState>((set, get) => ({
  tabs: [],
  activeTabId: null,

  openNewTab: () => {
    const id = generateId();
    const tab: Tab = {
      id,
      savedRequestId: null,
      historyEntryId: null,
      readOnly: false,
      title: "New Request",
      state: defaultTabState(),
      savedSnapshot: null,
    };
    set((s) => ({
      tabs: [...s.tabs, tab],
      activeTabId: id,
    }));
  },

  openSavedRequest: (request) => {
    const { tabs } = get();
    // If already open, just switch to it
    const existing = tabs.find((t) => t.savedRequestId === request.id);
    if (existing) {
      set({ activeTabId: existing.id });
      return;
    }
    const id = generateId();
    const state = stateFromSavedRequest(request);
    const tab: Tab = {
      id,
      savedRequestId: request.id,
      historyEntryId: null,
      readOnly: false,
      title: request.name,
      state,
      savedSnapshot: { ...state },
    };
    set((s) => ({
      tabs: [...s.tabs, tab],
      activeTabId: id,
    }));
  },

  openHistoryEntry: (entry) => {
    const id = generateId();
    let title: string;
    try {
      const parsed = new URL(entry.url);
      title = `${entry.method} ${parsed.pathname}`;
    } catch {
      title = `${entry.method} ${entry.url.slice(0, 30)}`;
    }

    const response: HttpResponse | null =
      entry.responseStatus != null
        ? {
            status: entry.responseStatus,
            status_text: entry.responseStatusText ?? "",
            headers: entry.responseHeaders ?? {},
            body: entry.responseBody ?? "",
            time_ms: entry.responseTimeMs ?? 0,
            size_bytes: entry.responseSizeBytes ?? 0,
          }
        : null;

    const tab: Tab = {
      id,
      savedRequestId: null,
      historyEntryId: entry.id,
      readOnly: true,
      title,
      state: {
        method: entry.method,
        url: entry.url,
        headers: entry.headers,
        params: entry.params,
        bodyConfig: entry.body,
        bodyCache: entry.body.type !== "none" ? { [entry.body.type]: entry.body as never } : {},
        auth: entry.auth,
        response,
        loading: false,
        error: entry.error,
      },
      savedSnapshot: null,
    };

    set((s) => ({
      tabs: [...s.tabs, tab],
      activeTabId: id,
    }));
  },

  restoreFromHistory: () => {
    const tab = get().getActiveTab();
    if (!tab || !tab.readOnly) return;
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.id === tab.id
          ? {
              ...t,
              historyEntryId: null,
              readOnly: false,
              title: "New Request",
            }
          : t,
      ),
    }));
  },

  closeTab: (tabId) => {
    set((s) => {
      const idx = s.tabs.findIndex((t) => t.id === tabId);
      const newTabs = s.tabs.filter((t) => t.id !== tabId);
      let newActive = s.activeTabId;
      if (s.activeTabId === tabId) {
        if (newTabs.length === 0) {
          newActive = null;
        } else {
          // Activate the tab to the left, or first
          const newIdx = Math.min(idx, newTabs.length - 1);
          newActive = newTabs[newIdx].id;
        }
      }
      return { tabs: newTabs, activeTabId: newActive };
    });
  },

  setActiveTab: (tabId) => {
    set({ activeTabId: tabId });
  },

  setMethod: (method) => {
    set((s) => ({
      tabs: updateActiveTab(s.tabs, s.activeTabId, () => ({ method })),
    }));
  },

  setUrl: (url, source) => {
    set((s) => ({
      tabs: updateActiveTab(s.tabs, s.activeTabId, () => {
        if (source === "params") {
          return { url };
        }
        return { url, params: parseQueryParams(url) };
      }),
    }));
  },

  setHeaders: (headers) => {
    set((s) => ({
      tabs: updateActiveTab(s.tabs, s.activeTabId, () => ({ headers })),
    }));
  },

  setParams: (params, source) => {
    set((s) => ({
      tabs: updateActiveTab(s.tabs, s.activeTabId, (state) => {
        if (source === "url") {
          return { params };
        }
        return { params, url: buildUrlWithParams(state.url, params) };
      }),
    }));
  },

  setBodyConfig: (bodyConfig) => {
    set((s) => ({
      tabs: updateActiveTab(s.tabs, s.activeTabId, () => ({ bodyConfig })),
    }));
  },

  setBodyType: (type) => {
    set((s) => {
      const tab = s.tabs.find((t) => t.id === s.activeTabId);
      if (!tab) return s;

      const currentBody = tab.state.bodyConfig;
      const currentCache = tab.state.bodyCache;

      const newCache = { ...currentCache };
      if (currentBody.type !== "none") {
        newCache[currentBody.type] = currentBody as never;
      }

      let newBody: RequestBody;
      if (type === "none") {
        newBody = { type: "none" };
      } else if (newCache[type]) {
        newBody = newCache[type] as RequestBody;
      } else {
        switch (type) {
          case "raw":
            newBody = { type: "raw", format: "json", content: "" };
            break;
          case "form-data":
            newBody = { type: "form-data", entries: [] };
            break;
          case "x-www-form-urlencoded":
            newBody = { type: "x-www-form-urlencoded", entries: [] };
            break;
          case "binary":
            newBody = { type: "binary", filePath: "" };
            break;
          default:
            newBody = { type: "none" };
        }
      }

      return {
        tabs: s.tabs.map((t) =>
          t.id === s.activeTabId
            ? { ...t, state: { ...t.state, bodyConfig: newBody, bodyCache: newCache } }
            : t,
        ),
      };
    });
  },

  setAuth: (auth) => {
    set((s) => ({
      tabs: updateActiveTab(s.tabs, s.activeTabId, () => ({ auth })),
    }));
  },

  sendRequest: async (resolveAuth, variableScope) => {
    const tab = get().getActiveTab();
    if (!tab || tab.readOnly) return;

    // Resolve auth first (may come from parent collection/folder)
    const stateWithAuth = resolveAuth
      ? { ...tab.state, auth: resolveAuth() }
      : tab.state;

    // Resolve variables if scope is provided
    const resolved = variableScope
      ? resolveRequest(stateWithAuth, variableScope)
      : stateWithAuth;

    const { method, url, headers, params, bodyConfig, auth } = resolved;

    if (!url.trim()) {
      set((s) => ({
        tabs: updateActiveTab(s.tabs, s.activeTabId, () => ({
          error: "URL is required",
        })),
      }));
      return;
    }

    set((s) => ({
      tabs: updateActiveTab(s.tabs, s.activeTabId, () => ({
        loading: true,
        error: null,
      })),
    }));

    // Build HTTP config from settings
    const settings = useSettingsStore.getState();
    const config = {
      timeout_ms: settings.timeoutMs,
      proxy_url: settings.proxyUrl || null,
      verify_ssl: settings.verifySsl,
    };

    try {
      const injected = injectAuth(headers, params, auth);
      const finalUrl = buildUrlWithParams(url.trim(), injected.params);
      const { body, contentType } = serializeBody(bodyConfig);

      const finalHeaders = injected.headers.filter((h) => h.enabled && h.key);
      if (
        contentType &&
        !finalHeaders.some((h) => h.key.toLowerCase() === "content-type")
      ) {
        finalHeaders.push({
          key: "Content-Type",
          value: contentType,
          enabled: true,
        });
      }

      const response = await invoke<HttpResponse>("send_request", {
        request: {
          method,
          url: finalUrl,
          headers: finalHeaders,
          body: body || null,
        },
        config,
      });

      set((s) => ({
        tabs: updateActiveTab(s.tabs, s.activeTabId, () => ({
          response,
          loading: false,
        })),
      }));

      // Log to history (fire-and-forget)
      useHistoryStore.getState().logEntry({
        method: tab.state.method,
        url: tab.state.url,
        headers: serializeHeaders(tab.state.headers),
        params: serializeParams(tab.state.params),
        body: serializeBodyJson(tab.state.bodyConfig),
        auth: serializeAuth(tab.state.auth),
        response_status: response.status,
        response_status_text: response.status_text,
        response_headers: JSON.stringify(response.headers),
        response_body: response.body,
        response_time_ms: response.time_ms,
        response_size_bytes: response.size_bytes,
        error: null,
        saved_request_id: tab.savedRequestId,
      }).catch(() => {});
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      set((s) => ({
        tabs: updateActiveTab(s.tabs, s.activeTabId, () => ({
          error: errorMsg,
          loading: false,
        })),
      }));

      // Log error to history too
      useHistoryStore.getState().logEntry({
        method: tab.state.method,
        url: tab.state.url,
        headers: serializeHeaders(tab.state.headers),
        params: serializeParams(tab.state.params),
        body: serializeBodyJson(tab.state.bodyConfig),
        auth: serializeAuth(tab.state.auth),
        response_status: null,
        response_status_text: null,
        response_headers: null,
        response_body: null,
        response_time_ms: null,
        response_size_bytes: null,
        error: errorMsg,
        saved_request_id: tab.savedRequestId,
      }).catch(() => {});
    }
  },

  linkTabToSaved: (tabId, savedRequestId, title) => {
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.id === tabId
          ? {
              ...t,
              savedRequestId,
              title,
              savedSnapshot: { ...t.state },
            }
          : t,
      ),
    }));
  },

  updateSavedSnapshot: (tabId) => {
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.id === tabId ? { ...t, savedSnapshot: { ...t.state } } : t,
      ),
    }));
  },

  isTabDirty: (tabId) => {
    const tab = get().tabs.find((t) => t.id === tabId);
    if (!tab || !tab.savedSnapshot) return false;
    return !stateEqual(tab.state, tab.savedSnapshot);
  },

  getActiveTab: () => {
    const { tabs, activeTabId } = get();
    if (!activeTabId) return null;
    return tabs.find((t) => t.id === activeTabId) ?? null;
  },
}));
