import type {
  HttpMethod,
  HeaderEntry,
  ParamEntry,
  RequestBody,
  RequestAuth,
} from "./request";
import type { Variable } from "./environment";

export interface Collection {
  id: string;
  name: string;
  description: string;
  defaultHeaders: HeaderEntry[];
  defaultAuth: RequestAuth;
  variables: Variable[];
  sortOrder: number;
  updatedAt: string;
  createdAt: string;
  teamId: string | null;
  cloudId: string | null;
  syncedAt: string | null;
  dirty: number;
}

export interface Folder {
  id: string;
  collectionId: string;
  parentFolderId: string | null;
  name: string;
  defaultHeaders: HeaderEntry[];
  defaultAuth: RequestAuth;
  variables: Variable[];
  sortOrder: number;
  createdAt: string;
  cloudId: string | null;
  syncedAt: string | null;
  dirty: number;
}

export interface SavedRequest {
  id: string;
  collectionId: string;
  folderId: string | null;
  name: string;
  method: HttpMethod;
  url: string;
  headers: HeaderEntry[];
  params: ParamEntry[];
  body: RequestBody;
  auth: RequestAuth;
  variables: Variable[];
  sortOrder: number;
  updatedAt: string;
  createdAt: string;
  cloudId: string | null;
  syncedAt: string | null;
  dirty: number;
}

export interface Workspace {
  collections: Collection[];
  folders: Folder[];
  requests: SavedRequest[];
}

export type TreeNode =
  | { type: "collection"; data: Collection; children: TreeNode[] }
  | { type: "folder"; data: Folder; children: TreeNode[] }
  | { type: "request"; data: SavedRequest };
