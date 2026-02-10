import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import App from "../App";

const renderWithProviders = () => {
  return render(
    <TooltipProvider>
      <App />
    </TooltipProvider>,
  );
};

describe("App", () => {
  it("renders the app shell with sidebar and collections", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Collections")).toBeInTheDocument();
    });

    expect(screen.getByText("History")).toBeInTheDocument();
    expect(screen.getByText("No history yet")).toBeInTheDocument();
  });

  it("renders an empty collections state with new collection button", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("No collections yet")).toBeInTheDocument();
    });

    expect(screen.getByText("New Collection")).toBeInTheDocument();
  });
});
