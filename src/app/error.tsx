"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to an error reporting service here if needed
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-4xl">⚠️</p>
      <h1 className="mt-4 text-xl font-semibold text-gray-900 dark:text-[#efefef]">
        Something went wrong
      </h1>
      <p className="mt-2 text-sm text-gray-500 dark:text-[#9fb8b8]">
        An unexpected error occurred. Try refreshing the page.
      </p>
      <div className="mt-8 flex gap-3">
        <button onClick={reset} className="btn-primary">
          Try again
        </button>
        <a href="/trips" className="btn-secondary">
          Back to my trips
        </a>
      </div>
    </div>
  );
}
