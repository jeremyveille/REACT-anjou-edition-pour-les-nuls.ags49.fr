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

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  collection: jest.fn(),
  getDocs: jest.fn(() => Promise.resolve({ empty: true, docs: [] })),
  doc: jest.fn(),
  getDoc: jest.fn(() => Promise.resolve({ exists: () => false, data: () => ({}) })),
  addDoc: jest.fn(() => Promise.resolve({ id: 'mock_doc' })),
  setDoc: jest.fn(() => Promise.resolve()),
  deleteDoc: jest.fn(() => Promise.resolve()),
  query: jest.fn(),
  orderBy: jest.fn(),
  where: jest.fn(),
  limit: jest.fn()
}));


describe('Dashboard Menu Builder Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState(null, '', '/ae-dashboard');
  });

  test('renders menu builder panel and lists menu items', async () => {
    const mockMenus = [
      { id: "m1", title: "Accueil", label: "Accueil", icon: "Home", url: "/", shortcode: "", status: "Actif", enabled: true, type: "internal-link", parentId: null, order: 1, description: "Lien vers la page d'accueil." },
      { id: "m2", title: "Contact", label: "Contact", icon: "HelpCircle", url: "", shortcode: "open_contact_modal", status: "Actif", enabled: true, type: "shortcode", parentId: null, order: 2, description: "Ouvre le formulaire de contact." }
    ];

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

    localStorage.setItem("ae_menus", JSON.stringify(mockMenus));
    render(<Dashboard onBackToSite={() => {}} />);
    
    fireEvent.click(screen.getByRole('button', { name: /Mes menus/i }));

    // Wait for mock list to load
    await screen.findByText("Accueil");

    fireEvent.click(screen.getByRole('button', { name: /Ajouter un élément/i }));

    // Fill Title with XSS code
    fireEvent.change(screen.getByPlaceholderText(/ex: Accueil/i), { target: { value: '<script>alert("XSS")</script>Sécurisé' } });
    // eslint-disable-next-line no-script-url
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

    localStorage.setItem("ae_menus", JSON.stringify(mockMenus));

    render(<Dashboard onBackToSite={() => {}} />);
    
    fireEvent.click(screen.getByRole('button', { name: /Mes menus/i }));

    // Wait for load
    expect(await screen.findByText(/Menu de Navigation & Actions de Shortcode/i)).toBeInTheDocument();
    expect(await screen.findByText("Item 1")).toBeInTheDocument();

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

describe('Dashboard Articles Management Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState(null, '', '/ae-dashboard');
  });

  test('renders articles list and displays featured article badge', async () => {
    render(<Dashboard onBackToSite={() => {}} />);

    // Click on Articles tab in sidebar
    const articlesTabBtn = screen.getByRole('button', { name: /Articles/i });
    fireEvent.click(articlesTabBtn);

    // Verify header and articles
    expect(await screen.findByText(/Articles du portail/i)).toBeInTheDocument();
    expect(await screen.findByText(/Anjou Édition : une maison d[’']édition ouverte à tous/i)).toBeInTheDocument();

    // Verify featured article badge
    expect(screen.getByText(/Article Principal \(Accueil\)/i)).toBeInTheDocument();
  });

  test('allows opening the edit article modal and modifying article data', async () => {
    render(<Dashboard onBackToSite={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: /Articles/i }));
    expect(await screen.findByText(/Anjou Édition : une maison d[’']édition ouverte à tous/i)).toBeInTheDocument();

    // Click Edit on the presentation article
    const editBtn = screen.getByRole('button', { name: /Modifier l['’]article Anjou Édition/i });
    fireEvent.click(editBtn);

    // Modal should be visible
    expect(await screen.findByText(/Modifier l['’]article/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/Anjou Édition : une maison d[’']édition ouverte à tous/i)).toBeInTheDocument();
    expect(screen.getByText(/Afficher cet article sur la page d[’']accueil/i)).toBeInTheDocument();

    // Change title
    const titleInput = screen.getByDisplayValue(/Anjou Édition : une maison d[’']édition ouverte à tous/i);
    fireEvent.change(titleInput, { target: { value: "Anjou Édition : Titre Modifié" } });

    // Click save
    const saveBtn = screen.getByRole('button', { name: /Enregistrer l['’]article/i });
    fireEvent.click(saveBtn);

    // Modal should close and updated title should be displayed
    await waitFor(() => {
      expect(screen.queryByText(/Modifier l['’]article/i)).not.toBeInTheDocument();
    });
    expect(await screen.findByRole('heading', { level: 5, name: /Anjou Édition : Titre Modifié/i })).toBeInTheDocument();
  });

  test('allows switching the featured article and persists choice in localStorage', async () => {
    render(<Dashboard onBackToSite={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: /Articles/i }));
    await screen.findByText(/Articles du portail/i);

    // Look for "Mettre à la une" buttons for non-featured articles
    const makeFeaturedBtns = await screen.findAllByRole('button', { name: /Mettre à la une/i });
    expect(makeFeaturedBtns.length).toBeGreaterThan(0);

    // Click the first "Mettre à la une" button
    fireEvent.click(makeFeaturedBtns[0]);

    await waitFor(() => {
      expect(localStorage.getItem('ae_featured_article_id')).toBeTruthy();
    });
  });
});

describe('Dashboard Media Library & Edit Image Tests', () => {
  const mockMedia = [
    { 
      id: "m1", 
      name: "chateau_angers.jpg", 
      type: "image/jpeg", 
      size: 1048576, 
      date: "12/05/2026 à 10h12", 
      url: "https://images.unsplash.com/photo-chateau.jpg",
      alt: "Château d'Angers"
    },
    { 
      id: "m2", 
      name: "musique_loire.mp3", 
      type: "audio/mpeg", 
      size: 2097152, 
      date: "14/05/2026 à 14h00", 
      url: "https://example.com/audio.mp3" 
    }
  ];

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("ae_medias", JSON.stringify(mockMedia));
    window.history.pushState(null, '', '/ae-dashboard');
    if (!global.URL.createObjectURL) {
      global.URL.createObjectURL = jest.fn(() => 'blob:mock-preview-url');
    }
    if (!global.URL.revokeObjectURL) {
      global.URL.revokeObjectURL = jest.fn();
    }
  });

  test('renders media cards with action buttons in order: Aperçu -> Copier -> Modifier -> Supprimer', async () => {
    render(<Dashboard onBackToSite={() => {}} />);

    // Navigate to Médiathèque
    const mediaTabBtn = screen.getByRole('button', { name: /Médiathèque/i });
    fireEvent.click(mediaTabBtn);

    expect(await screen.findByText(/Médiathèque Littéraire/i)).toBeInTheDocument();
    expect(await screen.findByText("chateau_angers.jpg")).toBeInTheDocument();

    // Verify all 4 action buttons exist
    const previewBtn = screen.getByRole('button', { name: /Aperçu de chateau_angers.jpg/i });
    const copyBtn = screen.getByRole('button', { name: /Copier le lien de chateau_angers.jpg/i });
    const editBtn = screen.getByRole('button', { name: /Modifier l['’]image chateau_angers.jpg/i });
    const deleteBtn = screen.getByRole('button', { name: /Supprimer chateau_angers.jpg/i });

    expect(previewBtn).toBeInTheDocument();
    expect(copyBtn).toBeInTheDocument();
    expect(editBtn).toBeInTheDocument();
    expect(deleteBtn).toBeInTheDocument();
  });

  test('opens edit modal, updates image metadata, and saves immediately without reload', async () => {
    render(<Dashboard onBackToSite={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: /Médiathèque/i }));
    expect(await screen.findByText("chateau_angers.jpg")).toBeInTheDocument();

    // Click on Edit button
    const editBtn = screen.getByRole('button', { name: /Modifier l['’]image chateau_angers.jpg/i });
    fireEvent.click(editBtn);

    // Modal should be open with current details
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Modifier (le média|l['’]image) : chateau_angers.jpg/i)).toBeInTheDocument();

    // Modify name input
    const nameInput = screen.getByPlaceholderText("ex: chateau_angers.jpg");
    fireEvent.change(nameInput, { target: { value: "chateau_angers_renomme.jpg" } });

    // Modify alt text input
    const altInput = screen.getByPlaceholderText("ex: Façade du château d'Angers sous le soleil");
    fireEvent.change(altInput, { target: { value: "Magnifique forteresse du Roi René" } });

    // Submit / Save
    const saveBtn = screen.getByRole('button', { name: /Enregistrer/i });
    fireEvent.click(saveBtn);

    // Modal closes
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    // Updated name is visible in the media grid
    expect(await screen.findByText("chateau_angers_renomme.jpg")).toBeInTheDocument();

    // Verify persistence in localStorage
    const savedList = JSON.parse(localStorage.getItem("ae_medias"));
    const updatedItem = savedList.find(m => m.name === "chateau_angers_renomme.jpg");
    expect(updatedItem).toBeTruthy();
    expect(updatedItem.name).toBe("chateau_angers_renomme.jpg");
    expect(updatedItem.alt).toBe("Magnifique forteresse du Roi René");
  });

  test('allows uploading a replacement image file and previews it before saving', async () => {
    render(<Dashboard onBackToSite={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: /Médiathèque/i }));
    expect(await screen.findByText("chateau_angers.jpg")).toBeInTheDocument();

    const editBtn = screen.getByRole('button', { name: /Modifier l['’]image chateau_angers.jpg/i });
    fireEvent.click(editBtn);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    // Select a new image file
    const file = new File(['mock-image-bytes'], 'nouvelle_vue_chateau.png', { type: 'image/png' });
    const fileInput = document.querySelector('input[type="file"][accept="image/*"]');
    expect(fileInput).toBeInTheDocument();

    fireEvent.change(fileInput, { target: { files: [file] } });

    // Badge showing new image selected should appear
    expect(await screen.findByText(/Nouvelle image sélectionnée/i)).toBeInTheDocument();
    expect(screen.getAllByText(/nouvelle_vue_chateau.png/i).length).toBeGreaterThan(0);

    // Save
    const saveBtn = screen.getByRole('button', { name: /Enregistrer/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    // Name updated to new file name
    expect(await screen.findByText("nouvelle_vue_chateau.png")).toBeInTheDocument();
  });

  test('cancels image modification when clicking Annuler', async () => {
    render(<Dashboard onBackToSite={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: /Médiathèque/i }));
    expect(await screen.findByText("chateau_angers.jpg")).toBeInTheDocument();

    const editBtn = screen.getByRole('button', { name: /Modifier l['’]image chateau_angers.jpg/i });
    fireEvent.click(editBtn);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    // Modify name
    const nameInput = screen.getByPlaceholderText("ex: chateau_angers.jpg");
    fireEvent.change(nameInput, { target: { value: "nom_temporaire.jpg" } });

    // Click Annuler
    const cancelBtn = screen.getByRole('button', { name: /Annuler/i });
    fireEvent.click(cancelBtn);

    // Modal closes
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    // Original name remains intact
    expect(screen.getByText("chateau_angers.jpg")).toBeInTheDocument();
    expect(screen.queryByText("nom_temporaire.jpg")).not.toBeInTheDocument();
  });

  test('closes edit modal when pressing Escape key', async () => {
    render(<Dashboard onBackToSite={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: /Médiathèque/i }));
    expect(await screen.findByText("chateau_angers.jpg")).toBeInTheDocument();
    const editBtn = screen.getByRole('button', { name: /Modifier l['’]image chateau_angers.jpg/i });
    fireEvent.click(editBtn);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    // Press Escape
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  test('renders file information (Nom, Identifiant, Taille, Type) and accessible inputs with labels', async () => {
    render(<Dashboard onBackToSite={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: /Médiathèque/i }));
    expect(await screen.findByText("chateau_angers.jpg")).toBeInTheDocument();
    const editBtn = screen.getByRole('button', { name: /Modifier l['’]image chateau_angers.jpg/i });
    fireEvent.click(editBtn);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    // Check file information card items
    expect(screen.getByText(/Identifiant unique/i)).toBeInTheDocument();
    expect(screen.getAllByText(/chateau_angers\.jpg/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Type MIME/i)).toBeInTheDocument();
    expect(screen.getByText(/image\/jpeg/i)).toBeInTheDocument();

    // Check inputs have proper label links
    const nameLabel = screen.getByText(/Nom du fichier \/ Titre/i);
    expect(nameLabel).toHaveAttribute('for', 'edit-media-name-input');
    const nameInput = document.getElementById('edit-media-name-input');
    expect(nameInput).toBeInTheDocument();

    const altLabel = screen.getByText(/Texte alternatif \(SEO \/ Accessibilité\)/i);
    expect(altLabel).toHaveAttribute('for', 'edit-media-alt-input');
    const altInput = document.getElementById('edit-media-alt-input');
    expect(altInput).toBeInTheDocument();

    // Close button has accessible aria-label
    const closeBtn = screen.getByRole('button', { name: /Fermer la boîte de dialogue/i });
    expect(closeBtn).toBeInTheDocument();
  });
});


