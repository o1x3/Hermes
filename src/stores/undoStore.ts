import { create } from "zustand";
import type {
  HttpMethod,
  HeaderEntry,
  ParamEntry,
  RequestBody,
  RequestAuth,
} from "@/types/request";

export interface UndoSnapshot {
  id: string;
  timestamp: number;
  label: string;
  tabId: string;
  state: {
    method: HttpMethod;
    url: string;
    headers: HeaderEntry[];
    params: ParamEntry[];
    bodyConfig: RequestBody;
    auth: RequestAuth;
  };
}

interface UndoState {
  stack: UndoSnapshot[];
  maxDepth: number;

  push: (snapshot: Omit<UndoSnapshot, "id" | "timestamp">) => void;
  pop: () => UndoSnapshot | null;
  peek: () => UndoSnapshot | null;
  canUndo: () => boolean;
  clear: () => void;
}

export const useUndoStore = create<UndoState>((set, get) => ({
  stack: [],
  maxDepth: 50,

  push: (snapshot) => {
    const id = crypto.randomUUID();
    const timestamp = Date.now();

    set((state) => {
      const newStack = [...state.stack, { ...snapshot, id, timestamp }].slice(
        -state.maxDepth,
      );

      return { stack: newStack };
    });
  },

  pop: () => {
    const { stack } = get();
    if (stack.length === 0) return null;

    const last = stack[stack.length - 1];
    set({ stack: stack.slice(0, -1) });
    return last;
  },

  peek: () => {
    const { stack } = get();
    return stack.length > 0 ? stack[stack.length - 1] : null;
  },

  canUndo: () => get().stack.length > 0,

  clear: () => set({ stack: [] }),
}));
