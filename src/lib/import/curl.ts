import type { HttpMethod, HeaderEntry, RequestBody, RequestAuth } from "@/types/request";

export interface CurlImport {
  method: HttpMethod;
  url: string;
  headers: HeaderEntry[];
  body: RequestBody;
  auth: RequestAuth;
}

/** Tokenize a shell-like string, handling single/double quotes and backslash escaping */
function tokenize(input: string): string[] {
  // Join continuation lines
  const joined = input.replace(/\\\n/g, " ").trim();

  const tokens: string[] = [];
  let current = "";
  let inSingle = false;
  let inDouble = false;
  let escaped = false;

  for (let i = 0; i < joined.length; i++) {
    const ch = joined[i];

    if (escaped) {
      current += ch;
      escaped = false;
      continue;
    }

    if (ch === "\\" && !inSingle) {
      escaped = true;
      continue;
    }

    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
      continue;
    }

    if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
      continue;
    }

    if (/\s/.test(ch) && !inSingle && !inDouble) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }

    current += ch;
  }

  if (current) tokens.push(current);
  return tokens;
}

export function parseCurl(input: string): CurlImport {
  const trimmed = input.trim();
  if (!trimmed.toLowerCase().startsWith("curl")) {
    throw new Error("Input doesn't start with 'curl'");
  }

  const tokens = tokenize(trimmed);
  // Skip "curl" token
  let i = 1;

  let method: HttpMethod = "GET";
  let url = "";
  const headers: HeaderEntry[] = [];
  let bodyStr: string | null = null;
  let auth: RequestAuth = { type: "none" };
  let methodExplicit = false;

  while (i < tokens.length) {
    const token = tokens[i];

    if (token === "-X" || token === "--request") {
      i++;
      method = (tokens[i]?.toUpperCase() || "GET") as HttpMethod;
      methodExplicit = true;
    } else if (token === "-H" || token === "--header") {
      i++;
      const headerStr = tokens[i] ?? "";
      const colonIdx = headerStr.indexOf(":");
      if (colonIdx > 0) {
        headers.push({
          key: headerStr.slice(0, colonIdx).trim(),
          value: headerStr.slice(colonIdx + 1).trim(),
          enabled: true,
        });
      }
    } else if (
      token === "-d" ||
      token === "--data" ||
      token === "--data-raw" ||
      token === "--data-binary"
    ) {
      i++;
      bodyStr = tokens[i] ?? "";
    } else if (token === "-u" || token === "--user") {
      i++;
      const userPass = tokens[i] ?? "";
      const colonIdx = userPass.indexOf(":");
      if (colonIdx >= 0) {
        auth = {
          type: "basic",
          username: userPass.slice(0, colonIdx),
          password: userPass.slice(colonIdx + 1),
        };
      }
    } else if (token === "-b" || token === "--cookie") {
      i++;
      headers.push({ key: "Cookie", value: tokens[i] ?? "", enabled: true });
    } else if (
      token === "--compressed" ||
      token === "-s" ||
      token === "--silent" ||
      token === "-k" ||
      token === "--insecure" ||
      token === "-L" ||
      token === "--location" ||
      token === "-v" ||
      token === "--verbose"
    ) {
      // Ignore informational flags
    } else if (token.startsWith("-")) {
      // Skip unknown flag with potential value
      if (i + 1 < tokens.length && !tokens[i + 1].startsWith("-")) {
        i++;
      }
    } else {
      // Positional argument — URL
      url = token;
    }

    i++;
  }

  // If body is set but no explicit method, use POST
  if (bodyStr && !methodExplicit) {
    method = "POST";
  }

  // Determine body type from Content-Type header
  let body: RequestBody = { type: "none" };
  if (bodyStr) {
    const contentType = headers
      .find((h) => h.key.toLowerCase() === "content-type")
      ?.value.toLowerCase();

    if (contentType?.includes("application/x-www-form-urlencoded")) {
      const entries = new URLSearchParams(bodyStr);
      body = {
        type: "x-www-form-urlencoded",
        entries: Array.from(entries.entries()).map(([key, value]) => ({
          key,
          value,
          enabled: true,
        })),
      };
    } else {
      const format = contentType?.includes("xml")
        ? "xml"
        : contentType?.includes("text/plain")
          ? "text"
          : "json";
      body = { type: "raw", format, content: bodyStr };
    }
  }

  return { method, url, headers, body, auth };
}
