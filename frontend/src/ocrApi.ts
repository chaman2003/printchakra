/**
 * OCR API Service
 * Functions for interacting with the PaddleOCR backend
 */

import apiClient from './apiClient';
import { OCRResponse, OCRResult } from './types';

/**
 * Run OCR on a processed image
 * @param filename - The filename of the processed image
 * @returns Promise with OCR results
 */
export async function runOCR(filename: string): Promise<OCRResponse> {
  try {
    const response = await apiClient.post<OCRResponse>(`/ocr/${filename}`);
    return response.data;
  } catch (error: any) {
    console.error('[OCR API] Error running OCR:', error);
    return {
      success: false,
      filename,
      ocr_result: null,
      ocr_ready: false,
      error: error.message || 'OCR processing failed',
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
 * Get OCR status for multiple files at once
 * @param filenames - Array of filenames to check
 * @returns Promise with status map
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
};
