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

interface RequestState {
  method: HttpMethod;
  url: string;
  headers: HeaderEntry[];
  params: ParamEntry[];
  bodyConfig: RequestBody;
  auth: RequestAuth;
  response: HttpResponse | null;
  loading: boolean;
  error: string | null;

  setMethod: (method: HttpMethod) => void;
  setUrl: (url: string, source?: "params" | "url") => void;
  setHeaders: (headers: HeaderEntry[]) => void;
  setParams: (params: ParamEntry[], source?: "params" | "url") => void;
  setBodyConfig: (body: RequestBody) => void;
  setAuth: (auth: RequestAuth) => void;
  sendRequest: () => Promise<void>;
  reset: () => void;
}

function parseQueryParams(url: string): ParamEntry[] {
  try {
    const u = new URL(url);
    const entries: ParamEntry[] = [];
    u.searchParams.forEach((value, key) => {
      entries.push({ key, value, enabled: true });
    });
    return entries;
  } catch {
    return [];
  }
}

function buildUrlWithParams(url: string, params: ParamEntry[]): string {
  try {
    const u = new URL(url);
    u.search = "";
    const enabled = params.filter((p) => p.enabled && p.key);
    for (const p of enabled) {
      u.searchParams.append(p.key, p.value);
    }
    return u.toString();
  } catch {
    return url;
  }
}

function serializeBody(bodyConfig: RequestBody): {
  body: string | null;
  contentType: string | null;
} {
  switch (bodyConfig.type) {
    case "none":
      return { body: null, contentType: null };
    case "raw": {
      const formatToContentType: Record<string, string> = {
        json: "application/json",
        xml: "application/xml",
        text: "text/plain",
      };
      return {
        body: bodyConfig.content || null,
        contentType: formatToContentType[bodyConfig.format],
      };
    }
    case "x-www-form-urlencoded": {
      const params = new URLSearchParams();
      for (const e of bodyConfig.entries.filter((e) => e.enabled && e.key)) {
        params.append(e.key, e.value);
      }
      const str = params.toString();
      return {
        body: str || null,
        contentType: "application/x-www-form-urlencoded",
      };
    }
    case "form-data": {
      // Text-only multipart: build a boundary-delimited string
      const boundary = "----HermesBoundary" + Date.now();
      const entries = bodyConfig.entries.filter((e) => e.enabled && e.key);
      if (entries.length === 0) return { body: null, contentType: null };
      let str = "";
      for (const e of entries) {
        str += `--${boundary}\r\n`;
        str += `Content-Disposition: form-data; name="${e.key}"\r\n\r\n`;
        str += `${e.value}\r\n`;
      }
      str += `--${boundary}--\r\n`;
      return {
        body: str,
        contentType: `multipart/form-data; boundary=${boundary}`,
      };
    }
    case "binary":
      return { body: null, contentType: null };
  }
}

function injectAuth(
  headers: HeaderEntry[],
  params: ParamEntry[],
  auth: RequestAuth,
): { headers: HeaderEntry[]; params: ParamEntry[] } {
  if (auth.type === "none") return { headers, params };

  const h = [...headers];
  const p = [...params];

  switch (auth.type) {
    case "bearer":
      if (auth.token) {
        h.push({
          key: "Authorization",
          value: `Bearer ${auth.token}`,
          enabled: true,
        });
      }
      break;
    case "basic":
      if (auth.username || auth.password) {
        const encoded = btoa(`${auth.username}:${auth.password}`);
        h.push({
          key: "Authorization",
          value: `Basic ${encoded}`,
          enabled: true,
        });
      }
      break;
    case "apikey":
      if (auth.key && auth.value) {
        if (auth.addTo === "header") {
          h.push({ key: auth.key, value: auth.value, enabled: true });
        } else {
          p.push({ key: auth.key, value: auth.value, enabled: true });
        }
      }
      break;
  }

  return { headers: h, params: p };
}

export const useRequestStore = create<RequestState>((set, get) => ({
  method: "GET",
  url: "",
  headers: [],
  params: [],
  bodyConfig: { type: "none" },
  auth: { type: "none" },
  response: null,
  loading: false,
  error: null,

  setMethod: (method) => set({ method }),

  setUrl: (url, source) => {
    if (source === "params") {
      // Only update URL, don't re-parse params
      set({ url });
    } else {
      // Parse query params from URL
      const params = parseQueryParams(url);
      set({ url, params });
    }
  },

  setHeaders: (headers) => set({ headers }),

  setParams: (params, source) => {
    if (source === "url") {
      // Only update params, don't re-build URL
      set({ params });
    } else {
      // Sync params into URL
      const { url } = get();
      const newUrl = buildUrlWithParams(url, params);
      set({ params, url: newUrl });
    }
  },

  setBodyConfig: (bodyConfig) => set({ bodyConfig }),
  setAuth: (auth) => set({ auth }),

  sendRequest: async () => {
    const { method, url, headers, params, bodyConfig, auth } = get();

    if (!url.trim()) {
      set({ error: "URL is required" });
      return;
    }

    set({ loading: true, error: null });

    try {
      // Inject auth into headers/params
      const injected = injectAuth(headers, params, auth);

      // Build final URL with all enabled params (including auth query params)
      const finalUrl = buildUrlWithParams(url.trim(), injected.params);

      // Serialize body
      const { body, contentType } = serializeBody(bodyConfig);

      // Build final headers
      const finalHeaders = injected.headers.filter((h) => h.enabled && h.key);
      if (contentType && !finalHeaders.some((h) => h.key.toLowerCase() === "content-type")) {
        finalHeaders.push({ key: "Content-Type", value: contentType, enabled: true });
      }

      const response = await invoke<HttpResponse>("send_request", {
        request: {
          method,
          url: finalUrl,
          headers: finalHeaders,
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
      params: [],
      bodyConfig: { type: "none" },
      auth: { type: "none" },
      response: null,
      loading: false,
      error: null,
    }),
}));
