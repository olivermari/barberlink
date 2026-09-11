"use client";

import { useEffect, useState } from "react";

// "12 min ago", kept current. Starts from the server's clock so the
// first paint matches the server render.
export function TimeAgo({ iso, serverNowMs }: { iso: string; serverNowMs: number }) {
  const [now, setNow] = useState(serverNowMs);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const minutes = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return <>just now</>;
  if (minutes < 60) return <>{minutes} min ago</>;
  return (
    <>
      {Math.floor(minutes / 60)} h {minutes % 60} min ago
    </>
  );
}
