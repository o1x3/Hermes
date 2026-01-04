export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";

export interface HeaderEntry {
  key: string;
  value: string;
  enabled: boolean;
}

export interface ParamEntry {
  key: string;
  value: string;
  enabled: boolean;
}

export type RawFormat = "json" | "xml" | "text";

export type RequestBody =
  | { type: "none" }
  | { type: "raw"; format: RawFormat; content: string }
  | { type: "form-data"; entries: ParamEntry[] }
  | { type: "x-www-form-urlencoded"; entries: ParamEntry[] }
  | { type: "binary"; filePath: string };

export type RequestAuth =
  | { type: "none" }
  | { type: "bearer"; token: string }
  | { type: "basic"; username: string; password: string }
  | { type: "apikey"; key: string; value: string; addTo: "header" | "query" };

export interface HttpResponse {
  status: number;
  status_text: string;
  headers: Record<string, string>;
  body: string;
  time_ms: number;
  size_bytes: number;
}
