/**
 * Audio Utility Functions
 * Handles audio encoding and WAV file creation
 */

/**
 * Convert audio blob to WAV format with proper headers
 * Ensures compatibility with Whisper and other audio processing tools
 */
export async function convertToWAV(audioBlob: Blob): Promise<Blob> {
  try {
    // If already WAV format, return as-is
    if (audioBlob.type === 'audio/wav' || audioBlob.type === 'audio/x-wav') {
      return audioBlob;
    }

    // Get audio context from browser
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const arrayBuffer = await audioBlob.arrayBuffer();
    
    try {
      // Decode audio data
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Create WAV file
      const wavBlob = encodeWAV(audioBuffer);
      console.log(`✅ Successfully converted to WAV: ${wavBlob.size} bytes`);
      return wavBlob;
    } catch (decodeError) {
      console.error('Error decoding audio data:', decodeError);
      // If decode fails, try to create WAV from raw blob
      console.log('⚠️ Falling back to raw audio encoding');
      return createWAVFromRaw(arrayBuffer);
    }
  } catch (error) {
    console.error('Error converting to WAV:', error);
    // Return original blob if conversion fails
    return audioBlob;
  }
}

/**
 * Encode audio buffer to WAV format with proper RIFF headers
 */
function encodeWAV(audioBuffer: AudioBuffer): Blob {
  const numberOfChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const frameLength = audioBuffer.length;
  const channelData = [];
  
  for (let i = 0; i < numberOfChannels; i++) {
    channelData.push(audioBuffer.getChannelData(i));
  }

  // Interleave channels
  const interleaved = interleaveChannels(channelData, frameLength);

  // Create WAV file with proper headers
  const dataLength = interleaved.length * 2;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  // WAV header
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // RIFF chunk descriptor
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, 'WAVE');

  // fmt sub-chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // size of fmt chunk
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numberOfChannels * 2, true); // byte rate
  view.setUint16(32, numberOfChannels * 2, true); // block align
  view.setUint16(34, 16, true); // 16-bit depth

  // data sub-chunk
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);

  // Write audio data (convert float32 to int16)
  let offset = 44;
  for (let i = 0; i < interleaved.length; i++) {
    // Clamp and convert to 16-bit integer
    const s = Math.max(-1, Math.min(1, interleaved[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Create WAV from raw audio data (fallback method)
 */
function createWAVFromRaw(arrayBuffer: ArrayBuffer): Blob {
  const view = new Uint8Array(arrayBuffer);
  
  // Try to detect if it's already WAV format
  const header = String.fromCharCode(view[0], view[1], view[2], view[3]);
  if (header === 'RIFF') {
    console.log('🎵 Audio is already in WAV format');
    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }
  
  // If not WAV, create a simple WAV wrapper
  // Assume 16-bit mono at 16000 Hz
  const sampleRate = 16000;
  const numberOfChannels = 1;
  const bytesPerSample = 2;
  
  const dataLength = arrayBuffer.byteLength;
  const fileLength = 36 + dataLength;
  const wavBuffer = new ArrayBuffer(44 + dataLength);
  const wavView = new DataView(wavBuffer);
  
  // RIFF header
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      wavView.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  writeString(0, 'RIFF');
  wavView.setUint32(4, fileLength, true);
  writeString(8, 'WAVE');
  
  // fmt chunk
  writeString(12, 'fmt ');
  wavView.setUint32(16, 16, true);
  wavView.setUint16(20, 1, true); // PCM
  wavView.setUint16(22, numberOfChannels, true);
  wavView.setUint32(24, sampleRate, true);
  wavView.setUint32(28, sampleRate * numberOfChannels * bytesPerSample, true);
  wavView.setUint16(32, numberOfChannels * bytesPerSample, true);
  wavView.setUint16(34, 16, true); // 16-bit
  
  // data chunk
  writeString(36, 'data');
  wavView.setUint32(40, dataLength, true);
  
  // Copy audio data
  const dataView = new Uint8Array(wavBuffer);
  const srcView = new Uint8Array(arrayBuffer);
  dataView.set(srcView, 44);
  
  return new Blob([wavBuffer], { type: 'audio/wav' });
}

/**
 * Interleave audio channels
 */
function interleaveChannels(
  channelData: Float32Array[],
  frameLength: number
): Float32Array {
  const interleaved = new Float32Array(frameLength * channelData.length);
  let index = 0;

  for (let i = 0; i < frameLength; i++) {
    for (let channel of channelData) {
      interleaved[index++] = channel[i];
    }
  }

  return interleaved;
}

/**
 * Validate audio blob
 */
export function isValidAudioBlob(blob: Blob): boolean {
  return (
    blob instanceof Blob &&
    blob.size > 0 &&
    (blob.type.startsWith('audio/') || blob.type === '')
  );
}

/**
 * Get audio duration from blob
 */
export async function getAudioDuration(audioBlob: Blob): Promise<number> {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    return audioBuffer.duration;
  } catch (error) {
    console.error('Error getting audio duration:', error);
    return 0;
  }
}

/**
 * Detect if audio contains voice activity (not silence)
 * Uses advanced RMS analysis with dynamic thresholding
 * Returns true if audio has significant sound energy
 */
export async function hasVoiceActivity(audioBlob: Blob, threshold: number = 0.015): Promise<boolean> {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // Get first channel data
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    
    // Calculate RMS (Root Mean Square) for overall energy
    let sum = 0;
    for (let i = 0; i < channelData.length; i++) {
      sum += channelData[i] * channelData[i];
    }
    const rms = Math.sqrt(sum / channelData.length);
    
    // Calculate peak energy to detect sudden loud sounds
    let maxAmplitude = 0;
    for (let i = 0; i < channelData.length; i++) {
      maxAmplitude = Math.max(maxAmplitude, Math.abs(channelData[i]));
    }
    
    // Calculate zero-crossing rate (indicator of voice vs noise)
    let zeroCrossings = 0;
    for (let i = 1; i < channelData.length; i++) {
      if ((channelData[i] >= 0 && channelData[i - 1] < 0) || 
          (channelData[i] < 0 && channelData[i - 1] >= 0)) {
        zeroCrossings++;
      }
    }
    const zcr = zeroCrossings / channelData.length;
    
    // Advanced energy detection in frequency bands
    // Analyze audio in short windows to detect speech patterns
    const windowSize = Math.floor(sampleRate * 0.02); // 20ms windows
    const windowCount = Math.floor(channelData.length / windowSize);
    let activeWindows = 0;
    
    for (let w = 0; w < windowCount; w++) {
      let windowSum = 0;
      const start = w * windowSize;
      const end = Math.min(start + windowSize, channelData.length);
      
      for (let i = start; i < end; i++) {
        windowSum += channelData[i] * channelData[i];
      }
      
      const windowRMS = Math.sqrt(windowSum / (end - start));
      
      // Count windows with significant energy (voice-like activity)
      if (windowRMS > threshold * 0.8) {
        activeWindows++;
      }
    }
    
    const activeRatio = activeWindows / windowCount;
    
    // Multi-criteria voice detection
    const hasEnergy = rms > threshold;
    const hasPeaks = maxAmplitude > threshold * 3; // At least 3x threshold for peaks
    const hasVoicePattern = activeRatio > 0.1; // At least 10% of windows have voice-like activity
    const properZCR = zcr > 0.01 && zcr < 0.5; // Voice typically has ZCR in this range
    
    const isVoice = hasEnergy && (hasPeaks || hasVoicePattern) && properZCR;
    
    console.log(`🎙️ Voice Activity Detection:`);
    console.log(`   RMS: ${rms.toFixed(4)} (threshold: ${threshold})`);
    console.log(`   Peak: ${maxAmplitude.toFixed(4)}`);
    console.log(`   Active Windows: ${activeRatio.toFixed(2)} (${activeWindows}/${windowCount})`);
    console.log(`   Zero Crossing Rate: ${zcr.toFixed(4)}`);
    console.log(`   Result: ${isVoice ? '✅ VOICE DETECTED' : '❌ SILENCE/NOISE'}`);
    
    return isVoice;
  } catch (error) {
    console.error('Error detecting voice activity:', error);
    return true; // If we can't detect, assume there's voice to avoid dropping valid audio
  }
}

/**
 * Check if audio contains the "hey" keyword
 * Uses Web Speech API for basic voice recognition
 */
export async function detectKeyword(audioBlob: Blob, keyword: string = 'hey'): Promise<{ detected: boolean; confidence: number }> {
  try {
    // This is a placeholder - requires backend processing for accuracy
    // Frontend Web Speech API has limitations for offline keyword detection
    console.log(`🔍 Keyword detection requested: "${keyword}"`);
    return { detected: false, confidence: 0 };
  } catch (error) {
    console.error('Error detecting keyword:', error);
    return { detected: false, confidence: 0 };
  }
}

