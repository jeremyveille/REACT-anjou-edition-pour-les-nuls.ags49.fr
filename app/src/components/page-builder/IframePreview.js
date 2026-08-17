import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export const IframePreview = ({ children, src = null, title = 'preview', device = 'desktop' }) => {
  const iframeRef = useRef(null);
  const [iframeDocument, setIframeDocument] = useState(null);

  // Sync document body once iframe is mounted and loaded
  const handleIframeLoad = () => {
    if (src) return; // If loading via src, we don't do portal manipulation
    if (!iframeRef.current) return;
    const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow.document;
    
    // Set initial doc
    setIframeDocument(doc);
    
    // Inject parent document styles
    const hostStyles = document.querySelectorAll('link[rel="stylesheet"], style');
    hostStyles.forEach((style) => {
      doc.head.appendChild(style.cloneNode(true));
    });

    // Ensure Bootstrap 5 CSS is available inside the iframe
    const bootstrapLink = doc.createElement('link');
    bootstrapLink.rel = 'stylesheet';
    bootstrapLink.href = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css';
    doc.head.appendChild(bootstrapLink);

    // Ensure Outfit font is loaded
    const fontsLink = doc.createElement('link');
    fontsLink.rel = 'stylesheet';
    fontsLink.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap';
    doc.head.appendChild(fontsLink);
  };

  useEffect(() => {
    // If the dark mode class exists on the main html document, apply it to the iframe document
    if (iframeDocument && !src) {
      const isParentDark = document.documentElement.classList.contains('dark-mode');
      const iframeHtml = iframeDocument.documentElement;
      
      if (isParentDark) {
        iframeHtml.classList.add('dark-mode');
      } else {
        iframeHtml.classList.remove('dark-mode');
      }
    }
  }, [iframeDocument, children, src]); // Check on updates to sync styles and darkMode

  // Device dimension class/styles mapping
  const getDimensionStyles = () => {
    switch (device) {
      case 'tablet':
        return {
          width: '768px',
          height: '100%',
          border: '10px solid #334155',
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          margin: '2rem auto',
          transition: 'all 0.3s ease'
        };
      case 'mobile':
        return {
          width: '390px', // Set to 390px as per requirements
          height: '667px',
          border: '12px solid #334155',
          borderRadius: '36px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          margin: '2rem auto',
          transition: 'all 0.3s ease'
        };
      default:
        return {
          width: '100%',
          height: '100%',
          border: 'none',
          transition: 'all 0.3s ease'
        };
    }
  };

  return (
    <div className="w-100 h-100 d-flex align-items-center justify-content-center bg-slate-100 dark:bg-slate-950 overflow-auto">
      <iframe
        title={title}
        ref={iframeRef}
        src={src || undefined}
        onLoad={handleIframeLoad}
        style={getDimensionStyles()}
      >
        {!src && iframeDocument && createPortal(children, iframeDocument.body)}
      </iframe>
    </div>
  );
};

export default IframePreview;
