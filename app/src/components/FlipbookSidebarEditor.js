import React, { useState } from 'react';
import { 
  Plus, 
  PanelLeft, 
  PanelRight, 
  ChevronDown, 
  ChevronUp, 
  Image as ImageIcon, 
  Film, 
  FileText, 
  Type, 
  Link as LinkIcon, 
  FileCode 
} from 'lucide-react';
import FlipbookSidebarBlockEditor from './FlipbookSidebarBlockEditor';
import FlipbookBlockModalEditor from './FlipbookBlockModalEditor';
import { MediaLibraryModal } from './MediaLibraryModal';

/**
 * Éditeur complet des deux barres latérales (gauche et droite) pour le Flipbook dans le Dashboard.
 * Permet d'administrer chaque barre sous forme de cartes visuelles compactes :
 * création, modification dans modale spacieuse, duplication en 1 clic, réordonnancement, suppression.
 */
export default function FlipbookSidebarEditor({ flipbook, onChange }) {
  const [mediaModalState, setMediaModalState] = useState({
    isOpen: false,
    callback: null,
    filterType: null
  });

  const [editingModalState, setEditingModalState] = useState({
    isOpen: false,
    position: 'left',
    index: 0,
    block: null
  });

  const [showAddMenuLeft, setShowAddMenuLeft] = useState(false);
  const [showAddMenuRight, setShowAddMenuRight] = useState(false);

  const [isLeftOpen, setIsLeftOpen] = useState(true);
  const [isRightOpen, setIsRightOpen] = useState(true);

  const leftSidebar = Array.isArray(flipbook?.leftSidebar) ? flipbook.leftSidebar : [];
  const rightSidebar = Array.isArray(flipbook?.rightSidebar) ? flipbook.rightSidebar : [];

  const handleOpenMediaLibrary = (callback, filterType = null) => {
    setMediaModalState({
      isOpen: true,
      callback,
      filterType
    });
  };

  const handleCloseMediaLibrary = () => {
    setMediaModalState({
      isOpen: false,
      callback: null,
      filterType: null
    });
  };

  const handleSelectMedia = (selectedMedia) => {
    if (mediaModalState.callback && typeof mediaModalState.callback === 'function') {
      mediaModalState.callback(selectedMedia);
    }
    handleCloseMediaLibrary();
  };

  // Ouverture de la modale d'édition spacieuse pour un bloc
  const handleOpenEditModal = (position, index) => {
    const list = position === 'left' ? leftSidebar : rightSidebar;
    if (list[index]) {
      setEditingModalState({
        isOpen: true,
        position,
        index,
        block: { ...list[index] }
      });
    }
  };

  // Enregistrement depuis la modale d'édition spacieuse
  const handleSaveModalBlock = (updatedBlock) => {
    const { position, index } = editingModalState;
    handleUpdateBlock(position, index, updatedBlock);
  };

  // Création d'un nouveau bloc
  const handleAddBlock = (position, type = 'text') => {
    const newId = `block_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newBlock = {
      id: newId,
      type,
      enabled: true,
      title: '',
      content: '',
      imageUrl: '',
      imageAlt: '',
      caption: '',
      videoUrl: '',
      videoSourceType: 'url',
      text: '',
      level: 'h3',
      buttonText: 'En savoir plus',
      buttonUrl: '#',
      buttonStyle: 'primary',
      openNewTab: false,
      pdfTitle: 'Document complémentaire',
      pdfUrl: '',
      description: ''
    };

    if (type === 'heading') {
      newBlock.text = 'Titre de la section';
      newBlock.level = 'h3';
    } else if (type === 'button') {
      newBlock.buttonText = 'Consulter le catalogue';
      newBlock.buttonUrl = '/flipbooks';
    } else if (type === 'image') {
      newBlock.imageAlt = "Illustration de l'ouvrage";
    }

    if (position === 'left') {
      const updatedLeft = [...leftSidebar, newBlock];
      onChange({ ...flipbook, leftSidebar: updatedLeft });
      setShowAddMenuLeft(false);
    } else {
      const updatedRight = [...rightSidebar, newBlock];
      onChange({ ...flipbook, rightSidebar: updatedRight });
      setShowAddMenuRight(false);
    }
  };

  // Duplication d'un bloc en 1 clic
  const handleDuplicateBlock = (position, index) => {
    const list = position === 'left' ? leftSidebar : rightSidebar;
    const sourceBlock = list[index];
    if (!sourceBlock) return;

    const newId = `block_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const clonedBlock = {
      ...JSON.parse(JSON.stringify(sourceBlock)),
      id: newId,
      title: sourceBlock.title ? `${sourceBlock.title} (Copie)` : sourceBlock.text ? `${sourceBlock.text} (Copie)` : 'Bloc (Copie)'
    };

    const updatedList = [...list];
    updatedList.splice(index + 1, 0, clonedBlock);

    if (position === 'left') {
      onChange({ ...flipbook, leftSidebar: updatedList });
    } else {
      onChange({ ...flipbook, rightSidebar: updatedList });
    }
  };

  // Mise à jour d'un bloc
  const handleUpdateBlock = (position, index, updatedBlock) => {
    if (position === 'left') {
      const updatedLeft = [...leftSidebar];
      updatedLeft[index] = updatedBlock;
      onChange({ ...flipbook, leftSidebar: updatedLeft });
    } else {
      const updatedRight = [...rightSidebar];
      updatedRight[index] = updatedBlock;
      onChange({ ...flipbook, rightSidebar: updatedRight });
    }
  };

  // Suppression d'un bloc
  const handleDeleteBlock = (position, index) => {
    const list = position === 'left' ? leftSidebar : rightSidebar;
    const blockTitle = list[index]?.title || list[index]?.text || `Bloc #${index + 1}`;
    if (window.confirm(`Confirmez-vous la suppression du bloc "${blockTitle}" ?`)) {
      if (position === 'left') {
        const updatedLeft = leftSidebar.filter((_, idx) => idx !== index);
        onChange({ ...flipbook, leftSidebar: updatedLeft });
      } else {
        const updatedRight = rightSidebar.filter((_, idx) => idx !== index);
        onChange({ ...flipbook, rightSidebar: updatedRight });
      }
    }
  };

  // Déplacement vers le haut
  const handleMoveUp = (position, index) => {
    if (index === 0) return;
    const list = position === 'left' ? [...leftSidebar] : [...rightSidebar];
    const temp = list[index - 1];
    list[index - 1] = list[index];
    list[index] = temp;

    if (position === 'left') {
      onChange({ ...flipbook, leftSidebar: list });
    } else {
      onChange({ ...flipbook, rightSidebar: list });
    }
  };

  // Déplacement vers le bas
  const handleMoveDown = (position, index) => {
    const list = position === 'left' ? [...leftSidebar] : [...rightSidebar];
    if (index >= list.length - 1) return;
    const temp = list[index + 1];
    list[index + 1] = list[index];
    list[index] = temp;

    if (position === 'left') {
      onChange({ ...flipbook, leftSidebar: list });
    } else {
      onChange({ ...flipbook, rightSidebar: list });
    }
  };

  return (
    <div className="flipbook-sidebars-editor-container" data-testid="flipbook-sidebars-editor">
      {/* Contrôle rapide : Tout déplier / Tout replier */}
      <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-200 dark:border-slate-700">
        <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
          Disposition verticale des barres (pleine largeur 100%)
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { setIsLeftOpen(true); setIsRightOpen(true); }}
            className="ae-btn-link-action text-[11px]"
            title="Déplier les barres gauche et droite"
          >
            Tout déplier
          </button>
          <span className="text-slate-300 dark:text-slate-600">•</span>
          <button
            type="button"
            onClick={() => { setIsLeftOpen(false); setIsRightOpen(false); }}
            className="ae-btn-link-action text-[11px]"
            title="Replier les barres gauche et droite"
          >
            Tout replier
          </button>
        </div>
      </div>

      <div className="flipbook-editor-columns-grid flipbook-editor-stacked-panels flex flex-col gap-4 w-full">
        {/* 1. PANNEAU BARRE GAUCHE (PLEINE LARGEUR) */}
        <div 
          className={`flipbook-sidebar-admin-column ${!isLeftOpen ? 'is-collapsed' : ''}`} 
          data-testid="admin-column-left"
        >
          <div className="flipbook-admin-col-header">
            <button
              type="button"
              onClick={() => setIsLeftOpen(!isLeftOpen)}
              className="flipbook-admin-col-header-btn"
              aria-expanded={isLeftOpen}
              aria-controls="admin-column-left-content"
              aria-label={`Barre gauche, ${leftSidebar.length} bloc${leftSidebar.length > 1 ? 's' : ''}, ${isLeftOpen ? 'cliquer pour replier' : 'cliquer pour déplier'}`}
            >
              <div className="flipbook-admin-col-title">
                <PanelLeft className="text-blue-600 dark:text-blue-400" size={18} aria-hidden="true" />
                <span>Barre gauche</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flipbook-admin-badge-count">
                  {leftSidebar.length} bloc{leftSidebar.length > 1 ? 's' : ''}
                </span>
                <span className="flipbook-admin-chevron-icon" aria-hidden="true">
                  {isLeftOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </span>
              </div>
            </button>
          </div>

          {isLeftOpen && (
            <div id="admin-column-left-content" className="flipbook-admin-column-body">
              <div className="flipbook-admin-blocks-list space-y-2">
                {leftSidebar.map((block, idx) => (
                  <FlipbookSidebarBlockEditor
                    key={block.id || `left-block-${idx}`}
                    block={block}
                    index={idx}
                    totalBlocks={leftSidebar.length}
                    position="left"
                    onUpdate={(updated) => handleUpdateBlock('left', idx, updated)}
                    onDelete={() => handleDeleteBlock('left', idx)}
                    onMoveUp={() => handleMoveUp('left', idx)}
                    onMoveDown={() => handleMoveDown('left', idx)}
                    onDuplicate={() => handleDuplicateBlock('left', idx)}
                    onEdit={() => handleOpenEditModal('left', idx)}
                    onOpenMediaLibrary={handleOpenMediaLibrary}
                    defaultExpanded={false}
                  />
                ))}

                {leftSidebar.length === 0 && (
                  <div className="flipbook-admin-empty-msg">
                    Aucun bloc configuré dans la barre gauche.
                  </div>
                )}
              </div>

              {/* Bouton Ajouter un bloc à proximité immédiate de la fin de la liste */}
              <div className="flipbook-add-block-footer mt-3">
                {!showAddMenuLeft ? (
                  <button
                    type="button"
                    onClick={() => setShowAddMenuLeft(true)}
                    className="flipbook-btn-add-block"
                    aria-label="Ajouter un bloc à la barre gauche"
                  >
                    <Plus size={16} aria-hidden="true" />
                    <span>+ Ajouter un bloc</span>
                  </button>
                ) : (
                  <div className="flipbook-add-menu">
                    <button
                      type="button"
                      onClick={() => handleAddBlock('left', 'image')}
                      className="flipbook-add-type-btn"
                    >
                      <ImageIcon size={16} /> Image
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddBlock('left', 'video')}
                      className="flipbook-add-type-btn"
                    >
                      <Film size={16} /> Vidéo
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddBlock('left', 'text')}
                      className="flipbook-add-type-btn"
                    >
                      <FileText size={16} /> Texte
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddBlock('left', 'heading')}
                      className="flipbook-add-type-btn"
                    >
                      <Type size={16} /> Titre
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddBlock('left', 'button')}
                      className="flipbook-add-type-btn"
                    >
                      <LinkIcon size={16} /> Bouton
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddBlock('left', 'pdf')}
                      className="flipbook-add-type-btn"
                    >
                      <FileCode size={16} /> PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddMenuLeft(false)}
                      className="col-span-full text-center text-xs text-slate-500 hover:text-slate-700 py-1 cursor-pointer bg-transparent border-none mt-1"
                    >
                      Annuler
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 2. PANNEAU BARRE DROITE (PLEINE LARGEUR) */}
        <div 
          className={`flipbook-sidebar-admin-column ${!isRightOpen ? 'is-collapsed' : ''}`} 
          data-testid="admin-column-right"
        >
          <div className="flipbook-admin-col-header">
            <button
              type="button"
              onClick={() => setIsRightOpen(!isRightOpen)}
              className="flipbook-admin-col-header-btn"
              aria-expanded={isRightOpen}
              aria-controls="admin-column-right-content"
              aria-label={`Barre droite, ${rightSidebar.length} bloc${rightSidebar.length > 1 ? 's' : ''}, ${isRightOpen ? 'cliquer pour replier' : 'cliquer pour déplier'}`}
            >
              <div className="flipbook-admin-col-title">
                <PanelRight className="text-blue-600 dark:text-blue-400" size={18} aria-hidden="true" />
                <span>Barre droite</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flipbook-admin-badge-count">
                  {rightSidebar.length} bloc{rightSidebar.length > 1 ? 's' : ''}
                </span>
                <span className="flipbook-admin-chevron-icon" aria-hidden="true">
                  {isRightOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </span>
              </div>
            </button>
          </div>

          {isRightOpen && (
            <div id="admin-column-right-content" className="flipbook-admin-column-body">
              <div className="flipbook-admin-blocks-list space-y-2">
                {rightSidebar.map((block, idx) => (
                  <FlipbookSidebarBlockEditor
                    key={block.id || `right-block-${idx}`}
                    block={block}
                    index={idx}
                    totalBlocks={rightSidebar.length}
                    position="right"
                    onUpdate={(updated) => handleUpdateBlock('right', idx, updated)}
                    onDelete={() => handleDeleteBlock('right', idx)}
                    onMoveUp={() => handleMoveUp('right', idx)}
                    onMoveDown={() => handleMoveDown('right', idx)}
                    onDuplicate={() => handleDuplicateBlock('right', idx)}
                    onEdit={() => handleOpenEditModal('right', idx)}
                    onOpenMediaLibrary={handleOpenMediaLibrary}
                    defaultExpanded={false}
                  />
                ))}

                {rightSidebar.length === 0 && (
                  <div className="flipbook-admin-empty-msg">
                    Aucun bloc configuré dans la barre droite.
                  </div>
                )}
              </div>

              {/* Bouton Ajouter un bloc à proximité immédiate de la fin de la liste */}
              <div className="flipbook-add-block-footer mt-3">
                {!showAddMenuRight ? (
                  <button
                    type="button"
                    onClick={() => setShowAddMenuRight(true)}
                    className="flipbook-btn-add-block"
                    aria-label="Ajouter un bloc à la barre droite"
                  >
                    <Plus size={16} aria-hidden="true" />
                    <span>+ Ajouter un bloc</span>
                  </button>
                ) : (
                  <div className="flipbook-add-menu">
                    <button
                      type="button"
                      onClick={() => handleAddBlock('right', 'image')}
                      className="flipbook-add-type-btn"
                    >
                      <ImageIcon size={16} /> Image
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddBlock('right', 'video')}
                      className="flipbook-add-type-btn"
                    >
                      <Film size={16} /> Vidéo
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddBlock('right', 'text')}
                      className="flipbook-add-type-btn"
                    >
                      <FileText size={16} /> Texte
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddBlock('right', 'heading')}
                      className="flipbook-add-type-btn"
                    >
                      <Type size={16} /> Titre
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddBlock('right', 'button')}
                      className="flipbook-add-type-btn"
                    >
                      <LinkIcon size={16} /> Bouton
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddBlock('right', 'pdf')}
                      className="flipbook-add-type-btn"
                    >
                      <FileCode size={16} /> PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddMenuRight(false)}
                      className="col-span-full text-center text-xs text-slate-500 hover:text-slate-700 py-1 cursor-pointer bg-transparent border-none mt-1"
                    >
                      Annuler
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modale d'édition spacieuse pour un bloc individuel */}
      {editingModalState.isOpen && editingModalState.block && (
        <FlipbookBlockModalEditor
          isOpen={editingModalState.isOpen}
          block={editingModalState.block}
          position={editingModalState.position}
          index={editingModalState.index}
          onSave={handleSaveModalBlock}
          onClose={() => setEditingModalState(prev => ({ ...prev, isOpen: false, block: null }))}
          onOpenMediaLibrary={handleOpenMediaLibrary}
        />
      )}

      {/* Modal Médiathèque mutualisée */}
      {mediaModalState.isOpen && (
        <MediaLibraryModal
          isOpen={mediaModalState.isOpen}
          onClose={handleCloseMediaLibrary}
          onSelect={handleSelectMedia}
          filterType={mediaModalState.filterType}
          title="Sélectionner un média pour la barre latérale"
        />
      )}
    </div>
  );
}
