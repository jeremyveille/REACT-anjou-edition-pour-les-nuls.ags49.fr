import { useState, useEffect, useRef } from 'react';
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

const SAMPLE_MEDIA = [
  { id: 'img1', name: "Château d'Angers et ses Jardins", url: "https://picsum.photos/800/600?random=11", type: 'image', size: 154000, mimeType: 'image/jpeg', alt: "Château d'Angers" },
  { id: 'img2', name: "Vignobles de Savennières", url: "https://picsum.photos/800/600?random=12", type: 'image', size: 168000, mimeType: 'image/jpeg', alt: "Vignobles de Savennières" },
  { id: 'img3', name: "Coucher de soleil sur la Loire", url: "https://picsum.photos/800/600?random=13", type: 'image', size: 142000, mimeType: 'image/jpeg', alt: "Coucher de soleil sur la Loire" },
  { id: 'img4', name: "Manoir en Tuffeau et Ardoise", url: "https://picsum.photos/800/600?random=14", type: 'image', size: 185000, mimeType: 'image/jpeg', alt: "Manoir en Tuffeau" },
  { id: 'vid1', name: "Survol Historique du Château d'Angers", url: "https://www.youtube.com/watch?v=Y1wzszq92f0", type: 'video', size: 0, mimeType: 'video/youtube' },
  { id: 'vid2', name: "La Loire : Fleuve Sauvage et Mystique", url: "https://www.youtube.com/watch?v=bO2tOaFf-1I", type: 'video', size: 0, mimeType: 'video/youtube' }
];

