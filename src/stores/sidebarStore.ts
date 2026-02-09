import { create } from "zustand";
import { persist } from "zustand/middleware";

const DEFAULT_WIDTH = 240;
const MIN_WIDTH = 180;
const MAX_WIDTH = 400;

interface SidebarState {
  expanded: boolean;
  activeSection: "collections" | "history" | null;
  width: number;
  toggle: () => void;
  expandToSection: (section: "collections" | "history") => void;
  setWidth: (width: number) => void;
  collapse: () => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      expanded: true,
      activeSection: "collections",
      width: DEFAULT_WIDTH,
      toggle: () => set((state) => ({ expanded: !state.expanded })),
      expandToSection: (section) =>
        set({ expanded: true, activeSection: section }),
      setWidth: (width) =>
        set({
          width: Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width)),
        }),
      collapse: () => set({ expanded: false }),
    }),
    {
      name: "hermes-sidebar",
      partialize: (state) => ({
        expanded: state.expanded,
        width: state.width,
      }),
    }
  )
);

export { MIN_WIDTH, MAX_WIDTH };
