/**
 * OCR API Service
 * Functions for interacting with the PaddleOCR backend
 */

import apiClient from './apiClient';
import { OCRResponse, OCRResult } from './types';

/**
 * Run OCR on a processed image with extended timeout
 * @param filename - The filename of the processed image
 * @returns Promise with OCR results
 */
export async function runOCR(filename: string): Promise<OCRResponse> {
  try {
    // Create a request config with extended timeout for OCR operations (120 seconds)
    const response = await apiClient.post<OCRResponse>(`/ocr/${filename}`, {}, {
      timeout: 120000, // 120 seconds for OCR processing
    });
    return response.data;
  } catch (error: any) {
    console.error('[OCR API] Error running OCR:', error);
    // Check if error was due to timeout
    const errorMessage = error.code === 'ECONNABORTED' 
      ? 'OCR is taking longer than expected. Please check the status in a moment.'
      : (error.message || 'OCR processing failed');
    
    return {
      success: false,
      filename,
      ocr_result: null,
      ocr_ready: false,
      error: errorMessage,
    };
  }
}

/**
 * Get existing OCR result for a file
 * @param filename - The filename to get OCR result for
 * @returns Promise with OCR results or null if not available
 */
export async function getOCRResult(filename: string): Promise<OCRResponse> {
  try {
    const response = await apiClient.get<OCRResponse>(`/ocr/${filename}`);
    return response.data;
  } catch (error: any) {
    console.error('[OCR API] Error fetching OCR result:', error);
    return {
      success: false,
      filename,
      ocr_result: null,
      ocr_ready: false,
      error: error.message || 'Failed to fetch OCR result',
    };
  }
}

/**
 * Check if OCR has been run on a file
 * @param filename - The filename to check
 * @returns Promise with OCR status
 */
export async function getOCRStatus(filename: string): Promise<{ filename: string; ocr_ready: boolean }> {
  try {
    const response = await apiClient.get<{ filename: string; ocr_ready: boolean }>(`/ocr-status/${filename}`);
    return response.data;
  } catch (error) {
    return { filename, ocr_ready: false };
  }
}

/**
 * Poll OCR status until complete with callback for progress updates
 * @param filename - The filename to check
 * @param onStatusUpdate - Callback function called on each status check
 * @param maxWaitTime - Maximum time to wait in milliseconds (default: 5 minutes)
 * @returns Promise with final OCR result or null if timeout
 */
export async function pollOCRStatus(
  filename: string,
  onStatusUpdate?: (status: { filename: string; ocr_ready: boolean; elapsed: number }) => void,
  maxWaitTime: number = 5 * 60 * 1000 // 5 minutes default
): Promise<OCRResponse | null> {
  const startTime = Date.now();
  const pollInterval = 2000; // Check every 2 seconds
  
  while (Date.now() - startTime < maxWaitTime) {
    try {
      // Call the status endpoint
      const statusResponse = await getOCRStatus(filename);
      const elapsed = Date.now() - startTime;
      
      // Notify caller of status
      if (onStatusUpdate) {
        onStatusUpdate({ filename, ocr_ready: statusResponse.ocr_ready, elapsed });
      }
      
      // If OCR is ready, fetch and return the full result
      if (statusResponse.ocr_ready) {
        const result = await getOCRResult(filename);
        return result;
      }
      
      // Wait before polling again
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    } catch (error) {
      console.error('[OCR API] Polling error:', error);
      // Continue polling on error
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }
  
  // Timeout reached
  console.warn(`[OCR API] Poll timeout for ${filename} after ${maxWaitTime}ms`);
  return null;
}

/**
 * Batch OCR status response
 */
export interface BatchOCRStatusResponse {
  success: boolean;
  statuses: Record<string, { has_ocr: boolean; derived_title?: string }>;
  error?: string;
}

export async function getBatchOCRStatus(filenames: string[]): Promise<BatchOCRStatusResponse> {
  try {
    const response = await apiClient.post<BatchOCRStatusResponse>('/ocr-batch-status', { filenames });
    return {
      success: true,
      statuses: response.data.statuses || {},
    };
  } catch (error: any) {
    console.error('[OCR API] Error fetching batch OCR status:', error);
    return {
      success: false,
      statuses: {},
      error: error.message || 'Failed to fetch batch OCR status',
    };
  }
}

export default {
  runOCR,
  getOCRResult,
  getOCRStatus,
  getBatchOCRStatus,
  pollOCRStatus,
};
