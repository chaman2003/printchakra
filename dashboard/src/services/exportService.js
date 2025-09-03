import jsPDF from 'jspdf';

class ExportService {
  // Export documents as plain text
  exportAsText(documents, filename = 'documents.txt') {
    let content = 'PrintChakra - Exported Documents\n';
    content += '================================\n\n';
    
    documents.forEach((doc, index) => {
      content += `Document ${index + 1}: ${doc.filename}\n`;
      content += `Captured: ${new Date(doc.captured_at).toLocaleString()}\n`;
      content += `Size: ${(doc.metadata?.file_size / 1024).toFixed(1)} KB\n`;
      content += '--- Text Content ---\n';
      content += doc.ocr_text || 'No text extracted';
      content += '\n\n' + '='.repeat(50) + '\n\n';
    });

    this.downloadTextFile(content, filename);
  }

  // Export documents as PDF
  exportAsPDF(documents, filename = 'documents.pdf') {
    const pdf = new jsPDF();
    const pageHeight = pdf.internal.pageSize.height;
    const margin = 20;
    let y = margin;

    // Title
    pdf.setFontSize(20);
    pdf.text('PrintChakra - Exported Documents', margin, y);
    y += 20;

    // Add a line
    pdf.setLineWidth(0.5);
    pdf.line(margin, y, pdf.internal.pageSize.width - margin, y);
    y += 15;

    documents.forEach((doc, index) => {
      // Check if we need a new page
      if (y > pageHeight - 60) {
        pdf.addPage();
        y = margin;
      }

      // Document header
      pdf.setFontSize(14);
      pdf.setFont(undefined, 'bold');
      pdf.text(`Document ${index + 1}: ${doc.filename}`, margin, y);
      y += 10;

      // Document metadata
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'normal');
      pdf.text(`Captured: ${new Date(doc.captured_at).toLocaleString()}`, margin, y);
      y += 7;
      pdf.text(`Size: ${(doc.metadata?.file_size / 1024).toFixed(1)} KB`, margin, y);
      y += 10;

      // Text content
      pdf.setFontSize(9);
      const text = doc.ocr_text || 'No text extracted';
      const lines = pdf.splitTextToSize(text, pdf.internal.pageSize.width - 2 * margin);
      
      lines.forEach(line => {
        if (y > pageHeight - 20) {
          pdf.addPage();
          y = margin;
        }
        pdf.text(line, margin, y);
        y += 5;
      });

      y += 15; // Space between documents
    });

    pdf.save(filename);
  }

  // Export single document as PDF
  exportSingleDocumentAsPDF(document, filename) {
    const pdf = new jsPDF();
    const margin = 20;
    let y = margin;

    // Title
    pdf.setFontSize(18);
    pdf.text(document.filename, margin, y);
    y += 15;

    // Metadata
    pdf.setFontSize(12);
    pdf.text(`Captured: ${new Date(document.captured_at).toLocaleString()}`, margin, y);
    y += 10;
    pdf.text(`Size: ${(document.metadata?.file_size / 1024).toFixed(1)} KB`, margin, y);
    y += 15;

    // Text content
    pdf.setFontSize(10);
    const text = document.ocr_text || 'No text extracted';
    const lines = pdf.splitTextToSize(text, pdf.internal.pageSize.width - 2 * margin);
    
    lines.forEach(line => {
      if (y > pdf.internal.pageSize.height - 20) {
        pdf.addPage();
        y = margin;
      }
      pdf.text(line, margin, y);
      y += 6;
    });

    const pdfFilename = filename || `${document.filename.replace(/\.[^/.]+$/, "")}.pdf`;
    pdf.save(pdfFilename);
  }

  // Export as JSON
  exportAsJSON(documents, filename = 'documents.json') {
    const data = {
      exportDate: new Date().toISOString(),
      totalDocuments: documents.length,
      documents: documents.map(doc => ({
        id: doc._id,
        filename: doc.filename,
        capturedAt: doc.captured_at,
        ocrText: doc.ocr_text,
        metadata: doc.metadata
      }))
    };

    const content = JSON.stringify(data, null, 2);
    this.downloadTextFile(content, filename, 'application/json');
  }

  // Export search results as CSV
  exportSearchAsCSV(documents, searchQuery, filename = 'search_results.csv') {
    let csv = 'Filename,Captured Date,File Size (KB),Text Content\n';
    
    documents.forEach(doc => {
      const filename = `"${doc.filename.replace(/"/g, '""')}"`;
      const date = new Date(doc.captured_at).toLocaleString();
      const size = (doc.metadata?.file_size / 1024).toFixed(1);
      const text = `"${(doc.ocr_text || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`;
      
      csv += `${filename},${date},${size},${text}\n`;
    });

    this.downloadTextFile(csv, filename, 'text/csv');
  }

  // Helper method to download text files
  downloadTextFile(content, filename, mimeType = 'text/plain') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }

  // Generate filename with timestamp
  generateFilename(prefix, extension) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${prefix}_${timestamp}.${extension}`;
  }
}

export default new ExportService();
