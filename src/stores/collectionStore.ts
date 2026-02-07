import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type {
  Collection,
  Folder,
  SavedRequest,
} from "@/types/collection";
import {
  parseWorkspace,
  parseCollection,
  parseFolder,
  parseRequest,
  serializeHeaders,
  serializeParams,
  serializeBody,
  serializeAuth,
  serializeVariables,
} from "@/lib/workspace-utils";
import { useEnvironmentStore } from "./environmentStore";

interface CollectionState {
  collections: Collection[];
  folders: Folder[];
  requests: SavedRequest[];
  loading: boolean;

  loadWorkspace: () => Promise<void>;
  createCollection: (name: string) => Promise<Collection>;
  updateCollection: (id: string, updates: Partial<Pick<Collection, "name" | "description" | "defaultHeaders" | "defaultAuth" | "variables">>) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  createFolder: (collectionId: string, name: string, parentFolderId?: string) => Promise<Folder>;
  updateFolder: (id: string, updates: Partial<Pick<Folder, "name" | "defaultHeaders" | "defaultAuth" | "variables">>) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  saveRequest: (data: Omit<SavedRequest, "id" | "sortOrder" | "updatedAt" | "createdAt">) => Promise<SavedRequest>;
  updateSavedRequest: (id: string, data: Partial<Omit<SavedRequest, "id" | "collectionId" | "sortOrder" | "updatedAt" | "createdAt">>) => Promise<void>;
  deleteSavedRequest: (id: string) => Promise<void>;
  duplicateRequest: (id: string) => Promise<SavedRequest>;
  moveRequest: (id: string, folderId: string | null, collectionId: string) => Promise<void>;
  reorderItems: (items: { id: string; sortOrder: number }[], table: string) => Promise<void>;

  // Lookup helpers
  getCollection: (id: string) => Collection | undefined;
  getFolder: (id: string) => Folder | undefined;
  getRequest: (id: string) => SavedRequest | undefined;
}

