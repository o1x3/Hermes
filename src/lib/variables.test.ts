import { describe, it, expect } from "vitest";
import {
  resolveString,
  buildScope,
  buildScopeWithAttribution,
  resolveRequest,
  getFolderChain,
  buildScopeForRequest,
} from "./variables";
import type { TabRequestState } from "@/stores/tabStore";
import type { Folder } from "@/types/collection";

describe("resolveString", () => {
  it("resolves a single variable", () => {
    const scope = new Map([["base_url", "http://localhost:3000"]]);
    expect(resolveString("{{base_url}}/users", scope)).toBe(
      "http://localhost:3000/users",
    );
  });

  it("resolves multiple variables", () => {
    const scope = new Map([
      ["host", "api.example.com"],
      ["version", "v2"],
    ]);
    expect(resolveString("https://{{host}}/{{version}}/users", scope)).toBe(
      "https://api.example.com/v2/users",
    );
  });

  it("leaves unresolved variables as literals", () => {
    const scope = new Map([["host", "localhost"]]);
    expect(resolveString("{{host}}:{{port}}", scope)).toBe(
      "localhost:{{port}}",
    );
  });

  it("handles no variables", () => {
    const scope = new Map<string, string>();
    expect(resolveString("hello world", scope)).toBe("hello world");
  });

  it("handles empty input", () => {
    const scope = new Map([["x", "y"]]);
    expect(resolveString("", scope)).toBe("");
  });

  it("trims whitespace in variable names", () => {
    const scope = new Map([["name", "value"]]);
    expect(resolveString("{{ name }}", scope)).toBe("value");
    expect(resolveString("{{  name  }}", scope)).toBe("value");
  });

  it("does not resolve nested braces", () => {
    const scope = new Map([["a", "{{b}}"], ["b", "resolved"]]);
    // Single-pass: {{a}} resolves to "{{b}}" but that won't be resolved again
    expect(resolveString("{{a}}", scope)).toBe("{{b}}");
  });

  it("handles adjacent variables", () => {
    const scope = new Map([["a", "1"], ["b", "2"]]);
    expect(resolveString("{{a}}{{b}}", scope)).toBe("12");
  });
});

describe("buildScope", () => {
  it("merges sources with later overriding earlier", () => {
    const scope = buildScope([
      { label: "Global", variables: [{ key: "url", value: "global.com" }] },
      { label: "Env", variables: [{ key: "url", value: "env.com" }] },
    ]);
    expect(scope.get("url")).toBe("env.com");
  });

  it("accumulates non-overlapping keys", () => {
    const scope = buildScope([
      { label: "A", variables: [{ key: "a", value: "1" }] },
      { label: "B", variables: [{ key: "b", value: "2" }] },
    ]);
    expect(scope.get("a")).toBe("1");
    expect(scope.get("b")).toBe("2");
  });

  it("skips variables with empty keys", () => {
    const scope = buildScope([
      { label: "A", variables: [{ key: "", value: "nope" }, { key: "valid", value: "yes" }] },
    ]);
    expect(scope.has("")).toBe(false);
    expect(scope.get("valid")).toBe("yes");
  });

  it("returns empty map for no sources", () => {
    expect(buildScope([]).size).toBe(0);
  });
});

describe("buildScopeWithAttribution", () => {
  it("tracks source of each variable", () => {
    const scope = buildScopeWithAttribution([
      { label: "Global", variables: [{ key: "url", value: "g.com" }] },
      { label: "Dev", variables: [{ key: "url", value: "d.com" }, { key: "token", value: "t", secret: true }] },
    ]);
    expect(scope.get("url")).toEqual({ value: "d.com", source: "Dev", secret: false });
    expect(scope.get("token")).toEqual({ value: "t", source: "Dev", secret: true });
  });
});

