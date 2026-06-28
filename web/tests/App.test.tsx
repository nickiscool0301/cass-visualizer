import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import App from "../src/App";

describe("App", () => {
  it("renders the visualizer", () => {
    render(<App />);
    expect(screen.getByRole("img", { hidden: true })).toBeInTheDocument();
  });

  it("switches to the Knowledge tab", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /knowledge/i }));
    expect(screen.getByRole("heading", { name: /cassandra knowledge base/i })).toBeInTheDocument();
  });
});
