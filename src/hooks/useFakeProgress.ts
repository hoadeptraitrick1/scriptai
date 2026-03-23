import { useState, useEffect } from 'react';

export function useFakeProgress(isLoading: boolean, durationMs: number = 15000) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      setProgress(0);
      return;
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      // Use an easing function so it slows down as it approaches 99%
      const x = Math.min(elapsed / durationMs, 1);
      const easeOutQuart = 1 - Math.pow(1 - x, 4);
      
      const currentProgress = Math.floor(easeOutQuart * 99);
      setProgress(currentProgress);
      
      if (elapsed >= durationMs) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isLoading, durationMs]);

  return progress;
}
