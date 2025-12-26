import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const CALIBRATION_STORAGE_KEY = 'printchakra_autocapture_delay';
const DEFAULT_DELAY_SECONDS = 10;
const DEFAULT_INTER_CAPTURE_DELAY = 2; // Default 2 seconds between captures

interface CalibrationContextType {
  /** Delay in seconds to wait for smartphone auto-capture to fully initialize */
  initialDelay: number;
  /** Update the auto-capture initialization delay */
  setInitialDelay: (seconds: number) => void;
  /** Delay in seconds between consecutive document captures */
  interCaptureDelay: number;
  /** Update the inter-capture delay */
  setInterCaptureDelay: (seconds: number) => void;
  /** Whether delay has been configured by user */
  isCalibrated: boolean;
  /** Mark as configured */
  markCalibrated: () => void;
  /** Reset to default */
  resetCalibration: () => void;
  /** Start a delay countdown and return a promise that resolves when done */
  startDelayCountdown: () => Promise<void>;
  /** Current countdown value (null if not counting) */
  countdownValue: number | null;
  /** Whether a countdown is currently active */
  isCountingDown: boolean;
  /** Cancel active countdown */
  cancelCountdown: () => void;
}

const CalibrationContext = createContext<CalibrationContextType>({
  initialDelay: DEFAULT_DELAY_SECONDS,
  setInitialDelay: () => { },
  interCaptureDelay: DEFAULT_INTER_CAPTURE_DELAY,
  setInterCaptureDelay: () => { },
  isCalibrated: false,
  markCalibrated: () => { },
  resetCalibration: () => { },
  startDelayCountdown: async () => { },
  countdownValue: null,
  isCountingDown: false,
  cancelCountdown: () => { },
});

export const useCalibration = () => {
  const context = useContext(CalibrationContext);
  if (!context) {
    throw new Error('useCalibration must be used within CalibrationProvider');
  }
  return context;
};

interface CalibrationProviderProps {
  children: React.ReactNode;
}

export const CalibrationProvider: React.FC<CalibrationProviderProps> = ({ children }) => {
  const [initialDelay, setInitialDelayState] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(CALIBRATION_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return typeof parsed.delay === 'number' ? parsed.delay : DEFAULT_DELAY_SECONDS;
      }
    } catch (e) {
      console.warn('[Calibration] Failed to load saved calibration:', e);
    }
    return DEFAULT_DELAY_SECONDS;
  });

  const [interCaptureDelay, setInterCaptureDelayState] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(CALIBRATION_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return typeof parsed.interCaptureDelay === 'number' ? parsed.interCaptureDelay : DEFAULT_INTER_CAPTURE_DELAY;
      }
    } catch (e) {
      // ignore
    }
    return DEFAULT_INTER_CAPTURE_DELAY;
  });

  const [isCalibrated, setIsCalibrated] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(CALIBRATION_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return Boolean(parsed.calibrated);
      }
    } catch (e) {
      // ignore
    }
    return false;
  });

  const [countdownValue, setCountdownValue] = useState<number | null>(null);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const countdownIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const countdownResolveRef = React.useRef<(() => void) | null>(null);
  const countdownRejectRef = React.useRef<((reason?: any) => void) | null>(null);

  // Save to localStorage whenever values change
  useEffect(() => {
    try {
      localStorage.setItem(
        CALIBRATION_STORAGE_KEY,
        JSON.stringify({
          delay: initialDelay,
          interCaptureDelay: interCaptureDelay,
          calibrated: isCalibrated
        })
      );
    } catch (e) {
      console.warn('[AutoCapture] Failed to save settings:', e);
    }
  }, [initialDelay, interCaptureDelay, isCalibrated]);

  const setInitialDelay = useCallback((seconds: number) => {
    const clamped = Math.max(0, Math.min(60, seconds)); // Clamp between 0 and 60 seconds
    setInitialDelayState(clamped);
    setIsCalibrated(true);
  }, []);

  const setInterCaptureDelay = useCallback((seconds: number) => {
    const clamped = Math.max(0, Math.min(30, seconds)); // Clamp between 0 and 30 seconds
    setInterCaptureDelayState(clamped);
    setIsCalibrated(true);
  }, []);

  const markCalibrated = useCallback(() => {
    setIsCalibrated(true);
  }, []);

  const resetCalibration = useCallback(() => {
    setInitialDelayState(DEFAULT_DELAY_SECONDS);
    setInterCaptureDelayState(DEFAULT_INTER_CAPTURE_DELAY);
    setIsCalibrated(false);
  }, []);

  const cancelCountdown = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setCountdownValue(null);
    setIsCountingDown(false);
    if (countdownRejectRef.current) {
      countdownRejectRef.current(new Error('Countdown cancelled'));
      countdownRejectRef.current = null;
    }
    countdownResolveRef.current = null;
  }, []);

  const startDelayCountdown = useCallback((): Promise<void> => {
    // Cancel any existing countdown
    cancelCountdown();

    // If delay is 0, resolve immediately
    if (initialDelay <= 0) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      countdownResolveRef.current = resolve;
      countdownRejectRef.current = reject;
      setIsCountingDown(true);
      setCountdownValue(initialDelay);

      let remaining = initialDelay;

      countdownIntervalRef.current = setInterval(() => {
        remaining -= 1;
        setCountdownValue(remaining);

        if (remaining <= 0) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          setCountdownValue(null);
          setIsCountingDown(false);
          if (countdownResolveRef.current) {
            countdownResolveRef.current();
            countdownResolveRef.current = null;
          }
          countdownRejectRef.current = null;
        }
      }, 1000);
    });
  }, [initialDelay, cancelCountdown]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  const value: CalibrationContextType = {
    initialDelay,
    setInitialDelay,
    interCaptureDelay,
    setInterCaptureDelay,
    isCalibrated,
    markCalibrated,
    resetCalibration,
    startDelayCountdown,
    countdownValue,
    isCountingDown,
    cancelCountdown,
  };

  return (
    <CalibrationContext.Provider value={value}>
      {children}
    </CalibrationContext.Provider>
  );
};

export default CalibrationContext;
