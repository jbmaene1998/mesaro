import { useEffect, useMemo, useState } from "react";

function getSecondsRemaining(expiresAt?: string | null) {
  if (!expiresAt) {
    return 0;
  }
  const expiresMs = new Date(expiresAt).getTime();
  if (Number.isNaN(expiresMs)) {
    return 0;
  }

  return Math.max(0, Math.floor((expiresMs - Date.now()) / 1000));
}

function formatTime(seconds: number) {
  const mm = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const ss = (seconds % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

export function useHoldTimer(expiresAt?: string | null) {
  const [timeRemaining, setTimeRemaining] = useState(() => getSecondsRemaining(expiresAt));

  useEffect(() => {
    setTimeRemaining(getSecondsRemaining(expiresAt));

    const timerId = window.setInterval(() => {
      setTimeRemaining(getSecondsRemaining(expiresAt));
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [expiresAt]);

  return useMemo(
    () => ({
      timeRemaining,
      formattedTime: formatTime(timeRemaining),
      isExpired: timeRemaining <= 0,
      isWarning: timeRemaining < 60
    }),
    [timeRemaining]
  );
}
