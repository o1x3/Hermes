import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Mock ResizeObserver for react-resizable-panels in jsdom
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock window.matchMedia for shadcn sidebar's useIsMobile hook
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock Tauri invoke API
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockImplementation((cmd: string) => {
    if (cmd === "load_workspace") {
      return Promise.resolve({
        collections: [],
        folders: [],
        requests: [],
      });
    }
    return Promise.resolve(null);
  }),
}));
