// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppHeader } from "@/components/app-header";

describe("AppHeader", () => {
  it("renders a banner landmark containing the wordmark", () => {
    render(<AppHeader />);

    const banner = screen.getByRole("banner");
    expect(banner).toBeInTheDocument();
    expect(
      within(banner).getByText("Hardware Service Decision Copilot"),
    ).toBeInTheDocument();
  });
});
