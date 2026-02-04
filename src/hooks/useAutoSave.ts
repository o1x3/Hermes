import { useEffect, useRef } from "react";
import { useTabStore } from "@/stores/tabStore";
import { useCollectionStore } from "@/stores/collectionStore";

const AUTO_SAVE_DELAY = 2000;

export function useAutoSave() {
  const activeTab = useTabStore((s) => s.getActiveTab());
  const isTabDirty = useTabStore((s) =>
    activeTab ? s.isTabDirty(activeTab.id) : false,
  );
  const updateSavedSnapshot = useTabStore((s) => s.updateSavedSnapshot);
  const updateSavedRequest = useCollectionStore((s) => s.updateSavedRequest);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Only auto-save tabs that are already saved (have a savedRequestId) and are dirty
    if (!activeTab || !activeTab.savedRequestId || !isTabDirty) {
      return;
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(async () => {
      if (!activeTab.savedRequestId) return;

      try {
        await updateSavedRequest(activeTab.savedRequestId, {
          method: activeTab.state.method,
          url: activeTab.state.url,
          headers: activeTab.state.headers,
          params: activeTab.state.params,
          body: activeTab.state.bodyConfig,
          auth: activeTab.state.auth,
        });
        updateSavedSnapshot(activeTab.id);
      } catch (err) {
        console.error("Auto-save failed:", err);
      }
    }, AUTO_SAVE_DELAY);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [
    activeTab,
    isTabDirty,
    updateSavedRequest,
    updateSavedSnapshot,
  ]);
}
