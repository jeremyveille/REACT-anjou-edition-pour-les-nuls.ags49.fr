import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Search, 
  Upload, 
  Image as ImageIcon, 
  Film, 
  FileText, 
  Check, 
  Trash2, 
  ExternalLink,
  Loader,
  Plus
} from 'lucide-react';
import { pageService } from '../services/pageService';
import '../styles/media-modal.css';

/**
 * Modal de sélection et de gestion de la médiathèque Anjou Édition (Firestore / Storage / LocalStorage)
 * Centrée, accessible (WCAG 2.2 AA), 100% Vanilla CSS pur et montée via React Portal.
 */
export const MediaLibraryModal = ({
  isOpen = false,
  onClose = () => {},
  onSelect = () => {},
  filterType = null, // null | 'image' | 'video' | 'document'
  title = "Sélectionner un média"
}) => {
  const [mediaList, setMediaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [activeTab, setActiveTab] = useState(filterType || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef(null);
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);

  // Charger la liste des médias
  const loadMedia = async () => {
    setLoading(true);
    setUploadError('');
    try {
      const items = await pageService.getMediaList();
      setMediaList(Array.isArray(items) ? items : []);
    } catch (err) {
      console.error('Erreur lors du chargement de la médiathèque:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement;
      loadMedia();
      if (filterType) {
        setActiveTab(filterType);
      }
    } else {
      setSelectedId(null);
      setSearchQuery('');
      if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
        previousActiveElement.current.focus();
      }
    }
  }, [isOpen, filterType]);

  // Fermeture par la touche Échap
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

  // Gestion du téléversement
  const handleFileUpload = async (file) => {
    if (!file) return;
    setIsUploading(true);
    setUploadError('');
    try {
      await pageService.uploadMedia(file);
      await loadMedia();
    } catch (err) {
      console.error('Échec du téléversement du fichier:', err);
      setUploadError("Impossible d'enregistrer ce fichier.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (window.confirm("Êtes-vous sûr de vouloir retirer ce média de la bibliothèque ?")) {
      try {
        await pageService.deleteMediaItem(id);
        if (selectedId === id) setSelectedId(null);
        await loadMedia();
      } catch (err) {
        console.error('Erreur lors de la suppression du média:', err);
      }
    }
  };

  const handleConfirmSelect = () => {
    const selectedItem = mediaList.find(m => m.id === selectedId);
    if (selectedItem) {
      onSelect(selectedItem);
      onClose();
    }
  };

  const handleDoubleClick = (item) => {
    onSelect(item);
    onClose();
  };

  if (!isOpen) return null;

  // Filtrage des médias
  const filteredMedia = mediaList.filter(item => {
    // Filtre de type
    if (activeTab !== 'all') {
      if (activeTab === 'image' && item.type !== 'image') return false;
      if (activeTab === 'video' && item.type !== 'video') return false;
      if (activeTab === 'document' && item.type !== 'document') return false;
    }
    // Filtre de recherche
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (item.name || '').toLowerCase().includes(q);
      const matchAlt = (item.alt || '').toLowerCase().includes(q);
      const matchUrl = (item.url || '').toLowerCase().includes(q);
      return matchName || matchAlt || matchUrl;
    }
    return true;
  });

  const selectedItem = mediaList.find(m => m.id === selectedId);

  const getFileInputAccept = () => {
    if (activeTab === 'image') return 'image/*';
    if (activeTab === 'video') return 'video/*';
    return 'image/*,video/*,application/pdf';
  };

  const modalNode = (
    <div 
      className="ae-media-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ae-media-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      data-testid="media-library-backdrop"
    >
      <div 
        ref={modalRef}
        className="ae-media-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        data-testid="media-library-dialog"
      >
        {/* EN-TÊTE DE LA MODALE */}
        <div className="ae-media-modal-header">
          <div className="ae-media-modal-title-group">
            <div className="ae-media-modal-icon-badge" aria-hidden="true">
              <ImageIcon size={22} />
            </div>
            <div>
              <h2 id="ae-media-modal-title" className="ae-media-modal-title">
                {title}
              </h2>
              <p className="ae-media-modal-subtitle">
                Sélectionnez, organisez ou téléversez des médias pour vos contenus
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer la médiathèque"
            className="ae-media-modal-close-btn"
          >
            <X size={20} />
          </button>
        </div>

        {/* BARRE D'OUTILS (ONGLETS + RECHERCHE + TÉLÉVERSEMENT) */}
        <div className="ae-media-modal-toolbar">
          {/* Onglets de filtrage */}
          <div className="ae-media-tabs" role="tablist" aria-label="Catégories de médias">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'all'}
              onClick={() => setActiveTab('all')}
              className={`ae-media-tab-btn ${activeTab === 'all' ? 'is-active' : ''}`}
            >
              Tous ({mediaList.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'image'}
              onClick={() => setActiveTab('image')}
              className={`ae-media-tab-btn ${activeTab === 'image' ? 'is-active' : ''}`}
            >
              <ImageIcon size={14} aria-hidden="true" />
              Images ({mediaList.filter(m => m.type === 'image').length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'video'}
              onClick={() => setActiveTab('video')}
              className={`ae-media-tab-btn ${activeTab === 'video' ? 'is-active' : ''}`}
            >
              <Film size={14} aria-hidden="true" />
              Vidéos ({mediaList.filter(m => m.type === 'video').length})
            </button>
          </div>

          {/* Recherche & Téléversement */}
          <div className="ae-media-actions-bar">
            <div className="ae-media-search-wrapper">
              <Search size={15} className="ae-media-search-icon" aria-hidden="true" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un média..."
                className="ae-media-search-input"
                aria-label="Rechercher un média"
              />
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept={getFileInputAccept()}
              style={{ display: 'none' }}
              data-testid="media-file-input"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="ae-media-upload-btn"
            >
              {isUploading ? (
                <>
                  <Loader size={14} className="animate-spin" aria-hidden="true" />
                  <span>Envoi en cours...</span>
                </>
              ) : (
                <>
                  <Upload size={14} aria-hidden="true" />
                  <span>Ajouter un média</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Message d'erreur de téléversement éventuel */}
        {uploadError && (
          <div className="ae-media-alert-error" role="alert">
            <X size={14} aria-hidden="true" />
            <span>{uploadError}</span>
          </div>
        )}

        {/* CORPS DE LA MODALE & GRILLE DES MÉDIAS */}
        <div 
          className="ae-media-modal-body"
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          {isDragging && (
            <div className="ae-media-drag-overlay">
              <Upload size={40} />
              <p className="ae-media-drag-text">Déposez votre fichier ici pour le téléverser</p>
            </div>
          )}

          <div className="ae-media-grid-area">
            {loading ? (
              <div className="ae-media-loading-state">
                <Loader size={32} className="animate-spin mb-2" style={{ color: '#004b7a' }} />
                <p style={{ fontSize: '0.85rem' }}>Chargement de la médiathèque...</p>
              </div>
            ) : filteredMedia.length === 0 ? (
              <div className="ae-media-empty-state">
                <div className="ae-media-empty-icon">
                  <ImageIcon size={28} />
                </div>
                <h3 className="ae-media-empty-title">Aucun média trouvé</h3>
                <p className="ae-media-empty-desc">
                  {searchQuery 
                    ? "Aucun fichier ne correspond à votre recherche." 
                    : "Vous n'avez pas encore téléversé de fichiers dans cette catégorie."}
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="ae-media-upload-btn"
                >
                  <Plus size={14} aria-hidden="true" /> Téléverser un fichier
                </button>
              </div>
            ) : (
              <div className="ae-media-grid" role="listbox" aria-label="Liste des médias">
                {filteredMedia.map((item) => {
                  const isSelected = item.id === selectedId;
                  const isImage = item.type === 'image';
                  const isVideo = item.type === 'video';

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      onDoubleClick={() => handleDoubleClick(item)}
                      className={`ae-media-card ${isSelected ? 'is-selected' : ''}`}
                      tabIndex={0}
                      role="option"
                      aria-selected={isSelected}
                      aria-label={`Sélectionner ${item.name || 'le média'}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedId(item.id);
                        }
                      }}
                      data-testid={`media-card-${item.id}`}
                    >
                      {/* VIGNETTE APERÇU */}
                      <div className="ae-media-card-thumb">
                        {isImage && item.url ? (
                          <img 
                            src={item.url} 
                            alt={item.alt || item.name || 'Média'} 
                            loading="lazy"
                          />
                        ) : isVideo ? (
                          <div className="ae-media-card-icon-preview is-video">
                            <Film size={26} />
                            <span>Vidéo</span>
                          </div>
                        ) : (
                          <div className="ae-media-card-icon-preview">
                            <FileText size={26} />
                            <span>Document</span>
                          </div>
                        )}
                      </div>

                      {/* BADGE DE SÉLECTION */}
                      {isSelected && (
                        <div className="ae-media-card-check" aria-hidden="true">
                          <Check size={14} strokeWidth={3} />
                        </div>
                      )}

                      {/* INFORMATIONS FICHIER */}
                      <div className="ae-media-card-info">
                        <p className="ae-media-card-name" title={item.name}>
                          {item.name}
                        </p>
                        <span className="ae-media-card-meta">
                          {item.type}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* PANNEAU LATÉRAL DES DÉTAILS DU MÉDIA SÉLECTIONNÉ */}
          {selectedItem && (
            <aside className="ae-media-sidebar" aria-label="Détails du média sélectionné">
              <h3 className="ae-media-sidebar-title">
                Détails du média
              </h3>

              <div className="ae-media-sidebar-preview">
                {selectedItem.type === 'image' && selectedItem.url ? (
                  <img 
                    src={selectedItem.url} 
                    alt={selectedItem.alt || selectedItem.name || 'Aperçu'} 
                  />
                ) : selectedItem.type === 'video' ? (
                  <div style={{ textAlign: 'center', color: '#004b7a' }}>
                    <Film size={36} style={{ margin: '0 auto 0.25rem auto' }} />
                    <p style={{ fontSize: '0.8rem', margin: 0, fontWeight: 600 }}>Fichier Vidéo</p>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', color: '#64748b' }}>
                    <FileText size={36} style={{ margin: '0 auto 0.25rem auto' }} />
                    <p style={{ fontSize: '0.8rem', margin: 0, fontWeight: 600 }}>Document</p>
                  </div>
                )}
              </div>

              <div className="ae-media-sidebar-meta-list">
                <div className="ae-media-sidebar-meta-item">
                  <span className="ae-media-sidebar-meta-label">Nom du fichier</span>
                  <span className="ae-media-sidebar-meta-val">{selectedItem.name}</span>
                </div>
                <div className="ae-media-sidebar-meta-item">
                  <span className="ae-media-sidebar-meta-label">Type</span>
                  <span className="ae-media-sidebar-meta-val">{selectedItem.mimeType || selectedItem.type}</span>
                </div>
                {selectedItem.url && (
                  <div className="ae-media-sidebar-meta-item">
                    <span className="ae-media-sidebar-meta-label">Lien direct</span>
                    <a 
                      href={selectedItem.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      style={{ 
                        color: '#004b7a', 
                        fontSize: '0.75rem', 
                        wordBreak: 'break-all', 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '0.25rem',
                        textDecoration: 'none'
                      }}
                    >
                      <span>Ouvrir l'original</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                )}
              </div>

              <div className="ae-media-sidebar-actions">
                <button
                  type="button"
                  onClick={(e) => handleDelete(e, selectedItem.id)}
                  className="ae-media-btn-delete"
                >
                  <Trash2 size={14} aria-hidden="true" />
                  <span>Supprimer de la bibliothèque</span>
                </button>
              </div>
            </aside>
          )}
        </div>

        {/* PIED DE PAGE DE LA MODALE */}
        <div className="ae-media-modal-footer">
          <span className="ae-media-footer-count">
            {filteredMedia.length} média{filteredMedia.length > 1 ? 's' : ''} disponible{filteredMedia.length > 1 ? 's' : ''}
          </span>

          <div className="ae-media-footer-actions">
            <button
              type="button"
              onClick={onClose}
              className="ae-media-btn-cancel"
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={!selectedId}
              onClick={handleConfirmSelect}
              className="ae-media-btn-confirm"
            >
              <Check size={16} aria-hidden="true" />
              <span>Utiliser ce média</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Utilisation de ReactDOM.createPortal pour monter la modale sur document.body
  if (typeof document !== 'undefined') {
    return createPortal(modalNode, document.body);
  }

  return modalNode;
};

export default MediaLibraryModal;
