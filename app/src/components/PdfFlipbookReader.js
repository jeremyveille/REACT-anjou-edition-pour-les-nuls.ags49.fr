import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, 
  ZoomIn, ZoomOut, Maximize, Minimize, Download, 
  BookOpen, FileText, AlertCircle, List, Grid, Search, X,
  Volume2, VolumeX
} from "lucide-react";
import { getPDFFile } from "../utils/indexedDBStorage";
import "../styles/pdf-reader.css";

// Helper to resolve PDF Outline destination to page number
const resolveOutlinePage = async (pdf, dest) => {
  if (typeof dest === "string") {
    const destArray = await pdf.getDestination(dest);
    if (destArray && destArray[0]) {
      const pageIndex = await pdf.getPageIndex(destArray[0]);
      return pageIndex + 1;
    }
  } else if (Array.isArray(dest) && dest[0]) {
    const pageIndex = await pdf.getPageIndex(dest[0]);
    return pageIndex + 1;
  }
  return null;
};

// PDF Page renderer sub-component
const PdfPage = ({ pdfDoc, pageNumber, scale, textLayerActive, searchQuery }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const renderTaskRef = useRef(null);

  useEffect(() => {
    if (!pdfDoc || !pageNumber || pageNumber < 1 || pageNumber > pdfDoc.numPages) return;

    let isCancelled = false;

    const renderPage = async () => {
      try {
        setLoading(true);
        const page = await pdfDoc.getPage(pageNumber);
        if (isCancelled) return;

        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext("2d");
        
        // Handle high DPI screens for razor-sharp rendering
        const pixelRatio = window.devicePixelRatio || 1;
        canvas.width = viewport.width * pixelRatio;
        canvas.height = viewport.height * pixelRatio;
        canvas.style.width = viewport.width + "px";
        canvas.style.height = viewport.height + "px";

        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

        // Cancel previous rendering task if running
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;

        await renderTask.promise;
        if (isCancelled) return;
        
        setLoading(false);

        // Render Text Selection & Search Highlight Layer
        if (textLayerActive && window.pdfjsLib && typeof window.pdfjsLib.renderTextLayer === "function") {
          try {
            const textContent = await page.getTextContent();
            if (isCancelled) return;

            const wrapper = containerRef.current;
            if (!wrapper) return;

            // Remove existing text layer if present
            const oldTextLayer = wrapper.querySelector(".textLayer");
            if (oldTextLayer) {
              oldTextLayer.remove();
            }

            const textLayerDiv = document.createElement("div");
            textLayerDiv.className = "textLayer";
            textLayerDiv.style.width = `${viewport.width}px`;
            textLayerDiv.style.height = `${viewport.height}px`;
            textLayerDiv.style.position = "absolute";
            textLayerDiv.style.top = "0";
            textLayerDiv.style.left = "0";
            textLayerDiv.style.setProperty('--scale-factor', viewport.scale);
            wrapper.appendChild(textLayerDiv);

            await window.pdfjsLib.renderTextLayer({
              textContentSource: textContent,
              container: textLayerDiv,
              viewport: viewport,
              textDivs: []
            }).promise;

            if (isCancelled) return;

            // Apply search query highlighting to text layer span items
            if (searchQuery) {
              const textSpans = textLayerDiv.querySelectorAll("span");
              // eslint-disable-next-line no-useless-escape
              const regex = new RegExp(searchQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
              
              textSpans.forEach(span => {
                const text = span.textContent;
                if (text.toLowerCase().includes(searchQuery.toLowerCase())) {
                  span.innerHTML = text.replace(regex, '<mark>$&</mark>');
                }
              });
            }
          } catch (textErr) {
            console.warn("Failed to render text layer:", textErr);
          }
        }
      } catch (err) {
        if (err.name !== "HeadingTaskUndefined" && err.name !== "RenderingCancelledException" && err.message !== "cancelled") {
          console.error("Error rendering PDF page:", err);
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [pdfDoc, pageNumber, scale, textLayerActive, searchQuery]);

  return (
    <div ref={containerRef} className="pdf-page-wrapper" style={{ position: "relative", display: "inline-block" }}>
      {loading && (
        <div className="absolute inset-0 bg-slate-900/10 dark:bg-slate-955/20 flex flex-col items-center justify-center text-xs text-slate-500 z-10">
          <div className="pdf-spinner mb-2"></div>
          <span>Chargement...</span>
        </div>
      )}
      <canvas ref={canvasRef} className="pdf-canvas shadow-md border border-slate-200 dark:border-slate-800" />
    </div>
  );
};

// Thumbnail Page sub-component
const ThumbnailPage = ({ pdfDoc, pageNumber, onClick, isActive }) => {
  const canvasRef = useRef(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!pdfDoc) return;
    let active = true;
    let renderTask = null;

    const drawThumb = async () => {
      try {
        setLoading(true);
        const page = await pdfDoc.getPage(pageNumber);
        if (!active) return;

        const viewport = page.getViewport({ scale: 0.18 });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        const ratio = window.devicePixelRatio || 1;
        
        canvas.width = viewport.width * ratio;
        canvas.height = viewport.height * ratio;
        canvas.style.width = viewport.width + "px";
        canvas.style.height = viewport.height + "px";
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

        renderTask = page.render({
          canvasContext: ctx,
          viewport: viewport
        });

        await renderTask.promise;
        if (active) setLoading(false);
      } catch (err) {
        console.warn("Thumbnail render error:", err);
      }
    };

    drawThumb();

    return () => {
      active = false;
      if (renderTask) renderTask.cancel();
    };
  }, [pdfDoc, pageNumber]);

  return (
    <button 
      type="button"
      className={`thumb-page flex flex-col items-center flex-shrink-0 cursor-pointer p-1 rounded transition-all ${
        isActive ? 'active' : 'hover-state'
      }`} 
      onClick={onClick}
      style={{ background: 'none', border: 'none', font: 'inherit', color: 'inherit' }}
      aria-label={`Aller à la page ${pageNumber}`}
    >
      <div className={`thumb-page-img-wrapper relative bg-white p-0.5 shadow-md transition-all ${isActive ? 'active' : ''}`}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/10">
            <div className="pdf-spinner" style={{ width: "16px", height: "16px" }}></div>
          </div>
        )}
        <canvas ref={canvasRef} style={{ display: "block", maxHeight: "100px", width: "auto" }} />
      </div>
      <span className={`thumb-page-label text-[10px] mt-1 ${isActive ? 'active' : ''}`}>
        Page {pageNumber}
      </span>
    </button>
  );
};

export default function PdfFlipbookReader({ book, onClose }) {
  const containerRef = useRef(null);
  const viewportRef = useRef(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Navigation states
  const [currentPage, setCurrentPage] = useState(1); // Start directly on page 1
  const [zoomFactor, setZoomFactor] = useState(1.0);
  const [readerMode, setReaderMode] = useState("single"); // Default to single page mode
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pdfObjectUrl, setPdfObjectUrl] = useState(null);

  // Advanced drawer states
  const [showToc, setShowToc] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [tocItems, setTocItems] = useState([]);
  
  // Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMatches, setSearchMatches] = useState([]);
  const [currentMatchIdx, setCurrentMatchIdx] = useState(-1);
  const [searchLoading, setSearchLoading] = useState(false);

  // Responsive sizing states
  const [viewportSize, setViewportSize] = useState({ width: 800, height: 600 });
  const [pdfPageOriginalSize, setPdfPageOriginalSize] = useState(null);

  const numPages = pdfDoc ? pdfDoc.numPages : 0;

  // Sound states
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const local = localStorage.getItem("ae_flipbook_sound");
    return local !== null ? local === "true" : true;
  });
  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const gainNodeRef = useRef(null);
  const isFirstRender = useRef(true);

  // Gesture swiping refs
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // Observe viewport element to calculate available dimensions
  useEffect(() => {
    const viewportEl = viewportRef.current;
    if (!viewportEl) return;

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      setViewportSize({ width, height });
    });

    resizeObserver.observe(viewportEl);
    return () => {
      resizeObserver.disconnect();
    };
  }, [loading, showToc, showSearch, showThumbnails]);

  // Reset navigation and zoom state when opening a new book
  useEffect(() => {
    setCurrentPage(1);
    setZoomFactor(1.0);
    setPdfPageOriginalSize(null);
    isFirstRender.current = true;
  }, [book]);

  // Initialize audio object
  useEffect(() => {
    try {
      const audio = new Audio(process.env.PUBLIC_URL + "/page-turn.mp3");
      audio.volume = 1.0; // Keep standard volume at 1.0 (max)
      audioRef.current = audio;

      // Set up Web Audio API to amplify volume to 1.0 (1x)
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        const audioCtx = new AudioContextClass();
        const source = audioCtx.createMediaElementSource(audio);
        const gainNode = audioCtx.createGain();
        gainNode.gain.value = 1.0; // Set gain value to 1.0 (100% volume)
        source.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        audioContextRef.current = audioCtx;
        gainNodeRef.current = gainNode;
      }
    } catch (e) {
      console.warn("Failed to initialize audio:", e);
    }

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Save sound setting to localStorage
  useEffect(() => {
    localStorage.setItem("ae_flipbook_sound", soundEnabled.toString());
  }, [soundEnabled]);

  // Audio playing helper
  const playPageTurn = () => {
    if (!soundEnabled || !audioRef.current) return;
    try {
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(() => {});
      }
      const audio = audioRef.current;
      audio.currentTime = 0; // reset playback to the beginning
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          // Silent catch for browser autoplay block
          console.log("Audio play blocked:", err);
        });
      }
    } catch (e) {
      // Silent catch
    }
  };

  // Play sound on page change
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    playPageTurn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore key events when typing in search input or page number input
      if (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA") {
        return;
      }
      if (e.key === "ArrowLeft") {
        handlePrevPage();
      } else if (e.key === "ArrowRight") {
        handleNextPage();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, readerMode, numPages]);

  // Compute the scale dynamically to fit the viewport size
  const scale = useMemo(() => {
    if (!pdfPageOriginalSize) return zoomFactor;

    const padding = 30; // 15px padding on each side
    const availableWidth = Math.max(200, viewportSize.width - padding);
    const availableHeight = Math.max(200, viewportSize.height - padding);

    let calculatedFitScale = 1.0;
    if (readerMode === "double") {
      const gap = 16;
      const totalOriginalWidth = pdfPageOriginalSize.width * 2 + gap;
      const scaleW = availableWidth / totalOriginalWidth;
      const scaleH = availableHeight / pdfPageOriginalSize.height;
      calculatedFitScale = Math.min(scaleW, scaleH);
    } else {
      const scaleW = availableWidth / pdfPageOriginalSize.width;
      const scaleH = availableHeight / pdfPageOriginalSize.height;
      calculatedFitScale = Math.min(scaleW, scaleH);
    }

    return calculatedFitScale * zoomFactor;
  }, [pdfPageOriginalSize, viewportSize, readerMode, zoomFactor]);

  // Compute container dimensions dynamically
  const pageWidth = pdfPageOriginalSize ? pdfPageOriginalSize.width : 380;
  const pageHeight = pdfPageOriginalSize ? pdfPageOriginalSize.height : 530;

  const containerStyle = {
    width: pageWidth * scale,
    height: pageHeight * scale
  };

  // Load PDF.js assets dynamically from CDN
  useEffect(() => {
    let active = true;

    const initializePdfJs = async () => {
      try {
        // Load stylesheet
        if (!document.getElementById("pdfjs-viewer-css")) {
          const link = document.createElement("link");
          link.id = "pdfjs-viewer-css";
          link.rel = "stylesheet";
          link.href = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf_viewer.min.css";
          document.head.appendChild(link);
        }

        // Load library
        if (!window.pdfjsLib) {
          await new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
            script.onload = resolve;
            script.onerror = reject;
            document.body.appendChild(script);
          });
        }

        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        }
      } catch (err) {
        console.error("Failed to load PDF.js library:", err);
        if (active) setError("Impossible de charger la bibliothèque PDF.js.");
      }
    };

    const loadPdfFile = async () => {
      await initializePdfJs();
      if (!active) return;

      try {
        setLoading(true);
        setError(null);

        let pdfSource = null;

        let isFallback = false;

        // Resolution strategy:
        // 1. Try IndexedDB cache (stored under book ID)
        if (book.id) {
          const cachedFile = await getPDFFile(book.id);
          if (cachedFile) {
            const url = URL.createObjectURL(cachedFile);
            setPdfObjectUrl(url);
            pdfSource = url;
            console.log(`Loaded PDF for book "${book.title}" from IndexedDB cache.`);
          }
        }

        // 2. Try Firestore/Storage pdfUrl
        if (!pdfSource && book.pdfUrl) {
          pdfSource = book.pdfUrl;
          console.log(`Loading PDF for book "${book.title}" from Firebase URL.`);
        }

        // 3. Fallback to local public folder file (e.g. guide_historique_anjou.pdf)
        if (!pdfSource && book.pdfFile) {
          pdfSource = book.pdfFile.startsWith("http") ? book.pdfFile : `/${book.pdfFile}`;
          console.log(`Loading PDF for book "${book.title}" from relative path: ${pdfSource}`);
          isFallback = true;
        }

        if (!pdfSource) {
          throw new Error("Aucun fichier source PDF n'a été spécifié pour ce livre.");
        }

        let doc = null;
        try {
          const loadingTask = window.pdfjsLib.getDocument({
            url: pdfSource,
            withCredentials: false
          });
          doc = await loadingTask.promise;
        } catch (loadErr) {
          console.warn(`Failed to load PDF from primary source (${pdfSource}):`, loadErr);
          // If we haven't already used the local fallback and a local file path exists, try it
          if (!isFallback && book.pdfFile) {
            const fallbackPath = book.pdfFile.startsWith("http") ? book.pdfFile : `/${book.pdfFile}`;
            console.log(`Attempting fallback loading from local path: ${fallbackPath}`);
            const loadingTask = window.pdfjsLib.getDocument({
              url: fallbackPath,
              withCredentials: false
            });
            doc = await loadingTask.promise;
          } else {
            throw loadErr;
          }
        }

        if (active && doc) {
          setPdfDoc(doc);
          // Get original dimensions of page 1 to compute fit scale
          try {
            const page = await doc.getPage(1);
            const vp = page.getViewport({ scale: 1.0 });
            setPdfPageOriginalSize({ width: vp.width, height: vp.height });
          } catch (sizeErr) {
            console.error("Failed to get page 1 size:", sizeErr);
          }
          setLoading(false);
        }
      } catch (err) {
        console.error("Error loading PDF document:", err);
        if (active) {
          setError(`Erreur de lecture du PDF : ${err.message || err}`);
          setLoading(false);
        }
      }
    };

    loadPdfFile();

    // Auto toggle single-page on small screens
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setReaderMode("single");
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      active = false;
      window.removeEventListener("resize", handleResize);
    };
  }, [book]);

  // Load TOC / Table of Contents
  useEffect(() => {
    if (!pdfDoc) return;
    
    const loadTOC = async () => {
      try {
        const outline = await pdfDoc.getOutline();
        if (!outline || outline.length === 0) {
          setTocItems([]);
          return;
        }

        const resolved = [];
        for (const item of outline) {
          let pageNum = null;
          if (item.dest) {
            pageNum = await resolveOutlinePage(pdfDoc, item.dest);
          }
          resolved.push({
            title: item.title,
            pageNum: pageNum,
            dest: item.dest
          });
        }
        setTocItems(resolved);
      } catch (err) {
        console.error("Failed to load outline:", err);
      }
    };
    
    loadTOC();
  }, [pdfDoc]);

  // Clean up Object URL
  useEffect(() => {
    return () => {
      if (pdfObjectUrl) {
        URL.revokeObjectURL(pdfObjectUrl);
      }
    };
  }, [pdfObjectUrl]);

  // Fullscreen monitor
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Error enabling fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const goToPage = (pageNum) => {
    if (readerMode === "double") {
      if (pageNum === 1) {
        setCurrentPage(0);
      } else {
        setCurrentPage(pageNum - (pageNum % 2));
      }
    } else {
      setCurrentPage(pageNum);
    }
  };

  const handlePageInputChange = (e) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 1 && val <= numPages) {
      goToPage(val);
    }
  };

  const handlePrevPage = () => {
    if (readerMode === "double") {
      setCurrentPage(prev => Math.max(0, prev - 2));
    } else {
      setCurrentPage(prev => Math.max(1, prev - 1));
    }
  };

  const handleNextPage = () => {
    if (readerMode === "double") {
      if (currentPage === 0) {
        setCurrentPage(2);
      } else {
        setCurrentPage(prev => Math.min(numPages + 1, prev + 2));
      }
    } else {
      setCurrentPage(prev => Math.min(numPages, prev + 1));
    }
  };

  const handleGoToFirst = () => {
    if (readerMode === "double") {
      setCurrentPage(0);
    } else {
      setCurrentPage(1);
    }
  };

  const handleGoToLast = () => {
    if (readerMode === "double") {
      const target = numPages % 2 === 0 ? numPages : numPages - 1;
      setCurrentPage(target);
    } else {
      setCurrentPage(numPages);
    }
  };

  // Zoom helpers
  const zoomIn = () => setZoomFactor(prev => Math.min(3.0, prev + 0.2));
  const zoomOut = () => setZoomFactor(prev => Math.max(0.4, prev - 0.2));
  const resetZoom = () => setZoomFactor(1.0);

  // Search Logic
  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchMatches([]);
      setCurrentMatchIdx(-1);
      return;
    }

    setSearchLoading(true);
    const matches = [];

    try {
      for (let i = 1; i <= numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(" ");
        if (pageText.toLowerCase().includes(searchQuery.toLowerCase())) {
          matches.push(i);
        }
      }
      setSearchMatches(matches);
      if (matches.length > 0) {
        setCurrentMatchIdx(0);
        goToPage(matches[0]);
      } else {
        setCurrentMatchIdx(-1);
      }
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setSearchLoading(false);
    }
  };

  const jumpToMatch = (idx) => {
    if (idx >= 0 && idx < searchMatches.length) {
      setCurrentMatchIdx(idx);
      goToPage(searchMatches[idx]);
    }
  };

  // Download PDF
  const handleDownload = async () => {
    try {
      let url = pdfObjectUrl || book.pdfUrl || (book.pdfFile ? (book.pdfFile.startsWith("http") ? book.pdfFile : `/${book.pdfFile}`) : null);
      if (!url) return;

      const link = document.createElement("a");
      link.href = url;
      link.download = book.pdfFile || `${book.title}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert("Erreur lors du téléchargement : " + err.message);
    }
  };

  // Active page computation for displaying page numbers
  const displayCurrentPage = (() => {
    if (readerMode === "double") {
      return currentPage === 0 ? 1 : Math.min(numPages, currentPage);
    }
    return Math.max(1, Math.min(numPages, currentPage));
  })();

  const handleTouchStart = (e) => {
    touchStartX.current = e.changedTouches[0].screenX;
  };

  const handleTouchEnd = (e) => {
    touchEndX.current = e.changedTouches[0].screenX;
    handleSwipe();
  };

  const handleSwipe = () => {
    const diff = touchStartX.current - touchEndX.current;
    const swipeThreshold = 50; // minimum distance in px
    if (diff > swipeThreshold) {
      handleNextPage();
    } else if (diff < -swipeThreshold) {
      handlePrevPage();
    }
  };

  return (
    <div ref={containerRef} className="pdf-reader-container">
      {/* Header / Toolbar */}
      <div className="pdf-reader-header">
        <h3 className="pdf-reader-title">
          <BookOpen className="w-5 h-5 pdf-reader-title-icon animate-pulse" />
          <span>{book.title}</span>
        </h3>

        {/* Toolbar Controls */}
        <div className="pdf-reader-toolbar">
          {/* Panels toggles */}
          <div className="pdf-toolbar-group">
            <button 
              type="button" 
              onClick={() => { setShowToc(!showToc); setShowSearch(false); }} 
              className={`pdf-toolbar-btn ${showToc ? 'active' : ''}`}
              title="Sommaire"
              disabled={loading || !!error}
            >
              <List className="w-4 h-4" />
            </button>
            <button 
              type="button" 
              onClick={() => { setShowSearch(!showSearch); setShowToc(false); }} 
              className={`pdf-toolbar-btn ${showSearch ? 'active' : ''}`}
              title="Rechercher"
              disabled={loading || !!error}
            >
              <Search className="w-4 h-4" />
            </button>
            <button 
              type="button" 
              onClick={() => setShowThumbnails(!showThumbnails)} 
              className={`pdf-toolbar-btn ${showThumbnails ? 'active' : ''}`}
              title="Miniatures"
              disabled={loading || !!error}
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>

          {/* Sound control */}
          <div className="pdf-toolbar-group">
            <button 
              type="button" 
              onClick={() => setSoundEnabled(!soundEnabled)} 
              className={`pdf-toolbar-btn ${soundEnabled ? 'active' : ''}`}
              title={soundEnabled ? "Désactiver le son de page" : "Activer le son de page"}
              disabled={loading || !!error}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>

          {/* Zoom controls */}
          <div className="pdf-toolbar-group">
            <button 
              type="button" 
              onClick={zoomOut} 
              disabled={loading || !!error} 
              className="pdf-toolbar-btn" 
              title="Zoom arrière"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="pdf-zoom-val">{Math.round(scale * 100)}%</span>
            <button 
              type="button" 
              onClick={zoomIn} 
              disabled={loading || !!error} 
              className="pdf-toolbar-btn" 
              title="Zoom avant"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button 
              type="button" 
              onClick={resetZoom} 
              disabled={loading || !!error || zoomFactor === 1.0} 
              className="pdf-toolbar-btn text-btn text-[10px]"
              title="Zoom normal"
            >
              100%
            </button>
          </div>

          {/* Mode Switcher */}
          <div className="pdf-toolbar-group">
            <button
              type="button"
              onClick={() => {
                setReaderMode("single");
                if (currentPage === 0) setCurrentPage(1);
              }}
              disabled={loading || !!error}
              className={`pdf-toolbar-btn ${readerMode === "single" ? "active" : ""}`}
              title="Affichage page unique"
            >
              <FileText className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setReaderMode("double");
                setCurrentPage(prev => (prev === 0 ? 0 : prev - (prev % 2)));
              }}
              disabled={loading || !!error}
              className={`pdf-toolbar-btn ${readerMode === "double" ? "active" : ""}`}
              title="Affichage double page"
            >
              <BookOpen className="w-4 h-4" />
            </button>
          </div>

          {/* Fullscreen & Download */}
          <div className="pdf-toolbar-group">
            <button 
              type="button" 
              onClick={toggleFullscreen} 
              disabled={loading || !!error} 
              className="pdf-toolbar-btn"
              title={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
            <button 
              type="button" 
              onClick={handleDownload} 
              disabled={loading || !!error} 
              className="pdf-toolbar-btn"
              title="Télécharger le PDF original"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>

          {onClose && (
            <button 
              type="button" 
              onClick={onClose} 
              className="bg-red-650 hover:bg-red-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
            >
              Fermer
            </button>
          )}
        </div>
      </div>

      {/* Middle Layout containing Viewport and Drawers */}
      <div className="pdf-reader-middle">
        
        {/* TOC Sidebar Drawer */}
        {showToc && (
          <div className="pdf-sidebar">
            <div className="pdf-sidebar-header">
              <h4>Sommaire</h4>
              <button onClick={() => setShowToc(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="pdf-sidebar-body">
              {tocItems.length === 0 ? (
                <p className="text-xs text-slate-500 italic text-center py-4">Aucun sommaire disponible dans ce document.</p>
              ) : (
                <div className="pdf-toc-list">
                  {tocItems.map((item, idx) => (
                    <button 
                      key={idx} 
                      onClick={() => item.pageNum && goToPage(item.pageNum)} 
                      className="pdf-toc-item text-left flex justify-between items-center"
                      disabled={!item.pageNum}
                    >
                      <span className="truncate" title={item.title}>{item.title}</span>
                      {item.pageNum && <span className="pdf-toc-item-pageNum">p.{item.pageNum}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Viewport Area */}
        <div 
          ref={viewportRef} 
          className="pdf-reader-viewport"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {loading && (
            <div className="pdf-loading-container">
              <div className="pdf-spinner"></div>
              <p className="text-sm font-semibold">Chargement du document PDF original...</p>
              <p className="text-xs text-slate-500">Mise en page, polices et illustrations d'origine respectées</p>
            </div>
          )}

          {error && (
            <div className="pdf-error-container">
              <AlertCircle className="w-12 h-12 mb-2 text-red-500" />
              <p className="font-bold text-md">{error}</p>
              <p className="text-xs text-slate-400 max-w-md">Veuifiez vérifier que le PDF existe et qu'il est disponible.</p>
              {book.pdfFile && (
                <div className="text-xs bg-slate-800 p-2 rounded font-mono text-slate-300 mt-2">
                  Fichier : {book.pdfFile}
                </div>
              )}
            </div>
          )}

          {!loading && !error && pdfDoc && (
            <div className="pdf-book-layout">
              {readerMode === "double" ? (
                /* DOUBLE PAGE VIEW */
                <>
                  {/* Left Page Slot */}
                  {currentPage > 0 ? (
                    <div className="pdf-page-container" style={containerStyle}>
                      <PdfPage 
                        pdfDoc={pdfDoc} 
                        pageNumber={currentPage} 
                        scale={scale} 
                        textLayerActive={true} 
                        searchQuery={searchQuery}
                      />
                    </div>
                  ) : (
                    /* Inside Left Cover */
                    <div className="pdf-page-container empty-cover text-slate-400" style={containerStyle}>
                      <span className="text-4xl mb-3">⚜️</span>
                      <h3>Anjou Édition</h3>
                      <p className="text-xs text-slate-550 italic max-w-[200px]">Lecteur PDF Numérique Premium</p>
                    </div>
                  )}

                  {/* Right Page Slot */}
                  {currentPage + 1 <= numPages ? (
                    <div className="pdf-page-container" style={containerStyle}>
                      <PdfPage 
                        pdfDoc={pdfDoc} 
                        pageNumber={currentPage + 1} 
                        scale={scale} 
                        textLayerActive={true} 
                        searchQuery={searchQuery}
                      />
                    </div>
                  ) : (
                    /* Inside Right Cover (End of Book) */
                    <div className="pdf-page-container empty-cover text-slate-400" style={containerStyle}>
                      <span className="text-3xl mb-2">📖</span>
                      <h3>Fin de l'ouvrage</h3>
                      <p className="text-xs text-slate-550 italic">Merci pour votre lecture !</p>
                    </div>
                  )}
                </>
              ) : (
                /* SINGLE PAGE VIEW */
                <div className="flex flex-col items-center">
                  {currentPage === 0 ? (
                    <div className="pdf-page-container empty-cover text-slate-400" style={containerStyle}>
                      <span className="text-4xl mb-3">⚜️</span>
                      <h3>Anjou Édition</h3>
                      <p className="text-xs text-slate-550 italic max-w-[200px]">{book.title}</p>
                      <button 
                        type="button" 
                        onClick={() => setCurrentPage(1)} 
                        className="mt-4 pdf-empty-cover-btn text-white font-bold text-xs px-3 py-1.5 rounded transition-all cursor-pointer"
                      >
                        Ouvrir le livre
                      </button>
                    </div>
                  ) : currentPage > numPages ? (
                    <div className="pdf-page-container empty-cover text-slate-400" style={containerStyle}>
                      <span className="text-3xl mb-2">📖</span>
                      <h3>Fin de l'ouvrage</h3>
                      <button 
                        type="button" 
                        onClick={() => setCurrentPage(1)} 
                        className="mt-4 pdf-empty-cover-btn text-white font-bold text-xs px-3 py-1.5 rounded transition-all cursor-pointer"
                      >
                        Retourner au début
                      </button>
                    </div>
                  ) : (
                    <div className="pdf-page-container" style={containerStyle}>
                      <PdfPage 
                        pdfDoc={pdfDoc} 
                        pageNumber={currentPage} 
                        scale={scale} 
                        textLayerActive={true} 
                        searchQuery={searchQuery}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Search Sidebar Drawer */}
        {showSearch && (
          <div className="pdf-sidebar right">
            <div className="pdf-sidebar-header">
              <h4>Recherche</h4>
              <button onClick={() => setShowSearch(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="pdf-sidebar-body">
              <form onSubmit={handleSearchSubmit} className="pdf-search-form">
                <input 
                  type="search" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un terme..." 
                  className="pdf-search-input"
                />
                <button type="submit" className="pdf-search-submit">
                  <Search className="w-4 h-4" />
                </button>
              </form>

              {searchLoading && (
                <div className="text-center py-4">
                  <div className="pdf-spinner mx-auto" style={{ width: "20px", height: "20px" }}></div>
                  <p className="text-xs text-slate-500 mt-2">Indexation en cours...</p>
                </div>
              )}

              {!searchLoading && searchMatches.length > 0 && (
                <>
                  <div className="pdf-search-results-nav">
                    <span>{currentMatchIdx + 1} / {searchMatches.length} résultats</span>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => jumpToMatch(currentMatchIdx - 1)} 
                        disabled={currentMatchIdx <= 0}
                        title="Précédent"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => jumpToMatch(currentMatchIdx + 1)} 
                        disabled={currentMatchIdx >= searchMatches.length - 1}
                        title="Suivant"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="pdf-search-matches-list">
                    {searchMatches.map((pageNum, idx) => (
                      <button 
                        key={idx} 
                        onClick={() => jumpToMatch(idx)}
                        className={`pdf-search-match-item text-left ${idx === currentMatchIdx ? 'active' : ''}`}
                      >
                        <span className="font-bold pdf-search-page-num">Page {pageNum}</span>
                        <p className="text-[11px] text-slate-400 mt-1 truncate">
                          Occurrence trouvée à la page {pageNum} du document.
                        </p>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {!searchLoading && searchQuery.trim() && searchMatches.length === 0 && (
                <p className="text-xs text-slate-500 italic text-center py-4">Aucun résultat trouvé pour "{searchQuery}".</p>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Thumbnails Tray Drawer */}
      {showThumbnails && !loading && !error && pdfDoc && (
        <div className="pdf-thumbnails-tray">
          {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
            <ThumbnailPage
              key={pageNum}
              pdfDoc={pdfDoc}
              pageNumber={pageNum}
              isActive={displayCurrentPage === pageNum}
              onClick={() => goToPage(pageNum)}
            />
          ))}
        </div>
      )}

      {/* Footer / Pagination Controls */}
      {!loading && !error && pdfDoc && (
        <div className="pdf-reader-footer">
          <div className="flex gap-2">
            <button 
              type="button" 
              onClick={handleGoToFirst} 
              disabled={readerMode === "double" ? currentPage === 0 : currentPage <= 1} 
              className="pdf-nav-btn px-2.5" 
              title="Première page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button 
              type="button" 
              onClick={handlePrevPage} 
              disabled={readerMode === "double" ? currentPage === 0 : currentPage <= 1} 
              className="pdf-nav-btn"
              title="Page précédente"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          <div className="pdf-page-indicator">
            <span>Page</span>
            <input 
              type="text" 
              value={displayCurrentPage} 
              onChange={handlePageInputChange} 
              className="pdf-page-input"
            />
            <span>sur {numPages}</span>
          </div>

          <div className="flex gap-2">
            <button 
              type="button" 
              onClick={handleNextPage} 
              disabled={readerMode === "double" ? currentPage >= numPages : currentPage >= numPages} 
              className="pdf-nav-btn"
              title="Page suivante"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button 
              type="button" 
              onClick={handleGoToLast} 
              disabled={readerMode === "double" ? currentPage >= numPages : currentPage >= numPages} 
              className="pdf-nav-btn px-2.5" 
              title="Dernière page"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
