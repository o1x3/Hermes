import type { HttpMethod, HeaderEntry, ParamEntry, RequestBody, RequestAuth } from "@/types/request";

export interface PostmanImport {
  name: string;
  description: string;
  folders: { name: string; parentPath: string[] }[];
  requests: {
    name: string;
    method: HttpMethod;
    url: string;
    headers: HeaderEntry[];
    params: ParamEntry[];
    body: RequestBody;
    auth: RequestAuth;
    folderPath: string[];
  }[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseAuth(raw: any): RequestAuth {
  if (!raw || !raw.type) return { type: "none" };

  switch (raw.type) {
    case "bearer": {
      const token = raw.bearer?.find((b: { key: string; value: string }) => b.key === "token")?.value ?? "";
      return { type: "bearer", token };
    }
    case "basic": {
      const username = raw.basic?.find((b: { key: string; value: string }) => b.key === "username")?.value ?? "";
      const password = raw.basic?.find((b: { key: string; value: string }) => b.key === "password")?.value ?? "";
      return { type: "basic", username, password };
    }
    case "apikey": {
      const key = raw.apikey?.find((b: { key: string; value: string }) => b.key === "key")?.value ?? "";
      const value = raw.apikey?.find((b: { key: string; value: string }) => b.key === "value")?.value ?? "";
      const addTo = raw.apikey?.find((b: { key: string; value: string }) => b.key === "in")?.value === "query" ? "query" : "header";
      return { type: "apikey", key, value, addTo: addTo as "header" | "query" };
    }
    default:
      return { type: "none" };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseBody(raw: any): RequestBody {
  if (!raw || !raw.mode) return { type: "none" };

  switch (raw.mode) {
    case "raw":
      return {
        type: "raw",
        format: raw.options?.raw?.language === "xml" ? "xml" : raw.options?.raw?.language === "text" ? "text" : "json",
        content: raw.raw ?? "",
      };
    case "formdata":
      return {
        type: "form-data",
        entries: (raw.formdata ?? []).map((e: { key: string; value: string; disabled?: boolean }) => ({
          key: e.key,
          value: e.value ?? "",
          enabled: !e.disabled,
        })),
      };
    case "urlencoded":
      return {
        type: "x-www-form-urlencoded",
        entries: (raw.urlencoded ?? []).map((e: { key: string; value: string; disabled?: boolean }) => ({
          key: e.key,
          value: e.value ?? "",
          enabled: !e.disabled,
        })),
      };
    default:
      return { type: "none" };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function processItem(item: any, path: string[], result: PostmanImport): void {
  if (item.request) {
    // It's a request
    const req = item.request;
    const rawUrl = typeof req.url === "string" ? req.url : req.url?.raw ?? "";
    const query = typeof req.url === "object" ? req.url?.query ?? [] : [];
    const headers = (req.header ?? []).map((h: { key: string; value: string; disabled?: boolean }) => ({
      key: h.key,
      value: h.value,
      enabled: !h.disabled,
    }));
    const params = query.map((q: { key: string; value: string; disabled?: boolean }) => ({
      key: q.key,
      value: q.value ?? "",
      enabled: !q.disabled,
    }));

    result.requests.push({
      name: item.name || "Untitled Request",
      method: (req.method?.toUpperCase() || "GET") as HttpMethod,
      url: rawUrl,
      headers,
      params,
      body: parseBody(req.body),
      auth: parseAuth(req.auth),
      folderPath: path,
    });
  }

  if (item.item && Array.isArray(item.item)) {
    // Has sub-items — it's a folder
    if (item.name && path.length > 0 || (item.name && !item.request)) {
      result.folders.push({ name: item.name, parentPath: path });
    }
    const nextPath = item.name && !item.request ? [...path, item.name] : path;
    for (const child of item.item) {
      processItem(child, nextPath, result);
    }
  }
}

export function parsePostmanCollection(json: string): PostmanImport {
  const data = JSON.parse(json);

  if (!data.info?.name || !data.item) {
    throw new Error("Invalid Postman collection format");
  }

  const result: PostmanImport = {
    name: data.info.name,
    description: data.info.description ?? "",
    folders: [],
    requests: [],
  };

  for (const item of data.item) {
    processItem(item, [], result);
  }

  return result;
}
