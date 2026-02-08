import { create } from "zustand";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { invoke } from "@tauri-apps/api/core";
import { useCollectionStore } from "@/stores/collectionStore";
import { useTeamStore } from "@/stores/teamStore";

type SyncStatus = "offline" | "syncing" | "synced" | "error";

interface SyncState {
  status: SyncStatus;
  lastSyncedAt: string | null;
  channel: RealtimeChannel | null;
  syncIntervalId: ReturnType<typeof setInterval> | null;

  startSync: () => void;
  stopSync: () => void;
  syncTeamCollections: (teamId: string) => Promise<void>;
  pushDirtyRecords: () => Promise<void>;
  handleRemoteChange: (table: string, payload: Record<string, unknown>) => void;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  status: "offline",
  lastSyncedAt: null,
  channel: null,
  syncIntervalId: null,

  startSync: () => {
    const { channel: existing } = get();
    if (existing) return;

    const teams = useTeamStore.getState().teams;
    const teamIds = teams.map((t) => t.id);
    if (teamIds.length === 0) {
      set({ status: "synced" });
      return;
    }

    // Subscribe to realtime changes on cloud tables
    const channel = supabase
      .channel("team-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "collections" },
        (payload) => get().handleRemoteChange("collections", payload.new as Record<string, unknown>),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "folders" },
        (payload) => get().handleRemoteChange("folders", payload.new as Record<string, unknown>),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "requests" },
        (payload) => get().handleRemoteChange("requests", payload.new as Record<string, unknown>),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "environments" },
        (payload) => get().handleRemoteChange("environments", payload.new as Record<string, unknown>),
      )
      .subscribe();

    // Initial pull for all teams
    for (const teamId of teamIds) {
      get().syncTeamCollections(teamId).catch(console.error);
    }

    // Periodic push of dirty records
    const syncIntervalId = setInterval(() => {
      if (navigator.onLine) {
        get().pushDirtyRecords().catch(console.error);
      }
    }, 30000);

    // Online/offline detection
    const handleOnline = () => {
      set({ status: "syncing" });
      get().pushDirtyRecords().catch(console.error);
    };
    const handleOffline = () => set({ status: "offline" });

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    set({
      channel,
      syncIntervalId,
      status: navigator.onLine ? "synced" : "offline",
    });
  },

  stopSync: () => {
    const { channel, syncIntervalId } = get();
    if (channel) {
      supabase.removeChannel(channel);
    }
    if (syncIntervalId) {
      clearInterval(syncIntervalId);
    }
    set({ channel: null, syncIntervalId: null, status: "offline" });
  },

  syncTeamCollections: async (teamId: string) => {
    set({ status: "syncing" });
    try {
      // Pull collections
      const { data: collections } = await supabase
        .from("collections")
        .select("*")
        .eq("team_id", teamId);

      for (const c of collections ?? []) {
        await invoke("upsert_from_cloud", {
          data: {
            table: "collections",
            cloud_id: c.id,
            team_id: c.team_id,
            name: c.name,
            description: c.description,
            default_headers: JSON.stringify(c.default_headers),
            default_auth: JSON.stringify(c.default_auth),
            variables: JSON.stringify(c.variables),
            sort_order: c.sort_order,
          },
        });
      }

      // Pull folders
      const collectionIds = (collections ?? []).map((c) => c.id);
      if (collectionIds.length > 0) {
        const { data: folders } = await supabase
          .from("folders")
          .select("*")
          .in("collection_id", collectionIds);

        for (const f of folders ?? []) {
          // Resolve local collection_id from cloud_id
          await invoke("upsert_from_cloud", {
            data: {
              table: "folders",
              cloud_id: f.id,
              collection_id: f.collection_id,
              parent_folder_id: f.parent_folder_id,
              name: f.name,
              default_headers: JSON.stringify(f.default_headers),
              default_auth: JSON.stringify(f.default_auth),
              variables: JSON.stringify(f.variables),
              sort_order: f.sort_order,
            },
          });
        }

        // Pull requests
        const { data: requests } = await supabase
          .from("requests")
          .select("*")
          .in("collection_id", collectionIds);

        for (const r of requests ?? []) {
          await invoke("upsert_from_cloud", {
            data: {
              table: "requests",
              cloud_id: r.id,
              collection_id: r.collection_id,
              folder_id: r.folder_id,
              name: r.name,
              method: r.method,
              url: r.url,
              headers: JSON.stringify(r.headers),
              params: JSON.stringify(r.params),
              body: JSON.stringify(r.body),
              auth: JSON.stringify(r.auth),
              variables: JSON.stringify(r.variables),
              sort_order: r.sort_order,
            },
          });
        }
      }

      // Refresh local store
      await useCollectionStore.getState().loadWorkspace();
      set({ status: "synced", lastSyncedAt: new Date().toISOString() });
    } catch (err) {
      console.error("Sync pull failed:", err);
      set({ status: "error" });
    }
  },

  pushDirtyRecords: async () => {
    try {
      const dirty = await invoke<{
        collections: Array<Record<string, unknown>>;
        folders: Array<Record<string, unknown>>;
        requests: Array<Record<string, unknown>>;
      }>("get_dirty_records");

      const hasDirty =
        dirty.collections.length > 0 ||
        dirty.folders.length > 0 ||
        dirty.requests.length > 0;

      if (!hasDirty) return;

      set({ status: "syncing" });

      // Push dirty collections
      for (const c of dirty.collections) {
        const cloudId = c.cloud_id as string;
        if (cloudId) {
          await supabase
            .from("collections")
            .update({
              name: c.name,
              description: c.description,
              default_headers: JSON.parse(c.default_headers as string),
              default_auth: JSON.parse(c.default_auth as string),
              variables: JSON.parse(c.variables as string),
              sort_order: c.sort_order,
            })
            .eq("id", cloudId);

          await invoke("mark_synced", {
            table: "collections",
            localId: c.id,
            cloudId,
            teamId: c.team_id,
          });
        }
      }

      // Push dirty folders
      for (const f of dirty.folders) {
        const cloudId = f.cloud_id as string;
        if (cloudId) {
          await supabase
            .from("folders")
            .update({
              name: f.name,
              default_headers: JSON.parse(f.default_headers as string),
              default_auth: JSON.parse(f.default_auth as string),
              variables: JSON.parse(f.variables as string),
              sort_order: f.sort_order,
            })
            .eq("id", cloudId);

          await invoke("mark_synced", {
            table: "folders",
            localId: f.id,
            cloudId,
          });
        }
      }

      // Push dirty requests
      for (const r of dirty.requests) {
        const cloudId = r.cloud_id as string;
        if (cloudId) {
          await supabase
            .from("requests")
            .update({
              name: r.name,
              method: r.method,
              url: r.url,
              headers: JSON.parse(r.headers as string),
              params: JSON.parse(r.params as string),
              body: JSON.parse(r.body as string),
              auth: JSON.parse(r.auth as string),
              variables: JSON.parse(r.variables as string),
              sort_order: r.sort_order,
            })
            .eq("id", cloudId);

          await invoke("mark_synced", {
            table: "requests",
            localId: r.id,
            cloudId,
          });
        }
      }

      set({ status: "synced", lastSyncedAt: new Date().toISOString() });
    } catch (err) {
      console.error("Sync push failed:", err);
      set({ status: "error" });
    }
  },

  handleRemoteChange: (_table: string, _payload: Record<string, unknown>) => {
    // Refresh workspace on any remote change
    // A simple approach: reload from local SQLite after a short delay
    // The realtime event tells us something changed; we re-pull to get the latest
    const activeTeamId = useTeamStore.getState().activeTeamId;
    if (activeTeamId) {
      get().syncTeamCollections(activeTeamId).catch(console.error);
    }
  },
}));
