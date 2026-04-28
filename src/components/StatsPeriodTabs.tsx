"use client";

import { useRouter, useSearchParams } from "next/navigation";

const PERIODS = [
  { value: "3m",  label: "3 Months" },
  { value: "1y",  label: "1 Year" },
  { value: "ytd", label: "Year to Date" },
  { value: "all", label: "All Time" },
] as const;

export default function StatsPeriodTabs({ period }: { period: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function select(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", value);
    router.push(`/stats?${params.toString()}`);
  }

  return (
    <div className="flex gap-1 rounded-xl bg-gray-100 dark:bg-gray-800 p-1 mb-8">
      {PERIODS.map((p) => (
        <button
          key={p.value}
          onClick={() => select(p.value)}
          className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            period === p.value
              ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
