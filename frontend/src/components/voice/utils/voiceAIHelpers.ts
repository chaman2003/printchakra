/**
 * Voice AI Helper Functions
 * Extracted utility functions for VoiceAIChat component
 */

export interface VoiceMessage {
  id: string;
  type: 'user' | 'ai' | 'system';
  text: string;
  timestamp: string;
  count?: number;
}

/**
 * Sanitize text for chat display - removes code, symbols, and special characters
 * Only allows English letters, numbers, basic punctuation, and spaces
 */
export const sanitizeChatText = (text: string): string => {
  if (!text) return '';
  
  // Remove code blocks
  let sanitized = text.replace(/```[\s\S]*?```/g, '');
  sanitized = sanitized.replace(/`[^`]*`/g, '');
  
  // Remove URLs
  sanitized = sanitized.replace(/https?:\/\/\S+/g, '');
  
  // Remove emoji patterns
  sanitized = sanitized.replace(/[\u{1F600}-\u{1F64F}]/gu, '');
  sanitized = sanitized.replace(/[\u{1F300}-\u{1F5FF}]/gu, '');
  sanitized = sanitized.replace(/[\u{1F680}-\u{1F6FF}]/gu, '');
  sanitized = sanitized.replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '');
  sanitized = sanitized.replace(/[\u{2702}-\u{27B0}]/gu, '');
  sanitized = sanitized.replace(/[\u{1F900}-\u{1F9FF}]/gu, '');
  
  // Only allow: English letters, numbers, basic punctuation, and spaces
  sanitized = sanitized.replace(/[^a-zA-Z0-9\s.,!?'\-:;]/g, '');
  
  // Clean up multiple spaces
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  
  return sanitized || 'Message received';
};

/**
 * Add a message with automatic duplicate detection
 * System messages that repeat will increment count instead of duplicating
 * All messages are sanitized to remove symbols and code
 */
export const addMessageWithDedup = (
  messages: VoiceMessage[],
  type: 'user' | 'ai' | 'system',
  text: string
): VoiceMessage[] => {
  // Sanitize the text to remove symbols, code, and special characters
  const sanitizedText = sanitizeChatText(text);
  const lastMessage = messages[messages.length - 1];

  // Check for duplicate system messages
  if (
    lastMessage &&
    lastMessage.type === type &&
    lastMessage.text === sanitizedText &&
    type === 'system'
  ) {
    const newCount = (lastMessage.count || 1) + 1;
    return [...messages.slice(0, -1), { ...lastMessage, count: newCount }];
  }

  // Add new message with sanitized text
  const message: VoiceMessage = {
    id: `${Date.now()}-${Math.random()}`,
    type,
    text: sanitizedText,
    timestamp: new Date().toISOString(),
    count: 1,
  };
  return [...messages, message];
};

/**
 * Format error message for display
 */
export const formatErrorMessage = (error: any): string => {
  if (error?.response?.data?.detail) {
    return error.response.data.detail;
  }
  if (error?.message) {
    return error.message;
  }
  return 'An error occurred';
};

/**
 * Create recording constraints for audio capture
 */
export const getRecordingConstraints = () => ({
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
});

/**
 * Validate audio blob
 */
export const isValidAudioBlob = (blob: Blob): boolean => {
  return blob && blob.size > 0 && blob.type.includes('audio');
};

/**
 * Get audio duration in seconds
 */
export const getAudioDuration = async (blob: Blob): Promise<number> => {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.onloadedmetadata = () => resolve(audio.duration);
    audio.src = URL.createObjectURL(blob);
  });
};

/**
 * Stop media tracks and cleanup
 */
export const stopMediaStream = (stream: MediaStream | null): void => {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
  }
};

/**
 * Create audio context and convert blob to WAV
 */
export const convertToWAV = async (blob: Blob): Promise<Blob> => {
  const arrayBuffer = await blob.arrayBuffer();
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)(
    {
      sampleRate: 48000, // Match recording sample rate for better quality
    }
  );
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  const numberOfChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numberOfChannels * bytesPerSample;

  const channelData = [];
  for (let i = 0; i < numberOfChannels; i++) {
    channelData.push(audioBuffer.getChannelData(i));
  }

  const interleaved = interleaveChannels(channelData);
  const dataLength = interleaved.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);

  let offset = 44;
  const volume = 1.0; // Full volume for better quality (was 0.8)
  for (let i = 0; i < interleaved.length; i++) {
    view.setInt16(offset, interleaved[i] * volume * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
};

/**
 * Interleave audio channels
 */
const interleaveChannels = (channels: Float32Array[]): Float32Array => {
  const length = channels[0].length * channels.length;
  const result = new Float32Array(length);
  let index = 0;
  const channelCount = channels.length;

  for (let i = 0; i < channels[0].length; i++) {
    for (let j = 0; j < channelCount; j++) {
      result[index++] = channels[j][i];
    }
  }

  return result;
};
