'use client';

import { useEffect, useState } from 'react';

interface CountdownTimerProps {
  targetDate: string;
  className?: string;
}

export function CountdownTimer({ targetDate, className }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    function calculate() {
      const now = Date.now();
      const target = new Date(targetDate).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft('Started');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 0) {
        setTimeLeft(`${hours}h ${mins}m`);
      } else if (mins > 0) {
        setTimeLeft(`${mins}m ${secs}s`);
      } else {
        setTimeLeft(`${secs}s`);
      }
    }

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <span className={className}>
      {timeLeft}
    </span>
  );
}
