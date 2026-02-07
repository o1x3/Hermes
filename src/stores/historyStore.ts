import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { HistoryEntry } from "@/types/history";
import type { RawHistoryEntry } from "@/lib/workspace-utils";
import { parseHistoryEntry } from "@/lib/workspace-utils";

interface HistorySearchFilters {
  query?: string;
  method?: string;
  statusMin?: number;
  statusMax?: number;
}

interface HistoryState {
  entries: HistoryEntry[];
  hasMore: boolean;
  loading: boolean;
  filters: HistorySearchFilters;

  loadRecent: () => Promise<void>;
  loadMore: () => Promise<void>;
  logEntry: (data: Record<string, unknown>) => Promise<HistoryEntry>;
  search: (filters: HistorySearchFilters) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

const PAGE_SIZE = 50;

export const useHistoryStore = create<HistoryState>((set, get) => ({
  entries: [],
  hasMore: true,
  loading: false,
  filters: {},

  loadRecent: async () => {
    set({ loading: true });
    try {
      const raws = await invoke<RawHistoryEntry[]>("search_history", {
        params: { limit: PAGE_SIZE, offset: 0 },
      });
      const entries = raws.map(parseHistoryEntry);
      set({ entries, hasMore: entries.length >= PAGE_SIZE, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  loadMore: async () => {
    const { entries, hasMore, loading, filters } = get();
    if (!hasMore || loading) return;

    set({ loading: true });
    try {
      const params: Record<string, unknown> = {
        limit: PAGE_SIZE,
        offset: entries.length,
      };
      if (filters.query) params.query = filters.query;
      if (filters.method) params.method = filters.method;
      if (filters.statusMin !== undefined) params.status_min = filters.statusMin;
      if (filters.statusMax !== undefined) params.status_max = filters.statusMax;

      const raws = await invoke<RawHistoryEntry[]>("search_history", { params });
      const newEntries = raws.map(parseHistoryEntry);
      set({
        entries: [...entries, ...newEntries],
        hasMore: newEntries.length >= PAGE_SIZE,
        loading: false,
      });
    } catch {
      set({ loading: false });
    }
  },

  logEntry: async (data) => {
    const raw = await invoke<RawHistoryEntry>("log_history", { data });
    const entry = parseHistoryEntry(raw);
    set((s) => ({ entries: [entry, ...s.entries] }));
    return entry;
  },

  search: async (filters) => {
    set({ filters, loading: true });
    try {
      const params: Record<string, unknown> = {
        limit: PAGE_SIZE,
        offset: 0,
      };
      if (filters.query) params.query = filters.query;
      if (filters.method) params.method = filters.method;
      if (filters.statusMin !== undefined) params.status_min = filters.statusMin;
      if (filters.statusMax !== undefined) params.status_max = filters.statusMax;

      const raws = await invoke<RawHistoryEntry[]>("search_history", { params });
      const entries = raws.map(parseHistoryEntry);
      set({ entries, hasMore: entries.length >= PAGE_SIZE, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  deleteEntry: async (id) => {
    await invoke("delete_history_entry", { id });
    set((s) => ({ entries: s.entries.filter((e) => e.id !== id) }));
  },

  clearAll: async () => {
    await invoke("clear_history");
    set({ entries: [], hasMore: false });
  },
}));
