import type {
  HttpMethod,
  HeaderEntry,
  ParamEntry,
  RequestBody,
  RequestAuth,
} from "./request";

export interface HistoryEntry {
  id: string;
  method: HttpMethod;
  url: string;
  headers: HeaderEntry[];
  params: ParamEntry[];
  body: RequestBody;
  auth: RequestAuth;
  responseStatus: number | null;
  responseStatusText: string | null;
  responseHeaders: Record<string, string> | null;
  responseBody: string | null;
  responseTimeMs: number | null;
  responseSizeBytes: number | null;
  responseBodyTruncated: boolean;
  error: string | null;
  savedRequestId: string | null;
  timestamp: string;
}
