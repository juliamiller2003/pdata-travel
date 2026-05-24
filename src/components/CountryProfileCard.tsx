"use client";

import { useEffect, useState } from "react";
import { OUTLET_LOOKUP } from "@/lib/countryData";

interface CountryProfile {
  currency: string;
  weather: string;
  sim: string;
  visa: string | null;
}

interface Props {
  countryName: string;
  month: string | null;
  homeCountryName: string | null;
}

const ICONS: Record<string, JSX.Element> = {
  outlet: (
    <svg className="h-3.5 w-3.5 shrink-0 text-[#9fb8b8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="9" cy="10" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="10" r="1" fill="currentColor" stroke="none" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 14h6" />
    </svg>
  ),
  currency: (
    <svg className="h-3.5 w-3.5 shrink-0 text-[#9fb8b8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33" />
    </svg>
  ),
  weather: (
    <svg className="h-3.5 w-3.5 shrink-0 text-[#9fb8b8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
    </svg>
  ),
  sim: (
    <svg className="h-3.5 w-3.5 shrink-0 text-[#9fb8b8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V6.75l-4.5-5.25h-3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 10.5h4.5M9.75 13.5h4.5M9.75 16.5h2.25" />
    </svg>
  ),
  visa: (
    <svg className="h-3.5 w-3.5 shrink-0 text-[#9fb8b8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
    </svg>
  ),
};

export default function CountryProfileCard({ countryName, month, homeCountryName }: Props) {
  const [profile, setProfile] = useState<CountryProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Outlet is resolved directly from the static lookup — no API call, no cache involved.
  // This is the permanent fix for the "wrong outlet" problem.
  const outlet = OUTLET_LOOKUP[countryName] ?? null;

  useEffect(() => {
    const cacheKey = `pathway-profile-v8-${countryName}-${month ?? ""}-${homeCountryName ?? ""}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try { setProfile(JSON.parse(cached)); setLoading(false); return; } catch {}
    }

    fetch("/api/country-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ countryName, month, homeCountryName }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setProfile(data);
          sessionStorage.setItem(cacheKey, JSON.stringify(data));
        }
      })
      .catch(() => setError("Could not load country info."))
      .finally(() => setLoading(false));
  }, [countryName, month, homeCountryName]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: homeCountryName ? 5 : 4 }).map((_, i) => (
          <div key={i} className="h-14 rounded-lg bg-[#e0e0e0] dark:bg-[#2e2e2e] animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-xs text-red-400 py-1">{error}</p>;
  }

  if (!profile) return null;

  const items = [
    // Outlet always comes from the static lookup — never from the API or cache
    ...(outlet ? [{ key: "outlet", label: "Outlet", value: outlet, sub: null }] : []),
    { key: "currency", label: "Currency", value: profile.currency, sub: null },
    {
      key: "weather",
      label: month ? `Weather in ${month}` : "Climate",
      value: profile.weather,
      sub: null,
    },
    { key: "sim",  label: "SIM Card", value: profile.sim,  sub: null },
    ...(profile.visa ? [{ key: "visa", label: "Visa", value: profile.visa, sub: null }] : []),
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {items.map(({ key, label, value, sub }) => (
        <div key={key} className="rounded-lg border border-[#e0e0e0] dark:border-[#2e2e2e] bg-white dark:bg-[#2e2e2e]/60 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            {ICONS[key]}
            <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-[#9fb8b8]">{label}</span>
          </div>
          <p className="text-xs text-gray-700 dark:text-[#efefef] leading-snug">{value}</p>
          {sub && (
            <p className="text-[11px] text-[#9fb8b8] dark:text-[#9fb8b8] mt-1 font-medium">{sub}</p>
          )}
        </div>
      ))}
    </div>
  );
}
