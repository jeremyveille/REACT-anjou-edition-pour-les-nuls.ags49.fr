import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import DashboardHeader from "./DashboardHeader";

describe("DashboardHeader Component Tests", () => {
  const mockSetSidebarOpen = jest.fn();
  const mockToggleCollapsed = jest.fn();
  const mockOnLogoutClick = jest.fn();
  const mockOnDashboardClick = jest.fn();
  const mockOnBackToSiteClick = jest.fn();
  const hamburgerBtnRef = { current: document.createElement("button") };

  const defaultProps = {
    userName: "JEREMY VEILLE",
    onLogoutClick: mockOnLogoutClick,
    onDashboardClick: mockOnDashboardClick,
    onBackToSiteClick: mockOnBackToSiteClick,
    currentPage: "dashboard",
    activeSection: null,
    sidebarOpen: false,
    setSidebarOpen: mockSetSidebarOpen,
    hamburgerBtnRef: hamburgerBtnRef,
    isCollapsed: false,
    toggleCollapsed: mockToggleCollapsed
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders topbar-left with topbar-menu-toggle, sidebar-collapse-toggle-btn, and title in expected order", () => {
    const { container } = render(<DashboardHeader {...defaultProps} />);

    const topbarLeft = container.querySelector(".topbar-left");
    expect(topbarLeft).toBeInTheDocument();

    const children = Array.from(topbarLeft.children);
    expect(children.length).toBe(3);

    // 1er enfant : topbar-menu-toggle
    expect(children[0]).toHaveClass("topbar-menu-toggle");

    // 2ème enfant : sidebar-collapse-toggle-btn
    expect(children[1]).toHaveClass("sidebar-collapse-toggle-btn");

    // 3ème enfant : topbar-title-wrapper
    expect(children[2]).toHaveClass("topbar-title-wrapper");
    expect(children[2]).toHaveTextContent("Tableau de bord");
    expect(children[2]).toHaveTextContent("Administration Anjou Édition");
  });

  test("renders sidebar-collapse-toggle-btn in expanded state (isCollapsed = false)", () => {
    render(<DashboardHeader {...defaultProps} isCollapsed={false} />);

    const collapseBtn = screen.getByRole("button", { name: /Réduire le menu latéral/i });
    expect(collapseBtn).toBeInTheDocument();
    expect(collapseBtn).toHaveClass("sidebar-collapse-toggle-btn");
    expect(collapseBtn).toHaveAttribute("aria-expanded", "true");
    expect(collapseBtn).not.toHaveAttribute("title");
    expect(screen.getByRole("tooltip")).toHaveTextContent("Réduire le menu");

    // Clic déclenche toggleCollapsed
    fireEvent.click(collapseBtn);
    expect(mockToggleCollapsed).toHaveBeenCalledTimes(1);
  });

  test("renders sidebar-collapse-toggle-btn in compact state (isCollapsed = true)", () => {
    render(<DashboardHeader {...defaultProps} isCollapsed={true} />);

    const expandBtn = screen.getByRole("button", { name: /Agrandir le menu latéral/i });
    expect(expandBtn).toBeInTheDocument();
    expect(expandBtn).toHaveClass("sidebar-collapse-toggle-btn");
    expect(expandBtn).toHaveAttribute("aria-expanded", "false");
    expect(expandBtn).not.toHaveAttribute("title");
    expect(screen.getByRole("tooltip")).toHaveTextContent("Agrandir le menu");

    // Clic déclenche toggleCollapsed
    fireEvent.click(expandBtn);
    expect(mockToggleCollapsed).toHaveBeenCalledTimes(1);
  });

  test("calls setSidebarOpen when clicking topbar-menu-toggle when closed", () => {
    render(<DashboardHeader {...defaultProps} sidebarOpen={false} />);

    const menuToggleBtn = screen.getByRole("button", { name: /Afficher ou masquer le menu latéral/i });
    expect(menuToggleBtn).toBeInTheDocument();
    expect(menuToggleBtn).toHaveAttribute("aria-expanded", "false");
    expect(menuToggleBtn).toHaveAttribute("aria-controls", "dashboard-sidebar");

    fireEvent.click(menuToggleBtn);
    expect(mockSetSidebarOpen).toHaveBeenCalledWith(true);
  });

  test("calls setSidebarOpen when clicking topbar-menu-toggle when open and displays close icon", () => {
    render(<DashboardHeader {...defaultProps} sidebarOpen={true} />);

    const menuToggleBtn = screen.getByRole("button", { name: /Masquer le menu latéral/i });
    expect(menuToggleBtn).toBeInTheDocument();
    expect(menuToggleBtn).toHaveAttribute("aria-expanded", "true");
    expect(menuToggleBtn).toHaveAttribute("aria-controls", "dashboard-sidebar");

    fireEvent.click(menuToggleBtn);
    expect(mockSetSidebarOpen).toHaveBeenCalledWith(false);
  });

  test("clicking chevron when sidebar is closed opens sidebar before toggling collapse", () => {
    render(<DashboardHeader {...defaultProps} sidebarOpen={false} isCollapsed={true} />);

    const chevronBtn = screen.getByRole("button", { name: /Agrandir le menu latéral/i });
    fireEvent.click(chevronBtn);

    expect(mockSetSidebarOpen).toHaveBeenCalledWith(true);
    expect(mockToggleCollapsed).toHaveBeenCalledTimes(1);
  });

  test("displays dynamic section title based on activeSection prop", () => {
    const { rerender } = render(<DashboardHeader {...defaultProps} activeSection="Page" />);
    expect(screen.getByText("Gestion des Pages")).toBeInTheDocument();

    rerender(<DashboardHeader {...defaultProps} activeSection="Article" />);
    expect(screen.getByText("Gestion des Articles")).toBeInTheDocument();

    rerender(<DashboardHeader {...defaultProps} activeSection="Mes Flipbooks" />);
    expect(screen.getByText("Gestion des Flipbooks")).toBeInTheDocument();
  });

  test("renders right actions and triggers appropriate callbacks", () => {
    render(<DashboardHeader {...defaultProps} />);

    const siteBtn = screen.getByRole("button", { name: /Voir le site/i });
    fireEvent.click(siteBtn);
    expect(mockOnBackToSiteClick).toHaveBeenCalledTimes(1);

    const logoutBtn = screen.getByRole("button", { name: /Déconnexion/i });
    fireEvent.click(logoutBtn);
    expect(mockOnLogoutClick).toHaveBeenCalledTimes(1);
  });

  test("renders breadcrumb link and navigates back to dashboard root on click", () => {
    render(<DashboardHeader {...defaultProps} activeSection="Article" />);

    const breadcrumbRootBtn = screen.getByRole("button", { name: /Tableau de bord/i });
    expect(breadcrumbRootBtn).toBeInTheDocument();
    expect(screen.getByText("Gestion des Articles")).toBeInTheDocument();

    fireEvent.click(breadcrumbRootBtn);
    expect(mockOnDashboardClick).toHaveBeenCalledTimes(1);
  });

  test("renders search trigger when onOpenCommandPalette is provided and triggers callback", () => {
    const mockOpenCmd = jest.fn();
    render(<DashboardHeader {...defaultProps} onOpenCommandPalette={mockOpenCmd} />);

    const searchBtn = screen.getByRole("button", { name: /Recherche universelle et commandes rapides/i });
    expect(searchBtn).toBeInTheDocument();
    expect(screen.getByText(/Ctrl K/i)).toBeInTheDocument();

    fireEvent.click(searchBtn);
    expect(mockOpenCmd).toHaveBeenCalledTimes(1);
  });
});
