import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { HttpMethod } from "@/components/request/MethodBadge";

interface HeaderEntry {
  key: string;
  value: string;
  enabled: boolean;
}

interface HttpResponse {
  status: number;
  status_text: string;
  headers: Record<string, string>;
  body: string;
  time_ms: number;
  size_bytes: number;
}

interface RequestState {
  method: HttpMethod;
  url: string;
  headers: HeaderEntry[];
  body: string;
  response: HttpResponse | null;
  loading: boolean;
  error: string | null;

  setMethod: (method: HttpMethod) => void;
  setUrl: (url: string) => void;
  setHeaders: (headers: HeaderEntry[]) => void;
  setBody: (body: string) => void;
  sendRequest: () => Promise<void>;
  reset: () => void;
}

export const useRequestStore = create<RequestState>((set, get) => ({
  method: "GET",
  url: "",
  headers: [],
  body: "",
  response: null,
  loading: false,
  error: null,

  setMethod: (method) => set({ method }),
  setUrl: (url) => set({ url }),
  setHeaders: (headers) => set({ headers }),
  setBody: (body) => set({ body }),

  sendRequest: async () => {
    const { method, url, headers, body } = get();

    if (!url.trim()) {
      set({ error: "URL is required" });
      return;
    }

    set({ loading: true, error: null });

    try {
      const response = await invoke<HttpResponse>("send_request", {
        request: {
          method,
          url: url.trim(),
          headers: headers.filter((h) => h.enabled && h.key),
          body: body || null,
        },
      });
      set({ response, loading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : String(err),
        loading: false,
      });
    }
  },

  reset: () =>
    set({
      method: "GET",
      url: "",
      headers: [],
      body: "",
      response: null,
      loading: false,
      error: null,
    }),
}));
