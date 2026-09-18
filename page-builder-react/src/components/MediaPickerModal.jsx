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
      className="position-fixed inset-0 d-flex align-items-center justify-content-center p-3"
      role="dialog"
      aria-modal="true"
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
        className="d-flex flex-column bg-white rounded-4 shadow-xl overflow-hidden animate-in"
        style={{
          width: '100%',
          maxWidth: '900px',
          height: '80vh',
          maxHeight: '700px'
        }}
      >
        {/* HEADER */}
        <div className="d-flex align-items-center justify-content-between px-4 py-3 border-bottom bg-slate-50">
          <div className="d-flex align-items-center gap-2">
            <div className="p-2 bg-primary-subtle text-primary rounded-3">
              <ImageIcon size={18} />
            </div>
            <div>
              <h2 className="h6 mb-0 fw-bold text-slate-800">{title}</h2>
              <p className="text-xs text-muted mb-0">Sélectionnez un média existant ou téléversez un nouveau fichier</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-light btn-sm rounded-circle p-1.5"
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        </div>

        {/* CONTROLS */}
        <div className="px-4 py-2.5 border-bottom bg-white d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div className="d-flex align-items-center gap-1 bg-slate-100 p-1 rounded-3">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`btn btn-sm py-1 px-2.5 rounded-2 font-medium text-xs ${activeTab === 'all' ? 'bg-white text-primary shadow-sm fw-semibold' : 'text-slate-600 border-0'}`}
            >
              Tous ({mediaList.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('image')}
              className={`btn btn-sm py-1 px-2.5 rounded-2 font-medium text-xs d-flex align-items-center gap-1 ${activeTab === 'image' ? 'bg-white text-primary shadow-sm fw-semibold' : 'text-slate-600 border-0'}`}
            >
              <ImageIcon size={13} /> Images ({mediaList.filter(m => m.type === 'image').length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('video')}
              className={`btn btn-sm py-1 px-2.5 rounded-2 font-medium text-xs d-flex align-items-center gap-1 ${activeTab === 'video' ? 'bg-white text-primary shadow-sm fw-semibold' : 'text-slate-600 border-0'}`}
            >
              <Film size={13} /> Vidéos ({mediaList.filter(m => m.type === 'video').length})
            </button>
          </div>

          <div className="d-flex align-items-center gap-2 flex-grow-1 justify-content-end">
            <div className="position-relative flex-grow-1" style={{ maxWidth: '260px' }}>
              <Search size={14} className="position-absolute text-muted" style={{ left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un média..."
                className="form-control form-control-sm ps-4 text-xs rounded-3"
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
              className="d-none"
            />
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-primary btn-sm d-flex align-items-center gap-1.5 rounded-3 text-xs fw-semibold px-3"
            >
              {isUploading ? <Loader size={14} className="animate-spin" /> : <Upload size={14} />}
              <span>{isUploading ? "Envoi..." : "Ajouter un média"}</span>
            </button>
          </div>
        </div>

        {/* BODY */}
        <div 
          className="d-flex flex-grow-1 overflow-hidden"
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
          <div className="flex-grow-1 p-3 overflow-y-auto bg-slate-50 position-relative">
            {isDragging && (
              <div 
                className="position-absolute inset-0 bg-primary/10 border-2 border-primary border-dashed rounded-3 m-3 d-flex flex-column align-items-center justify-content-center"
                style={{ top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 75, 122, 0.08)' }}
              >
                <Upload size={32} className="text-primary mb-2" />
                <p className="fw-bold text-primary mb-0">Déposez votre fichier ici</p>
              </div>
            )}

            {filteredMedia.length === 0 ? (
              <div className="d-flex flex-column align-items-center justify-content-center h-100 py-5 text-muted text-center">
                <ImageIcon size={32} className="text-slate-400 mb-2" />
                <p className="text-xs">Aucun média trouvé</p>
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
                className="d-grid gap-2.5"
                style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}
              >
                {filteredMedia.map(item => {
                  const isSelected = item.id === selectedId;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      onDoubleClick={() => { onSelect(item); onClose(); }}
                      className={`position-relative rounded-3 overflow-hidden border bg-white cursor-pointer transition-all shadow-sm ${
                        isSelected ? 'border-primary' : 'border-slate-200 hover:border-slate-300'
                      }`}
                      style={{
                        height: '140px',
                        outline: isSelected ? '2px solid #004b7a' : 'none'
                      }}
                      tabIndex={0}
                      role="button"
                    >
                      <div className="w-100 bg-slate-100 d-flex align-items-center justify-content-center overflow-hidden" style={{ height: '90px' }}>
                        {item.type === 'image' && item.url ? (
                          <img src={item.url} alt={item.alt || item.name} className="w-100 h-100 object-fit-cover" loading="lazy" />
                        ) : item.type === 'video' ? (
                          <div className="d-flex flex-column align-items-center text-primary bg-primary-subtle w-100 h-100 justify-content-center">
                            <Film size={24} />
                            <span className="text-xxs fw-bold mt-0.5">Vidéo</span>
                          </div>
                        ) : (
                          <div className="d-flex flex-column align-items-center text-slate-500 w-100 h-100 justify-content-center">
                            <FileText size={24} />
                            <span className="text-xxs fw-bold mt-0.5">Document</span>
                          </div>
                        )}
                      </div>

                      {isSelected && (
                        <div 
                          className="position-absolute bg-primary text-white rounded-circle p-0.5 d-flex align-items-center justify-content-center"
                          style={{ top: '6px', right: '6px', width: '18px', height: '18px' }}
                        >
                          <Check size={12} strokeWidth={3} />
                        </div>
                      )}

                      <div className="p-2 bg-white">
                        <p className="text-xs fw-semibold text-truncate mb-0 text-slate-800" title={item.name}>
                          {item.name}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SIDEBAR DETAILS */}
          {selectedItem && (
            <div className="border-start bg-white p-3 d-flex flex-column" style={{ width: '250px' }}>
              <h6 className="text-xs fw-bold text-uppercase text-slate-500 mb-2">Détails</h6>
              <div className="rounded-3 overflow-hidden border border-slate-200 mb-2 bg-slate-50 d-flex align-items-center justify-content-center" style={{ height: '120px' }}>
                {selectedItem.type === 'image' && selectedItem.url ? (
                  <img src={selectedItem.url} alt={selectedItem.alt || selectedItem.name} className="w-100 h-100 object-fit-contain" />
                ) : (
                  <div className="text-center text-primary">
                    <Film size={32} className="mx-auto mb-1" />
                  </div>
                )}
              </div>
              <div className="text-xs space-y-1 mb-3">
                <p className="fw-semibold text-truncate mb-1">{selectedItem.name}</p>
                {selectedItem.url && (
                  <a href={selectedItem.url} target="_blank" rel="noopener noreferrer" className="text-primary text-truncate d-block text-xxs">
                    {selectedItem.url} <ExternalLink size={10} className="d-inline" />
                  </a>
                )}
              </div>
              <div className="mt-auto pt-2 border-top">
                <button
                  type="button"
                  onClick={(e) => handleDelete(e, selectedItem.id)}
                  className="btn btn-outline-danger btn-sm text-xs w-100 d-flex align-items-center justify-content-center gap-1"
                >
                  <Trash2 size={12} /> Supprimer
                </button>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-4 py-3 border-top bg-slate-50 d-flex align-items-center justify-content-between">
          <span className="text-xs text-muted">{filteredMedia.length} élément{filteredMedia.length > 1 ? 's' : ''}</span>
          <div className="d-flex align-items-center gap-2">
            <button type="button" onClick={onClose} className="btn btn-light btn-sm text-xs rounded-3 px-3">
              Annuler
            </button>
            <button
              type="button"
              disabled={!selectedId}
              onClick={handleConfirmSelect}
              className="btn btn-primary btn-sm text-xs rounded-3 px-3 fw-semibold d-flex align-items-center gap-1"
            >
              <Check size={14} /> Insérer ce média
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default MediaPickerModal;
