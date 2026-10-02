import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import MenuManager from "../MenuManager";

const mockNormalizeParentId = (id) => {
  if (!id || id === "null" || id === "") return null;
  return id;
};

const mockReindexMenuOrders = (list) => {
  const groups = {};
  list.forEach(item => {
    const pId = mockNormalizeParentId(item.parentId) || "root";
    if (!groups[pId]) groups[pId] = [];
    groups[pId].push(item);
  });
  return Object.values(groups).flatMap(group =>
    group.map((item, index) => ({ ...item, order: index + 1 }))
  );
};

const mockGetDescendantIds = (itemId, items) => {
  const children = items.filter(item => mockNormalizeParentId(item.parentId) === itemId);
  let ids = [];
  children.forEach(child => {
    ids.push(child.id);
    ids = ids.concat(mockGetDescendantIds(child.id, items));
  });
  return ids;
};

const mockSampleMenus = [
  { id: "m1", title: "Accueil", label: "Accueil", icon: "Home", url: "/", status: "Actif", enabled: true, type: "internal", parentId: null, order: 1 },
  { id: "m2", title: "Arts & Culture", label: "Arts & Culture", icon: "Layers", url: "/arts", status: "Actif", enabled: true, type: "internal", parentId: null, order: 2 },
  { id: "m21", title: "Peinture", label: "Peinture", icon: "Layers", url: "/arts/peinture", status: "Actif", enabled: true, type: "internal", parentId: "m2", order: 1 },
  { id: "m22", title: "Sculpture", label: "Sculpture", icon: "Layers", url: "/arts/sculpture", status: "Actif", enabled: true, type: "internal", parentId: "m2", order: 2 },
  { id: "m211", title: "Renaissance", label: "Renaissance", icon: "Layers", url: "/arts/peinture/renaissance", status: "Actif", enabled: true, type: "internal", parentId: "m21", order: 1 },
  { id: "m3", title: "Contact", label: "Contact", icon: "HelpCircle", url: "", shortcode: "open_contact_modal", status: "Actif", enabled: true, type: "shortcode", parentId: null, order: 3 }
];