describe("resolveRequest", () => {
  const scope = new Map([
    ["base", "http://localhost:3000"],
    ["token", "abc123"],
    ["key_name", "X-Key"],
    ["key_val", "secret"],
    ["user", "admin"],
    ["pass", "password"],
  ]);

  it("resolves URL", () => {
    const state: TabRequestState = {
      method: "GET",
      url: "{{base}}/api/users",
      headers: [],
      params: [],
      bodyConfig: { type: "none" },
      auth: { type: "none" },
      response: null,
      loading: false,
      error: null,
    };
    const resolved = resolveRequest(state, scope);
    expect(resolved.url).toBe("http://localhost:3000/api/users");
  });

  it("resolves headers", () => {
    const state: TabRequestState = {
      method: "GET",
      url: "",
      headers: [{ key: "{{key_name}}", value: "{{key_val}}", enabled: true }],
      params: [],
      bodyConfig: { type: "none" },
      auth: { type: "none" },
      response: null,
      loading: false,
      error: null,
    };
    const resolved = resolveRequest(state, scope);
    expect(resolved.headers[0].key).toBe("X-Key");
    expect(resolved.headers[0].value).toBe("secret");
  });

  it("resolves params", () => {
    const state: TabRequestState = {
      method: "GET",
      url: "",
      headers: [],
      params: [{ key: "token", value: "{{token}}", enabled: true }],
      bodyConfig: { type: "none" },
      auth: { type: "none" },
      response: null,
      loading: false,
      error: null,
    };
    const resolved = resolveRequest(state, scope);
    expect(resolved.params[0].value).toBe("abc123");
  });

  it("resolves raw body", () => {
    const state: TabRequestState = {
      method: "POST",
      url: "",
      headers: [],
      params: [],
      bodyConfig: { type: "raw", format: "json", content: '{"token": "{{token}}"}' },
      auth: { type: "none" },
      response: null,
      loading: false,
      error: null,
    };
    const resolved = resolveRequest(state, scope);
    expect(resolved.bodyConfig).toEqual({
      type: "raw",
      format: "json",
      content: '{"token": "abc123"}',
    });
  });

  it("resolves form-data body entries", () => {
    const state: TabRequestState = {
      method: "POST",
      url: "",
      headers: [],
      params: [],
      bodyConfig: {
        type: "form-data",
        entries: [{ key: "{{key_name}}", value: "{{key_val}}", enabled: true }],
      },
      auth: { type: "none" },
      response: null,
      loading: false,
      error: null,
    };
    const resolved = resolveRequest(state, scope);
    if (resolved.bodyConfig.type === "form-data") {
      expect(resolved.bodyConfig.entries[0].key).toBe("X-Key");
      expect(resolved.bodyConfig.entries[0].value).toBe("secret");
    }
  });

  it("resolves bearer auth", () => {
    const state: TabRequestState = {
      method: "GET",
      url: "",
      headers: [],
      params: [],
      bodyConfig: { type: "none" },
      auth: { type: "bearer", token: "{{token}}" },
      response: null,
      loading: false,
      error: null,
    };
    const resolved = resolveRequest(state, scope);
    expect(resolved.auth).toEqual({ type: "bearer", token: "abc123" });
  });

  it("resolves basic auth", () => {
    const state: TabRequestState = {
      method: "GET",
      url: "",
      headers: [],
      params: [],
      bodyConfig: { type: "none" },
      auth: { type: "basic", username: "{{user}}", password: "{{pass}}" },
      response: null,
      loading: false,
      error: null,
    };
    const resolved = resolveRequest(state, scope);
    expect(resolved.auth).toEqual({ type: "basic", username: "admin", password: "password" });
  });

  it("resolves apikey auth", () => {
    const state: TabRequestState = {
      method: "GET",
      url: "",
      headers: [],
      params: [],
      bodyConfig: { type: "none" },
      auth: { type: "apikey", key: "{{key_name}}", value: "{{key_val}}", addTo: "header" },
      response: null,
      loading: false,
      error: null,
    };
    const resolved = resolveRequest(state, scope);
    expect(resolved.auth).toEqual({ type: "apikey", key: "X-Key", value: "secret", addTo: "header" });
  });

  it("preserves transient fields", () => {
    const state: TabRequestState = {
      method: "GET",
      url: "{{base}}",
      headers: [],
      params: [],
      bodyConfig: { type: "none" },
      auth: { type: "none" },
      response: { status: 200, status_text: "OK", headers: {}, body: "", time_ms: 10, size_bytes: 0 },
      loading: true,
      error: "some error",
    };
    const resolved = resolveRequest(state, scope);
    expect(resolved.response).toBe(state.response);
    expect(resolved.loading).toBe(true);
    expect(resolved.error).toBe("some error");
  });
});

