/**
 * Dashboard Types
 * Type definitions for dashboard feature
 */

export interface FileInfo {
  filename: string;
  size: number;
  created: string;
  has_text: boolean;
  processing?: boolean;
  processing_step?: number;
  thumbnailUrl?: string;
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
