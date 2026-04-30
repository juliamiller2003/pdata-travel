"use client";

import { useEffect, useState } from "react";

export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    setOffline(!navigator.onLine);
    const handleOffline = () => setOffline(true);
    const handleOnline = () => setOffline(false);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-[#e5dd83] dark:bg-[#f5ee9e] px-4 py-2 text-xs font-medium text-[#1e1e1e]">
      <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M8.111 8.111A6.003 6.003 0 0012 6c3.314 0 6 2.686 6 6 0 1.344-.442 2.586-1.188 3.576M3.22 10.22A9.96 9.96 0 003 12c0 5.523 4.477 10 10 10a9.96 9.96 0 005.78-1.843M12 2C6.477 2 2 6.477 2 12" />
      </svg>
      You&apos;re offline — showing cached content
    </div>
  );
}