describe("MenuManager Column-Based Navigation Tests", () => {
  test("renders Column 1 with only top-level categories and does not show endless vertical tree", () => {
    render(
      <MenuManager
        menusList={mockSampleMenus}
        onSaveAllMenus={jest.fn()}
        normalizeParentId={mockNormalizeParentId}
        reindexMenuOrders={mockReindexMenuOrders}
        getDescendantIds={mockGetDescendantIds}
      />
    );

    // Header and search bar
    expect(screen.getByText("Menu de Navigation & Actions de Shortcode")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Rechercher un élément ou shortcode.../i)).toBeInTheDocument();

    // Column 1 has top-level items
    expect(screen.getByText("Accueil")).toBeInTheDocument();
    expect(screen.getByText("Arts & Culture")).toBeInTheDocument();
    expect(screen.getByText("Contact")).toBeInTheDocument();

    // Sub-items are NOT rendered initially in Column 1
    expect(screen.queryByText("Peinture")).not.toBeInTheDocument();
    expect(screen.queryByText("Renaissance")).not.toBeInTheDocument();
  });

  test("clicking a top-level category displays its children in Column 2", () => {
    render(
      <MenuManager
        menusList={mockSampleMenus}
        onSaveAllMenus={jest.fn()}
        normalizeParentId={mockNormalizeParentId}
        reindexMenuOrders={mockReindexMenuOrders}
        getDescendantIds={mockGetDescendantIds}
      />
    );

    // Click on "Arts & Culture"
    fireEvent.click(screen.getByText("Arts & Culture"));

    // Column 2 should now display direct children
    expect(screen.getByText("Peinture")).toBeInTheDocument();
    expect(screen.getByText("Sculpture")).toBeInTheDocument();

    // Level 3 item "Renaissance" is still not displayed until Peinture is clicked
    expect(screen.queryByText("Renaissance")).not.toBeInTheDocument();
  });

  test("clicking a child with deeper descendants displays Column 3 and breadcrumb trail", () => {
    render(
      <MenuManager
        menusList={mockSampleMenus}
        onSaveAllMenus={jest.fn()}
        normalizeParentId={mockNormalizeParentId}
        reindexMenuOrders={mockReindexMenuOrders}
        getDescendantIds={mockGetDescendantIds}
      />
    );

    // Navigate to Arts & Culture -> Peinture
    fireEvent.click(screen.getByText("Arts & Culture"));
    fireEvent.click(screen.getByText("Peinture"));

    // Renaissance should now be visible in Column 3
    expect(screen.getByText("Renaissance")).toBeInTheDocument();

    // Breadcrumb bar should display: Menu du site / Arts & Culture / Peinture
    expect(screen.getByRole('navigation', { name: /Fil d'ariane/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Menu du site/i })).toBeInTheDocument();
  });

  test("breadcrumb navigation resets to root when clicking Menu du site", () => {
    render(
      <MenuManager
        menusList={mockSampleMenus}
        onSaveAllMenus={jest.fn()}
        normalizeParentId={mockNormalizeParentId}
        reindexMenuOrders={mockReindexMenuOrders}
        getDescendantIds={mockGetDescendantIds}
      />
    );

    // Navigate down
    fireEvent.click(screen.getByText("Arts & Culture"));
    expect(screen.getByText("Peinture")).toBeInTheDocument();

    // Click breadcrumb root
    fireEvent.click(screen.getByRole('button', { name: /Menu du site/i }));

    // Column 2 should return to empty state prompt
    expect(screen.queryByText("Peinture")).not.toBeInTheDocument();
    expect(screen.getByText(/Sélectionnez une catégorie principale à gauche/i)).toBeInTheDocument();
  });

  test("global search filters tree and displays hierarchical path, navigating on click", () => {
    render(
      <MenuManager
        menusList={mockSampleMenus}
        onSaveAllMenus={jest.fn()}
        normalizeParentId={mockNormalizeParentId}
        reindexMenuOrders={mockReindexMenuOrders}
        getDescendantIds={mockGetDescendantIds}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Rechercher un élément ou shortcode.../i);
    fireEvent.change(searchInput, { target: { value: "Renaissance" } });

    // Search dropdown appears with matching result and ancestor path
    const searchResult = screen.getByRole("option");
    expect(searchResult).toBeInTheDocument();
    expect(searchResult).toHaveTextContent("Renaissance");

    // Click search result to navigate directly
    fireEvent.click(searchResult);

    // It should open editor panel for Renaissance
    expect(screen.getByDisplayValue("Renaissance")).toBeInTheDocument();
  });

  test("safe delete modal prompts for choice when category has children", async () => {
    const handleSave = jest.fn();
    render(
      <MenuManager
        menusList={mockSampleMenus}
        onSaveAllMenus={handleSave}
        normalizeParentId={mockNormalizeParentId}
        reindexMenuOrders={mockReindexMenuOrders}
        getDescendantIds={mockGetDescendantIds}
      />
    );

    // Open options context menu on Arts & Culture (which has children)
    const optionsBtn = screen.getByRole('button', { name: /Options pour Arts & Culture/i });
    fireEvent.click(optionsBtn);

    // Click Supprimer in dropdown
    const deleteBtn = screen.getByRole('menuitem', { name: /Supprimer/i });
    fireEvent.click(deleteBtn);

    // Delete modal should open warning about children
    expect(screen.getByRole('dialog', { name: /Supprimer la catégorie/i })).toBeInTheDocument();
    expect(screen.getByText(/Cette catégorie contient 2 sous-élément/i)).toBeInTheDocument();

    // Choose to promote children and confirm
    const promoteRadio = screen.getByLabelText(/Conserver les sous-éléments/i);
    expect(promoteRadio).toBeChecked();

    const confirmBtn = screen.getByRole('button', { name: /Confirmer la suppression/i });
    fireEvent.click(confirmBtn);

    // Children should have their parentId updated to null
    await waitFor(() => {
      expect(handleSave).toHaveBeenCalled();
    });
  });

  test("move modal allows safe reparenting without cycles", async () => {
    const handleSave = jest.fn();
    render(
      <MenuManager
        menusList={mockSampleMenus}
        onSaveAllMenus={handleSave}
        normalizeParentId={mockNormalizeParentId}
        reindexMenuOrders={mockReindexMenuOrders}
        getDescendantIds={mockGetDescendantIds}
      />
    );

    // Open context menu on "Contact"
    const optionsBtn = screen.getByRole('button', { name: /Options pour Contact/i });
    fireEvent.click(optionsBtn);

    // Click Déplacer vers...
    const moveBtn = screen.getByRole('menuitem', { name: /Déplacer vers.../i });
    fireEvent.click(moveBtn);

    // Modal dialog should be visible
    expect(screen.getByRole('dialog', { name: /Déplacer l'élément/i })).toBeInTheDocument();

    // Select target parent Arts & Culture
    const select = screen.getByLabelText(/Nouvel emplacement parent/i);
    fireEvent.change(select, { target: { value: "m2" } });

    // Confirm move
    fireEvent.click(screen.getByRole('button', { name: /Déplacer l'élément/i }));

    await waitFor(() => {
      expect(handleSave).toHaveBeenCalled();
    });
  });

  test("allows duplicating an element with duplicate name and slug", async () => {
    const handleSave = jest.fn();
    render(
      <MenuManager
        menusList={mockSampleMenus}
        onSaveAllMenus={handleSave}
        normalizeParentId={mockNormalizeParentId}
        reindexMenuOrders={mockReindexMenuOrders}
        getDescendantIds={mockGetDescendantIds}
      />
    );

    // Open context menu on "Accueil"
    const optionsBtn = screen.getByRole('button', { name: /Options pour Accueil/i });
    fireEvent.click(optionsBtn);

    // Click Dupliquer
    const duplicateBtn = screen.getByRole('menuitem', { name: /Dupliquer/i });
    fireEvent.click(duplicateBtn);

    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ title: "Accueil (Copie)" })
        ])
      );
    });
  });
});
