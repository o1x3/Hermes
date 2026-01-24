import type {
  HttpMethod,
  HeaderEntry,
  ParamEntry,
  RequestBody,
  RequestAuth,
} from "./request";

export interface Collection {
  id: string;
  name: string;
  description: string;
  defaultHeaders: HeaderEntry[];
  defaultAuth: RequestAuth;
  sortOrder: number;
  updatedAt: string;
  createdAt: string;
}

export interface Folder {
  id: string;
  collectionId: string;
  parentFolderId: string | null;
  name: string;
  defaultHeaders: HeaderEntry[];
  defaultAuth: RequestAuth;
  sortOrder: number;
  createdAt: string;
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
  sortOrder: number;
  updatedAt: string;
  createdAt: string;
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
