import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, 
  Plus, 
  Search, 
  X, 
  BookOpen, 
  Edit3, 
  Copy, 
  Trash2, 
  FileText, 
  Check, 
  Filter, 
  ArrowUpDown 
} from 'lucide-react';

/**
 * Utilitaires pour le tri et le formatage sécurisé des dates
 */
function parseDateForSort(dateStr) {
  if (!dateStr) return 0;
  if (typeof dateStr === 'number') return dateStr;
  const dmyMatch = String(dateStr).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    const timeMatch = String(dateStr).match(/(\d{1,2})h(\d{1,2})/);
    const hours = timeMatch ? parseInt(timeMatch[1], 10) : 0;
    const minutes = timeMatch ? parseInt(timeMatch[2], 10) : 0;
    return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10), hours, minutes).getTime();
  }
  const timestamp = Date.parse(dateStr);
  return isNaN(timestamp) ? 0 : timestamp;
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return "Non daté";
  if (typeof dateStr === "string" && dateStr.includes("/")) return dateStr;
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
    }
  } catch (e) {
    // fallback
  }
  return String(dateStr);
}

/**
 * Composant de gestion ergonomique de la liste des Flipbooks
 * Conforme WCAG 2.1 AA : faible hauteur de ligne, pagination, recherche/filtres réactifs,
 * actions directes, barre d'actions groupées en haut.
 */
