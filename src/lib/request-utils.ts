import type {
  HeaderEntry,
  ParamEntry,
  RequestBody,
  RequestAuth,
} from "@/types/request";

export function parseQueryParams(url: string): ParamEntry[] {
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

export function buildUrlWithParams(url: string, params: ParamEntry[]): string {
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

export function serializeBody(bodyConfig: RequestBody): {
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

export function injectAuth(
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
