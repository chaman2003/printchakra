/**
 * API Services
 * Centralized API client services
 */

import apiClient from '../apiClient';
import type {
  FileInfo,
  ScanConfig,
  PrintConfig,
  ConversionOptions,
} from '../features/dashboard/types';

/**
 * File Service
 * Handles file operations
 */
export class FileService {
  /**
   * Get list of files
   */
  static async listFiles(): Promise<FileInfo[]> {
    const response = await apiClient.get('/files');
    return response.data.files || [];
  }

  /**
   * Upload file
   */
  static async uploadFile(file: File, onProgress?: (progress: number) => void): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: progressEvent => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });

    return response.data.filename;
  }

  /**
   * Delete file
   */
  static async deleteFile(filename: string): Promise<void> {
    await apiClient.delete(`/files/${filename}`);
  }

  /**
   * Download file
   */
  static getFileUrl(filename: string): string {
    return `${apiClient.defaults.baseURL}/files/${filename}`;
  }

  /**
   * Check if file exists
   */
  static async fileExists(filename: string): Promise<boolean> {
    const response = await apiClient.get(`/files/${filename}/exists`);
    return response.data.exists;
  }
}

/**
 * Scan Service
 * Handles scanner operations
 */
export class ScanService {
  /**
   * Get available scanners
   */
  static async getScanners(): Promise<string[]> {
    const response = await apiClient.get('/scan/scanners');
    return response.data.scanners || [];
  }

  /**
   * Get scan preview
   */
  static async getPreview(scanner?: string): Promise<any> {
    const response = await apiClient.post('/scan/preview', { scanner });
    return response.data;
  }

  /**
   * Execute scan
   */
  static async executeScan(config: ScanConfig, outputFilename: string): Promise<string> {
    const response = await apiClient.post('/scan/execute', {
      ...config,
      outputFilename,
    });
    return response.data.filename;
  }
}

/**
 * Print Service
 * Handles printer operations
 */
export class PrintService {
  /**
   * Get available printers
   */
  static async getPrinters(): Promise<string[]> {
    const response = await apiClient.get('/print/printers');
    return response.data.printers || [];
  }

  /**
   * Get printer status
   */
  static async getPrinterStatus(printerName: string): Promise<any> {
    const response = await apiClient.get(`/print/status/${printerName}`);
    return response.data;
  }

  /**
   * Execute print job
   */
  static async executePrint(filename: string, config: PrintConfig): Promise<void> {
    await apiClient.post('/print/execute', {
      filename,
      ...config,
    });
  }
}

/**
 * OCR Service
 * Handles OCR operations
 */
export class OCRService {
  /**
   * Get OCR text for file
   */
  static async getOCRText(filename: string): Promise<string> {
    const response = await apiClient.get(`/ocr/${filename}`);
    return response.data.text || '';
  }

  /**
   * Process file with OCR
   */
  static async processOCR(filename: string, language = 'eng'): Promise<string> {
    const response = await apiClient.post('/ocr/process', {
      filename,
      language,
    });
    return response.data.text || '';
  }

  /**
   * Batch OCR processing
   */
  static async batchOCR(filenames: string[], language = 'eng'): Promise<any> {
    const response = await apiClient.post('/ocr/batch', {
      filenames,
      language,
    });
    return response.data;
  }
}

/**
 * Conversion Service
 * Handles file conversion operations
 */
export class ConversionService {
  /**
   * Get supported formats
   */
  static async getSupportedFormats(): Promise<string[]> {
    const response = await apiClient.get('/convert/formats');
    return response.data.formats || [];
  }

  /**
   * Convert single file
   */
  static async convertFile(filename: string, format: string): Promise<string> {
    const response = await apiClient.post('/convert/execute', {
      filename,
      format,
    });
    return response.data.output_filename;
  }

  /**
   * Batch convert files
   */
  static async batchConvert(filenames: string[], format: string): Promise<any> {
    const response = await apiClient.post('/convert/batch', {
      filenames,
      format,
    });
    return response.data;
  }

  /**
   * List converted files
   */
  static async listConverted(): Promise<string[]> {
    const response = await apiClient.get('/convert/list');
    return response.data.files || [];
  }

  /**
   * Get converted file download URL
   */
  static getConvertedFileUrl(filename: string): string {
    return `${apiClient.defaults.baseURL}/convert/download/${filename}`;
  }
}
