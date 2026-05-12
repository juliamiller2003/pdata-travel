"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getTravelPrefs } from "@/lib/travelPrefs";

const DISMISSED_KEY = "pathway-prefs-banner-dismissed";

export default function TravelPrefsBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed) return;
    const prefs = getTravelPrefs();
    const isEmpty =
      !prefs.pace &&
      !prefs.style &&
      prefs.interests.length === 0 &&
      prefs.dietary.length === 0;
    if (isEmpty) setShow(true);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-[#cadede] bg-[#cadede]/20 dark:border-[#2a3f3f] dark:bg-[#2a3f3f]/40 px-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <svg className="h-4 w-4 shrink-0 text-[#1e2d2d] dark:text-[#cadede]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
        <p className="text-sm font-semibold text-[#1e2d2d] dark:text-[#cadede] min-w-0">Set up preferences</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href="/settings"
          onClick={dismiss}
          className="rounded-lg bg-[#1e2d2d] dark:bg-[#cadede] px-3 py-1.5 text-xs font-semibold text-white dark:text-[#1e1e1e] hover:opacity-90 transition-opacity"
        >
          Set up
        </Link>
        <button
          onClick={dismiss}
          className="text-[#1e2d2d]/50 dark:text-[#cadede]/50 hover:text-[#1e2d2d] dark:hover:text-[#cadede] transition-colors"
          aria-label="Dismiss"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
