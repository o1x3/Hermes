import yaml from "js-yaml";
import type { HttpMethod, HeaderEntry, ParamEntry, RequestBody } from "@/types/request";

export interface OpenApiImport {
  title: string;
  version: string;
  baseUrl: string;
  endpoints: {
    method: HttpMethod;
    path: string;
    summary: string;
    operationId: string;
    params: ParamEntry[];
    headers: HeaderEntry[];
    body: RequestBody;
  }[];
}

const HTTP_METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseContent(content: string): any {
  // Try JSON first
  try {
    return JSON.parse(content);
  } catch {
    // Try YAML
    return yaml.load(content);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractBodyFromSchema(schema: any): RequestBody {
  if (!schema) return { type: "none" };
  const example = schema.example ?? schema.default;
  if (example !== undefined) {
    return {
      type: "raw",
      format: "json",
      content: JSON.stringify(example, null, 2),
    };
  }
  // Generate a minimal template from properties
  if (schema.type === "object" && schema.properties) {
    const template: Record<string, unknown> = {};
    for (const [key, prop] of Object.entries(schema.properties)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = prop as any;
      if (p.example !== undefined) template[key] = p.example;
      else if (p.type === "string") template[key] = "";
      else if (p.type === "number" || p.type === "integer") template[key] = 0;
      else if (p.type === "boolean") template[key] = false;
      else if (p.type === "array") template[key] = [];
      else template[key] = null;
    }
    return {
      type: "raw",
      format: "json",
      content: JSON.stringify(template, null, 2),
    };
  }
  return { type: "none" };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseOpenApi3(doc: any): OpenApiImport {
  const baseUrl = doc.servers?.[0]?.url ?? "";
  const result: OpenApiImport = {
    title: doc.info?.title ?? "Imported API",
    version: doc.info?.version ?? "",
    baseUrl,
    endpoints: [],
  };

  for (const [path, pathItem] of Object.entries(doc.paths ?? {})) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pi = pathItem as any;
    for (const method of HTTP_METHODS) {
      const op = pi[method.toLowerCase()];
      if (!op) continue;

      const params: ParamEntry[] = [];
      const headers: HeaderEntry[] = [];

      for (const param of op.parameters ?? pi.parameters ?? []) {
        if (param.in === "query") {
          params.push({ key: param.name, value: param.example ?? "", enabled: true });
        } else if (param.in === "header") {
          headers.push({ key: param.name, value: param.example ?? "", enabled: true });
        }
      }

      let body: RequestBody = { type: "none" };
      const requestBody = op.requestBody;
      if (requestBody) {
        const jsonContent = requestBody.content?.["application/json"];
        if (jsonContent?.schema) {
          body = extractBodyFromSchema(jsonContent.schema);
        }
      }

      result.endpoints.push({
        method,
        path,
        summary: op.summary ?? op.description ?? "",
        operationId: op.operationId ?? "",
        params,
        headers,
        body,
      });
    }
  }

  return result;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseSwagger2(doc: any): OpenApiImport {
  const scheme = doc.schemes?.[0] ?? "https";
  const host = doc.host ?? "";
  const basePath = doc.basePath ?? "";
  const baseUrl = host ? `${scheme}://${host}${basePath}` : "";

  const result: OpenApiImport = {
    title: doc.info?.title ?? "Imported API",
    version: doc.info?.version ?? "",
    baseUrl,
    endpoints: [],
  };

  for (const [path, pathItem] of Object.entries(doc.paths ?? {})) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pi = pathItem as any;
    for (const method of HTTP_METHODS) {
      const op = pi[method.toLowerCase()];
      if (!op) continue;

      const params: ParamEntry[] = [];
      const headers: HeaderEntry[] = [];
      let body: RequestBody = { type: "none" };

      for (const param of op.parameters ?? []) {
        if (param.in === "query") {
          params.push({ key: param.name, value: param.example ?? "", enabled: true });
        } else if (param.in === "header") {
          headers.push({ key: param.name, value: param.example ?? "", enabled: true });
        } else if (param.in === "body" && param.schema) {
          body = extractBodyFromSchema(param.schema);
        }
      }

      result.endpoints.push({
        method,
        path,
        summary: op.summary ?? op.description ?? "",
        operationId: op.operationId ?? "",
        params,
        headers,
        body,
      });
    }
  }

  return result;
}

export function parseOpenApi(content: string): OpenApiImport {
  const doc = parseContent(content);

  if (!doc || typeof doc !== "object") {
    throw new Error("Failed to parse file as JSON or YAML");
  }

  if (doc.openapi && typeof doc.openapi === "string" && doc.openapi.startsWith("3")) {
    return parseOpenApi3(doc);
  }

  if (doc.swagger && typeof doc.swagger === "string" && doc.swagger.startsWith("2")) {
    return parseSwagger2(doc);
  }

  throw new Error("Unsupported format: expected OpenAPI 3.x or Swagger 2.0");
}
