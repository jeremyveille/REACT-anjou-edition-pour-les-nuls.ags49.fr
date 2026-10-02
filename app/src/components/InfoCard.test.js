import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import InfoCard from "./InfoCard";

describe("InfoCard Administrative Status Card Tests", () => {
  test("renders service status details without promotional imagery", () => {
    const mockLearnMore = jest.fn();
    render(<InfoCard onLearnMore={mockLearnMore} />);

    // Service title & status
    expect(screen.getByText("Service Anjou Édition")).toBeInTheDocument();
    expect(screen.getByText(/Statut : Actif/i)).toBeInTheDocument();

    // Cloud Firestore & access
    expect(screen.getByText("Cloud Firestore")).toBeInTheDocument();
    expect(screen.getByText("Outils de publication")).toBeInTheDocument();
    expect(screen.getByText(/AE-29381/i)).toBeInTheDocument();

    // Learn more button
    const btn = screen.getByRole("button", { name: /En savoir plus/i });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(mockLearnMore).toHaveBeenCalledTimes(1);

    // Verify no promotional cover image is present
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  test("renders gracefully without onLearnMore callback", () => {
    render(<InfoCard />);
    expect(screen.getByText("Service Anjou Édition")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /En savoir plus/i })).not.toBeInTheDocument();
  });
});
