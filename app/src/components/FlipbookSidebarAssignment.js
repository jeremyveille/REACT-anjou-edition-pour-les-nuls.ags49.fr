import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  Sliders, 
  Check, 
  Search, 
  X, 
  Filter, 
  Edit3, 
  AlertCircle
} from 'lucide-react';

/**
 * Espace « Paramètres individuels » : Permet de visualiser et de gérer l'attribution
 * du modèle global ou d'une personnalisation pour chaque Flipbook de la bibliothèque.
 */
export default function FlipbookSidebarAssignment({
  flipbooks = [],
  onUpdateFlipbookMode,
  onEditFlipbook,
  onApplyGlobalToAll,
  onBackToMain
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'global' | 'custom'
  const [confirmTarget, setConfirmTarget] = useState(null); // { fb, targetMode }
  const [applyReport, setApplyReport] = useState(null);

  const handleTriggerApplyGlobalToAll = async () => {
    if (!onApplyGlobalToAll) return;
    const res = await onApplyGlobalToAll();
    if (res && typeof res === 'object' && typeof res.totalCount === 'number') {
      setApplyReport(res);
    }
  };

  // Calcul du mode de chaque Flipbook
  const flipbooksWithMode = useMemo(() => {
    return flipbooks.map(fb => {
      let mode = 'global';
      if (fb.sidebarMode === 'global') {
        mode = 'global';
      } else if (fb.sidebarMode === 'custom') {
        mode = 'custom';
      } else {
        // Rétrocompatibilité : si des blocs existent déjà sur l'ancien flipbook
        const hasBlocks = (Array.isArray(fb.leftSidebar) && fb.leftSidebar.length > 0) ||
                          (Array.isArray(fb.rightSidebar) && fb.rightSidebar.length > 0);
        mode = hasBlocks ? 'custom' : 'global';
      }
      return {
        ...fb,
        computedMode: mode
      };
    });
  }, [flipbooks]);

  // Filtrage
  const filteredList = useMemo(() => {
    let list = [...flipbooksWithMode];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(fb => 
        (fb.title && fb.title.toLowerCase().includes(q)) ||
        (fb.category && fb.category.toLowerCase().includes(q))
      );
    }
    if (filterMode === 'global') {
      list = list.filter(fb => fb.computedMode === 'global');
    } else if (filterMode === 'custom') {
      list = list.filter(fb => fb.computedMode === 'custom');
    }
    return list;
  }, [flipbooksWithMode, searchQuery, filterMode]);

  // Statistiques de répartition
  const totalCount = flipbooks.length;
  const globalCount = flipbooksWithMode.filter(f => f.computedMode === 'global').length;
  const customCount = flipbooksWithMode.filter(f => f.computedMode === 'custom').length;

  const handleRequestModeChange = (fb, newMode) => {
    if (fb.computedMode === newMode) return;
    if (newMode === 'global' && fb.computedMode === 'custom') {
      // Confirmation requise pour éviter d'écraser par inadvertance une personnalisation
      setConfirmTarget({ fb, targetMode: 'global' });
    } else {
      onUpdateFlipbookMode(fb.id, newMode);
    }
  };

  const handleConfirmSwitch = () => {
    if (confirmTarget) {
      onUpdateFlipbookMode(confirmTarget.fb.id, confirmTarget.targetMode);
      setConfirmTarget(null);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in" data-testid="sidebar-assignment-panel">
      {/* 1. EN-TÊTE ET STATISTIQUES */}
      <div className="ae-assignment-summary-card">
        <div className="flex justify-between items-start flex-wrap gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Sliders size={18} className="text-blue-600" aria-hidden="true" />
              <span>Paramètres individuels & Attribution des modèles</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Choisissez pour chaque ouvrage s'il utilise le <strong>modèle commun partagé</strong> ou une <strong>configuration sur mesure</strong>.
              Les modifications du modèle global s'appliquent automatiquement à tous les Flipbooks en mode global.
            </p>
          </div>

          <button
            type="button"
            onClick={handleTriggerApplyGlobalToAll}
            className="ae-flipbook-btn-primary text-xs"
            aria-label="Appliquer le modèle global à tous les flipbooks"
          >
            <Sparkles size={15} aria-hidden="true" />
            <span>Appliquer le modèle global à tous</span>
          </button>
        </div>

        {applyReport && (
          <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-2">
            <div>
              <strong>Bilan de l'application :</strong> {applyReport.verifiedCount}/{applyReport.totalCount} Flipbooks synchronisés sur le « Modèle global — Anjou Édition » ({applyReport.replacedCustomCount} personnalisé(s) basculé(s), {applyReport.backedUpCount} configuration(s) individuelle(s) préservée(s) en sauvegarde).
            </div>
            <button
              type="button"
              onClick={() => setApplyReport(null)}
              className="text-xs underline bg-transparent border-none cursor-pointer text-emerald-800 dark:text-emerald-300"
            >
              Fermer
            </button>
          </div>
        )}

        {/* Indicateurs de répartition */}
        <div className="ae-assignment-kpi-row mt-4">
          <div className="ae-assignment-kpi">
            <span className="ae-assignment-kpi-num">{totalCount}</span>
            <span className="ae-assignment-kpi-label">Total Flipbooks</span>
          </div>

          <div className="ae-assignment-kpi">
            <span className="ae-assignment-kpi-num text-emerald-600">{globalCount}</span>
            <span className="ae-assignment-kpi-label">Modèle global actif</span>
          </div>

          <div className="ae-assignment-kpi">
            <span className="ae-assignment-kpi-num text-indigo-600">{customCount}</span>
            <span className="ae-assignment-kpi-label">Configurations personnalisées</span>
          </div>
        </div>
      </div>

      {/* 2. BARRE DE FILTRAGE ET RECHERCHE */}
      <div className="ae-flipbook-toolbar">
        <div className="ae-flipbook-toolbar-filters">
          <div className="ae-flipbook-search-wrapper">
            <Search className="ae-flipbook-search-icon" size={16} aria-hidden="true" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrer par titre..."
              className="ae-flipbook-search-input"
              aria-label="Filtrer les flipbooks"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="ae-flipbook-search-clear"
                aria-label="Effacer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <Filter size={15} className="text-slate-400" aria-hidden="true" />
            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value)}
              className="ae-flipbook-select text-xs"
              aria-label="Filtrer par mode de barre latérale"
            >
              <option value="all">Tous les modes ({totalCount})</option>
              <option value="global">Modèle global uniquement ({globalCount})</option>
              <option value="custom">Personnalisés uniquement ({customCount})</option>
            </select>
          </div>
        </div>

        <div className="ae-flipbook-stats-badge">
          {filteredList.length} Flipbook{filteredList.length > 1 ? 's' : ''}
        </div>
      </div>

      {/* 3. TABLEAU DES ATTRIBUTIONS */}
      <div className="ae-flipbook-table-card">
        <div className="ae-flipbook-table-wrapper">
          <table className="ae-flipbook-table">
            <thead>
              <tr>
                <th>Flipbook / Ouvrage</th>
                <th>Catégorie</th>
                <th>Mode des barres latérales</th>
                <th>Détails des colonnes</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.map((fb) => {
                const isGlobal = fb.computedMode === 'global';
                const leftCount = Array.isArray(fb.leftSidebar) ? fb.leftSidebar.length : 0;
                const rightCount = Array.isArray(fb.rightSidebar) ? fb.rightSidebar.length : 0;

                return (
                  <tr key={fb.id}>
                    <td>
                      <div className="ae-flipbook-cell-title-group">
                        <span className="ae-flipbook-row-title">{fb.title}</span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {fb.pdfFile || "document.pdf"}
                        </span>
                      </div>
                    </td>

                    <td>
                      <span className="ae-flipbook-row-category">{fb.category || "Outils"}</span>
                    </td>

                    {/* Sélecteur de mode ergonomique */}
                    <td>
                      <div className="flex items-center gap-2">
                        {isGlobal ? (
                          <span className="ae-badge-global-active">
                            <Sparkles size={12} />
                            <span>Modèle global actif</span>
                          </span>
                        ) : (
                          <span className="ae-badge-custom-active">
                            <Sliders size={12} />
                            <span>Personnalisé</span>
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => handleRequestModeChange(fb, isGlobal ? 'custom' : 'global')}
                          className="text-xs text-blue-600 hover:text-blue-800 underline bg-transparent border-none cursor-pointer ml-1"
                          aria-label={`Basculer ${fb.title} en mode ${isGlobal ? 'personnalisé' : 'modèle global'}`}
                        >
                          {isGlobal ? "Passer en personnalisé" : "Basculer sur le modèle global"}
                        </button>
                      </div>
                    </td>

                    {/* Détails des blocs */}
                    <td>
                      <span className="text-xs text-slate-500">
                        {isGlobal ? (
                          <span className="italic text-emerald-700 dark:text-emerald-400">
                            Hérite du modèle global
                          </span>
                        ) : (
                          <span>
                            {leftCount} bloc{leftCount > 1 ? 's' : ''} G / {rightCount} bloc{rightCount > 1 ? 's' : ''} D
                          </span>
                        )}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="ae-flipbook-actions-cell">
                      <div className="ae-flipbook-actions-group">
                        <button
                          type="button"
                          onClick={() => onEditFlipbook(fb)}
                          className="ae-flipbook-action-btn ae-action-edit"
                          title="Modifier les options et barres de ce flipbook"
                          aria-label={`Éditer ${fb.title}`}
                        >
                          <Edit3 size={15} />
                          <span className="ae-btn-label-desktop">Modifier</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredList.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-xs text-slate-500">
                    Aucun flipbook ne correspond à vos filtres.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. MODALE DE CONFIRMATION : BASCULE VERS MODÈLE GLOBAL */}
      {confirmTarget && (
        <div className="ae-modal-overlay" onClick={() => setConfirmTarget(null)} role="presentation">
          <div 
            className="ae-modal-container max-w-md p-6" 
            onClick={(e) => e.stopPropagation()} 
            role="dialog" 
            aria-modal="true"
            aria-labelledby="confirm-switch-title"
          >
            <div className="flex items-center gap-3 mb-3 text-amber-600">
              <AlertCircle size={24} aria-hidden="true" />
              <h3 id="confirm-switch-title" className="text-base font-bold text-slate-900 dark:text-slate-100 mb-0">
                Basculer « {confirmTarget.fb.title} » sur le modèle global ?
              </h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
              Ce Flipbook possède actuellement une configuration de barres latérales personnalisée.
              En passant sur le modèle global, il utilisera désormais automatiquement les colonnes communes d'Anjou Édition.
            </p>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmTarget(null)}
                className="ae-flipbook-btn-secondary"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmSwitch}
                className="ae-flipbook-btn-primary"
              >
                <Check size={16} aria-hidden="true" />
                <span>Confirmer</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
