import type { Collection, Folder, SavedRequest } from "@/types/collection";
import type {
  HttpMethod,
  HeaderEntry,
  RequestBody,
  RequestAuth,
} from "@/types/request";
import {
  serializeHeaders,
  serializeParams,
  serializeBody as serializeBodyJson,
  serializeAuth,
  serializeVariables,
} from "@/lib/workspace-utils";

// ── Hermes JSON Export ──

interface HermesExport {
  _hermes: { version: number; exportedAt: string };
  collection: {
    id: string;
    name: string;
    description: string;
    defaultHeaders: string;
    defaultAuth: string;
    variables: string;
  };
  folders: {
    id: string;
    name: string;
    parentFolderId: string | null;
    defaultHeaders: string;
    defaultAuth: string;
    variables: string;
    sortOrder: number;
  }[];
  requests: {
    id: string;
    folderId: string | null;
    name: string;
    method: string;
    url: string;
    headers: string;
    params: string;
    body: string;
    auth: string;
    variables: string;
    sortOrder: number;
  }[];
}

export function exportCollectionToJson(
  collection: Collection,
  folders: Folder[],
  requests: SavedRequest[],
): string {
  const colFolders = folders.filter((f) => f.collectionId === collection.id);
  const colRequests = requests.filter((r) => r.collectionId === collection.id);

  const data: HermesExport = {
    _hermes: { version: 1, exportedAt: new Date().toISOString() },
    collection: {
      id: collection.id,
      name: collection.name,
      description: collection.description,
      defaultHeaders: serializeHeaders(collection.defaultHeaders),
      defaultAuth: serializeAuth(collection.defaultAuth),
      variables: serializeVariables(collection.variables),
    },
    folders: colFolders.map((f) => ({
      id: f.id,
      name: f.name,
      parentFolderId: f.parentFolderId,
      defaultHeaders: serializeHeaders(f.defaultHeaders),
      defaultAuth: serializeAuth(f.defaultAuth),
      variables: serializeVariables(f.variables),
      sortOrder: f.sortOrder,
    })),
    requests: colRequests.map((r) => ({
      id: r.id,
      folderId: r.folderId,
      name: r.name,
      method: r.method,
      url: r.url,
      headers: serializeHeaders(r.headers),
      params: serializeParams(r.params),
      body: serializeBodyJson(r.body),
      auth: serializeAuth(r.auth),
      variables: serializeVariables(r.variables),
      sortOrder: r.sortOrder,
    })),
  };

  return JSON.stringify(data, null, 2);
}

// ── cURL Export ──

function escapeShell(str: string): string {
  return str.replace(/'/g, "'\\''");
}

export function requestToCurl(
  method: HttpMethod,
  url: string,
  headers: HeaderEntry[],
  body: RequestBody,
  auth: RequestAuth,
): string {
  const parts: string[] = ["curl"];

  // Method
  if (method !== "GET") {
    parts.push(`-X ${method}`);
  }

  // Auth headers
  if (auth.type === "bearer" && auth.token) {
    parts.push(`-H 'Authorization: Bearer ${escapeShell(auth.token)}'`);
  } else if (auth.type === "basic" && (auth.username || auth.password)) {
    parts.push(`-u '${escapeShell(auth.username)}:${escapeShell(auth.password)}'`);
  } else if (auth.type === "apikey" && auth.key && auth.value) {
    if (auth.addTo === "header") {
      parts.push(`-H '${escapeShell(auth.key)}: ${escapeShell(auth.value)}'`);
    } else {
      // Will be appended as query param to URL
      const sep = url.includes("?") ? "&" : "?";
      url = `${url}${sep}${encodeURIComponent(auth.key)}=${encodeURIComponent(auth.value)}`;
    }
  }

  // Headers
  for (const h of headers) {
    if (!h.enabled || !h.key) continue;
    parts.push(`-H '${escapeShell(h.key)}: ${escapeShell(h.value)}'`);
  }

  // Body
  if (body.type === "raw" && body.content) {
    parts.push(`-d '${escapeShell(body.content)}'`);
    // Add Content-Type if not in headers
    const hasContentType = headers.some(
      (h) => h.enabled && h.key.toLowerCase() === "content-type",
    );
    if (!hasContentType) {
      const ct =
        body.format === "json"
          ? "application/json"
          : body.format === "xml"
            ? "application/xml"
            : "text/plain";
      parts.push(`-H 'Content-Type: ${ct}'`);
    }
  } else if (body.type === "x-www-form-urlencoded") {
    for (const e of body.entries) {
      if (!e.enabled || !e.key) continue;
      parts.push(`--data-urlencode '${escapeShell(e.key)}=${escapeShell(e.value)}'`);
    }
  } else if (body.type === "form-data") {
    for (const e of body.entries) {
      if (!e.enabled || !e.key) continue;
      parts.push(`-F '${escapeShell(e.key)}=${escapeShell(e.value)}'`);
    }
  }

  // URL (always last)
  parts.push(`'${escapeShell(url)}'`);

  return parts.join(" \\\n  ");
}
