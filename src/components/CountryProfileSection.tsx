"use client";

import { useState } from "react";
import CountryProfileCard from "./CountryProfileCard";
import { byAlpha2 } from "@/lib/countries";

interface Props {
  countryCodes: string[];
  startDate: string | null;
  homeCountryName: string | null;
}

export default function CountryProfileSection({ countryCodes, startDate, homeCountryName }: Props) {
  const [open, setOpen] = useState(true);

  // Use noon time so timezone offsets never cross midnight and change the month.
  const month = startDate
    ? new Date(startDate + "T12:00:00").toLocaleString("en-US", { month: "long" })
    : null;

  return (
    <div className="border-t border-gray-100 dark:border-[#2e2e2e] pt-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Country Profile</span>
        <svg
          className={`h-3.5 w-3.5 text-gray-400 dark:text-[#9fb8b8] transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          {countryCodes.map((code) => {
            const name = byAlpha2[code]?.name ?? code;
            return (
              <div key={code}>
                {countryCodes.length > 1 && (
                  <p className="text-xs font-medium text-gray-400 dark:text-[#9fb8b8] mb-2">{name}</p>
                )}
                <CountryProfileCard countryName={name} month={month} homeCountryName={homeCountryName} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
