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
import type { SavedRequest } from "@/types/collection";
import {
  parseQueryParams,
  buildUrlWithParams,
  serializeBody,
  injectAuth,
} from "@/lib/request-utils";
import { resolveRequest } from "@/lib/variables";

export interface TabRequestState {
  method: HttpMethod;
  url: string;
  headers: HeaderEntry[];
  params: ParamEntry[];
  bodyConfig: RequestBody;
  auth: RequestAuth;
  response: HttpResponse | null;
  loading: boolean;
  error: string | null;
}

export interface Tab {
  id: string;
  savedRequestId: string | null;
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
    auth: { type: "none" },
    response: null,
    loading: false,
    error: null,
  };
}

function stateFromSavedRequest(req: SavedRequest): TabRequestState {
  return {
    method: req.method,
    url: req.url,
    headers: req.headers,
    params: req.params,
    bodyConfig: req.body,
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
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;

  // Active tab mutations
  setMethod: (method: HttpMethod) => void;
  setUrl: (url: string, source?: "params" | "url") => void;
  setHeaders: (headers: HeaderEntry[]) => void;
  setParams: (params: ParamEntry[], source?: "params" | "url") => void;
  setBodyConfig: (body: RequestBody) => void;
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
      title: request.name,
      state,
      savedSnapshot: { ...state },
    };
    set((s) => ({
      tabs: [...s.tabs, tab],
      activeTabId: id,
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

  setAuth: (auth) => {
    set((s) => ({
      tabs: updateActiveTab(s.tabs, s.activeTabId, () => ({ auth })),
    }));
  },

  sendRequest: async (resolveAuth, variableScope) => {
    const tab = get().getActiveTab();
    if (!tab) return;

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
      });

      set((s) => ({
        tabs: updateActiveTab(s.tabs, s.activeTabId, () => ({
          response,
          loading: false,
        })),
      }));
    } catch (err) {
      set((s) => ({
        tabs: updateActiveTab(s.tabs, s.activeTabId, () => ({
          error: err instanceof Error ? err.message : String(err),
          loading: false,
        })),
      }));
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
