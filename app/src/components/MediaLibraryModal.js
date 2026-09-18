import React, { useState, useEffect, useRef } from 'react';
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

/**
 * Modal de sélection et de gestion de la médiathèque (Firestore / Storage / LocalStorage)
 */
export const MediaLibraryModal = ({
  isOpen = false,
  onClose = () => {},
  onSelect = () => {},
  filterType = null, // null | 'image' | 'video' | 'document'
  title = "Médiathèque Anjou Édition"
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
      loadMedia();
      if (filterType) {
        setActiveTab(filterType);
      }
    } else {
      setSelectedId(null);
      setSearchQuery('');
    }
  }, [isOpen, filterType]);

  // Fermeture par la touche Échap
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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

  if (!isOpen) return null;

  const selectedItem = mediaList.find(m => m.id === selectedId);

  return (
    <div 
      className="db-modal-overlay d-flex align-items-center justify-content-center p-3"
      role="dialog"
      aria-modal="true"
      aria-labelledby="media-library-title"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999
      }}
    >
      <div 
        ref={modalRef}
        className="db-card d-flex flex-column bg-white rounded-4 shadow-xl overflow-hidden animate-in"
        style={{
          width: '100%',
          maxWidth: '920px',
          height: '85vh',
          maxHeight: '750px'
        }}
      >
        {/* EN-TÊTE DE LA MODALE */}
        <div className="d-flex align-items-center justify-content-between px-4 py-3 border-bottom bg-slate-50">
          <div className="d-flex align-items-center gap-2.5">
            <div className="p-2 bg-primary-subtle text-primary rounded-3 d-flex align-items-center justify-content-center">
              <ImageIcon size={20} />
            </div>
            <div>
              <h2 id="media-library-title" className="h5 mb-0 fw-bold text-slate-800">
                {title}
              </h2>
              <p className="text-xs text-muted mb-0">
                Sélectionnez, organisez ou téléversez des médias pour vos contenus
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer la médiathèque"
            className="btn btn-light btn-sm rounded-circle p-1.5 text-muted hover:text-dark"
          >
            <X size={18} />
          </button>
        </div>

        {/* BARRE DE CONTRÔLES (ONGLETS + RECHERCHE + TÉLÉVERSEMENT) */}
        <div className="px-4 py-2.5 border-bottom bg-white d-flex flex-wrap align-items-center justify-content-between gap-3">
          {/* Onglets de filtrage */}
          <div className="d-flex align-items-center gap-1 bg-slate-100 p-1 rounded-3">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`btn btn-sm py-1 px-2.5 rounded-2 font-medium text-xs transition-all ${
                activeTab === 'all' 
                  ? 'bg-white text-primary shadow-sm fw-semibold' 
                  : 'text-slate-600 border-0 hover:bg-white/50'
              }`}
            >
              Tous ({mediaList.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('image')}
              className={`btn btn-sm py-1 px-2.5 rounded-2 font-medium text-xs d-flex align-items-center gap-1 transition-all ${
                activeTab === 'image' 
                  ? 'bg-white text-primary shadow-sm fw-semibold' 
                  : 'text-slate-600 border-0 hover:bg-white/50'
              }`}
            >
              <ImageIcon size={13} /> Images ({mediaList.filter(m => m.type === 'image').length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('video')}
              className={`btn btn-sm py-1 px-2.5 rounded-2 font-medium text-xs d-flex align-items-center gap-1 transition-all ${
                activeTab === 'video' 
                  ? 'bg-white text-primary shadow-sm fw-semibold' 
                  : 'text-slate-600 border-0 hover:bg-white/50'
              }`}
            >
              <Film size={13} /> Vidéos ({mediaList.filter(m => m.type === 'video').length})
            </button>
          </div>

          {/* Recherche & Téléversement */}
          <div className="d-flex align-items-center gap-2 flex-grow-1 justify-content-end" style={{ minWidth: '240px' }}>
            <div className="position-relative flex-grow-1" style={{ maxWidth: '280px' }}>
              <Search size={14} className="position-absolute text-muted" style={{ left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un média..."
                className="form-control form-control-sm ps-4 text-xs rounded-3"
                aria-label="Rechercher un média"
              />
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept="image/*,video/*,application/pdf"
              className="d-none"
            />
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-primary btn-sm d-flex align-items-center gap-1.5 rounded-3 text-xs fw-semibold px-3 text-nowrap"
            >
              {isUploading ? (
                <>
                  <Loader size={14} className="animate-spin" /> Envoi...
                </>
              ) : (
                <>
                  <Upload size={14} /> Ajouter un média
                </>
              )}
            </button>
          </div>
        </div>

        {uploadError && (
          <div className="px-4 py-2 bg-danger-subtle text-danger text-xs border-bottom">
            {uploadError}
          </div>
        )}

        {/* CORPS PRINCIPAL : GRILLE DES MÉDIAS & DÉTAIL */}
        <div 
          className="d-flex flex-grow-1 overflow-hidden"
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          {/* Grille des médias */}
          <div className="flex-grow-1 p-3.5 overflow-y-auto bg-slate-50/50 position-relative">
            {isDragging && (
              <div 
                className="position-absolute inset-0 bg-primary/10 border-2 border-primary border-dashed rounded-3 m-3 d-flex flex-column align-items-center justify-content-center z-10"
                style={{ top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 75, 122, 0.08)' }}
              >
                <Upload size={36} className="text-primary mb-2" />
                <p className="fw-bold text-primary mb-0">Déposez votre fichier ici pour le téléverser</p>
              </div>
            )}

            {loading ? (
              <div className="d-flex flex-column align-items-center justify-content-center h-100 py-5 text-muted">
                <Loader size={32} className="animate-spin mb-2 text-primary" />
                <p className="text-xs">Chargement de la médiathèque...</p>
              </div>
            ) : filteredMedia.length === 0 ? (
              <div className="d-flex flex-column align-items-center justify-content-center h-100 py-5 text-muted text-center">
                <div className="p-3 bg-slate-100 rounded-circle mb-3">
                  <ImageIcon size={32} className="text-slate-400" />
                </div>
                <h6 className="fw-semibold text-slate-700 mb-1">Aucun média trouvé</h6>
                <p className="text-xs text-muted mb-3" style={{ maxWidth: '300px' }}>
                  {searchQuery ? "Aucun fichier ne correspond à votre recherche." : "Vous n'avez pas encore téléversé de fichiers dans cette catégorie."}
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn btn-outline-primary btn-sm rounded-3 text-xs"
                >
                  <Plus size={14} className="me-1" /> Téléverser un fichier
                </button>
              </div>
            ) : (
              <div 
                className="d-grid gap-3"
                style={{
                  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))'
                }}
              >
                {filteredMedia.map((item) => {
                  const isSelected = item.id === selectedId;
                  const isImage = item.type === 'image';
                  const isVideo = item.type === 'video';

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      onDoubleClick={() => handleDoubleClick(item)}
                      className={`position-relative rounded-3 overflow-hidden border bg-white cursor-pointer transition-all shadow-sm ${
                        isSelected 
                          ? 'border-primary ring-2 ring-primary ring-offset-1' 
                          : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
                      }`}
                      style={{
                        height: '150px',
                        outline: isSelected ? '2px solid #004b7a' : 'none'
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`Sélectionner ${item.name}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          setSelectedId(item.id);
                        }
                      }}
                    >
                      {/* VIGNETTE APERÇU */}
                      <div className="w-100 bg-slate-100 d-flex align-items-center justify-content-center overflow-hidden" style={{ height: '100px' }}>
                        {isImage && item.url ? (
                          <img 
                            src={item.url} 
                            alt={item.alt || item.name} 
                            className="w-100 h-100 object-fit-cover"
                            loading="lazy"
                          />
                        ) : isVideo ? (
                          <div className="d-flex flex-column align-items-center justify-content-center text-primary bg-primary-subtle w-100 h-100">
                            <Film size={28} />
                            <span className="text-xxs fw-bold mt-1 text-uppercase">Vidéo</span>
                          </div>
                        ) : (
                          <div className="d-flex flex-column align-items-center justify-content-center text-slate-500 w-100 h-100">
                            <FileText size={28} />
                            <span className="text-xxs fw-bold mt-1 text-uppercase">Document</span>
                          </div>
                        )}
                      </div>

                      {/* BADGE DE SÉLECTION */}
                      {isSelected && (
                        <div 
                          className="position-absolute bg-primary text-white rounded-circle p-0.5 d-flex align-items-center justify-content-center shadow"
                          style={{ top: '6px', right: '6px', width: '20px', height: '20px' }}
                        >
                          <Check size={13} strokeWidth={3} />
                        </div>
                      )}

                      {/* INFORMATIONS FICHIER */}
                      <div className="p-2 bg-white">
                        <p className="text-xs fw-semibold text-truncate mb-0 text-slate-800" title={item.name}>
                          {item.name}
                        </p>
                        <span className="text-xxs text-muted text-uppercase">
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
            <div className="border-start bg-white p-3.5 d-flex flex-column overflow-y-auto" style={{ width: '280px' }}>
              <h6 className="text-xs fw-bold text-uppercase text-slate-500 mb-3 tracking-wider">
                Détails du média
              </h6>

              <div className="rounded-3 overflow-hidden border border-slate-200 mb-3 bg-slate-50 d-flex align-items-center justify-content-center" style={{ height: '140px' }}>
                {selectedItem.type === 'image' && selectedItem.url ? (
                  <img 
                    src={selectedItem.url} 
                    alt={selectedItem.alt || selectedItem.name} 
                    className="w-100 h-100 object-fit-contain"
                  />
                ) : selectedItem.type === 'video' ? (
                  <div className="text-center text-primary">
                    <Film size={36} className="mx-auto mb-1" />
                    <p className="text-xs mb-0 fw-medium">Lecteur Vidéo</p>
                  </div>
                ) : (
                  <div className="text-center text-slate-500">
                    <FileText size={36} className="mx-auto mb-1" />
                    <p className="text-xs mb-0 fw-medium">Document PDF</p>
                  </div>
                )}
              </div>

              <div className="space-y-2 mb-4 text-xs">
                <div>
                  <span className="text-muted d-block text-xxs">Nom du fichier</span>
                  <span className="fw-semibold text-slate-800 text-break">{selectedItem.name}</span>
                </div>
                <div>
                  <span className="text-muted d-block text-xxs">Type MIME</span>
                  <span className="text-slate-700 font-mono text-xxs">{selectedItem.mimeType || selectedItem.type}</span>
                </div>
                {selectedItem.url && (
                  <div>
                    <span className="text-muted d-block text-xxs">URL publique</span>
                    <a 
                      href={selectedItem.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-primary text-truncate d-block text-xxs hover:underline"
                    >
                      {selectedItem.url} <ExternalLink size={10} className="d-inline" />
                    </a>
                  </div>
                )}
              </div>

              <div className="mt-auto pt-3 border-top d-flex gap-2">
                <button
                  type="button"
                  onClick={(e) => handleDelete(e, selectedItem.id)}
                  className="btn btn-outline-danger btn-sm rounded-3 text-xs w-100 d-flex align-items-center justify-content-center gap-1"
                >
                  <Trash2 size={13} /> Supprimer
                </button>
              </div>
            </div>
          )}
        </div>

        {/* PIED DE PAGE DE LA MODALE */}
        <div className="px-4 py-3 border-top bg-slate-50 d-flex align-items-center justify-content-between">
          <span className="text-xs text-muted">
            {filteredMedia.length} média{filteredMedia.length > 1 ? 's' : ''} disponible{filteredMedia.length > 1 ? 's' : ''}
          </span>

          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-light btn-sm text-xs rounded-3 px-3 fw-medium text-slate-700"
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={!selectedId}
              onClick={handleConfirmSelect}
              className="btn btn-primary btn-sm text-xs rounded-3 px-3.5 fw-semibold d-flex align-items-center gap-1.5 shadow-sm"
            >
              <Check size={14} /> Insérer ce média
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default MediaLibraryModal;