export const MediaPickerModal = ({
  isOpen = false,
  onClose = () => {},
  onSelect = () => {},
  filterType = null,
  title = "Médiathèque Anjou Édition"
}) => {
  const [mediaList, setMediaList] = useState(() => {
    try {
      const stored = localStorage.getItem('ae_media_library');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return SAMPLE_MEDIA;
  });

  const [selectedId, setSelectedId] = useState(null);
  const [activeTab, setActiveTab] = useState(filterType || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      try {
        const stored = localStorage.getItem('ae_media_library');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) setMediaList(parsed);
        }
      } catch (e) {
        console.error(e);
      }
      if (filterType) {
        setActiveTab(filterType);
      }
    } else {
      setSelectedId(null);
      setSearchQuery('');
    }
  }, [isOpen, filterType]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleFileUpload = (file) => {
    if (!file) return;
    setIsUploading(true);
    setTimeout(() => {
      try {
        const type = file.type?.startsWith('video/') ? 'video' : file.type?.includes('pdf') ? 'document' : 'image';
        const newItem = {
          id: `media_${Date.now()}`,
          name: file.name,
          url: URL.createObjectURL(file),
          type,
          size: file.size,
          mimeType: file.type || 'image/jpeg',
          alt: file.name.replace(/\.[^/.]+$/, '')
        };
        const updated = [newItem, ...mediaList];
        setMediaList(updated);
        try {
          localStorage.setItem('ae_media_library', JSON.stringify(updated));
        } catch (e) {
          console.error(e);
        }
        setSelectedId(newItem.id);
      } catch (e) {
        console.error(e);
      } finally {
        setIsUploading(false);
      }
    }, 400);
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    if (window.confirm("Retirer ce média de la bibliothèque ?")) {
      const updated = mediaList.filter(m => m.id !== id);
      setMediaList(updated);
      try {
        localStorage.setItem('ae_media_library', JSON.stringify(updated));
      } catch (err) {
        console.error(err);
      }
      if (selectedId === id) setSelectedId(null);
    }
  };

  const handleConfirmSelect = () => {
    const selectedItem = mediaList.find(m => m.id === selectedId);
    if (selectedItem) {
      onSelect(selectedItem);
      onClose();
    }
  };

  const filteredMedia = mediaList.filter(item => {
    if (activeTab !== 'all') {
      if (activeTab === 'image' && item.type !== 'image') return false;
      if (activeTab === 'video' && item.type !== 'video') return false;
      if (activeTab === 'document' && item.type !== 'document') return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (item.name || '').toLowerCase().includes(q) || (item.url || '').toLowerCase().includes(q);
    }
    return true;
  });

  if (!isOpen) return null;

  const selectedItem = mediaList.find(m => m.id === selectedId);

  return (
    <div 
      className="pb-media-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pb-media-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="pb-media-modal-dialog">
        {/* HEADER */}
        <div className="pb-media-modal-header">
          <div className="pb-media-modal-header-info">
            <div className="pb-media-modal-header-icon" aria-hidden="true">
              <ImageIcon size={18} />
            </div>
            <div>
              <h2 id="pb-media-modal-title" className="pb-media-modal-title">{title}</h2>
              <p className="pb-media-modal-subtitle">Sélectionnez un média existant ou téléversez un nouveau fichier</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="pb-btn pb-btn-icon-only"
            aria-label="Fermer la médiathèque"
          >
            <X size={16} />
          </button>
        </div>

        {/* CONTROLS */}
        <div className="pb-media-modal-toolbar">
          <div className="pb-media-tab-group" role="tablist" aria-label="Filtres par type de média">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'all'}
              onClick={() => setActiveTab('all')}
              className={`pb-media-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            >
              Tous ({mediaList.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'image'}
              onClick={() => setActiveTab('image')}
              className={`pb-media-tab-btn ${activeTab === 'image' ? 'active' : ''}`}
            >
              <ImageIcon size={13} /> Images ({mediaList.filter(m => m.type === 'image').length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'video'}
              onClick={() => setActiveTab('video')}
              className={`pb-media-tab-btn ${activeTab === 'video' ? 'active' : ''}`}
            >
              <Film size={13} /> Vidéos ({mediaList.filter(m => m.type === 'video').length})
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, justifyContent: 'flex-end' }}>
            <div className="pb-media-search-container">
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--pb-text-3)' }} aria-hidden="true" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un média..."
                className="pb-media-search-input"
                aria-label="Rechercher un média"
              />
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileUpload(f);
                e.target.value = '';
              }}
              accept="image/*,video/*,application/pdf"
              style={{ display: 'none' }}
              aria-hidden="true"
            />
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="pb-btn pb-btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', fontWeight: 600 }}
            >
              {isUploading ? <Loader size={14} className="pb-spin" /> : <Upload size={14} />}
              <span>{isUploading ? "Envoi..." : "Ajouter un média"}</span>
            </button>
          </div>
        </div>

        {/* BODY */}
        <div 
          className="pb-media-modal-body"
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const f = e.dataTransfer.files?.[0];
            if (f) handleFileUpload(f);
          }}
        >
          {/* GRID */}
          <div className="pb-media-grid-area">
            {isDragging && (
              <div 
                style={{
                  position: 'absolute',
                  inset: '1rem',
                  backgroundColor: 'rgba(59, 110, 248, 0.08)',
                  border: '2px dashed var(--pb-primary)',
                  borderRadius: 'var(--pb-r-lg)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 20
                }}
              >
                <Upload size={32} style={{ color: 'var(--pb-primary)', marginBottom: '0.5rem' }} />
                <p style={{ fontWeight: 700, color: 'var(--pb-primary)', margin: 0 }}>Déposez votre fichier ici</p>
              </div>
            )}

            {filteredMedia.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '3rem 1rem', textAlign: 'center', color: 'var(--pb-text-3)' }}>
                <ImageIcon size={36} style={{ color: 'var(--pb-text-3)', marginBottom: '0.75rem' }} />
                <p style={{ fontSize: '0.8rem', margin: '0 0 1rem' }}>Aucun média trouvé</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="pb-btn"
                >
                  <Plus size={14} style={{ marginRight: '0.35rem' }} /> Téléverser un fichier
                </button>
              </div>
            ) : (
              <div className="pb-media-grid">
                {filteredMedia.map(item => {
                  const isSelected = item.id === selectedId;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      onDoubleClick={() => { onSelect(item); onClose(); }}
                      className={`pb-media-card ${isSelected ? 'selected' : ''}`}
                      tabIndex={0}
                      role="button"
                      aria-label={`Média ${item.name}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedId(item.id);
                        }
                      }}
                    >
                      <div className="pb-media-card-thumb">
                        {item.type === 'image' && item.url ? (
                          <img src={item.url} alt={item.alt || item.name} loading="lazy" />
                        ) : item.type === 'video' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--pb-primary)', height: '100%' }}>
                            <Film size={26} />
                            <span style={{ fontSize: '0.65rem', fontWeight: 700, marginTop: '2px' }}>Vidéo</span>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--pb-text-3)', height: '100%' }}>
                            <FileText size={26} />
                            <span style={{ fontSize: '0.65rem', fontWeight: 700, marginTop: '2px' }}>Document</span>
                          </div>
                        )}
                      </div>

                      {isSelected && (
                        <div className="pb-media-card-badge" aria-label="Sélectionné">
                          <Check size={12} strokeWidth={3} />
                        </div>
                      )}

                      <p className="pb-media-card-title" title={item.name}>
                        {item.name}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SIDEBAR DETAILS (Fluide) */}
          {selectedItem && (
            <div className="pb-media-sidebar">
              <h6 className="pb-media-sidebar-title">Détails</h6>
              <div className="pb-media-sidebar-preview">
                {selectedItem.type === 'image' && selectedItem.url ? (
                  <img src={selectedItem.url} alt={selectedItem.alt || selectedItem.name} />
                ) : (
                  <div style={{ color: 'var(--pb-primary)', textAlign: 'center' }}>
                    <Film size={32} />
                  </div>
                )}
              </div>
              <div className="pb-media-sidebar-meta">
                <p style={{ fontWeight: 600, margin: '0 0 0.35rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={selectedItem.name}>
                  {selectedItem.name}
                </p>
                {selectedItem.url && (
                  <a
                    href={selectedItem.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: '0.68rem', color: 'var(--pb-primary)', wordBreak: 'break-all', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  >
                    <span>Ouvrir le lien</span>
                    <ExternalLink size={10} />
                  </a>
                )}
              </div>
              <div style={{ marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid var(--pb-border)' }}>
                <button
                  type="button"
                  onClick={(e) => handleDelete(e, selectedItem.id)}
                  className="pb-btn pb-btn-danger"
                  style={{ width: '100%', fontSize: '0.75rem', justifyContent: 'center' }}
                >
                  <Trash2 size={13} style={{ marginRight: '0.35rem' }} /> Supprimer
                </button>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="pb-media-modal-footer">
          <span style={{ fontSize: '0.75rem', color: 'var(--pb-text-3)' }}>
            {filteredMedia.length} élément{filteredMedia.length > 1 ? 's' : ''}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button type="button" onClick={onClose} className="pb-btn">
              Annuler
            </button>
            <button
              type="button"
              disabled={!selectedId}
              onClick={handleConfirmSelect}
              className="pb-btn pb-btn-primary"
            >
              <Check size={14} style={{ marginRight: '0.35rem' }} /> Insérer ce média
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default MediaPickerModal;