describe("getFolderChain", () => {
  const folders: Folder[] = [
    { id: "root", collectionId: "c1", parentFolderId: null, name: "Root", defaultHeaders: [], defaultAuth: { type: "none" }, variables: [], sortOrder: 0, createdAt: "" },
    { id: "mid", collectionId: "c1", parentFolderId: "root", name: "Mid", defaultHeaders: [], defaultAuth: { type: "none" }, variables: [], sortOrder: 0, createdAt: "" },
    { id: "leaf", collectionId: "c1", parentFolderId: "mid", name: "Leaf", defaultHeaders: [], defaultAuth: { type: "none" }, variables: [], sortOrder: 0, createdAt: "" },
  ];

  it("returns root → leaf order", () => {
    const chain = getFolderChain("leaf", folders);
    expect(chain.map((f) => f.id)).toEqual(["root", "mid", "leaf"]);
  });

  it("returns single folder for root", () => {
    const chain = getFolderChain("root", folders);
    expect(chain.map((f) => f.id)).toEqual(["root"]);
  });

  it("returns empty for null folderId", () => {
    expect(getFolderChain(null, folders)).toEqual([]);
  });

  it("returns empty for nonexistent folder", () => {
    expect(getFolderChain("nope", folders)).toEqual([]);
  });
});

describe("buildScopeForRequest", () => {
  it("applies full priority chain: Request > Folder > Collection > Env > Global", () => {
    const scope = buildScopeForRequest({
      globalEnv: { id: "global", name: "Global", variables: [{ key: "a", value: "global" }, { key: "g", value: "only-global" }], isGlobal: true, sortOrder: 0, updatedAt: "", createdAt: "" },
      activeEnv: { id: "dev", name: "Dev", variables: [{ key: "a", value: "dev" }, { key: "e", value: "only-env" }], isGlobal: false, sortOrder: 1, updatedAt: "", createdAt: "" },
      collection: { id: "c1", name: "API", description: "", defaultHeaders: [], defaultAuth: { type: "none" }, variables: [{ key: "a", value: "collection" }], sortOrder: 0, updatedAt: "", createdAt: "" },
      folderChain: [
        { id: "f1", collectionId: "c1", parentFolderId: null, name: "Users", defaultHeaders: [], defaultAuth: { type: "none" }, variables: [{ key: "a", value: "folder" }], sortOrder: 0, createdAt: "" },
      ],
      requestVariables: [{ key: "a", value: "request" }],
    });

    // Request should win for "a"
    expect(scope.get("a")).toBe("request");
    // Global-only var should still be available
    expect(scope.get("g")).toBe("only-global");
    // Env-only var should still be available
    expect(scope.get("e")).toBe("only-env");
  });

  it("works with no active environment", () => {
    const scope = buildScopeForRequest({
      globalEnv: { id: "global", name: "Global", variables: [{ key: "x", value: "1" }], isGlobal: true, sortOrder: 0, updatedAt: "", createdAt: "" },
      activeEnv: undefined,
      collection: undefined,
      folderChain: [],
      requestVariables: [],
    });
    expect(scope.get("x")).toBe("1");
  });

  it("returns empty scope when nothing is provided", () => {
    const scope = buildScopeForRequest({
      globalEnv: undefined,
      activeEnv: undefined,
      collection: undefined,
      folderChain: [],
      requestVariables: [],
    });
    expect(scope.size).toBe(0);
  });
});
