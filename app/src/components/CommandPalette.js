import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Search,
  FileText,
  BookOpen,
  Newspaper,
  MessageSquare,
  PlusCircle,
  FolderOpen,
  Menu,
  Users,
  Settings,
  ExternalLink,
  LogOut,
  ArrowRight,
  X,
  Compass
} from "lucide-react";

/**
 * CommandPalette — Palette de commandes et recherche universelle du Dashboard (Ctrl + K)
 * Permet un accès instantané au clavier à tous les écrits, flipbooks, pages,
 * messages, médiathèque et raccourcis d'administration.
 */
export default function CommandPalette({
  isOpen,
  onClose,
  onNavigateSection,
  onAction,
  articles = [],
  flipbooks = [],
  pages = [],
  messages = [],
  onBackToSite,
  onLogout
}) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Focus automatique du champ de recherche à l'ouverture
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 50);
    }
  }, [isOpen]);

  // Actions de base prédéfinies
  const baseActions = useMemo(() => [
    {
      id: "act-new-article",
      type: "action",
      category: "Actions rapides",
      title: "Rédiger un nouvel écrit / article",
      subtitle: "Ajouter une œuvre ou un texte au catalogue",
      icon: PlusCircle,
      iconColor: "text-blue-600",
      execute: () => onAction && onAction("new-article")
    },
    {
      id: "act-new-flipbook",
      type: "action",
      category: "Actions rapides",
      title: "Publier un nouveau Flipbook",
      subtitle: "Téléverser un livre numérique PDF interactif",
      icon: BookOpen,
      iconColor: "text-amber-600",
      execute: () => onAction && onAction("new-flipbook")
    },
    {
      id: "act-new-page",
      type: "action",
      category: "Actions rapides",
      title: "Créer une nouvelle page",
      subtitle: "Nouvelle entrée éditoriale",
      icon: FileText,
      iconColor: "text-green-600",
      execute: () => onAction && onAction("new-page")
    },
    {
      id: "act-messages",
      type: "action",
      category: "Navigation",
      title: "Boîte de réception (Messages)",
      subtitle: "Consulter les formulaires de contact reçus",
      icon: MessageSquare,
      iconColor: "text-purple-600",
      execute: () => onNavigateSection && onNavigateSection("Messages")
    },
    {
      id: "act-media",
      type: "action",
      category: "Navigation",
      title: "Médiathèque & Fichiers",
      subtitle: "Gérer les images, documents et assets",
      icon: FolderOpen,
      iconColor: "text-cyan-600",
      execute: () => onNavigateSection && onNavigateSection("Médiathèque")
    },
    {
      id: "act-menus",
      type: "action",
      category: "Navigation",
      title: "Menus de navigation",
      subtitle: "Gérer l'arborescence et les catégories du site",
      icon: Menu,
      iconColor: "text-indigo-600",
      execute: () => onNavigateSection && onNavigateSection("Mes menus")
    },
    {
      id: "act-accounts",
      type: "action",
      category: "Navigation",
      title: "Comptes & Écrivains",
      subtitle: "Gestion des utilisateurs administratifs et auteurs",
      icon: Users,
      iconColor: "text-pink-600",
      execute: () => onNavigateSection && onNavigateSection("Mes Comptes")
    },
    {
      id: "act-settings",
      type: "action",
      category: "Navigation",
      title: "Paramètres système",
      subtitle: "Configuration générale, API et intégrations",
      icon: Settings,
      iconColor: "text-slate-600",
      execute: () => onNavigateSection && onNavigateSection("Paramètres")
    },
    {
      id: "act-site",
      type: "action",
      category: "Accès",
      title: "Voir le site public",
      subtitle: "Consulter Anjou Édition en mode lecteur",
      icon: ExternalLink,
      iconColor: "text-blue-500",
      execute: () => onBackToSite && onBackToSite()
    },
    {
      id: "act-logout",
      type: "action",
      category: "Sécurité",
      title: "Déconnexion de l'administration",
      subtitle: "Fermer la session en toute sécurité",
      icon: LogOut,
      iconColor: "text-red-500",
      execute: () => onLogout && onLogout()
    }
  ], [onAction, onNavigateSection, onBackToSite, onLogout]);

  // Filtrage et regroupement dynamique selon la recherche de l'utilisateur
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();

    // 1. Actions filtrées
    const matchedActions = baseActions.filter(a => 
      !q || a.title.toLowerCase().includes(q) || a.subtitle.toLowerCase().includes(q)
    );

    // 2. Articles & Écrits filtrés
    const matchedArticles = articles
      .filter(art => !q || (art.title && art.title.toLowerCase().includes(q)) || (art.category && art.category.toLowerCase().includes(q)))
      .slice(0, 6)
      .map(art => ({
        id: `article-${art.id}`,
        type: "article",
        category: "Écrits & Articles",
        title: art.title,
        subtitle: `Catégorie: ${art.category || 'Général'} • Statut: ${art.status || 'Publié'}`,
        icon: Newspaper,
        iconColor: "text-blue-600",
        execute: () => {
          if (onAction) onAction("open-article", art);
          else if (onNavigateSection) onNavigateSection("Article");
        }
      }));

    // 3. Flipbooks filtrés
    const matchedFlipbooks = flipbooks
      .filter(fb => !q || (fb.title && fb.title.toLowerCase().includes(q)) || (fb.category && fb.category.toLowerCase().includes(q)))
      .slice(0, 5)
      .map(fb => ({
        id: `fb-${fb.id}`,
        type: "flipbook",
        category: "Flipbooks interactifs",
        title: fb.title,
        subtitle: `Catégorie: ${fb.category || 'Édition'} • Fichier: ${fb.pdfUrl ? 'PDF rattaché' : 'Non défini'}`,
        icon: BookOpen,
        iconColor: "text-amber-600",
        execute: () => {
          if (onNavigateSection) onNavigateSection("Mes Flipbooks");
        }
      }));

    // 4. Pages filtrées
    const matchedPages = pages
      .filter(p => !q || (p.title && p.title.toLowerCase().includes(q)) || (p.slug && p.slug.toLowerCase().includes(q)))
      .slice(0, 5)
      .map(p => ({
        id: `page-${p.id}`,
        type: "page",
        category: "Pages",
        title: p.title,
        subtitle: `Slug: /${p.slug || ''} • Statut: ${p.status || 'Brouillon'}`,
        icon: FileText,
        iconColor: "text-green-600",
        execute: () => {
          if (onNavigateSection) onNavigateSection("Page");
        }
      }));

    // 5. Messages filtrés
    const matchedMessages = messages
      .filter(m => !q || (m.name && m.name.toLowerCase().includes(q)) || (m.subject && m.subject.toLowerCase().includes(q)))
      .slice(0, 4)
      .map(m => ({
        id: `msg-${m.id}`,
        type: "message",
        category: "Messages de contact",
        title: `${m.name} : ${m.subject}`,
        subtitle: m.date || 'Récemment reçu',
        icon: MessageSquare,
        iconColor: "text-purple-600",
        execute: () => {
          if (onNavigateSection) onNavigateSection("Messages");
        }
      }));

    // Si recherche vide, afficher les actions clés en priorité
    if (!q) {
      return baseActions;
    }

    return [
      ...matchedActions,
      ...matchedArticles,
      ...matchedFlipbooks,
      ...matchedPages,
      ...matchedMessages
    ];
  }, [query, baseActions, articles, flipbooks, pages, messages, onAction, onNavigateSection]);

  // Ajustement de l'index sélectionné lors du changement de liste
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems.length, query]);

  // Gestion de la navigation clavier (Flèches, Entrée, Échap)
  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1 < filteredItems.length ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 >= 0 ? prev - 1 : filteredItems.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const current = filteredItems[selectedIndex];
      if (current && current.execute) {
        current.execute();
        onClose();
      }
    }
  };

  // Scroll de l'élément sélectionné dans la vue
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (activeEl && typeof activeEl.scrollIntoView === 'function') {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      className="ae-cmd-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Palette de commandes et recherche universelle"
    >
      <div
        className="ae-cmd-modal"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* En-tête de recherche */}
        <div className="ae-cmd-header">
          <Search className="ae-cmd-search-icon" size={20} aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            className="ae-cmd-input"
            placeholder="Rechercher un écrit, flipbook, page, message ou action..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-autocomplete="list"
            aria-controls="ae-cmd-list"
          />
          {query ? (
            <button
              type="button"
              className="ae-cmd-clear-btn"
              onClick={() => setQuery("")}
              title="Effacer la recherche"
              aria-label="Effacer la recherche"
            >
              <X size={16} />
            </button>
          ) : (
            <span className="ae-cmd-badge-esc" title="Appuyez sur Échap pour fermer">Échap</span>
          )}
        </div>

        {/* Liste des résultats */}
        <div
          ref={listRef}
          id="ae-cmd-list"
          className="ae-cmd-list"
          role="listbox"
        >
          {filteredItems.length === 0 ? (
            <div className="ae-cmd-empty">
              <Compass size={32} className="ae-cmd-empty-icon" />
              <p className="ae-cmd-empty-text">Aucun résultat trouvé pour « {query} »</p>
              <span className="ae-cmd-empty-sub">Essayez un autre mot-clé ou tapez le nom d'un écrit ou d'une page.</span>
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const IconComponent = item.icon || FileText;
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  data-index={index}
                  role="option"
                  aria-selected={isSelected}
                  className={`ae-cmd-item ${isSelected ? "ae-cmd-item--selected" : ""}`}
                  onClick={() => {
                    if (item.execute) item.execute();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className={`ae-cmd-item-icon-wrapper ${item.iconColor || ''}`}>
                    <IconComponent size={18} aria-hidden="true" />
                  </div>
                  <div className="ae-cmd-item-content">
                    <div className="ae-cmd-item-top">
                      <span className="ae-cmd-item-title">{item.title}</span>
                      <span className="ae-cmd-item-category">{item.category}</span>
                    </div>
                    {item.subtitle && (
                      <span className="ae-cmd-item-desc">{item.subtitle}</span>
                    )}
                  </div>
                  <ArrowRight size={14} className="ae-cmd-item-arrow" aria-hidden="true" />
                </div>
              );
            })
          )}
        </div>

        {/* Pied de la palette de commandes */}
        <div className="ae-cmd-footer">
          <div className="ae-cmd-footer-hints">
            <span className="ae-cmd-hint"><kbd>↑</kbd><kbd>↓</kbd> Naviguer</span>
            <span className="ae-cmd-hint"><kbd>↵</kbd> Sélectionner</span>
            <span className="ae-cmd-hint"><kbd>Échap</kbd> Fermer</span>
          </div>
          <span className="ae-cmd-footer-brand">Anjou Édition</span>
        </div>
      </div>
    </div>
  );
}
