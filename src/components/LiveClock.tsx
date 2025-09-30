'use client';

import { useState, useEffect } from 'react';

export default function LiveClock() {
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const romeTime = now.toLocaleString('it-IT', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'Europe/Rome'
      });
      setCurrentTime(romeTime);
    };

    // Update immediately
    updateTime();

    // Update every second
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-xs text-gray-400 font-mono">
      Roma: {currentTime}
    </div>
  );
}