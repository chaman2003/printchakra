import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Alert,
  Badge,
  Box,
  Button,
  Divider,
  Flex,
  HStack,
  Icon,
  IconButton,
  Spinner,
  Text,
  Textarea,
  Tooltip,
  VStack,
  useColorModeValue,
} from '@chakra-ui/react';
import { FiAlertTriangle, FiMic, FiMicOff, FiRefreshCw, FiVolume2 } from 'react-icons/fi';
import { useSocket } from '../../context/SocketContext';
import { API_BASE_URL, getDefaultHeaders } from '../../config';

// React 19 + react-icons typing mismatch: cast icon components for Chakra `as`.
const MicIcon = FiMic as any;
const MicOffIcon = FiMicOff as any;
const RefreshIcon = FiRefreshCw as any;
const VolumeIcon = FiVolume2 as any;

interface PipecatStatus {
  available: boolean;
  status?: {
    current_language: string;
    supported_languages: string[];
    whisper_model: string;
    ollama_model: string;
    mms_model: string;
    is_active: boolean;
    components?: {
      stt?: {
        connected?: boolean;
        model_loaded?: boolean;
        provider?: string;
      };
      tts?: {
        connected?: boolean;
        model_loaded?: boolean;
        provider?: string;
      };
      llm?: {
        connected?: boolean;
        provider?: string;
        base_url?: string;
      };
    };
  };
  error?: string;
}

interface LanguageInfo {
  current: string;
  supported: string[];
  default: string;
}

interface PipecatHealth {
  status: 'healthy' | 'unhealthy' | 'unavailable';
  websocket_url?: string;
  rest_base_url?: string;
  bot_status?: any;
  error?: string;
}

const LANGUAGE_NAMES: Record<string, string> = {
  'en': 'English',
  'hi': 'हिंदी',
  'te': 'తెలుగు',
  'kn': 'ಕನ್ನಡ'
};

const LANGUAGE_FLAGS: Record<string, string> = {
  'en': '🇺🇸',
  'hi': '🇮🇳',
  'te': '🇮🇳',
  'kn': '🇮🇳'
};

interface PipecatVoiceBotProps {
  onLanguageChange?: (language: string) => void;
  onStatusChange?: (status: PipecatStatus) => void;
  compact?: boolean;
  onClose?: () => void;
}

type ChatMessage = { role: 'user' | 'assistant'; content: string };

