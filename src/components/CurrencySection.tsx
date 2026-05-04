"use client";

import { useState, useEffect, useCallback } from "react";
import { CURRENCY_CODES } from "@/lib/countryData";
import { byAlpha2 } from "@/lib/countries";

interface CurrencyOption {
  code: string;
  countryName: string;
}

interface Props {
  countryCodes: string[];
  homeCountryCode: string | null;
}

const QUICK_AMOUNTS = [1, 5, 10, 50, 100, 500, 1000];

function formatAmount(n: number): string {
  if (n === 0) return "0";
  if (n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (n >= 10)   return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default function CurrencySection({ countryCodes, homeCountryCode }: Props) {
  const [open, setOpen] = useState(false);

  // Build list of destination currencies from trip's country codes
  const destOptions: CurrencyOption[] = [];
  for (const code of countryCodes) {
    const name = byAlpha2[code]?.name;
    if (!name) continue;
    const currCode = CURRENCY_CODES[name];
    if (!currCode) continue;
    if (!destOptions.find((o) => o.code === currCode)) {
      destOptions.push({ code: currCode, countryName: name });
    }
  }

  const homeCurrencyCode =
    (homeCountryCode ? CURRENCY_CODES[byAlpha2[homeCountryCode]?.name ?? ""] : null) ?? "USD";

  // Filter out dest currencies that are the same as home
  const filteredDest = destOptions.filter((o) => o.code !== homeCurrencyCode);

  const [selectedDest, setSelectedDest] = useState<string>(filteredDest[0]?.code ?? "");
  const [amount, setAmount]             = useState<string>("100");
  const [flipped, setFlipped]           = useState(false); // false = home→dest, true = dest→home
  const [rate, setRate]                 = useState<number | null>(null);
  const [approximate, setApproximate]   = useState(false);
  const [rateLoading, setRateLoading]   = useState(false);
  const [rateError, setRateError]       = useState(false);

  const fromCode = flipped ? selectedDest : homeCurrencyCode;
  const toCode   = flipped ? homeCurrencyCode : selectedDest;

  const fetchRate = useCallback(async (from: string, to: string) => {
    if (!from || !to || from === to) { setRate(1); return; }
    setRateLoading(true);
    setRateError(false);
    try {
      const res = await fetch(`/api/exchange-rate?from=${from}&to=${to}`);
      const data = await res.json();
      if (data.rate) {
        setRate(data.rate);
        setApproximate(data.approximate ?? false);
      } else {
        setRateError(true);
      }
    } catch {
      setRateError(true);
    } finally {
      setRateLoading(false);
    }
  }, []);

  // Fetch rate whenever currency pair or direction changes
  useEffect(() => {
    if (selectedDest && open) fetchRate(fromCode, toCode);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromCode, toCode, selectedDest, open]);

  if (filteredDest.length === 0) return null;

  const numAmount  = parseFloat(amount) || 0;
  const converted  = rate !== null ? numAmount * rate : null;

  return (
    <div className="mb-8 rounded-xl border border-[#e0e0e0] dark:border-[#2e2e2e] overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#cadede] dark:bg-[#2e2e2e]">
            <svg className="h-4 w-4 text-[#1e1e1e] dark:text-[#9fb8b8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-[#efefef]">Currency</p>
            <p className="text-xs text-gray-400 dark:text-[#9fb8b8]">
              {filteredDest.map((d) => d.code).join(" · ")} · live converter
            </p>
          </div>
        </div>
        <svg
          className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-[#e0e0e0] dark:border-[#2e2e2e] px-5 py-5 space-y-5">

          {/* Currency selector (only if multiple dest currencies) */}
          {filteredDest.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {filteredDest.map((opt) => (
                <button
                  key={opt.code}
                  onClick={() => { setSelectedDest(opt.code); setRate(null); }}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                    selectedDest === opt.code
                      ? "bg-[#1e1e1e] dark:bg-[#cadede] text-white dark:text-[#1e1e1e]"
                      : "bg-[#e0e0e0] dark:bg-[#2e2e2e] text-gray-600 dark:text-[#9fb8b8] hover:bg-[#cadede] dark:hover:bg-[#3e3e3e]"
                  }`}
                >
                  {opt.code} <span className="font-normal opacity-70">· {opt.countryName}</span>
                </button>
              ))}
            </div>
          )}

          {/* Calculator */}
          <div className="rounded-xl bg-[#f5f5f5] dark:bg-[#2e2e2e] p-4 space-y-3">

            {/* Input row */}
            <div className="flex items-center gap-2">
              {/* From */}
              <div className="flex-1">
                <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-[#9fb8b8] mb-1 block">
                  {fromCode}
                </label>
                <input
                  type="number"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-lg border border-[#e0e0e0] dark:border-[#3e3e3e] bg-white dark:bg-[#1e1e1e] px-3 py-2.5 text-lg font-semibold text-gray-900 dark:text-[#efefef] focus:outline-none focus:ring-2 focus:ring-[#cadede] dark:focus:ring-[#9fb8b8]"
                  placeholder="0"
                />
              </div>

              {/* Swap button */}
              <button
                onClick={() => setFlipped((v) => !v)}
                className="mt-5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#e0e0e0] dark:border-[#3e3e3e] bg-white dark:bg-[#1e1e1e] text-gray-400 hover:border-[#9fb8b8] hover:text-[#9fb8b8] transition-colors"
                title="Swap currencies"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 3M21 7.5H7.5" />
                </svg>
              </button>

              {/* To */}
              <div className="flex-1">
                <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-[#9fb8b8] mb-1 block">
                  {toCode}
                </label>
                <div className="w-full rounded-lg border border-[#cadede] dark:border-[#9fb8b8]/30 bg-[#cadede]/20 dark:bg-[#9fb8b8]/10 px-3 py-2.5 min-h-[46px] flex items-center">
                  {rateLoading ? (
                    <span className="text-sm text-gray-400 animate-pulse">Loading…</span>
                  ) : rateError ? (
                    <span className="text-sm text-red-400">Unavailable</span>
                  ) : converted !== null ? (
                    <span className="text-lg font-semibold text-gray-900 dark:text-[#efefef]">
                      {formatAmount(converted)}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">—</span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick amounts */}
            <div className="flex flex-wrap gap-1.5">
              {QUICK_AMOUNTS.map((q) => (
                <button
                  key={q}
                  onClick={() => setAmount(String(q))}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    amount === String(q)
                      ? "bg-[#1e1e1e] dark:bg-[#9fb8b8] text-white dark:text-[#1e1e1e]"
                      : "bg-white dark:bg-[#1e1e1e] border border-[#e0e0e0] dark:border-[#3e3e3e] text-gray-500 dark:text-[#9fb8b8] hover:border-[#9fb8b8]"
                  }`}
                >
                  {q.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Rate display */}
          {rate !== null && !rateError && (
            <p className="text-xs text-gray-400 dark:text-[#9fb8b8] text-center">
              1 {fromCode} = {formatAmount(rate)} {toCode}
              {approximate && <span className="ml-1 opacity-70">(approximate)</span>}
            </p>
          )}

        </div>
      )}
    </div>
  );
}