export const useCollectionStore = create<CollectionState>((set, get) => ({
  collections: [],
  folders: [],
  requests: [],
  loading: false,

  loadWorkspace: async () => {
    set({ loading: true });
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = await invoke<any>("load_workspace");
      const workspace = parseWorkspace(raw);
      set({
        collections: workspace.collections,
        folders: workspace.folders,
        requests: workspace.requests,
        loading: false,
      });
      // Initialize environment store from workspace data
      useEnvironmentStore.getState().setEnvironments(
        workspace.environments,
        workspace.activeEnvironmentId,
      );
    } catch (err) {
      console.error("Failed to load workspace:", err);
      set({ loading: false });
    }
  },

  createCollection: async (name) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = await invoke<any>("create_collection", { name });
    const collection = parseCollection(raw);
    set((s) => ({ collections: [...s.collections, collection] }));
    return collection;
  },

  updateCollection: async (id, updates) => {
    const data: Record<string, string | undefined> = {};
    if (updates.name !== undefined) data.name = updates.name;
    if (updates.description !== undefined) data.description = updates.description;
    if (updates.defaultHeaders !== undefined) data.default_headers = serializeHeaders(updates.defaultHeaders);
    if (updates.defaultAuth !== undefined) data.default_auth = serializeAuth(updates.defaultAuth);
    if (updates.variables !== undefined) data.variables = serializeVariables(updates.variables);
    await invoke("update_collection", { id, data });
    set((s) => ({
      collections: s.collections.map((c) =>
        c.id === id ? { ...c, ...updates } : c,
      ),
    }));
  },

  deleteCollection: async (id) => {
    await invoke("delete_collection", { id });
    set((s) => ({
      collections: s.collections.filter((c) => c.id !== id),
      folders: s.folders.filter((f) => f.collectionId !== id),
      requests: s.requests.filter((r) => r.collectionId !== id),
    }));
  },

  createFolder: async (collectionId, name, parentFolderId) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = await invoke<any>("create_folder", {
      collectionId,
      name,
      parentFolderId: parentFolderId ?? null,
    });
    const folder = parseFolder(raw);
    set((s) => ({ folders: [...s.folders, folder] }));
    return folder;
  },

  updateFolder: async (id, updates) => {
    const data: Record<string, string | undefined> = {};
    if (updates.name !== undefined) data.name = updates.name;
    if (updates.defaultHeaders !== undefined) data.default_headers = serializeHeaders(updates.defaultHeaders);
    if (updates.defaultAuth !== undefined) data.default_auth = serializeAuth(updates.defaultAuth);
    if (updates.variables !== undefined) data.variables = serializeVariables(updates.variables);
    await invoke("update_folder", { id, data });
    set((s) => ({
      folders: s.folders.map((f) =>
        f.id === id ? { ...f, ...updates } : f,
      ),
    }));
  },

  deleteFolder: async (id) => {
    await invoke("delete_folder", { id });
    set((s) => {
      // Cascade: also remove child folders and their requests
      const deletedFolderIds = new Set<string>();
      const collectChildren = (parentId: string) => {
        deletedFolderIds.add(parentId);
        for (const f of s.folders) {
          if (f.parentFolderId === parentId) {
            collectChildren(f.id);
          }
        }
      };
      collectChildren(id);
      return {
        folders: s.folders.filter((f) => !deletedFolderIds.has(f.id)),
        requests: s.requests.filter((r) => !r.folderId || !deletedFolderIds.has(r.folderId)),
      };
    });
  },

  saveRequest: async (data) => {
    const payload = {
      data: {
        collection_id: data.collectionId,
        folder_id: data.folderId ?? null,
        name: data.name,
        method: data.method,
        url: data.url,
        headers: serializeHeaders(data.headers),
        params: serializeParams(data.params),
        body: serializeBody(data.body),
        auth: serializeAuth(data.auth),
      },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = await invoke<any>("create_request", payload);
    const request = parseRequest(raw);
    set((s) => ({ requests: [...s.requests, request] }));
    return request;
  },

  updateSavedRequest: async (id, data) => {
    const payload: Record<string, string | undefined | null> = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.method !== undefined) payload.method = data.method;
    if (data.url !== undefined) payload.url = data.url;
    if (data.headers !== undefined) payload.headers = serializeHeaders(data.headers);
    if (data.params !== undefined) payload.params = serializeParams(data.params);
    if (data.body !== undefined) payload.body = serializeBody(data.body);
    if (data.auth !== undefined) payload.auth = serializeAuth(data.auth);
    if (data.folderId !== undefined) payload.folder_id = data.folderId;
    if (data.variables !== undefined) payload.variables = serializeVariables(data.variables);
    await invoke("update_request", { id, data: payload });
    set((s) => ({
      requests: s.requests.map((r) =>
        r.id === id ? { ...r, ...data } : r,
      ),
    }));
  },

  deleteSavedRequest: async (id) => {
    await invoke("delete_request", { id });
    set((s) => ({ requests: s.requests.filter((r) => r.id !== id) }));
  },

  duplicateRequest: async (id) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = await invoke<any>("duplicate_request", { id });
    const request = parseRequest(raw);
    set((s) => ({ requests: [...s.requests, request] }));
    return request;
  },

  moveRequest: async (id, folderId, collectionId) => {
    await invoke("move_request", { id, folderId, collectionId });
    set((s) => ({
      requests: s.requests.map((r) =>
        r.id === id ? { ...r, folderId, collectionId } : r,
      ),
    }));
  },

  reorderItems: async (items, table) => {
    await invoke("reorder_items", {
      items: items.map((i) => ({ id: i.id, sort_order: i.sortOrder })),
      table,
    });
    // Update local sort orders
    const orderMap = new Map(items.map((i) => [i.id, i.sortOrder]));
    set((s) => {
      if (table === "collections") {
        return {
          collections: s.collections.map((c) =>
            orderMap.has(c.id) ? { ...c, sortOrder: orderMap.get(c.id)! } : c,
          ),
        };
      }
      if (table === "folders") {
        return {
          folders: s.folders.map((f) =>
            orderMap.has(f.id) ? { ...f, sortOrder: orderMap.get(f.id)! } : f,
          ),
        };
      }
      return {
        requests: s.requests.map((r) =>
          orderMap.has(r.id) ? { ...r, sortOrder: orderMap.get(r.id)! } : r,
        ),
      };
    });
  },

  getCollection: (id) => get().collections.find((c) => c.id === id),
  getFolder: (id) => get().folders.find((f) => f.id === id),
  getRequest: (id) => get().requests.find((r) => r.id === id),
}));