const PipecatVoiceBot: React.FC<PipecatVoiceBotProps> = ({
  onLanguageChange,
  onStatusChange,
  compact = false,
}) => {
  const { socket } = useSocket();
  
  // State management
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [pipecatStatus, setPipecatStatus] = useState<PipecatStatus>({ available: false });
  const [languageInfo, setLanguageInfo] = useState<LanguageInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  
  // Refs
  const websocketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const wsUrlRef = useRef<string | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const voiceReplyPendingRef = useRef(false);
  /** Must use a ref in ScriptProcessor callback — state `isRecording` is always stale there. */
  const isRecordingRef = useRef(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const speechDetectedRef = useRef(false);
  const silenceSinceRef = useRef<number | null>(null);
  const componentStatus = pipecatStatus.status?.components;
  const panelCardBg = useColorModeValue('whiteAlpha.900', 'blackAlpha.400');
  const panelCardBorder = useColorModeValue('blackAlpha.200', 'whiteAlpha.200');
  const chatUserBubbleBg = useColorModeValue('purple.500', 'purple.600');
  const chatAssistBubbleBg = useColorModeValue('gray.200', 'whiteAlpha.300');

  const renderComponentBadge = (
    label: string,
    connected: boolean | undefined,
    loaded?: boolean
  ) => {
    const ok = connected === true;
    return (
      <Badge
        colorScheme={ok ? 'green' : 'red'}
        variant="subtle"
        borderRadius="md"
        px={2}
        py={1}
      >
        {label}: {ok ? 'Connected' : 'Not connected'}
        {loaded !== undefined ? ` (${loaded ? 'loaded' : 'not loaded'})` : ''}
      </Badge>
    );
  };

  const fetchJson = useCallback(async <T,>(path: string, init?: RequestInit): Promise<T> => {
    const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
    const defaultHeaders = getDefaultHeaders();
    const mergedHeaders = {
      ...(defaultHeaders || {}),
      ...(init?.headers || {}),
    } as Record<string, string>;

    const res = await fetch(url, { ...init, headers: mergedHeaders });
    const data = (await res.json()) as T;
    if (!res.ok) {
      const msg = (data as any)?.error || `Request failed (${res.status})`;
      throw new Error(msg);
    }
    return data;
  }, []);

  // Audio playback
  const playAudio = useCallback(async (blob: Blob) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const arrayBuffer = await blob.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);

      setIsPlaying(true);
      source.onended = () => setIsPlaying(false);
      source.start();
    } catch (error) {
      console.error('Audio playback error:', error);
    }
  }, []);

  // Initialize Pipecat connection
  const initializePipecat = useCallback(async () => {
    try {
      setConnectionStatus('connecting');
      setError(null);
      setIsConnected(false);

      // Close any existing WS first
      try {
        websocketRef.current?.close();
      } catch {
        // ignore
      }
      websocketRef.current = null;
      
      // Check Pipecat status via REST API first
      const statusData = await fetchJson<PipecatStatus>('/pipecat/status');
      
      setPipecatStatus(statusData);
      onStatusChange?.(statusData);
      
      if (!statusData.available) {
        throw new Error(statusData.error || 'Pipecat voice bot not available');
      }
      
      // Get language info
      const langData = await fetchJson<LanguageInfo>('/pipecat/languages');
      setLanguageInfo(langData);

      // Discover the correct WebSocket URL from backend (environment-aware)
      const health = await fetchJson<PipecatHealth>('/pipecat/health');
      if (!health?.websocket_url) {
        throw new Error(health?.error || 'Pipecat health did not provide websocket_url');
      }

      wsUrlRef.current = health.websocket_url;

      // Connect to WebSocket
      const ws = new WebSocket(health.websocket_url);
      websocketRef.current = ws;
      
      ws.onopen = () => {
        setIsConnected(true);
        setConnectionStatus('connected');
        console.log('Connected to Pipecat WebSocket');
      };
      
      ws.onclose = () => {
        setIsConnected(false);
        setConnectionStatus('idle');
        console.log('Disconnected from Pipecat WebSocket');
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
        setError('WebSocket connection error');
      };
      
      ws.onmessage = async (event) => {
        if (event.data instanceof Blob) {
          if (voiceReplyPendingRef.current) {
            voiceReplyPendingRef.current = false;
            setMessages((prev) => [
              ...prev,
              { role: 'assistant', content: '🔊 Voice reply (audio)' },
            ]);
          }
          await playAudio(event.data);
        }
      };
      
    } catch (error) {
      console.error('Failed to initialize Pipecat:', error);
      setConnectionStatus('error');
      setError(error instanceof Error ? error.message : 'Failed to initialize Pipecat');
    }
  }, [fetchJson, onStatusChange, playAudio]);

  const finishRecording = useCallback((expectReply: boolean) => {
    const hadSpeech = speechDetectedRef.current;
    isRecordingRef.current = false;

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (microphoneRef.current) {
      microphoneRef.current.disconnect();
      microphoneRef.current = null;
    }

    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }

    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    silenceSinceRef.current = null;

    if (expectReply && hadSpeech) {
      voiceReplyPendingRef.current = true;
      setMessages((prev) => [...prev, { role: 'user', content: '🎤 Voice message' }]);
    } else {
      voiceReplyPendingRef.current = false;
    }
    speechDetectedRef.current = false;
    setIsRecording(false);
  }, []);

  // Start one-shot recording: auto-stops after silence.
  const startRecording = useCallback(async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      await audioContextRef.current.resume();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      mediaStreamRef.current = stream;

      microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;

      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

      isRecordingRef.current = true;
      speechDetectedRef.current = false;
      silenceSinceRef.current = null;

      const speechThreshold = 0.01;
      const autoStopSilenceMs = 1200;

      processorRef.current.onaudioprocess = (event) => {
        if (!isRecordingRef.current || websocketRef.current?.readyState !== WebSocket.OPEN) {
          return;
        }
        const inputData = event.inputBuffer.getChannelData(0);
        const pcmData = new Int16Array(inputData.length);
        let sumSquares = 0;

        for (let i = 0; i < inputData.length; i++) {
          const s = inputData[i];
          sumSquares += s * s;
          pcmData[i] = Math.max(-32768, Math.min(32767, s * 32768));
        }

        try {
          websocketRef.current?.send(pcmData.buffer);
        } catch {
          // ignore backpressure / closed
        }

        const rms = Math.sqrt(sumSquares / inputData.length);
        const now = performance.now();
        if (rms >= speechThreshold) {
          speechDetectedRef.current = true;
          silenceSinceRef.current = null;
        } else if (speechDetectedRef.current) {
          if (silenceSinceRef.current === null) {
            silenceSinceRef.current = now;
          } else if (now - silenceSinceRef.current > autoStopSilenceMs) {
            finishRecording(true);
          }
        }
      };

      microphoneRef.current.connect(analyserRef.current);
      analyserRef.current.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      setError('Failed to access microphone');
      finishRecording(false);
    }
  }, [finishRecording]);

  // Single-button behavior: tap once to speak, auto-stop on silence.
  const toggleRecording = useCallback(() => {
    if (isRecording) {
      finishRecording(false);
      return;
    }
    startRecording();
  }, [finishRecording, isRecording, startRecording]);

  useEffect(() => {
    const el = chatScrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const sendChatMessage = useCallback(async () => {
    const text = chatInput.trim();
    if (!text || chatSending) return;
    setChatSending(true);
    setChatInput('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    try {
      const res = await fetchJson<{
        reply: string;
        audio_wav_base64?: string | null;
      }>('/pipecat/conversation/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const reply = res.reply?.trim() || '(No reply)';
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      if (res.audio_wav_base64) {
        const bin = atob(res.audio_wav_base64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        await playAudio(new Blob([bytes], { type: 'audio/wav' }));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Request failed';
      setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${msg}` }]);
    } finally {
      setChatSending(false);
    }
  }, [chatInput, chatSending, fetchJson, playAudio]);

  // Switch language
  const switchLanguage = useCallback(async (language: string) => {
    try {
      const data = await fetchJson<any>('/pipecat/switch-language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language }),
      });
      if (data.success) {
        // Update local state
        if (languageInfo) {
          setLanguageInfo({ ...languageInfo, current: language });
        }
        onLanguageChange?.(language);
        
        // Emit via SocketIO for real-time updates
        socket?.emit('pipecat_language_switch', { language });
      } else {
        setError(data.error || 'Failed to switch language');
      }
    } catch (error) {
      console.error('Failed to switch language:', error);
      setError('Failed to switch language');
    }
  }, [fetchJson, languageInfo, onLanguageChange, socket]);

  // Reset language
  const resetLanguage = useCallback(async () => {
    try {
      const data = await fetchJson<any>('/pipecat/reset-language', { method: 'POST' });
      if (data.success && languageInfo) {
        setLanguageInfo({ ...languageInfo, current: languageInfo.default });
        onLanguageChange?.(languageInfo.default);
      }
    } catch (error) {
      console.error('Failed to reset language:', error);
    }
  }, [fetchJson, languageInfo, onLanguageChange]);

  // Initialize on mount
  useEffect(() => {
    initializePipecat();
    
    // Listen for SocketIO events
    const handler = (data: any) => {
      if (data?.success && languageInfo) {
        setLanguageInfo({ ...languageInfo, current: data.language });
        onLanguageChange?.(data.language);
      }
    };
    socket?.on('pipecat_language_response', handler);
    
    return () => {
      socket?.off('pipecat_language_response', handler);
      // Cleanup
      if (websocketRef.current) {
        websocketRef.current.close();
      }
      finishRecording(false);
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Render compact version
  if (compact) {
    return (
      <Box borderWidth="1px" borderColor="whiteAlpha.200" borderRadius="lg" p={3} bg="blackAlpha.400">
        <HStack spacing={3}>
          <Badge
            borderRadius="full"
            w="10px"
            h="10px"
            bg={isConnected ? 'green.400' : 'red.400'}
          />
          <Box flex="1" minW={0}>
            <Text fontWeight="700" fontSize="sm" noOfLines={1}>
              Pipecat Voice
            </Text>
            <Text fontSize="xs" color="whiteAlpha.700" noOfLines={1}>
              {languageInfo ? LANGUAGE_NAMES[languageInfo.current] : 'Loading...'}
            </Text>
          </Box>
          <IconButton
            aria-label={isRecording ? 'Cancel listening' : 'Tap to speak'}
            size="sm"
            onClick={toggleRecording}
            isDisabled={!isConnected}
            colorScheme={isRecording ? 'red' : 'purple'}
            icon={isRecording ? <Icon as={MicOffIcon} /> : <Icon as={MicIcon} />}
          />
        </HStack>
      </Box>
    );
  }

  // Render full version
  return (
    <Box p={4}>
      <VStack align="stretch" spacing={3}>
        <HStack justify="space-between">
          <HStack spacing={2}>
            <Text fontWeight="800" fontSize="md">
              Pipecat Voice
            </Text>
            <Badge colorScheme={connectionStatus === 'connected' ? 'green' : connectionStatus === 'connecting' ? 'yellow' : connectionStatus === 'error' ? 'red' : 'gray'}>
              {connectionStatus}
            </Badge>
          </HStack>
          <Tooltip label="Reconnect" hasArrow>
            <IconButton aria-label="Reconnect" size="sm" onClick={initializePipecat} icon={<Icon as={RefreshIcon} />} />
          </Tooltip>
        </HStack>

        {error && (
          <Alert status="error" borderRadius="md">
            {error}
          </Alert>
        )}

        <Box borderWidth="1px" borderColor={panelCardBorder} borderRadius="lg" p={3} bg={panelCardBg}>
          <VStack align="stretch" spacing={1}>
            <Text fontSize="sm">
              {connectionStatus === 'connected' && 'Connected to voice bot'}
              {connectionStatus === 'connecting' && 'Connecting...'}
              {connectionStatus === 'error' && 'Connection failed'}
              {connectionStatus === 'idle' && 'Not connected'}
            </Text>
            {pipecatStatus.status && (
              <Text fontSize="xs" color="whiteAlpha.700">
                Models: {pipecatStatus.status.whisper_model} → {pipecatStatus.status.ollama_model} → {pipecatStatus.status.mms_model}
              </Text>
            )}
            {componentStatus && (
              <VStack align="stretch" spacing={1} pt={1}>
                <Text fontSize="xs" color="whiteAlpha.700" fontWeight="700">
                  Services
                </Text>
                <HStack spacing={2} flexWrap="wrap">
                  {renderComponentBadge('STT', componentStatus.stt?.connected, componentStatus.stt?.model_loaded)}
                  {renderComponentBadge('TTS', componentStatus.tts?.connected, componentStatus.tts?.model_loaded)}
                  {renderComponentBadge('LLM', componentStatus.llm?.connected)}
                </HStack>
              </VStack>
            )}
          </VStack>
        </Box>

        {languageInfo && (
          <Box>
            <Text fontWeight="700" fontSize="sm" mb={2}>
              Language
            </Text>
            <Flex wrap="wrap" gap={2}>
              {languageInfo.supported.map((lang) => (
                <Button
                  key={lang}
                  size="xs"
                  variant={languageInfo.current === lang ? 'solid' : 'outline'}
                  colorScheme="purple"
                  onClick={() => switchLanguage(lang)}
                >
                  {LANGUAGE_FLAGS[lang]} {LANGUAGE_NAMES[lang] || lang}
                </Button>
              ))}
              <Tooltip label="Reset to default" hasArrow>
                <IconButton aria-label="Reset language" size="xs" onClick={resetLanguage} icon={<Icon as={RefreshIcon} />} />
              </Tooltip>
            </Flex>
          </Box>
        )}

        <Box>
          <Text fontWeight="700" fontSize="sm" mb={2}>
            Chat
          </Text>
          <Text fontSize="xs" color="whiteAlpha.600" mb={2}>
            Type a message (same AI as voice) or use the mic. Both appear in this thread.
          </Text>
          <Box
            ref={chatScrollRef}
            borderWidth="1px"
            borderColor={panelCardBorder}
            borderRadius="lg"
            bg={panelCardBg}
            px={3}
            py={2}
            maxH="220px"
            overflowY="auto"
            mb={2}
          >
            {messages.length === 0 ? (
              <Text fontSize="xs" color="whiteAlpha.500">
                No messages yet — send text or use the microphone.
              </Text>
            ) : (
              <VStack align="stretch" spacing={2}>
                {messages.map((m, i) => (
                  <Flex key={i} justify={m.role === 'user' ? 'flex-end' : 'flex-start'}>
                    <Box
                      maxW="88%"
                      px={3}
                      py={2}
                      borderRadius="lg"
                      bg={m.role === 'user' ? chatUserBubbleBg : chatAssistBubbleBg}
                      color={m.role === 'user' ? 'white' : undefined}
                    >
                      <Text fontSize="sm" whiteSpace="pre-wrap">
                        {m.content}
                      </Text>
                    </Box>
                  </Flex>
                ))}
              </VStack>
            )}
          </Box>
          <HStack spacing={2} align="flex-end">
            <Textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Message…"
              size="sm"
              rows={2}
              resize="none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendChatMessage();
                }
              }}
              isDisabled={chatSending}
            />
            <Button
              colorScheme="purple"
              size="sm"
              onClick={sendChatMessage}
              isDisabled={chatSending || !chatInput.trim()}
              minW="72px"
            >
              {chatSending ? <Spinner size="sm" /> : 'Send'}
            </Button>
          </HStack>
        </Box>

        <Divider borderColor="whiteAlpha.200" />

        <VStack spacing={2} align="stretch">
          <HStack spacing={4} justify="center" align="center">
            <IconButton
              aria-label={isRecording ? 'Cancel listening' : 'Tap to speak'}
              onClick={toggleRecording}
              isDisabled={!isConnected}
              colorScheme={isRecording ? 'red' : 'purple'}
              width="92px"
              height="92px"
              minW="92px"
              borderRadius="full"
              fontSize="34px"
              icon={isRecording ? <Icon as={MicOffIcon} /> : <Icon as={MicIcon} />}
            />
            <VStack spacing={0} align="start">
              <Text fontSize="sm" color="whiteAlpha.800">
                {isRecording ? 'Listening... (auto-send on silence)' : 'Tap and speak'}
              </Text>
              {isPlaying && (
                <HStack spacing={1}>
                  <Box as={VolumeIcon} />
                  <Text fontSize="xs" color="purple.200">
                    Speaking...
                  </Text>
                </HStack>
              )}
            </VStack>
          </HStack>
        </VStack>

        <Box borderWidth="1px" borderColor={panelCardBorder} borderRadius="lg" p={3} bg={panelCardBg}>
          <Text fontSize="xs" color="whiteAlpha.700">
            <Text as="span" fontWeight="800">Language Switching:</Text>
            <br />• English: "speak english"
            <br />• Hindi: "हिंदी बोलो"
            <br />• Telugu: "తెలుగు మాట్లాడండి"
            <br />• Kannada: "ಕನ್ನಡ ಮಾತನಾಡಿ"
          </Text>
        </Box>

        {(connectionStatus !== 'connected' || error || !componentStatus?.llm?.connected) && (
          <Alert status="warning" borderRadius="md" variant="left-accent">
            <VStack align="start" spacing={1}>
              <HStack>
                <Icon as={FiAlertTriangle as any} />
                <Text fontSize="sm" fontWeight="700">Troubleshooting</Text>
              </HStack>
              <Text fontSize="xs">1) Ensure backend (`:5000`) and pipecat (`:8765`) are both running.</Text>
              <Text fontSize="xs">2) Check `http://localhost:5000/pipecat/status` and `/pipecat/health`.</Text>
              <Text fontSize="xs">3) If LLM is disconnected, start Ollama and pull model `{pipecatStatus.status?.ollama_model || 'qwen2.5:3b-instruct-q4_K_M'}`.</Text>
              <Text fontSize="xs">4) Click reconnect after services are healthy.</Text>
            </VStack>
          </Alert>
        )}
      </VStack>
    </Box>
  );
};

export default PipecatVoiceBot;
