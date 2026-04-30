"use client";

import { useEffect, useState } from "react";

interface CountryProfile {
  outlet: string;
  currency: string;
  weather: string;
}

interface Props {
  countryName: string;
  month: string | null;
}

const OUTLET_ICON = (
  <svg className="h-3.5 w-3.5 shrink-0 text-[#9fb8b8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="9" cy="10" r="1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="10" r="1" fill="currentColor" stroke="none" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 14h6" />
  </svg>
);

const CURRENCY_ICON = (
  <svg className="h-3.5 w-3.5 shrink-0 text-[#9fb8b8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33" />
  </svg>
);

const WEATHER_ICON = (
  <svg className="h-3.5 w-3.5 shrink-0 text-[#9fb8b8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
  </svg>
);

export default function CountryProfileCard({ countryName, month }: Props) {
  const [profile, setProfile] = useState<CountryProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cacheKey = `pdata-profile-${countryName}-${month ?? ""}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try { setProfile(JSON.parse(cached)); setLoading(false); return; } catch {}
    }

    fetch("/api/country-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ countryName, month }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) {
          setProfile(data);
          sessionStorage.setItem(cacheKey, JSON.stringify(data));
        }
      })
      .finally(() => setLoading(false));
  }, [countryName, month]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-14 rounded-lg bg-[#e0e0e0] dark:bg-[#2e2e2e] animate-pulse" />
        ))}
      </div>
    );
  }

  if (!profile) return null;

  const items = [
    { icon: OUTLET_ICON, label: "Outlet", value: profile.outlet },
    { icon: CURRENCY_ICON, label: "Currency", value: profile.currency },
    { icon: WEATHER_ICON, label: month ? `Weather in ${month}` : "Climate", value: profile.weather },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {items.map(({ icon, label, value }) => (
        <div key={label} className="rounded-lg border border-[#e0e0e0] dark:border-[#2e2e2e] bg-white dark:bg-[#2e2e2e]/60 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            {icon}
            <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-[#9fb8b8]">{label}</span>
          </div>
          <p className="text-xs text-gray-700 dark:text-[#efefef] leading-snug">{value}</p>
        </div>
      ))}
    </div>
  );
}