export default function FlipbookManager({
  flipbooks = [],
  onAddFlipbook,
  onViewFlipbook,
  onEditFlipbook,
  onDeleteFlipbook,
  onBulkDelete,
  onBackToMain,
  setNotification = () => {}
}) {
  // États de recherche, filtrage et tri
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortFilter, setSortFilter] = useState('newest');

  // États de pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // Sélection multiple & actions groupées
  const [selectedFlipbookIds, setSelectedFlipbookIds] = useState([]);
  const [bulkAction, setBulkAction] = useState('-1');
  const [copiedId, setCopiedId] = useState(null);

  // Extraction dynamique des catégories existantes
  const allCategories = useMemo(() => {
    const set = new Set();
    flipbooks.forEach(fb => {
      if (fb.category && fb.category.trim()) {
        set.add(fb.category.trim());
      }
    });
    // Compléter avec les catégories littéraires canoniques si non présentes
    ["Poésies", "Nouvelles", "Romans", "Contes et légendes", "Essais", "Sciences", "Art", "Outils"].forEach(c => set.add(c));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [flipbooks]);

  // Filtrage et tri des Flipbooks en local (zéro appel Firestore intempestif)
  const filteredAndSortedFlipbooks = useMemo(() => {
    let list = [...flipbooks];

    // Recherche par mot-clé (titre, catégorie, fichier pdf, description)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(fb => 
        (fb.title && fb.title.toLowerCase().includes(q)) ||
        (fb.category && fb.category.toLowerCase().includes(q)) ||
        (fb.pdfFile && fb.pdfFile.toLowerCase().includes(q)) ||
        (fb.pdfUrl && fb.pdfUrl.toLowerCase().includes(q)) ||
        (fb.description && fb.description.toLowerCase().includes(q))
      );
    }

    // Filtre de catégorie
    if (categoryFilter !== 'all') {
      list = list.filter(fb => (fb.category || 'Outils') === categoryFilter);
    }

    // Tri
    list.sort((a, b) => {
      if (sortFilter === 'newest') {
        return parseDateForSort(b.date) - parseDateForSort(a.date);
      }
      if (sortFilter === 'oldest') {
        return parseDateForSort(a.date) - parseDateForSort(b.date);
      }
      if (sortFilter === 'title_asc') {
        return (a.title || '').localeCompare(b.title || '', 'fr', { sensitivity: 'base' });
      }
      if (sortFilter === 'title_desc') {
        return (b.title || '').localeCompare(a.title || '', 'fr', { sensitivity: 'base' });
      }
      return 0;
    });

    return list;
  }, [flipbooks, searchQuery, categoryFilter, sortFilter]);

  // Réinitialisation de la page lors d'un changement de filtre
  const handleSearchChange = (val) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const handleCategoryChange = (val) => {
    setCategoryFilter(val);
    setCurrentPage(1);
  };

  const handleSortChange = (val) => {
    setSortFilter(val);
    setCurrentPage(1);
  };

  // Pagination calculée
  const totalItems = filteredAndSortedFlipbooks.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedFlipbooks = useMemo(() => {
    const startIdx = (safeCurrentPage - 1) * perPage;
    return filteredAndSortedFlipbooks.slice(startIdx, startIdx + perPage);
  }, [filteredAndSortedFlipbooks, safeCurrentPage, perPage]);

  // Sélection / désélection globale de la page courante
  const isAllCurrentPageSelected = 
    paginatedFlipbooks.length > 0 && 
    paginatedFlipbooks.every(fb => selectedFlipbookIds.includes(fb.id));

  const handleToggleSelectAll = (e) => {
    if (e.target.checked) {
      const pageIds = paginatedFlipbooks.map(fb => fb.id);
      setSelectedFlipbookIds(prev => Array.from(new Set([...prev, ...pageIds])));
    } else {
      const pageIds = new Set(paginatedFlipbooks.map(fb => fb.id));
      setSelectedFlipbookIds(prev => prev.filter(id => !pageIds.has(id)));
    }
  };

  const handleToggleSelectOne = (id) => {
    setSelectedFlipbookIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Application de l'action groupée
  const handleApplyBulkAction = () => {
    if (bulkAction === '-1') {
      alert("Veuillez sélectionner une action groupée.");
      return;
    }
    if (selectedFlipbookIds.length === 0) {
      alert("Aucun flipbook sélectionné.");
      return;
    }
    if (bulkAction === 'trash') {
      onBulkDelete(selectedFlipbookIds);
      setSelectedFlipbookIds([]);
      setBulkAction('-1');
    }
  };

  // Copie rapide du snippet d'intégration React
  const handleCopySnippet = (fb) => {
    const snippet = `<PdfFlipbookReader book={flipbooks.find(f => f.id === "${fb.id}")} onClose={handleClose} />`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(snippet);
      setCopiedId(fb.id);
      setNotification(`Code d'intégration React copié pour "${fb.title}" !`);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  // Numéros de page pour la pagination
  const paginationRange = useMemo(() => {
    const delta = 2;
    const range = [];
    for (let i = Math.max(1, safeCurrentPage - delta); i <= Math.min(totalPages, safeCurrentPage + delta); i++) {
      range.push(i);
    }
    return range;
  }, [safeCurrentPage, totalPages]);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* 1. FIL D'ARIANE ET RETOUR EN HAUT (Navigation Claire) */}
      <nav className="ae-flipbook-nav-breadcrumb" aria-label="Navigation secondaire">
        <button
          type="button"
          onClick={onBackToMain}
          className="ae-flipbook-back-btn"
          aria-label="Retour au tableau de bord principal"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Tableau de bord</span>
        </button>
        <span className="ae-flipbook-breadcrumb-sep" aria-hidden="true">/</span>
        <span className="ae-flipbook-breadcrumb-current" aria-current="page">Flipbooks</span>
      </nav>

      {/* 2. EN-TÊTE DE LA SECTION FLIPBOOKS */}
      <div className="ae-flipbook-header">
        <div>
          <h2 className="ae-flipbook-title">Bibliothèque de Flipbooks interactifs</h2>
          <p className="ae-flipbook-subtitle">
            Gérez les publications numériques et leurs barres latérales d'accompagnement.
          </p>
        </div>
        <button
          type="button"
          onClick={onAddFlipbook}
          className="ae-flipbook-btn-primary"
          aria-label="Ajouter un nouveau Flipbook"
        >
          <Plus size={18} aria-hidden="true" />
          <span>+ Ajouter un Flipbook</span>
        </button>
      </div>

      {/* 3. BARRE DE RECHERCHE, FILTRE PAR CATÉGORIE ET TRI */}
      <div className="ae-flipbook-toolbar" role="search" aria-label="Recherche et filtres de flipbooks">
        <div className="ae-flipbook-toolbar-filters">
          {/* Recherche */}
          <div className="ae-flipbook-search-wrapper">
            <Search className="ae-flipbook-search-icon" size={16} aria-hidden="true" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Rechercher un Flipbook..."
              className="ae-flipbook-search-input"
              aria-label="Rechercher par titre, catégorie ou nom de fichier PDF"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                className="ae-flipbook-search-clear"
                aria-label="Effacer la recherche"
              >
                <X size={14} aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Filtre par catégorie */}
          <div className="flex items-center gap-1.5">
            <Filter size={15} className="text-slate-400" aria-hidden="true" />
            <select
              value={categoryFilter}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="ae-flipbook-select"
              aria-label="Filtrer les flipbooks par catégorie"
            >
              <option value="all">Toutes les catégories</option>
              {allCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Tri */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown size={15} className="text-slate-400" aria-hidden="true" />
            <select
              value={sortFilter}
              onChange={(e) => handleSortChange(e.target.value)}
              className="ae-flipbook-select"
              aria-label="Trier la liste des flipbooks"
            >
              <option value="newest">Plus récent</option>
              <option value="oldest">Plus ancien</option>
              <option value="title_asc">Titre A → Z</option>
              <option value="title_desc">Titre Z → A</option>
            </select>
          </div>
        </div>

        <div className="ae-flipbook-stats-badge">
          {totalItems} flipbook{totalItems > 1 ? 's' : ''} trouvé{totalItems > 1 ? 's' : ''}
        </div>
      </div>

      {/* 4. ACTIONS GROUPÉES AFFICHEES PRÈS DU HAUT DE LA LISTE */}
      {selectedFlipbookIds.length > 0 && (
        <div className="ae-flipbook-bulk-bar" role="region" aria-label="Actions groupées sélectionnées">
          <div className="ae-flipbook-bulk-count">
            <span className="ae-flipbook-bulk-badge">{selectedFlipbookIds.length}</span>
            <span>{selectedFlipbookIds.length > 1 ? `${selectedFlipbookIds.length} éléments sélectionnés` : '1 élément sélectionné'}</span>
          </div>

          <div className="ae-flipbook-bulk-actions">
            <select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
              className="ae-flipbook-bulk-select"
              aria-label="Sélectionner l'action groupée"
            >
              <option value="-1">Actions groupées...</option>
              <option value="trash">Déplacer dans la corbeille</option>
            </select>

            <button
              type="button"
              onClick={handleApplyBulkAction}
              disabled={bulkAction === '-1'}
              className="ae-flipbook-btn-secondary"
              aria-label="Appliquer l'action groupée sur les flipbooks sélectionnés"
            >
              Appliquer
            </button>

            <button
              type="button"
              onClick={() => setSelectedFlipbookIds([])}
              className="ae-flipbook-btn-ghost"
              aria-label="Annuler la sélection multiple"
            >
              Annuler la sélection
            </button>
          </div>
        </div>
      )}

      {/* 5. TABLEAU COMPACT ET ÉLÉGANT */}
      <div className="ae-flipbook-table-card">
        {/* Table Desktop et Tablette */}
        <div className="ae-flipbook-table-wrapper">
          <table className="ae-flipbook-table">
            <thead>
              <tr>
                <th className="ae-flipbook-checkbox-col">
                  <input 
                    type="checkbox"
                    checked={isAllCurrentPageSelected}
                    onChange={handleToggleSelectAll}
                    aria-label="Sélectionner tous les flipbooks de la page actuelle"
                  />
                </th>
                <th>Flipbook / Titre</th>
                <th>Fichier PDF</th>
                <th>Date de publication</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {paginatedFlipbooks.map((fb) => {
                const isSelected = selectedFlipbookIds.includes(fb.id);
                return (
                  <tr key={fb.id} className={isSelected ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''}>
                    <td className="ae-flipbook-checkbox-col">
                      <input 
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectOne(fb.id)}
                        aria-label={`Sélectionner le flipbook ${fb.title}`}
                      />
                    </td>

                    {/* Titre principal et Catégorie subtile (faible hauteur, pas de description encombrante) */}
                    <td>
                      <div className="ae-flipbook-cell-title-group">
                        <span className="ae-flipbook-row-title">{fb.title}</span>
                        <span className="ae-flipbook-row-category">{fb.category || "Outils"}</span>
                      </div>
                    </td>

                    {/* Fichier PDF */}
                    <td>
                      <span className="ae-flipbook-pdf-tag" title={fb.pdfFile || fb.pdfUrl || "Document PDF"}>
                        <FileText size={14} className="text-red-500 shrink-0" aria-hidden="true" />
                        <span className="ae-flipbook-pdf-name">{fb.pdfFile || "document.pdf"}</span>
                      </span>
                    </td>

                    {/* Date */}
                    <td>
                      <span className="ae-flipbook-row-date">
                        {formatDisplayDate(fb.date)}
                      </span>
                    </td>

                    {/* Actions directes et compréhensibles */}
                    <td className="ae-flipbook-actions-cell">
                      <div className="ae-flipbook-actions-group">
                        {/* Voir */}
                        <button
                          type="button"
                          onClick={() => onViewFlipbook(fb)}
                          className="ae-flipbook-action-btn ae-action-view"
                          title="Afficher le lecteur flipbook"
                          aria-label={`Voir le flipbook interactif : ${fb.title}`}
                        >
                          <BookOpen size={16} aria-hidden="true" />
                          <span className="ae-btn-label-desktop">Voir</span>
                        </button>

                        {/* Modifier */}
                        <button
                          type="button"
                          onClick={() => onEditFlipbook(fb)}
                          className="ae-flipbook-action-btn ae-action-edit"
                          title="Modifier le flipbook et ses barres latérales"
                          aria-label={`Modifier le flipbook : ${fb.title}`}
                        >
                          <Edit3 size={16} aria-hidden="true" />
                          <span className="ae-btn-label-desktop">Modifier</span>
                        </button>

                        {/* Copier le code d'intégration React */}
                        <button
                          type="button"
                          onClick={() => handleCopySnippet(fb)}
                          className="ae-flipbook-action-btn ae-action-code"
                          title="Copier le code d'intégration React.js"
                          aria-label={`Copier le code React pour : ${fb.title}`}
                        >
                          {copiedId === fb.id ? (
                            <Check size={16} className="text-emerald-500" aria-hidden="true" />
                          ) : (
                            <Copy size={16} aria-hidden="true" />
                          )}
                        </button>

                        {/* Supprimer */}
                        <button
                          type="button"
                          onClick={() => onDeleteFlipbook(fb.id, fb.title)}
                          className="ae-flipbook-action-btn ae-action-delete"
                          title="Supprimer ce flipbook"
                          aria-label={`Supprimer le flipbook : ${fb.title}`}
                        >
                          <Trash2 size={16} aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {paginatedFlipbooks.length === 0 && (
                <tr>
                  <td colSpan="5">
                    <div className="ae-flipbook-empty-state">
                      <FileText className="ae-flipbook-empty-icon" aria-hidden="true" />
                      <div className="ae-flipbook-empty-title">Aucun Flipbook ne correspond à vos critères</div>
                      <div className="ae-flipbook-empty-desc">
                        {searchQuery || categoryFilter !== 'all' 
                          ? "Essayez de modifier votre recherche ou de réinitialiser le filtre de catégorie."
                          : "Votre bibliothèque est actuellement vide. Cliquez sur « + Ajouter un Flipbook » pour créer le premier."}
                      </div>
                      {(searchQuery || categoryFilter !== 'all') && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery('');
                            setCategoryFilter('all');
                            setCurrentPage(1);
                          }}
                          className="ae-flipbook-btn-secondary"
                        >
                          Réinitialiser les filtres
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Vue Cartes Mobile (Évite le défilement horizontal et les tables compressées) */}
        <div className="ae-flipbook-mobile-cards">
          {paginatedFlipbooks.map((fb) => {
            const isSelected = selectedFlipbookIds.includes(fb.id);
            return (
              <div 
                key={`mobile-${fb.id}`} 
                className={`ae-flipbook-mobile-card ${isSelected ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}`}
              >
                <div className="ae-flipbook-mobile-card-top">
                  <input 
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleSelectOne(fb.id)}
                    aria-label={`Sélectionner ${fb.title}`}
                    className="mt-1"
                  />
                  <div className="ae-flipbook-mobile-card-info">
                    <div className="ae-flipbook-row-title">{fb.title}</div>
                    <div className="ae-flipbook-row-category">{fb.category || "Outils"}</div>
                  </div>
                </div>

                <div className="ae-flipbook-mobile-card-meta">
                  <span className="ae-flipbook-pdf-tag">
                    <FileText size={13} className="text-red-500 shrink-0" />
                    <span className="ae-flipbook-pdf-name">{fb.pdfFile || "document.pdf"}</span>
                  </span>
                  <span className="ae-flipbook-row-date">
                    {formatDisplayDate(fb.date)}
                  </span>
                </div>

                <div className="ae-flipbook-mobile-card-actions">
                  <button
                    type="button"
                    onClick={() => onViewFlipbook(fb)}
                    className="ae-flipbook-action-btn ae-action-view"
                    aria-label={`Voir ${fb.title}`}
                  >
                    <BookOpen size={16} />
                    <span>Voir</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onEditFlipbook(fb)}
                    className="ae-flipbook-action-btn ae-action-edit"
                    aria-label={`Modifier ${fb.title}`}
                  >
                    <Edit3 size={16} />
                    <span>Modifier</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopySnippet(fb)}
                    className="ae-flipbook-action-btn ae-action-code"
                    aria-label={`Copier le code React pour ${fb.title}`}
                  >
                    {copiedId === fb.id ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteFlipbook(fb.id, fb.title)}
                    className="ae-flipbook-action-btn ae-action-delete"
                    aria-label={`Supprimer ${fb.title}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* 6. PAGINATION RÉACTIVE */}
        {totalItems > 0 && (
          <div className="ae-flipbook-pagination" aria-label="Pagination des flipbooks">
            <div className="ae-flipbook-pagination-info">
              Affichage de <strong>{Math.min(totalItems, (safeCurrentPage - 1) * perPage + 1)}</strong> à{' '}
              <strong>{Math.min(totalItems, safeCurrentPage * perPage)}</strong> sur <strong>{totalItems}</strong> flipbooks
            </div>

            <div className="ae-flipbook-pagination-controls">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safeCurrentPage <= 1}
                className="ae-flipbook-page-btn"
                aria-label="Aller à la page précédente"
              >
                ‹ Précédent
              </button>

              {paginationRange.map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setCurrentPage(num)}
                  className={`ae-flipbook-page-btn ${safeCurrentPage === num ? 'active' : ''}`}
                  aria-current={safeCurrentPage === num ? "page" : undefined}
                  aria-label={`Page ${num}`}
                >
                  {num}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage >= totalPages}
                className="ae-flipbook-page-btn"
                aria-label="Aller à la page suivante"
              >
                Suivant ›
              </button>

              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="ae-flipbook-per-page-select"
                aria-label="Nombre d'éléments par page"
              >
                <option value="10">10 / page</option>
                <option value="20">20 / page</option>
                <option value="50">50 / page</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
