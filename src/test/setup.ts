import "@testing-library/jest-dom/vitest";

// Mock ResizeObserver for react-resizable-panels in jsdom
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
