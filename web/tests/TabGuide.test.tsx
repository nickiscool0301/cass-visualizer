import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TabGuide } from "../src/components/TabGuide";

describe("TabGuide", () => {
  it("renders a help button that opens the guide modal", () => {
    render(<TabGuide tab="storage" />);

    const button = screen.getByRole("button", { name: /Open guide for Storage Tab/i });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Storage Tab Guide")).toBeInTheDocument();
    expect(screen.getByText(/How to use/i)).toBeInTheDocument();
    expect(screen.getByText(/Tips/i)).toBeInTheDocument();
  });

  it("closes the modal when Close is clicked", () => {
    render(<TabGuide tab="topology" />);

    fireEvent.click(screen.getByRole("button", { name: /Open guide/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Close guide/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
