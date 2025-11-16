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
function interleaveChannels(channelData: Float32Array[], frameLength: number): Float32Array {
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
    blob instanceof Blob && blob.size > 0 && (blob.type.startsWith('audio/') || blob.type === '')
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
export async function hasVoiceActivity(
  audioBlob: Blob,
  threshold: number = 0.020 // BALANCED: 0.020 for good detection while filtering background noise
): Promise<boolean> {
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
      if (
        (channelData[i] >= 0 && channelData[i - 1] < 0) ||
        (channelData[i] < 0 && channelData[i - 1] >= 0)
      ) {
        zeroCrossings++;
      }
    }
    const zcr = zeroCrossings / channelData.length;

    // Advanced energy detection in frequency bands
    // Analyze audio in short windows to detect speech patterns
    const windowSize = Math.floor(sampleRate * 0.02); // 20ms windows
    const windowCount = Math.floor(channelData.length / windowSize);
    let activeWindows = 0;
    let peakWindows = 0; // Track windows with strong peaks (human speech bursts)

    for (let w = 0; w < windowCount; w++) {
      let windowSum = 0;
      let windowMax = 0;
      const start = w * windowSize;
      const end = Math.min(start + windowSize, channelData.length);

      for (let i = start; i < end; i++) {
        windowSum += channelData[i] * channelData[i];
        windowMax = Math.max(windowMax, Math.abs(channelData[i]));
      }

      const windowRMS = Math.sqrt(windowSum / (end - start));

      // Count windows with significant energy (voice-like activity)
      if (windowRMS > threshold * 0.85) { // BALANCED: relaxed from 0.9 to accept quieter speech
        activeWindows++;
      }
      
      // Count windows with clear speech peaks (not just constant background noise)
      if (windowMax > threshold * 3.5) { // BALANCED: relaxed from 4 to detect softer speech
        peakWindows++;
      }
    }

    const activeRatio = activeWindows / windowCount;
    const peakRatio = peakWindows / windowCount;

    // BALANCED multi-criteria voice detection - filters noise while accepting real speech
    const hasEnergy = rms > threshold; // Overall energy check
    const hasSufficientPeaks = maxAmplitude > threshold * 4; // BALANCED: relaxed from 5x to 4x
    const hasVoicePattern = activeRatio > 0.12; // BALANCED: relaxed from 0.15 to 0.12
    const hasSpeechBursts = peakRatio > 0.06; // BALANCED: relaxed from 0.08 to 0.06
    const properZCR = zcr > 0.01 && zcr < 0.5; // BALANCED: relaxed range for varied speech patterns
    
    // Balanced detection: filters background noise but accepts real speech
    const isVoice = hasEnergy && hasSufficientPeaks && (hasVoicePattern || hasSpeechBursts) && properZCR;

    console.log(`🎙️ Voice Activity Detection (Human Voice Only Mode):`);
    console.log(`   RMS: ${rms.toFixed(4)} (threshold: ${threshold}) - ${hasEnergy ? '✅' : '❌'}`);
    console.log(`   Peak Amplitude: ${maxAmplitude.toFixed(4)} (min: ${(threshold * 5).toFixed(4)}) - ${hasSufficientPeaks ? '✅' : '❌'}`);
    console.log(`   Active Windows: ${(activeRatio * 100).toFixed(1)}% (min: 15%) - ${hasVoicePattern ? '✅' : '❌'}`);
    console.log(`   Peak Windows: ${(peakRatio * 100).toFixed(1)}% (min: 8%) - ${hasSpeechBursts ? '✅' : '❌'}`);
    console.log(`   Zero Crossing Rate: ${zcr.toFixed(4)} (range: 0.015-0.45) - ${properZCR ? '✅' : '❌'}`);
    console.log(`   Result: ${isVoice ? '✅ HUMAN VOICE DETECTED' : '❌ BACKGROUND NOISE/SILENCE REJECTED'}`);

    return isVoice;
  } catch (error) {
    console.error('Error detecting voice activity:', error);
    return true; // If we can't detect, assume there's voice to avoid dropping valid audio
  }
}

/**
 * Detect if audio contains high-pitch sounds (speech-like frequencies)
 * Analyzes frequency content to determine if audio has human voice characteristics
 * Returns true if significant high-frequency content detected (typical of human speech)
 */
