import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import DashboardSidebar from "./DashboardSidebar";

describe("DashboardSidebar Component Tests", () => {
  const mockSetActiveSection = jest.fn();
  const mockSetActiveCategory = jest.fn();
  const mockSetSidebarOpen = jest.fn();
  const mockHandleLogout = jest.fn();
  const mockOnOpenPageBuilder = jest.fn();
  const mockSetNotification = jest.fn();
  const hamburgerBtnRef = { current: document.createElement("button") };

  const defaultProps = {
    activeSection: null,
    setActiveSection: mockSetActiveSection,
    setActiveCategory: mockSetActiveCategory,
    sidebarOpen: false,
    setSidebarOpen: mockSetSidebarOpen,
    userName: "JEREMY VEILLE",
    handleLogout: mockHandleLogout,
    pagesCount: 5,
    articlesCount: 12,
    flipbooksCount: 3,
    messagesCount: 2,
    onOpenPageBuilder: mockOnOpenPageBuilder,
    setNotification: mockSetNotification,
    hamburgerBtnRef: hamburgerBtnRef
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test("renders branding and all required navigation & management items", () => {
    render(<DashboardSidebar {...defaultProps} />);

    // Brand
    expect(screen.getByText(/ANJOU ÉDITION/i)).toBeInTheDocument();
    expect(screen.getByText(/Pour les Nuls/i)).toBeInTheDocument();

    // Section Titles
    expect(screen.getByText(/Navigation/i)).toBeInTheDocument();
    expect(screen.getByText(/Gestion/i)).toBeInTheDocument();

    // NAVIGATION items
    expect(screen.getByRole("button", { name: /Tableau de bord/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Pages/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Articles/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Actualités/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Constructeur/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Flipbooks/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Médias/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Médiathèque/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Galerie Photos/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Vidéos/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Messages/i })).toBeInTheDocument();

    // GESTION items
    expect(screen.getByRole("button", { name: /Apparence \/ Mes menus/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Comptes \/ Écrivains/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Paramètres/i })).toBeInTheDocument();

    // User profile & Logout
    expect(screen.getByText("JEREMY VEILLE")).toBeInTheDocument();
    expect(screen.getByText("Administrateur")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Déconnexion/i })).toBeInTheDocument();
  });

  test("highlights active section with aria-current='page' and .active class", () => {
    // When activeSection is null, Tableau de bord is active
    const { rerender } = render(<DashboardSidebar {...defaultProps} activeSection={null} />);
    const dashboardBtn = screen.getByRole("button", { name: /Tableau de bord/i });
    expect(dashboardBtn).toHaveAttribute("aria-current", "page");
    expect(dashboardBtn).toHaveClass("active");

    // When activeSection is 'Page'
    rerender(<DashboardSidebar {...defaultProps} activeSection="Page" />);
    const pagesBtn = screen.getByRole("button", { name: /^Pages/i });
    expect(pagesBtn).toHaveAttribute("aria-current", "page");
    expect(pagesBtn).toHaveClass("active");

    // When activeSection is 'Mes menus'
    rerender(<DashboardSidebar {...defaultProps} activeSection="Mes menus" />);
    const menusBtn = screen.getByRole("button", { name: /Apparence \/ Mes menus/i });
    expect(menusBtn).toHaveAttribute("aria-current", "page");
    expect(menusBtn).toHaveClass("active");
  });

  test("renders in compact collapsed mode or full mode according to isCollapsed prop without duplicate toggle button", () => {
    const { rerender } = render(<DashboardSidebar {...defaultProps} isCollapsed={false} />);
    const aside = screen.getByRole("complementary");
    expect(aside).not.toHaveClass("is-collapsed");

    // Vérifier que le bouton n'est plus présent dans son ancien emplacement
    expect(screen.queryByRole("button", { name: /Réduire le menu latéral/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Agrandir le menu latéral/i })).not.toBeInTheDocument();

    // Mode réduit
    rerender(<DashboardSidebar {...defaultProps} isCollapsed={true} />);
    expect(aside).toHaveClass("is-collapsed");
    expect(screen.getByRole("button", { name: /Tableau de bord/i })).toBeInTheDocument();
  });

  test("navigates on item click and closes mobile sidebar if open", () => {
    render(<DashboardSidebar {...defaultProps} sidebarOpen={true} />);

    // Click on Articles
    const articlesBtn = screen.getByRole("button", { name: /Articles/i });
    fireEvent.click(articlesBtn);

    expect(mockSetActiveSection).toHaveBeenCalledWith("Article");
    expect(mockSetSidebarOpen).toHaveBeenCalledWith(false);

    // Click on Home brand
    const brandBtn = screen.getByRole("button", { name: /Accueil Anjou Édition/i });
    fireEvent.click(brandBtn);

    expect(mockSetActiveSection).toHaveBeenCalledWith(null);
    expect(mockSetActiveCategory).toHaveBeenCalledWith("Accueil");
  });

  test("opens page builder when clicking Constructeur", () => {
    render(<DashboardSidebar {...defaultProps} />);

    const builderBtn = screen.getByRole("button", { name: /Constructeur/i });
    fireEvent.click(builderBtn);

    expect(mockOnOpenPageBuilder).toHaveBeenCalled();
  });

  test("collapses and expands the Médias submenu", () => {
    render(<DashboardSidebar {...defaultProps} />);

    const mediaToggleBtn = screen.getByRole("button", { name: /Médias/i });
    expect(mediaToggleBtn).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Médiathèque")).toBeInTheDocument();

    // Click to close submenu
    fireEvent.click(mediaToggleBtn);
    expect(mediaToggleBtn).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("group", { name: /Sous-menu Médias/i })).not.toBeInTheDocument();

    // Click to re-open
    fireEvent.click(mediaToggleBtn);
    expect(mediaToggleBtn).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Médiathèque")).toBeInTheDocument();
  });

  test("closes mobile drawer on close button click and on Escape key press", () => {
    const focusSpy = jest.spyOn(hamburgerBtnRef.current, "focus");

    const { rerender } = render(<DashboardSidebar {...defaultProps} sidebarOpen={true} />);

    // Close button in drawer header
    const closeBtn = screen.getByRole("button", { name: /Fermer le menu latéral/i });
    expect(closeBtn).toHaveClass("sidebar-header-close-btn");
    expect(closeBtn).toHaveClass("sidebar-mobile-close-btn");
    expect(closeBtn).toHaveAttribute("type", "button");
    fireEvent.click(closeBtn);

    expect(mockSetSidebarOpen).toHaveBeenCalledWith(false);
    expect(focusSpy).toHaveBeenCalled();

    // Re-open and test Escape key
    rerender(<DashboardSidebar {...defaultProps} sidebarOpen={true} />);
    fireEvent.keyDown(window, { key: "Escape" });

    expect(mockSetSidebarOpen).toHaveBeenCalledWith(false);
  });

  test("calls handleLogout when clicking on Déconnexion", () => {
    render(<DashboardSidebar {...defaultProps} />);

    const logoutBtn = screen.getByRole("button", { name: /Déconnexion/i });
    fireEvent.click(logoutBtn);

    expect(mockHandleLogout).toHaveBeenCalled();
  });

  test("has id='dashboard-sidebar' and proper aria attributes for accessibility", () => {
    render(<DashboardSidebar {...defaultProps} pagesCount={8} articlesCount={15} />);

    const aside = screen.getByRole("complementary");
    expect(aside).toHaveAttribute("id", "dashboard-sidebar");

    // Badges for pages and articles
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();

    // Media submenu toggle has aria-controls and aria-expanded
    const mediaBtn = screen.getByRole("button", { name: /Médias/i });
    expect(mediaBtn).toHaveAttribute("aria-controls", "sidebar-submenu-medias");
    expect(mediaBtn).toHaveAttribute("aria-expanded", "true");
  });
});
