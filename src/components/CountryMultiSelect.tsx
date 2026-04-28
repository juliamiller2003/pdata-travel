"use client";

import { useState, useRef, useEffect } from "react";
import { SORTED_COUNTRIES } from "@/lib/countries";

interface CountryMultiSelectProps {
  value: string[];
  onChange: (codes: string[]) => void;
}

export default function CountryMultiSelect({ value, onChange }: CountryMultiSelectProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = SORTED_COUNTRIES.filter(
    (c) =>
      !value.includes(c.alpha2) &&
      c.name.toLowerCase().includes(query.toLowerCase())
  );

  function add(code: string) {
    onChange([...value, code]);
    setQuery("");
  }

  function remove(code: string) {
    onChange(value.filter((c) => c !== code));
  }

  const selectedCountries = value
    .map((code) => SORTED_COUNTRIES.find((c) => c.alpha2 === code))
    .filter(Boolean) as (typeof SORTED_COUNTRIES)[number][];

  return (
    <div ref={containerRef} className="relative">
      <div
        className="input flex flex-wrap gap-1.5 min-h-[2.5rem] h-auto cursor-text py-1.5"
        onClick={() => setOpen(true)}
      >
        {selectedCountries.map((c) => (
          <span
            key={c.alpha2}
            className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-700"
          >
            {c.name}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); remove(c.alpha2); }}
              className="ml-0.5 text-sky-400 hover:text-sky-700 leading-none"
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={value.length === 0 ? "Search countries…" : "Add another…"}
          className="min-w-[8rem] flex-1 border-none bg-transparent p-0 text-sm focus:outline-none focus:ring-0"
        />
      </div>

      {open && filtered.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full overflow-y-auto rounded-xl border border-gray-100 bg-white shadow-lg max-h-56">
          {filtered.map((c) => (
            <li key={c.alpha2}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); add(c.alpha2); }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-sky-50 hover:text-sky-700"
              >
                {c.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
