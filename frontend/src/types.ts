/**
 * Application Types
 * Common type definitions for the application
 */

export interface FileInfo {
  filename: string;
  size: number;
  created: string;
  has_text: boolean;
  page_count?: number;
  mime_type?: string;
  processing?: boolean;
  processing_step?: number;
  processing_total?: number;
  processing_stage?: string;
  processing_eta?: number;
  processing_progress?: number;
  thumbnail?: string;
  thumbnailUrl?: string; // Keep for compatibility if needed
}

export interface DocumentPage {
  pageNumber: number;
  thumbnailUrl?: string;
  fullUrl?: string;
}

export interface Document {
  filename: string;
  pages?: DocumentPage[];
  thumbnailUrl?: string;
  fullUrl?: string;
}

export interface ScanConfig {
  resolution: number;
  colorMode: 'color' | 'grayscale' | 'bw';
  paperSize: string;
  orientation: 'portrait' | 'landscape';
  autoDetect: boolean;
  enhance: boolean;
  ocr: boolean;
}

export interface PrintConfig {
  printerName?: string;
  copies: number;
  paperSize: string;
  orientation: 'portrait' | 'landscape';
  colorMode: 'color' | 'grayscale' | 'bw';
  quality: 'draft' | 'normal' | 'high';
  printResolution: number;
  duplex: boolean;
  collate: boolean;
  pages?: number[];
  scale: number;
}

export interface PreviewSettings {
  layout?: 'portrait' | 'landscape';
  scale?: number;
  colorMode?: 'color' | 'grayscale' | 'bw';
  paperSize?: string;
}

export interface ConversionOptions {
  format: 'pdf' | 'jpg' | 'png';
  quality?: number;
  dpi?: number;
}
