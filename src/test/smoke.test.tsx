import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import App from "../App";

describe("App", () => {
  it("renders the app shell", () => {
    render(<App />);
    expect(screen.getByText("Sidebar")).toBeInTheDocument();
    expect(screen.getByText("URL Bar")).toBeInTheDocument();
    expect(screen.getByText("Response Panel")).toBeInTheDocument();
  });
});