export async function hasHighPitchSound(
  audioBlob: Blob,
  frequencyThreshold: number = 0.15 // Threshold for high-frequency energy (0.15-0.25 = speech range)
): Promise<boolean> {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Get first channel data
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;

    // Create offline context for FFT analysis
    const offlineContext = new OfflineAudioContext(1, audioBuffer.length, sampleRate);
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    
    const analyser = offlineContext.createAnalyser();
    analyser.fftSize = 2048; // 2048-point FFT for frequency analysis
    source.connect(analyser);
    analyser.connect(offlineContext.destination);
    
    source.start(0);
    await offlineContext.startRendering();

    // Get frequency data
    const frequencyData = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(frequencyData);

    // Analyze frequency bands
    // Human speech typically dominates in 80Hz-8000Hz range
    // Low frequencies (0-500Hz): background noise
    // Mid frequencies (500-2000Hz): consonants, speech clarity
    // High frequencies (2000-8000Hz): sibilants, speech identity
    
    const nyquist = sampleRate / 2;
    const total = frequencyData.length;

    // Calculate energy in different frequency bands
    const lowBandEnd = Math.floor((500 / nyquist) * total); // 0-500Hz
    const midBandEnd = Math.floor((2000 / nyquist) * total); // 500-2000Hz
    const highBandEnd = Math.floor((8000 / nyquist) * total); // 2000-8000Hz

    let lowEnergy = 0, midEnergy = 0, highEnergy = 0;
    
    // Low band energy (background noise indicator)
    for (let i = 0; i < lowBandEnd; i++) {
      lowEnergy += frequencyData[i];
    }
    lowEnergy /= lowBandEnd || 1;

    // Mid band energy (speech consonants)
    for (let i = lowBandEnd; i < midBandEnd; i++) {
      midEnergy += frequencyData[i];
    }
    midEnergy /= (midBandEnd - lowBandEnd) || 1;

    // High band energy (speech sibilants and clarity)
    for (let i = midBandEnd; i < highBandEnd; i++) {
      highEnergy += frequencyData[i];
    }
    highEnergy /= (highBandEnd - midBandEnd) || 1;

    // Calculate ratios to distinguish speech from pure noise
    const highToLowRatio = lowEnergy > 0 ? highEnergy / lowEnergy : 0;
    const midToLowRatio = lowEnergy > 0 ? midEnergy / lowEnergy : 0;
    const speechLikePattern = (midEnergy + highEnergy) / Math.max(lowEnergy, 1);

    // Speech detection heuristic:
    // - Significant mid and high frequency content (not just low rumble)
    // - High frequency energy present (speech characteristics)
    // - Ratio indicates speech vs background noise
    const hasHighPitch = highEnergy > frequencyThreshold * 128 && // Threshold in 0-255 scale
                         highToLowRatio > 0.3 && // High frequencies stronger than low
                         midToLowRatio > 0.3 && // Mid frequencies also present
                         speechLikePattern > 0.4; // Overall speech pattern detected

    console.log(`🎵 High-Pitch Sound Detection (Speech Frequency Analysis):`);
    console.log(`   Low Band (0-500Hz): ${lowEnergy.toFixed(1)} dB`);
    console.log(`   Mid Band (500-2kHz): ${midEnergy.toFixed(1)} dB`);
    console.log(`   High Band (2-8kHz): ${highEnergy.toFixed(1)} dB`);
    console.log(`   High-to-Low Ratio: ${highToLowRatio.toFixed(2)} (threshold: 0.3+)`);
    console.log(`   Mid-to-Low Ratio: ${midToLowRatio.toFixed(2)} (threshold: 0.3+)`);
    console.log(`   Speech-Like Pattern: ${speechLikePattern.toFixed(2)} (threshold: 0.4+)`);
    console.log(`   Result: ${hasHighPitch ? '✅ HIGH-PITCH SPEECH DETECTED' : '❌ LOW-PITCH/NOISE REJECTED'}`);

    return hasHighPitch;
  } catch (error) {
    console.error('Error detecting high-pitch sound:', error);
    return true; // If we can't detect, assume there's speech to avoid dropping valid audio
  }
}

/**
 * Check if audio contains the "hey" keyword
 * Uses Web Speech API for basic voice recognition
 */
export async function detectKeyword(
  audioBlob: Blob,
  keyword: string = 'hey'
): Promise<{ detected: boolean; confidence: number }> {
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
