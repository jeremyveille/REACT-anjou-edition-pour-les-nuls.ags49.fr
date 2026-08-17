import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Dashboard from './Dashboard';

// Mock ES Modules dependencies causing Jest issues
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({}))
}));

jest.mock('../firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'admin-123' } }
}));

let mockMenusInDb = [];

describe('Dashboard Menu Builder Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    mockMenusInDb = [];
  });

  test('renders menu builder panel and lists menu items', async () => {
    const mockMenus = [
      { id: "m1", title: "Accueil", label: "Accueil", icon: "Home", url: "/", shortcode: "", status: "Actif", enabled: true, type: "internal-link", parentId: null, order: 1, description: "Lien vers la page d'accueil." },
      { id: "m2", title: "Contact", label: "Contact", icon: "HelpCircle", url: "", shortcode: "open_contact_modal", status: "Actif", enabled: true, type: "shortcode", parentId: null, order: 2, description: "Ouvre le formulaire de contact." }
    ];
    mockMenusInDb = mockMenus;
    localStorage.setItem("ae_menus", JSON.stringify(mockMenus));

    render(<Dashboard onBackToSite={() => {}} />);

    // Click on the "Mes menus" sidebar button
    const menusTabBtn = screen.getByRole('button', { name: /Mes menus/i });
    fireEvent.click(menusTabBtn);

    // Check title of section
    expect(await screen.findByText(/Menu de Navigation & Actions de Shortcode/i)).toBeInTheDocument();

    // Check that menu items are displayed
    expect(await screen.findByText("Accueil")).toBeInTheDocument();
    expect(screen.getByText("Contact")).toBeInTheDocument();
  });

  test('validates and allows whitelisted shortcode but refuses non-authorized shortcode', async () => {
    const mockMenus = [
      { id: "m1", title: "Accueil", label: "Accueil", icon: "Home", url: "/", shortcode: "", status: "Actif", enabled: true, type: "internal-link", parentId: null, order: 1 }
    ];
    mockMenusInDb = mockMenus;
    localStorage.setItem("ae_menus", JSON.stringify(mockMenus));
    window.alert = jest.fn();

    render(<Dashboard onBackToSite={() => {}} />);
    
    // Go to Menus
    fireEvent.click(screen.getByRole('button', { name: /Mes menus/i }));

    // Wait for load
    await screen.findByText("Accueil");

    // Click "Ajouter un élément"
    fireEvent.click(screen.getByRole('button', { name: /Ajouter un élément/i }));

    // Fill form with non-authorized shortcode
    fireEvent.change(screen.getByPlaceholderText(/ex: Accueil/i), { target: { value: 'Test Shortcode' } });
    fireEvent.change(screen.getByRole('combobox', { name: /Type d'action/i }), { target: { value: 'shortcode' } });
    fireEvent.change(screen.getByPlaceholderText(/Sélectionnez ou saisissez un identifiant/i), { target: { value: 'forbidden_shortcode' } });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /Créer l'élément/i }));

    // Alert should have been called reporting forbidden shortcode
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("n'est pas autorisé"));

    // Now fill with whitelisted shortcode
    fireEvent.change(screen.getByPlaceholderText(/Sélectionnez ou saisissez un identifiant/i), { target: { value: 'open_contact_modal' } });
    fireEvent.click(screen.getByRole('button', { name: /Créer l'élément/i }));

    // It should close modal and add item
    await waitFor(() => {
      expect(screen.queryByText(/Type d'action/i)).not.toBeInTheDocument();
    });
  });

  test('sanitizes titles to prevent XSS injections', async () => {
    const mockMenus = [
      { id: "m1", title: "Accueil", label: "Accueil", icon: "Home", url: "/", shortcode: "", status: "Actif", enabled: true, type: "internal-link", parentId: null, order: 1 }
    ];
    mockMenusInDb = mockMenus;
    localStorage.setItem("ae_menus", JSON.stringify(mockMenus));
    render(<Dashboard onBackToSite={() => {}} />);
    
    fireEvent.click(screen.getByRole('button', { name: /Mes menus/i }));

    // Wait for mock list to load
    await screen.findByText("Accueil");

    fireEvent.click(screen.getByRole('button', { name: /Ajouter un élément/i }));

    // Fill Title with XSS code
    fireEvent.change(screen.getByPlaceholderText(/ex: Accueil/i), { target: { value: '<script>alert("XSS")</script>Sécurisé' } });
    fireEvent.change(screen.getByPlaceholderText(/ex: \/contact/i), { target: { value: 'javascript:alert(1)' } });
    
    fireEvent.click(screen.getByRole('button', { name: /Créer l'élément/i }));

    // Should display sanitized title (without HTML script tag)
    expect(await screen.findByText("Sécurisé")).toBeInTheDocument();
    expect(screen.queryByText('<script>alert("XSS")</script>Sécurisé')).not.toBeInTheDocument();
  });

  test('keyboard accessibility controls change order and nesting', async () => {
    const mockMenus = [
      { id: "m1", title: "Item 1", label: "Item 1", icon: "Home", url: "/", shortcode: "", status: "Actif", enabled: true, type: "internal-link", parentId: null, order: 1 },
      { id: "m2", title: "Item 2", label: "Item 2", icon: "Layers", url: "/page2", shortcode: "", status: "Actif", enabled: true, type: "internal-link", parentId: null, order: 2 }
    ];
    mockMenusInDb = mockMenus;
    localStorage.setItem("ae_menus", JSON.stringify(mockMenus));

    render(<Dashboard onBackToSite={() => {}} />);
    
    fireEvent.click(screen.getByRole('button', { name: /Mes menus/i }));

    // Wait for load
    await screen.findByText("Item 1");

    // Check elements focus-ability & labels
    const moveUpBtns = screen.getAllByRole('button', { name: /Monter l'élément Item 1/i });
    const moveDownBtns = screen.getAllByRole('button', { name: /Descendre l'élément Item 1/i });
    const subMenuBtns = screen.getAllByRole('button', { name: /Déplacer en sous-menu de l'élément précédent/i });

    expect(moveUpBtns[0]).toBeInTheDocument();
    expect(moveDownBtns[0]).toBeInTheDocument();
    expect(subMenuBtns[0]).toBeInTheDocument();

    // Check make sub item
    fireEvent.click(subMenuBtns[1]); // Make Item 2 sub-item of Item 1 (since it is index 1 of subMenuBtns, corresponding to Item 2)
    
    await waitFor(() => {
      const localData = JSON.parse(localStorage.getItem("ae_menus"));
      const item2 = localData.find(item => item.id === "m2");
      expect(item2.parentId).toBe("m1");
    });
  });
});
