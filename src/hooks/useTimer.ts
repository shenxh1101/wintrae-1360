import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseTimerOptions {
  autoStart?: boolean;
  timeLimit?: number;
  initialTime?: number;
  onTick?: (time: number) => void;
  onComplete?: () => void;
  onTimeout?: () => void;
  interval?: number;
}

export interface UseTimerReturn {
  time: number;
  formattedTime: string;
  isRunning: boolean;
  isPaused: boolean;
  remainingTime?: number;
  formattedRemainingTime?: string;
  progress?: number;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: (newInitialTime?: number) => void;
  stop: () => void;
  addTime: (seconds: number) => void;
}

function formatTime(totalSeconds: number): string {
  if (totalSeconds < 0) totalSeconds = 0;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function useTimer(options: UseTimerOptions = {}): UseTimerReturn {
  const {
    autoStart = false,
    timeLimit,
    initialTime = 0,
    onTick,
    onComplete,
    onTimeout,
    interval = 1000,
  } = options;

  const [time, setTime] = useState(initialTime);
  const [isRunning, setIsRunning] = useState(autoStart);
  const [isPaused, setIsPaused] = useState(false);
  const hasTimedOutRef = useRef(false);
  const onTickRef = useRef(onTick);
  const onTimeoutRef = useRef(onTimeout);

  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  useEffect(() => {
    if (!isRunning || isPaused) return;

    const timer = setInterval(() => {
      setTime(prevTime => {
        const newTime = prevTime + 1;
        onTickRef.current?.(newTime);

        if (timeLimit !== undefined && newTime >= timeLimit && !hasTimedOutRef.current) {
          hasTimedOutRef.current = true;
          setTimeout(() => {
            setIsRunning(false);
            onTimeoutRef.current?.();
          }, 0);
        }

        return newTime;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isRunning, isPaused, timeLimit, interval]);

  const start = useCallback(() => {
    hasTimedOutRef.current = false;
    setIsRunning(true);
    setIsPaused(false);
  }, []);

  const pause = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    setIsPaused(false);
  }, []);

  const reset = useCallback((newInitialTime?: number) => {
    hasTimedOutRef.current = false;
    setIsRunning(false);
    setIsPaused(false);
    setTime(newInitialTime ?? initialTime);
  }, [initialTime]);

  const stop = useCallback(() => {
    setIsRunning(false);
    setIsPaused(false);
    onComplete?.();
  }, [onComplete]);

  const addTime = useCallback((seconds: number) => {
    setTime(prev => Math.max(0, prev + seconds));
  }, []);

  const remainingTime = timeLimit !== undefined ? Math.max(0, timeLimit - time) : undefined;
  const formattedRemainingTime = remainingTime !== undefined ? formatTime(remainingTime) : undefined;
  const progress = timeLimit !== undefined ? Math.min(100, (time / timeLimit) * 100) : undefined;

  return {
    time,
    formattedTime: formatTime(time),
    isRunning,
    isPaused,
    remainingTime,
    formattedRemainingTime,
    progress,
    start,
    pause,
    resume,
    reset,
    stop,
    addTime,
  };
}
