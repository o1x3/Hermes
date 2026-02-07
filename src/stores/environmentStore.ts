import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { Environment } from "@/types/environment";
import { parseEnvironment, serializeVariables } from "@/lib/workspace-utils";

interface EnvironmentState {
  environments: Environment[];
  activeEnvironmentId: string | null;

  // Initialization (called from collectionStore.loadWorkspace)
  setEnvironments: (environments: Environment[], activeId: string | null) => void;

  // CRUD
  createEnvironment: (name: string) => Promise<Environment>;
  updateEnvironment: (id: string, updates: Partial<Pick<Environment, "name" | "variables">>) => Promise<void>;
  deleteEnvironment: (id: string) => Promise<void>;

  // Active environment
  setActiveEnvironment: (id: string | null) => Promise<void>;

  // Lookups
  getGlobalEnvironment: () => Environment | undefined;
  getActiveEnvironment: () => Environment | undefined;
  getEnvironment: (id: string) => Environment | undefined;
}

export const useEnvironmentStore = create<EnvironmentState>((set, get) => ({
  environments: [],
  activeEnvironmentId: null,

  setEnvironments: (environments, activeId) => {
    set({ environments, activeEnvironmentId: activeId });
  },

  createEnvironment: async (name) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = await invoke<any>("create_environment", { name });
    const env = parseEnvironment(raw);
    set((s) => ({ environments: [...s.environments, env] }));
    return env;
  },

  updateEnvironment: async (id, updates) => {
    const data: Record<string, string | undefined> = {};
    if (updates.name !== undefined) data.name = updates.name;
    if (updates.variables !== undefined) data.variables = serializeVariables(updates.variables);
    await invoke("update_environment", { id, data });
    set((s) => ({
      environments: s.environments.map((e) =>
        e.id === id ? { ...e, ...updates } : e,
      ),
    }));
  },

  deleteEnvironment: async (id) => {
    await invoke("delete_environment", { id });
    set((s) => {
      const newState: Partial<EnvironmentState> = {
        environments: s.environments.filter((e) => e.id !== id),
      };
      // Clear active if we just deleted it
      if (s.activeEnvironmentId === id) {
        newState.activeEnvironmentId = null;
      }
      return newState as EnvironmentState;
    });
  },

  setActiveEnvironment: async (id) => {
    if (id) {
      await invoke("set_setting", { key: "active_environment_id", value: id });
    } else {
      // Setting empty string effectively clears it; we read it as null in the store
      await invoke("set_setting", { key: "active_environment_id", value: "" });
    }
    set({ activeEnvironmentId: id });
  },

  getGlobalEnvironment: () => get().environments.find((e) => e.isGlobal),
  getActiveEnvironment: () => {
    const { environments, activeEnvironmentId } = get();
    if (!activeEnvironmentId) return undefined;
    return environments.find((e) => e.id === activeEnvironmentId);
  },
  getEnvironment: (id) => get().environments.find((e) => e.id === id),
}));
