import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import App from "../App";

describe("App", () => {
  it("renders the app shell with sidebar and collections", async () => {
    render(<App />);

    // Sidebar branding
    await waitFor(() => {
      expect(screen.getByText("Hermes")).toBeInTheDocument();
    });

    // Section labels
    expect(screen.getByText("Collections")).toBeInTheDocument();
    expect(screen.getByText("History")).toBeInTheDocument();
    expect(screen.getByText("No history yet")).toBeInTheDocument();
  });

  it("renders an empty collections state with new collection button", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("No collections yet")).toBeInTheDocument();
    });

    expect(screen.getByText("New Collection")).toBeInTheDocument();
  });
});
