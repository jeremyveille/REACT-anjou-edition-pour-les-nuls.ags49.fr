import React, { useState, useMemo, useCallback } from "react";
import { 
  Plus, 
  Search, 
  X, 
  Layers, 
  ChevronRight, 
  Home
} from "lucide-react";
import MenuColumn from "./MenuColumn";
import MenuItemEditor from "./MenuItemEditor";
import DeleteMenuModal from "./DeleteMenuModal";
import MoveItemModal from "./MoveItemModal";
import { sanitizeInput, sanitizeUrl } from "../../utils/sanitize";

export default function MenuManager({
  menusList = [],
  onSaveAllMenus,
  pagesList = [],
  textsData = {},
  flipbooks = [],
  normalizeParentId,
  reindexMenuOrders,
  getDescendantIds,
  getFlattenedMenuTree,
  menuAriaAnnouncement,
  setMenuAriaAnnouncement,
  setNotification
}) {
  // Navigation & sélection d'états
  const [selectedLevel1Id, setSelectedLevel1Id] = useState(null);
  const [selectedLevel2Id, setSelectedLevel2Id] = useState(null);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newParentPreset, setNewParentPreset] = useState(null);

  // Recherche globale
  const [searchQuery, setSearchQuery] = useState("");

  // Modales
  const [deleteModalState, setDeleteModalState] = useState({ open: false, item: null });
  const [moveModalState, setMoveModalState] = useState({ open: false, item: null });

  // Whitelist des shortcodes autorisés (conforme à Dashboard.js)
  const ALLOWED_SHORTCODE_TAGS = useMemo(() => [
    "open_contact_modal",
    "toggle_theme",
    "play_speech",
    "increase_font",
    "show_flipbooks",
    "show_videos",
    "show_gallery",
    "alert_hello"
  ], []);

  const validateShortcode = (shortcode) => {
    if (!shortcode) return true;
    let clean = shortcode.trim();
    if (textsData[clean]) return true;

    let unbracketed = clean;
    if (clean.startsWith("[") && clean.endsWith("]")) {
      unbracketed = clean.slice(1, -1).trim();
    }
    if (textsData[unbracketed]) return true;

    if (clean.includes("PdfFlipbookReader") || clean.startsWith("<") || (clean.startsWith("[") && clean.endsWith("]"))) {
      return true;
    }

    const tagName = unbracketed.split(/\s+/)[0].toLowerCase();
    return ALLOWED_SHORTCODE_TAGS.includes(tagName);
  };

  // Objets sélectionnés
  const selectedLevel1 = useMemo(() => {
    return menusList.find(m => m.id === selectedLevel1Id) || null;
  }, [menusList, selectedLevel1Id]);

  const selectedLevel2 = useMemo(() => {
    return menusList.find(m => m.id === selectedLevel2Id) || null;
  }, [menusList, selectedLevel2Id]);

  const selectedItem = useMemo(() => {
    return menusList.find(m => m.id === selectedItemId) || null;
  }, [menusList, selectedItemId]);

  // Liste des éléments du Niveau 1
  const level1Items = useMemo(() => {
    return menusList
      .filter(m => normalizeParentId(m.parentId) === null)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [menusList, normalizeParentId]);

  // Liste des sous-éléments du Niveau 2
  const level2Items = useMemo(() => {
    if (!selectedLevel1Id) return [];
    return menusList
      .filter(m => normalizeParentId(m.parentId) === selectedLevel1Id)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [menusList, selectedLevel1Id, normalizeParentId]);

  // Liste des sous-éléments du Niveau 3
  const level3Items = useMemo(() => {
    if (!selectedLevel2Id) return [];
    return menusList
      .filter(m => normalizeParentId(m.parentId) === selectedLevel2Id)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [menusList, selectedLevel2Id, normalizeParentId]);

  // Calcul du chemin hiérarchique d'un élément
  const getItemPath = useCallback((itemId) => {
    const path = [];
    let curr = menusList.find(m => m.id === itemId);
    while (curr) {
      path.unshift(curr);
      const pId = normalizeParentId(curr.parentId);
      curr = pId ? menusList.find(m => m.id === pId) : null;
    }
    return path;
  }, [menusList, normalizeParentId]);

  // Résultats de la recherche globale
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return menusList.filter(item => {
      const titleMatch = (item.title || "").toLowerCase().includes(q);
      const urlMatch = (item.url || item.slug || "").toLowerCase().includes(q);
      const scMatch = (item.shortcode || "").toLowerCase().includes(q);
      const descMatch = (item.description || "").toLowerCase().includes(q);
      return titleMatch || urlMatch || scMatch || descMatch;
    }).map(item => ({
      item,
      path: getItemPath(item.id)
    }));
  }, [searchQuery, menusList, getItemPath]);

  // Actions de sélection
  const handleSelectLevel1 = (item) => {
    setSelectedLevel1Id(item.id);
    setSelectedLevel2Id(null);
    setSelectedItemId(item.id);
    setIsCreatingNew(false);
  };

  const handleSelectLevel2 = (item) => {
    setSelectedLevel2Id(item.id);
    setSelectedItemId(item.id);
    setIsCreatingNew(false);
  };

  const handleSelectLevel3 = (item) => {
    setSelectedItemId(item.id);
    setIsCreatingNew(false);
  };

  // Clic sur un résultat de recherche
  const handleSelectSearchResult = (targetItem) => {
    const path = getItemPath(targetItem.id);
    if (path.length > 0) {
      setSelectedLevel1Id(path[0].id);
      if (path.length > 1) {
        setSelectedLevel2Id(path[1].id);
      } else {
        setSelectedLevel2Id(null);
      }
    }
    setSelectedItemId(targetItem.id);
    setIsCreatingNew(false);
    setSearchQuery("");
  };

  // Début de création
  const handleStartCreate = (parentId = null) => {
    setIsCreatingNew(true);
    setNewParentPreset(parentId);
    setSelectedItemId(null);
  };

  // Enregistrement d'un élément (Ajout ou Modification)
  const handleSaveItem = async (formData) => {
    const sanitizedTitle = sanitizeInput(formData.title);
    if (!sanitizedTitle) {
      alert("L'intitulé est obligatoire.");
      return;
    }

    let sanitizedShortcode = "";
    if (formData.type === "shortcode" || formData.shortcode) {
      let rawSc = (formData.shortcode || "").trim();
      const isShortcodeValid = validateShortcode(rawSc);
      if (!isShortcodeValid) {
        alert("Erreur de validation : Le shortcode saisi n'est pas autorisé.");
        return;
      }

      if (rawSc.includes("PdfFlipbookReader")) {
        const idMatch = rawSc.match(/id\s*(?:===|==|=)\s*["']?(\d+)["']?/);
        if (idMatch && idMatch[1]) {
          sanitizedShortcode = idMatch[1];
        } else {
          const genericIdMatch = rawSc.match(/\b\d{4,}\b/);
          sanitizedShortcode = genericIdMatch ? genericIdMatch[0] : rawSc;
        }
      } else {
        if (rawSc.startsWith('[') && rawSc.endsWith(']')) {
          rawSc = rawSc.slice(1, -1).trim();
        }
        sanitizedShortcode = sanitizeInput(rawSc);
      }
    }

    const sanitizedUrl = formData.type === "shortcode" ? "" : sanitizeUrl(formData.url);
    const parentId = formData.parentId || null;
    const now = new Date();
    const isActive = formData.status === "Actif";

    let updatedList = [];

    if (formData.id) {
      // Modification
      const originalItem = menusList.find(m => m.id === formData.id);
      updatedList = menusList.map(m => {
        if (m.id === formData.id) {
          return {
            ...m,
            title: sanitizedTitle,
            label: sanitizedTitle,
            icon: formData.icon || "Layers",
            url: sanitizedUrl,
            slug: sanitizedUrl,
            shortcode: sanitizedShortcode || "",
            status: formData.status,
            enabled: isActive,
            isActive: isActive,
            type: formData.type,
            parentId: parentId,
            description: sanitizeInput(formData.description),
            updatedAt: now,
            createdAt: originalItem?.createdAt || now
          };
        }
        return m;
      });
      if (setNotification) {
        setNotification(`Élément "${sanitizedTitle}" modifié avec succès.`);
      }
    } else {
      // Ajout
      const siblings = menusList.filter(m => normalizeParentId(m.parentId) === normalizeParentId(parentId));
      const maxOrder = siblings.reduce((max, item) => Math.max(max, item.order || 0), 0);

      const newItem = {
        id: "m" + Date.now(),
        title: sanitizedTitle,
        label: sanitizedTitle,
        icon: formData.icon || "Layers",
        url: sanitizedUrl,
        slug: sanitizedUrl,
        shortcode: sanitizedShortcode || "",
        status: formData.status,
        enabled: isActive,
        isActive: isActive,
        type: formData.type,
        parentId: parentId,
        order: maxOrder + 1,
        description: sanitizeInput(formData.description),
        createdAt: now,
        updatedAt: now
      };

      updatedList = [...menusList, newItem];
      if (setNotification) {
        setNotification(`Élément "${newItem.title}" créé.`);
      }
    }

    const reindexed = reindexMenuOrders(updatedList);
    await onSaveAllMenus(reindexed);

    setIsCreatingNew(false);
    setSelectedItemId(null);
  };

  // Réordonnancement vers le haut
  const handleMoveUp = async (id) => {
    const item = menusList.find(m => m.id === id);
    if (!item) return;

    const parentId = normalizeParentId(item.parentId);
    const siblings = menusList
      .filter(m => normalizeParentId(m.parentId) === parentId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    const idx = siblings.findIndex(m => m.id === id);
    if (idx <= 0) return;

    const prevItem = siblings[idx - 1];
    const prevOrder = prevItem.order;
    const currentOrder = item.order;

    const updated = menusList.map(m => {
      if (m.id === item.id) return { ...m, order: prevOrder };
      if (m.id === prevItem.id) return { ...m, order: currentOrder };
      return m;
    });

    const reindexed = reindexMenuOrders(updated);
    await onSaveAllMenus(reindexed);
    if (setMenuAriaAnnouncement) {
      setMenuAriaAnnouncement(`L'élément ${item.title} a été déplacé vers le haut.`);
    }
  };

  // Réordonnancement vers le bas
  const handleMoveDown = async (id) => {
    const item = menusList.find(m => m.id === id);
    if (!item) return;

    const parentId = normalizeParentId(item.parentId);
    const siblings = menusList
      .filter(m => normalizeParentId(m.parentId) === parentId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    const idx = siblings.findIndex(m => m.id === id);
    if (idx < 0 || idx >= siblings.length - 1) return;

    const nextItem = siblings[idx + 1];
    const nextOrder = nextItem.order;
    const currentOrder = item.order;

    const updated = menusList.map(m => {
      if (m.id === item.id) return { ...m, order: nextOrder };
      if (m.id === nextItem.id) return { ...m, order: currentOrder };
      return m;
    });

    const reindexed = reindexMenuOrders(updated);
    await onSaveAllMenus(reindexed);
    if (setMenuAriaAnnouncement) {
      setMenuAriaAnnouncement(`L'élément ${item.title} a été déplacé vers le bas.`);
    }
  };

  // Transformer en sous-élément du frère précédent
  const handleMakeSubItem = async (id) => {
    const item = menusList.find(m => m.id === id);
    if (!item) return;

    const parentId = normalizeParentId(item.parentId);
    const siblings = menusList
      .filter(m => normalizeParentId(m.parentId) === parentId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    const idx = siblings.findIndex(m => m.id === id);
    if (idx <= 0) {
      if (setNotification) {
        setNotification("Impossible de créer un sous-menu : pas d'élément précédent à ce niveau.");
      }
      return;
    }

    const newParent = siblings[idx - 1];
    const existingChildren = menusList.filter(m => normalizeParentId(m.parentId) === newParent.id);

    const updated = menusList.map(m => {
      if (m.id === id) {
        return {
          ...m,
          parentId: newParent.id,
          order: existingChildren.length + 1
        };
      }
      return m;
    });

    const reindexed = reindexMenuOrders(updated);
    await onSaveAllMenus(reindexed);

    // Ajuster la vue si nécessaire
    setSelectedLevel1Id(newParent.id);
    if (setMenuAriaAnnouncement) {
      setMenuAriaAnnouncement(`L'élément ${item.title} est devenu un sous-menu de ${newParent.title}.`);
    }
  };

  // Drag-and-drop intra-colonne (réordonnancement entre frères)
  const handleDropReorder = async (draggedId, targetId) => {
    if (draggedId === targetId) return;

    const draggedItem = menusList.find(m => m.id === draggedId);
    const targetItem = menusList.find(m => m.id === targetId);
    if (!draggedItem || !targetItem) return;

    // Ne réordonner que si les éléments partagent le même parent
    const draggedParent = normalizeParentId(draggedItem.parentId);
    const targetParent = normalizeParentId(targetItem.parentId);
    if (draggedParent !== targetParent) return;

    const siblings = menusList
      .filter(m => normalizeParentId(m.parentId) === draggedParent)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    const oldIdx = siblings.findIndex(m => m.id === draggedId);
    const newIdx = siblings.findIndex(m => m.id === targetId);
    if (oldIdx === -1 || newIdx === -1) return;

    const reorderedSiblings = [...siblings];
    const [moved] = reorderedSiblings.splice(oldIdx, 1);
    reorderedSiblings.splice(newIdx, 0, moved);

    const updated = menusList.map(m => {
      const idxInSiblings = reorderedSiblings.findIndex(s => s.id === m.id);
      if (idxInSiblings !== -1) {
        return { ...m, order: idxInSiblings + 1 };
      }
      return m;
    });

    const reindexed = reindexMenuOrders(updated);
    await onSaveAllMenus(reindexed);
    if (setNotification) {
      setNotification(`Ordre mis à jour.`);
    }
  };

  // Déplacement via la modale "Déplacer vers..."
  const handleConfirmMove = async (itemId, targetParentId) => {
    const item = menusList.find(m => m.id === itemId);
    if (!item) return;

    const normalizedTargetParent = normalizeParentId(targetParentId);
    const targetSiblings = menusList.filter(
      m => normalizeParentId(m.parentId) === normalizedTargetParent && m.id !== itemId
    );

    const updated = menusList.map(m => {
      if (m.id === itemId) {
        return {
          ...m,
          parentId: normalizedTargetParent,
          order: targetSiblings.length + 1
        };
      }
      return m;
    });

    const reindexed = reindexMenuOrders(updated);
    await onSaveAllMenus(reindexed);
    setMoveModalState({ open: false, item: null });

    if (setNotification) {
      setNotification(`Élément "${item.title}" déplacé.`);
    }
  };

  // Duplication d'un élément
  const handleDuplicate = async (item) => {
    const parentId = normalizeParentId(item.parentId);
    const siblings = menusList.filter(m => normalizeParentId(m.parentId) === parentId);
    const maxOrder = siblings.reduce((max, s) => Math.max(max, s.order || 0), 0);

    const duplicateItem = {
      ...item,
      id: "m" + Date.now(),
      title: `${item.title} (Copie)`,
      label: `${item.label || item.title} (Copie)`,
      url: item.url ? `${item.url}-copie` : "",
      slug: item.slug ? `${item.slug}-copie` : "",
      order: maxOrder + 1,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const updated = [...menusList, duplicateItem];
    const reindexed = reindexMenuOrders(updated);
    await onSaveAllMenus(reindexed);

    if (setNotification) {
      setNotification(`Élément "${duplicateItem.title}" créé.`);
    }
  };

  // Suppression d'un élément
  const handleConfirmDelete = async (itemId, keepChildren) => {
    const itemToDelete = menusList.find(m => m.id === itemId);
    if (!itemToDelete) return;

    let updatedList = [];

    if (keepChildren) {
      // Les enfants sont remontés au parent de l'élément supprimé
      const newParentId = normalizeParentId(itemToDelete.parentId);
      updatedList = menusList
        .filter(m => m.id !== itemId)
        .map(m => {
          if (normalizeParentId(m.parentId) === itemId) {
            return { ...m, parentId: newParentId };
          }
          return m;
        });
    } else {
      // Suppression de l'élément et de tous ses descendants
      const descendantIds = getDescendantIds ? getDescendantIds(itemId, menusList) : [];
      const idsToRemove = [itemId, ...descendantIds];
      updatedList = menusList.filter(m => !idsToRemove.includes(m.id));
    }

    const reindexed = reindexMenuOrders(updatedList);
    await onSaveAllMenus(reindexed);

    setDeleteModalState({ open: false, item: null });
    if (selectedItemId === itemId) setSelectedItemId(null);
    if (selectedLevel1Id === itemId) setSelectedLevel1Id(null);
    if (selectedLevel2Id === itemId) setSelectedLevel2Id(null);

    if (setNotification) {
      setNotification(`Élément "${itemToDelete.title}" supprimé.`);
    }
  };

  // Construction du fil d'Ariane
  const breadcrumbItems = useMemo(() => {
    const crumbs = [];
    if (selectedLevel1) {
      crumbs.push({ id: selectedLevel1.id, title: selectedLevel1.title, level: 1 });
    }
    if (selectedLevel2) {
      crumbs.push({ id: selectedLevel2.id, title: selectedLevel2.title, level: 2 });
    }
    if (selectedItem && selectedItem.id !== selectedLevel1Id && selectedItem.id !== selectedLevel2Id) {
      crumbs.push({ id: selectedItem.id, title: selectedItem.title, level: 3 });
    }
    return crumbs;
  }, [selectedLevel1, selectedLevel2, selectedItem, selectedLevel1Id, selectedLevel2Id]);

  return (
    <div className="menu-manager-container">
      {/* 1. Barre d'outils supérieure avec Titre conforme et Actions */}
      <div className="menu-manager-header-bar">
        <div>
          <h4 className="ae-card-title-lg">
            Menu de Navigation & Actions de Shortcode
          </h4>
          <p className="ae-text-sm-muted">
            Gérez et réordonnez la structure du menu de votre site. Glissez-déposez les éléments pour les réorganiser ou les imbriquer.
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleStartCreate(null)}
          className="ae-button ae-button--primary"
          aria-label="Ajouter un élément"
        >
          <Plus size={16} /> Ajouter un élément
        </button>
      </div>

      {/* Screen reader aria-live region */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {menuAriaAnnouncement}
      </div>

      {/* 2. Barre de Recherche globale */}
      <div className="menu-manager-search-box">
        <div style={{ position: 'relative', width: '100%', maxWidth: '460px' }}>
          <Search size={16} className="menu-search-icon" />
          <input
            type="text"
            placeholder="Rechercher un élément ou shortcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="menu-search-input"
            aria-label="Rechercher un élément de menu"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              aria-label="Effacer la recherche"
            >
              <X size={14} />
            </button>
          )}

          {/* Menu déroulant des résultats de recherche */}
          {searchQuery.trim().length > 0 && (
            <div className="menu-search-dropdown" role="listbox">
              {searchResults.length > 0 ? (
                searchResults.map(({ item, path }) => (
                  <div
                    key={item.id}
                    className="menu-search-result-item"
                    role="option"
                    aria-selected={selectedItemId === item.id}
                    tabIndex={0}
                    onClick={() => handleSelectSearchResult(item)}
                    onKeyDown={(e) => e.key === "Enter" && handleSelectSearchResult(item)}
                  >
                    <div className="menu-search-result-title">
                      <span>{item.title}</span>
                      <span className="menu-search-result-type">
                        {item.type === "shortcode" ? "Shortcode" : item.type === "external" ? "Lien externe" : "Lien interne"}
                      </span>
                    </div>
                    <div className="menu-search-result-path">
                      <span>Racine</span>
                      {path.map((p, idx) => (
                        <React.Fragment key={p.id || idx}>
                          <ChevronRight size={12} style={{ display: 'inline', margin: '0 2px' }} />
                          <span>{p.title}</span>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '12px', fontSize: '0.8125rem', color: '#94a3b8', textAlign: 'center', fontStyle: 'italic' }}>
                  Aucun élément ne correspond à « {searchQuery} »
                </div>
              )}
            </div>
          )}
        </div>

        <div className="ae-caption-with-icon" style={{ fontSize: '0.8125rem', color: '#64748b' }}>
          <span className="ae-indicator-pulse-blue" />
          <span>Sélectionnez une catégorie pour afficher ses sous-niveaux. Glissez pour réordonner.</span>
        </div>
      </div>

      {/* 3. Fil d'Ariane cliquable */}
      <nav className="menu-breadcrumb-bar" aria-label="Fil d'ariane du menu">
        <button
          type="button"
          onClick={() => {
            setSelectedLevel1Id(null);
            setSelectedLevel2Id(null);
            setSelectedItemId(null);
            setIsCreatingNew(false);
          }}
          className={`menu-breadcrumb-crumb ${!selectedLevel1Id ? "active" : ""}`}
        >
          <Home size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-2px' }} />
          Menu du site
        </button>

        {breadcrumbItems.map((crumb, idx) => (
          <React.Fragment key={crumb.id}>
            <span className="menu-breadcrumb-separator">/</span>
            <button
              type="button"
              onClick={() => {
                if (crumb.level === 1) {
                  setSelectedLevel1Id(crumb.id);
                  setSelectedLevel2Id(null);
                  setSelectedItemId(crumb.id);
                } else if (crumb.level === 2) {
                  setSelectedLevel2Id(crumb.id);
                  setSelectedItemId(crumb.id);
                } else {
                  setSelectedItemId(crumb.id);
                }
                setIsCreatingNew(false);
              }}
              className={`menu-breadcrumb-crumb ${idx === breadcrumbItems.length - 1 ? "active" : ""}`}
            >
              {crumb.title}
            </button>
          </React.Fragment>
        ))}
      </nav>

      {/* 4. Grille de navigation en colonnes */}
      <div className="menu-columns-workspace">
        {/* Colonne 1 : Catégories principales */}
        <MenuColumn
          title="Catégories principales"
          count={level1Items.length}
          items={level1Items}
          selectedItem={selectedLevel1}
          allMenus={menusList}
          onSelectItem={handleSelectLevel1}
          onMoveUp={handleMoveUp}
          onMoveDown={handleMoveDown}
          onMakeSubItem={handleMakeSubItem}
          onReorderItems={handleDropReorder}
          onEdit={(item) => {
            setSelectedItemId(item.id);
            setIsCreatingNew(false);
          }}
          onMoveTo={(item) => setMoveModalState({ open: true, item })}
          onDuplicate={handleDuplicate}
          onDelete={(item) => setDeleteModalState({ open: true, item })}
          onAddItem={() => handleStartCreate(null)}
          addBtnLabel="+ Ajouter une catégorie"
          emptyMessage="Aucune catégorie principale créée."
        />

        {/* Colonne 2 : Sous-catégories */}
        <MenuColumn
          title={selectedLevel1 ? `Sous-catégories : ${selectedLevel1.title}` : "Sous-catégories"}
          count={level2Items.length}
          items={level2Items}
          selectedItem={selectedLevel2 || (selectedItem && normalizeParentId(selectedItem.parentId) === selectedLevel1Id ? selectedItem : null)}
          allMenus={menusList}
          onSelectItem={handleSelectLevel2}
          onMoveUp={handleMoveUp}
          onMoveDown={handleMoveDown}
          onMakeSubItem={handleMakeSubItem}
          onReorderItems={handleDropReorder}
          onEdit={(item) => {
            setSelectedItemId(item.id);
            setIsCreatingNew(false);
          }}
          onMoveTo={(item) => setMoveModalState({ open: true, item })}
          onDuplicate={handleDuplicate}
          onDelete={(item) => setDeleteModalState({ open: true, item })}
          onAddItem={selectedLevel1Id ? () => handleStartCreate(selectedLevel1Id) : null}
          addBtnLabel="+ Ajouter une sous-catégorie"
          emptyMessage={
            selectedLevel1 
              ? "Aucune sous-catégorie dans cet élément." 
              : "Sélectionnez une catégorie principale à gauche."
          }
        />

        {/* Colonne 3 optionnelle : Niveaux supplémentaires */}
        {selectedLevel2 && level3Items.length > 0 && (
          <MenuColumn
            title={`Niveau 3 : ${selectedLevel2.title}`}
            count={level3Items.length}
            items={level3Items}
            selectedItem={selectedItem && normalizeParentId(selectedItem.parentId) === selectedLevel2Id ? selectedItem : null}
            allMenus={menusList}
            onSelectItem={handleSelectLevel3}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
            onMakeSubItem={handleMakeSubItem}
            onReorderItems={handleDropReorder}
            onEdit={(item) => {
              setSelectedItemId(item.id);
              setIsCreatingNew(false);
            }}
            onMoveTo={(item) => setMoveModalState({ open: true, item })}
            onDuplicate={handleDuplicate}
            onDelete={(item) => setDeleteModalState({ open: true, item })}
            onAddItem={selectedLevel2Id ? () => handleStartCreate(selectedLevel2Id) : null}
            addBtnLabel="+ Ajouter un sous-élément"
            emptyMessage="Aucun sous-élément dans ce niveau."
          />
        )}

        {/* Colonne Droite : Panneau d'Édition Dédié */}
        <div className="menu-editor-column-wrapper">
          {isCreatingNew ? (
            <MenuItemEditor
              isNew={true}
              presetParentId={newParentPreset}
              allMenus={menusList}
              pagesList={pagesList}
              textsData={textsData}
              flipbooks={flipbooks}
              onSave={handleSaveItem}
              onCancel={() => {
                setIsCreatingNew(false);
              }}
              normalizeParentId={normalizeParentId}
              getFlattenedMenuTree={getFlattenedMenuTree}
              getDescendantIds={getDescendantIds}
            />
          ) : selectedItem ? (
            <MenuItemEditor
              item={selectedItem}
              isNew={false}
              allMenus={menusList}
              pagesList={pagesList}
              textsData={textsData}
              flipbooks={flipbooks}
              onSave={handleSaveItem}
              onCancel={() => setSelectedItemId(null)}
              onMoveTo={(item) => setMoveModalState({ open: true, item })}
              onDuplicate={handleDuplicate}
              onDelete={(item) => setDeleteModalState({ open: true, item })}
              normalizeParentId={normalizeParentId}
              getFlattenedMenuTree={getFlattenedMenuTree}
              getDescendantIds={getDescendantIds}
            />
          ) : (
            <div className="menu-editor-placeholder">
              <Layers size={40} color="#94a3b8" />
              <p className="menu-editor-placeholder-title">Sélectionnez un élément</p>
              <p className="menu-editor-placeholder-desc">
                Cliquez sur une catégorie ou une sous-catégorie pour afficher et modifier ses propriétés, ou créez un nouvel élément.
              </p>
              <button
                type="button"
                onClick={() => handleStartCreate(selectedLevel1Id || null)}
                className="ae-button ae-button--primary"
                style={{ marginTop: '8px' }}
                aria-label="Nouveau menu"
              >
                <Plus size={16} /> Nouveau menu
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modale de déplacement d'élément */}
      <MoveItemModal
        isOpen={moveModalState.open}
        item={moveModalState.item}
        allMenus={menusList}
        onConfirm={handleConfirmMove}
        onCancel={() => setMoveModalState({ open: false, item: null })}
        normalizeParentId={normalizeParentId}
        getDescendantIds={getDescendantIds}
        getFlattenedMenuTree={getFlattenedMenuTree}
      />

      {/* Modale de suppression sécurisée */}
      <DeleteMenuModal
        isOpen={deleteModalState.open}
        item={deleteModalState.item}
        childCount={
          deleteModalState.item 
            ? menusList.filter(m => normalizeParentId(m.parentId) === deleteModalState.item.id).length 
            : 0
        }
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModalState({ open: false, item: null })}
      />
    </div>
  );
}
