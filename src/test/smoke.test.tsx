import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import App from "../App";

describe("App", () => {
  it("renders the app shell with sidebar", () => {
    render(<App />);
    expect(screen.getByText("Hermes")).toBeInTheDocument();
    expect(screen.getByText("Collections")).toBeInTheDocument();
    expect(screen.getByText("History")).toBeInTheDocument();
    expect(screen.getByText("No collections yet")).toBeInTheDocument();
    expect(screen.getByText("No history yet")).toBeInTheDocument();
  });
});
