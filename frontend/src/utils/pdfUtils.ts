/**
 * PDF Utilities
 * Client-side PDF to image conversion using PDF.js
 */

import * as pdfjsLib from 'pdfjs-dist';

// Set worker source - use local worker from node_modules
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).href;

export interface PDFPage {
  pageNumber: number;
  thumbnailUrl: string;
  width: number;
  height: number;
}

export interface PDFConversionResult {
  filename: string;
  pageCount: number;
  pages: PDFPage[];
  thumbnailUrl: string; // First page as main thumbnail
}

/**
 * Detect if a canvas is mostly blank (white/light colored)
 */
function isCanvasBlank(canvas: HTMLCanvasElement, threshold: number = 0.95): boolean {
  const context = canvas.getContext('2d');
  if (!context) return false;
  
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  let lightPixels = 0;
  // Check every 4th pixel for performance (RGBA)
  for (let i = 0; i < data.length; i += 16) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    
    // Consider pixel light if it's mostly white or transparent
    if ((r > 200 && g > 200 && b > 200) || a < 50) {
      lightPixels++;
    }
  }
  
  const totalPixels = data.length / 16;
  const lightRatio = lightPixels / totalPixels;
  
  return lightRatio > threshold;
}

/**
 * Convert a PDF file to images (data URLs)
 * @param file - The PDF file to convert
 * @param scale - Scale factor for rendering (default 1.5 for good quality)
 * @returns Promise with conversion result
 */
export async function convertPDFToImages(
  file: File,
  scale: number = 1.5
): Promise<PDFConversionResult> {
  console.log(`[pdfUtils] Converting PDF: ${file.name}`);
  
  // Read file as ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();
  
  // Load PDF document
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pageCount = pdf.numPages;
  
  console.log(`[pdfUtils] PDF loaded: ${pageCount} pages`);
  
  const pages: PDFPage[] = [];
  
  // Convert each page to image
  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    
    // Create canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) {
      console.error(`[pdfUtils] Failed to get canvas context for page ${i}`);
      continue;
    }
    
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    // Render page to canvas
    await page.render({
      canvasContext: context,
      viewport: viewport,
      // @ts-ignore - pdfjs types issue
      canvas: canvas,
    }).promise;
    
    // Skip blank pages
    if (isCanvasBlank(canvas)) {
      console.log(`[pdfUtils] Skipping blank page ${i}`);
      continue;
    }
    
    // Convert canvas to data URL
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    
    pages.push({
      pageNumber: i,
      thumbnailUrl: dataUrl,
      width: viewport.width,
      height: viewport.height,
    });
    
    console.log(`[pdfUtils] Page ${i} converted and included (${viewport.width}x${viewport.height})`);
  }
  
  return {
    filename: file.name,
    pageCount,
    pages,
    thumbnailUrl: pages[0]?.thumbnailUrl || '',
  };
}

/**
 * Convert an image file to data URL
 * @param file - The image file to convert
 * @returns Promise with data URL
 */
export function convertImageToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      console.log(`[pdfUtils] Image converted: ${file.name}`);
      resolve(result);
    };
    reader.onerror = (e) => {
      console.error(`[pdfUtils] Failed to read image: ${file.name}`, e);
      reject(e);
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Process a file (PDF or image) and return preview data
 * @param file - The file to process
 * @returns Promise with processed file data
 */
export async function processFileForPreview(file: File): Promise<{
  filename: string;
  size: number;
  type: string;
  thumbnailUrl: string;
  pages: PDFPage[];
  fileObject: File;
}> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  const isPDF = ext === 'pdf';
  
  if (isPDF) {
    const result = await convertPDFToImages(file);
    return {
      filename: file.name,
      size: file.size,
      type: file.type,
      thumbnailUrl: result.thumbnailUrl,
      pages: result.pages,
      fileObject: file,
    };
  } else {
    // For images
    const dataUrl = await convertImageToDataURL(file);
    return {
      filename: file.name,
      size: file.size,
      type: file.type,
      thumbnailUrl: dataUrl,
      pages: [{
        pageNumber: 1,
        thumbnailUrl: dataUrl,
        width: 0,
        height: 0,
      }],
      fileObject: file,
    };
  }
}
