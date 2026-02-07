import type {
  Collection,
  Folder,
  SavedRequest,
} from "@/types/collection";
import type {
  HeaderEntry,
  ParamEntry,
  RequestBody,
  RequestAuth,
  HttpMethod,
} from "@/types/request";
import type { Variable, Environment } from "@/types/environment";

// Raw shapes from Rust IPC (snake_case, JSON strings for complex fields)
interface RawCollection {
  id: string;
  name: string;
  description: string;
  default_headers: string;
  default_auth: string;
  variables: string;
  sort_order: number;
  updated_at: string;
  created_at: string;
}

interface RawFolder {
  id: string;
  collection_id: string;
  parent_folder_id: string | null;
  name: string;
  default_headers: string;
  default_auth: string;
  variables: string;
  sort_order: number;
  created_at: string;
}

interface RawRequest {
  id: string;
  collection_id: string;
  folder_id: string | null;
  name: string;
  method: string;
  url: string;
  headers: string;
  params: string;
  body: string;
  auth: string;
  variables: string;
  sort_order: number;
  updated_at: string;
  created_at: string;
}

interface RawEnvironment {
  id: string;
  name: string;
  variables: string;
  is_global: boolean;
  sort_order: number;
  updated_at: string;
  created_at: string;
}

interface RawWorkspace {
  collections: RawCollection[];
  folders: RawFolder[];
  requests: RawRequest[];
  environments: RawEnvironment[];
  active_environment_id: string | null;
}

function parseJson<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

function parseCollection(raw: RawCollection): Collection {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    defaultHeaders: parseJson<HeaderEntry[]>(raw.default_headers, []),
    defaultAuth: parseJson<RequestAuth>(raw.default_auth, { type: "none" }),
    variables: parseJson<Variable[]>(raw.variables, []),
    sortOrder: raw.sort_order,
    updatedAt: raw.updated_at,
    createdAt: raw.created_at,
  };
}

function parseFolder(raw: RawFolder): Folder {
  return {
    id: raw.id,
    collectionId: raw.collection_id,
    parentFolderId: raw.parent_folder_id,
    name: raw.name,
    defaultHeaders: parseJson<HeaderEntry[]>(raw.default_headers, []),
    defaultAuth: parseJson<RequestAuth>(raw.default_auth, { type: "none" }),
    variables: parseJson<Variable[]>(raw.variables, []),
    sortOrder: raw.sort_order,
    createdAt: raw.created_at,
  };
}

function parseRequest(raw: RawRequest): SavedRequest {
  return {
    id: raw.id,
    collectionId: raw.collection_id,
    folderId: raw.folder_id,
    name: raw.name,
    method: raw.method as HttpMethod,
    url: raw.url,
    headers: parseJson<HeaderEntry[]>(raw.headers, []),
    params: parseJson<ParamEntry[]>(raw.params, []),
    body: parseJson<RequestBody>(raw.body, { type: "none" }),
    auth: parseJson<RequestAuth>(raw.auth, { type: "none" }),
    variables: parseJson<Variable[]>(raw.variables, []),
    sortOrder: raw.sort_order,
    updatedAt: raw.updated_at,
    createdAt: raw.created_at,
  };
}

function parseEnvironment(raw: RawEnvironment): Environment {
  return {
    id: raw.id,
    name: raw.name,
    variables: parseJson<Variable[]>(raw.variables, []),
    isGlobal: raw.is_global,
    sortOrder: raw.sort_order,
    updatedAt: raw.updated_at,
    createdAt: raw.created_at,
  };
}

export interface ParsedWorkspace {
  collections: Collection[];
  folders: Folder[];
  requests: SavedRequest[];
  environments: Environment[];
  activeEnvironmentId: string | null;
}

export function parseWorkspace(raw: RawWorkspace): ParsedWorkspace {
  return {
    collections: raw.collections.map(parseCollection),
    folders: raw.folders.map(parseFolder),
    requests: raw.requests.map(parseRequest),
    environments: raw.environments.map(parseEnvironment),
    activeEnvironmentId: raw.active_environment_id,
  };
}

export { parseCollection, parseFolder, parseRequest, parseEnvironment };

// Serialize typed objects back to JSON strings for Rust IPC
export function serializeHeaders(headers: HeaderEntry[]): string {
  return JSON.stringify(headers);
}

export function serializeParams(params: ParamEntry[]): string {
  return JSON.stringify(params);
}

export function serializeBody(body: RequestBody): string {
  return JSON.stringify(body);
}

export function serializeAuth(auth: RequestAuth): string {
  return JSON.stringify(auth);
}

export function serializeVariables(variables: Variable[]): string {
  return JSON.stringify(variables);
}
