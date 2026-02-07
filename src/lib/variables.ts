import type { Variable } from "@/types/environment";
import type { TabRequestState } from "@/stores/tabStore";
import type { Collection, Folder } from "@/types/collection";
import type { Environment } from "@/types/environment";
import type { HeaderEntry, ParamEntry, RequestBody, RequestAuth } from "@/types/request";

const VARIABLE_PATTERN = /\{\{([^{}]+?)\}\}/g;

/**
 * Replace all {{variable_name}} placeholders in a string.
 * Unresolved variables stay as literal text.
 * Single-pass — no recursive resolution.
 */
export function resolveString(
  input: string,
  scope: Map<string, string>,
): string {
  return input.replace(VARIABLE_PATTERN, (match, name: string) => {
    const trimmed = name.trim();
    return scope.has(trimmed) ? scope.get(trimmed)! : match;
  });
}

export interface VariableSource {
  label: string;
  variables: Variable[];
}

/**
 * Build a flat scope map from ordered sources (lowest priority first).
 * Later sources override earlier ones.
 */
export function buildScope(sources: VariableSource[]): Map<string, string> {
  const scope = new Map<string, string>();
  for (const source of sources) {
    for (const v of source.variables) {
      if (v.key) {
        scope.set(v.key, v.value);
      }
    }
  }
  return scope;
}

export interface AttributedVariable {
  value: string;
  source: string;
  secret: boolean;
}

/**
 * Same as buildScope but tracks where each variable came from.
 * Used for autocomplete display.
 */
export function buildScopeWithAttribution(
  sources: VariableSource[],
): Map<string, AttributedVariable> {
  const scope = new Map<string, AttributedVariable>();
  for (const source of sources) {
    for (const v of source.variables) {
      if (v.key) {
        scope.set(v.key, {
          value: v.value,
          source: source.label,
          secret: v.secret ?? false,
        });
      }
    }
  }
  return scope;
}

function resolveHeaders(
  headers: HeaderEntry[],
  scope: Map<string, string>,
): HeaderEntry[] {
  return headers.map((h) => ({
    ...h,
    key: resolveString(h.key, scope),
    value: resolveString(h.value, scope),
  }));
}

function resolveParams(
  params: ParamEntry[],
  scope: Map<string, string>,
): ParamEntry[] {
  return params.map((p) => ({
    ...p,
    key: resolveString(p.key, scope),
    value: resolveString(p.value, scope),
  }));
}

function resolveBody(
  body: RequestBody,
  scope: Map<string, string>,
): RequestBody {
  switch (body.type) {
    case "none":
    case "binary":
      return body;
    case "raw":
      return { ...body, content: resolveString(body.content, scope) };
    case "form-data":
    case "x-www-form-urlencoded":
      return {
        ...body,
        entries: body.entries.map((e) => ({
          ...e,
          key: resolveString(e.key, scope),
          value: resolveString(e.value, scope),
        })),
      };
  }
}

function resolveAuth(
  auth: RequestAuth,
  scope: Map<string, string>,
): RequestAuth {
  switch (auth.type) {
    case "none":
      return auth;
    case "bearer":
      return { ...auth, token: resolveString(auth.token, scope) };
    case "basic":
      return {
        ...auth,
        username: resolveString(auth.username, scope),
        password: resolveString(auth.password, scope),
      };
    case "apikey":
      return {
        ...auth,
        key: resolveString(auth.key, scope),
        value: resolveString(auth.value, scope),
      };
  }
}

/**
 * Resolve all variable references in a request state.
 * Returns a new state with all {{var}} placeholders substituted.
 */
export function resolveRequest(
  state: TabRequestState,
  scope: Map<string, string>,
): TabRequestState {
  return {
    ...state,
    url: resolveString(state.url, scope),
    headers: resolveHeaders(state.headers, scope),
    params: resolveParams(state.params, scope),
    bodyConfig: resolveBody(state.bodyConfig, scope),
    auth: resolveAuth(state.auth, scope),
  };
}

/**
 * Walk the folder chain from a given folder up to the collection root.
 * Returns folders in order from root → leaf (for priority: root = lower priority).
 */
export function getFolderChain(
  folderId: string | null,
  folders: Folder[],
): Folder[] {
  if (!folderId) return [];

  const chain: Folder[] = [];
  let currentId: string | null = folderId;

  while (currentId) {
    const folder = folders.find((f) => f.id === currentId);
    if (!folder) break;
    chain.unshift(folder); // prepend so root is first
    currentId = folder.parentFolderId;
  }

  return chain;
}

/**
 * Assemble the full variable scope for a given request context.
 * Priority (highest wins): Request > Folder chain (leaf > root) > Collection > Active Environment > Global
 */
export function buildScopeForRequest(opts: {
  globalEnv: Environment | undefined;
  activeEnv: Environment | undefined;
  collection: Collection | undefined;
  folderChain: Folder[];
  requestVariables: Variable[];
}): Map<string, string> {
  const sources: VariableSource[] = [];

  if (opts.globalEnv) {
    sources.push({ label: "Global", variables: opts.globalEnv.variables });
  }
  if (opts.activeEnv && !opts.activeEnv.isGlobal) {
    sources.push({ label: opts.activeEnv.name, variables: opts.activeEnv.variables });
  }
  if (opts.collection) {
    sources.push({ label: opts.collection.name, variables: opts.collection.variables });
  }
  for (const folder of opts.folderChain) {
    sources.push({ label: folder.name, variables: folder.variables });
  }
  if (opts.requestVariables.length > 0) {
    sources.push({ label: "Request", variables: opts.requestVariables });
  }

  return buildScope(sources);
}

/**
 * Same as buildScopeForRequest but with attribution for autocomplete.
 */
export function buildAttributedScopeForRequest(opts: {
  globalEnv: Environment | undefined;
  activeEnv: Environment | undefined;
  collection: Collection | undefined;
  folderChain: Folder[];
  requestVariables: Variable[];
}): Map<string, AttributedVariable> {
  const sources: VariableSource[] = [];

  if (opts.globalEnv) {
    sources.push({ label: "Global", variables: opts.globalEnv.variables });
  }
  if (opts.activeEnv && !opts.activeEnv.isGlobal) {
    sources.push({ label: opts.activeEnv.name, variables: opts.activeEnv.variables });
  }
  if (opts.collection) {
    sources.push({ label: opts.collection.name, variables: opts.collection.variables });
  }
  for (const folder of opts.folderChain) {
    sources.push({ label: folder.name, variables: folder.variables });
  }
  if (opts.requestVariables.length > 0) {
    sources.push({ label: "Request", variables: opts.requestVariables });
  }

  return buildScopeWithAttribution(sources);
}
