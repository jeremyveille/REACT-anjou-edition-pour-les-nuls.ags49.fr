import { jsPDF } from 'jspdf';

// Mémoire cache pour les URLs Blob générées afin d'éviter toute re-génération inutile
const pdfBlobCache = new Map();

/**
 * Nettoie les caractères spéciaux pour une compatibilité parfaite avec les polices standards jsPDF
 */
function cleanTextForPdf(str) {
  if (!str) return '';
  return String(str)
    .replace(/[«»]/g, '"')
    .replace(/[’‘`]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/[œ]/g, 'oe')
    .replace(/[Œ]/g, 'OE');
}

/**
 * Génère ou récupère un Blob URL PDF pour un texte ou ouvrage littéraire
 * @param {Object} item - { title, author, date, category, content }
 * @returns {string} Blob URL vers le document PDF prêt pour PdfFlipbookReader
 */
export function getOrCreateTextPdfUrl(item) {
  if (!item || !item.title) return '';

  const cacheKey = (item.title + '_' + (item.author || '')).toLowerCase().replace(/[^a-z0-9]/g, '_');
  if (pdfBlobCache.has(cacheKey)) {
    return pdfBlobCache.get(cacheKey);
  }

  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);

    const safeTitle = cleanTextForPdf(item.title);
    const safeAuthor = cleanTextForPdf(item.author || 'Comité éditorial Anjou Édition');
    const safeDate = cleanTextForPdf(item.date || '2026');
    const safeCategory = cleanTextForPdf(item.category || "Création Littéraire");
    const safeContent = cleanTextForPdf(item.content || "Publication en cours de rédaction...");

    // ==========================================
    // PAGE 1 : COUVERTURE OFFICIELLE ANJOU ÉDITION
    // ==========================================

    // Cadre double bordure élégante
    doc.setDrawColor(0, 75, 122); // Bleu primaire Anjou Édition #004b7a
    doc.setLineWidth(1.4);
    doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

    doc.setDrawColor(217, 119, 6); // Liseré or chaud #d97706
    doc.setLineWidth(0.5);
    doc.rect(12.5, 12.5, pageWidth - 25, pageHeight - 25);

    // En-tête de marque
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(0, 75, 122);
    doc.text("ANJOU ÉDITION", pageWidth / 2, 42, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(100, 116, 139);
    doc.text("POUR LES NULS — ÉCRITS & CRÉATIONS INÉDITES", pageWidth / 2, 49, { align: 'center' });

    // Filet décoratif central sous logo
    doc.setDrawColor(0, 75, 122);
    doc.setLineWidth(0.8);
    doc.line(pageWidth / 2 - 30, 56, pageWidth / 2 + 30, 56);

    // Badge catégorie
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(217, 119, 6);
    doc.text(`[ ${safeCategory.toUpperCase()} ]`, pageWidth / 2, 85, { align: 'center' });

    // Titre de l'œuvre
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42);
    const splitTitle = doc.splitTextToSize(safeTitle, contentWidth - 10);
    doc.text(splitTitle, pageWidth / 2, 110, { align: 'center' });

    // Séparateur fin
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.4);
    doc.line(pageWidth / 2 - 20, 140, pageWidth / 2 + 20, 140);

    // Auteur
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(13);
    doc.setTextColor(51, 65, 85);
    doc.text(`Par ${safeAuthor}`, pageWidth / 2, 155, { align: 'center' });

    // Date / Année
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Publication / Référence : ${safeDate}`, pageWidth / 2, 165, { align: 'center' });

    // Mentions légales bas de page de couverture
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("Édition numérique interactive — Reproduction interdite sans autorisation", pageWidth / 2, pageHeight - 25, { align: 'center' });
    doc.text("http://anjou-edition-pour-les-nuls.ags49.fr", pageWidth / 2, pageHeight - 20, { align: 'center' });

    // ==========================================
    // PAGE 2 ET SUIVANTES : CORPS DE L'ŒUVRE
    // ==========================================
    doc.addPage();

    const drawPageBordersAndHeader = () => {
      // Cadre sobre
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.4);
      doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

      // En-tête courant
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("Anjou Édition — Pour les Nuls", margin, 16);
      doc.text(safeTitle.length > 35 ? safeTitle.slice(0, 35) + '...' : safeTitle, pageWidth - margin, 16, { align: 'right' });
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(margin, 18, pageWidth - margin, 18);
    };

    drawPageBordersAndHeader();

    // Titre de section sur page 2
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(0, 75, 122);
    doc.text(safeTitle, margin, 30);

    // Sous-titre
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`${safeAuthor} • ${safeDate}`, margin, 36);

    doc.setDrawColor(0, 75, 122);
    doc.setLineWidth(0.5);
    doc.line(margin, 40, margin + 40, 40);

    // Texte principal
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(30, 41, 59);

    let currentY = 50;
    const paragraphs = safeContent.split('\n\n');

    for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
      const para = paragraphs[pIdx].trim();
      if (!para) continue;

      const lines = doc.splitTextToSize(para, contentWidth);
      const lineHeight = 5.5;
      const blockHeight = lines.length * lineHeight;

      // Saut de page automatique si dépassement de la hauteur disponible
      if (currentY + blockHeight > pageHeight - 26) {
        doc.addPage();
        drawPageBordersAndHeader();
        currentY = 28;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10.5);
        doc.setTextColor(30, 41, 59);
      }

      doc.text(lines, margin, currentY);
      currentY += blockHeight + 5;
    }

    // Numérotation des pages en pied de page
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Page ${i} sur ${totalPages}`, pageWidth / 2, pageHeight - 14, { align: 'center' });
    }

    const blob = doc.output('blob');
    const objectUrl = URL.createObjectURL(blob);
    pdfBlobCache.set(cacheKey, objectUrl);
    return objectUrl;
  } catch (err) {
    console.error("Erreur lors de la génération dynamique du PDF :", err);
    return '';
  }
}
