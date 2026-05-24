"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { SORTED_COUNTRIES } from "@/lib/countries";
import { TRIP_SECTIONS, getSectionVisibility, setSectionVisibility, type SectionKey } from "@/lib/tripSections";
import { getClockFormat, setClockFormat, type ClockFormat } from "@/lib/timeFormat";
import { getDefaultItineraryStyle, setDefaultItineraryStyle, ITINERARY_STYLE_OPTIONS } from "@/lib/itineraryStyle";
import type { MapView, UserSettings, ItineraryStyle } from "@/types/database";
import { getTravelPrefs, setTravelPrefs, formatTravelPrefsForPrompt, PACE_OPTIONS, STYLE_OPTIONS, INTERESTS, DIETARY_OPTIONS, type TravelPrefs } from "@/lib/travelPrefs";

export default function SettingsPage() {
  const [isDark, setIsDark] = useState(false);
  const [clockFormat, setClockFormatState] = useState<ClockFormat>("12h");
  const [defaultStyle, setDefaultStyleState] = useState<ItineraryStyle>("structured");
  const router = useRouter();
  const supabase = createClient();

  const [mapView, setMapView] = useState<MapView>("world");
  const [homeCountry, setHomeCountry] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [travelPrefs, setTravelPrefsState] = useState<TravelPrefs>({ pace: "", style: "", interests: [], dietary: [], dietaryOther: "", daily_budget: null, currency: "USD", fitness: "", avoid: "" });
  const [sectionVisibility, setSectionVisibilityState] = useState<Record<SectionKey, boolean>>({
    itinerary: true, map: true, flights: true, expenses: true, journal: true,
  });

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const preferred = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsDark(stored ? stored === "dark" : preferred);
    setSectionVisibilityState(getSectionVisibility());
    setClockFormatState(getClockFormat());
    setDefaultStyleState(getDefaultItineraryStyle());
    setTravelPrefsState(getTravelPrefs());
  }, []);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: rawData, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!error && rawData) {
        const data = rawData as unknown as UserSettings;
        setMapView(data.map_view);
        setHomeCountry(data.home_country_code ?? "");
      }
      setLoading(false);
    }
    load();
  }, [supabase, router]);

  function toggleDark() {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("user_settings").upsert({
      user_id: user.id,
      map_view: mapView,
      home_country_code: homeCountry || null,
    });

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function updateTravelPrefs(partial: Partial<TravelPrefs>) {
    setTravelPrefsState((prev) => {
      const next = { ...prev, ...partial };
      setTravelPrefs(next);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <nav className="mb-6 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/trips" className="hover:text-brand-600">My Trips</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Settings</span>
      </nav>

      <div>
        <h1 className="mb-6 text-xl font-bold text-gray-900">Settings</h1>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Map view preference */}
          <div>
            <p className="label mb-2">Map view</p>
            <div className="grid grid-cols-2 gap-3">
              {(["world", "country"] as MapView[]).map((v) => (
                <label
                  key={v}
                  className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 p-4 transition-colors ${
                    mapView === v
                      ? "border-brand-500 bg-brand-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="map_view"
                    value={v}
                    checked={mapView === v}
                    onChange={() => setMapView(v)}
                    className="sr-only"
                  />
                  {v === "world" ? (
                    <svg className="h-8 w-8 text-brand-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                      <path d="M2 12h20" />
                    </svg>
                  ) : (
                    <svg className="h-8 w-8 text-brand-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                  )}
                  <span className="text-sm font-medium capitalize text-gray-700">
                    {v === "world" ? "World map" : "My country"}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Home country */}
          <div>
            <label htmlFor="home_country" className="label">
              Home country
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Used to zoom the map when &ldquo;My country&rdquo; view is selected.
            </p>
            <select
              id="home_country"
              value={homeCountry}
              onChange={(e) => setHomeCountry(e.target.value)}
              className="input"
            >
              <option value="">— Select a country —</option>
              {SORTED_COUNTRIES.map((c) => (
                <option key={c.alpha2} value={c.alpha2}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? "Saving…" : "Save settings"}
            </button>
            {saved && (
              <span className="text-sm text-green-600 font-medium">Saved!</span>
            )}
          </div>
        </form>

        {/* Trip section visibility */}
        <div className="mt-6 border-t border-gray-100 pt-6 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Trip page sections</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Choose which sections appear on each trip page.</p>
          <div className="space-y-2">
            {TRIP_SECTIONS.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                <button
                  type="button"
                  onClick={() => {
                    const next = { ...sectionVisibility, [key]: !sectionVisibility[key] };
                    setSectionVisibilityState(next);
                    setSectionVisibility(next);
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                    sectionVisibility[key] ? "bg-brand-600" : "bg-gray-200"
                  }`}
                  role="switch"
                  aria-checked={sectionVisibility[key]}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${sectionVisibility[key] ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Default itinerary style */}
        <div className="mt-6 border-t border-gray-100 pt-6 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Default itinerary style</p>
          <div className="grid grid-cols-2 gap-2">
            {ITINERARY_STYLE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { setDefaultStyleState(opt.value); setDefaultItineraryStyle(opt.value); }}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  defaultStyle === opt.value
                    ? "border-[#1e1e1e] dark:border-[#cadede] bg-[#1e1e1e] dark:bg-[#cadede] text-white dark:text-[#1e1e1e]"
                    : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                <p className="text-sm font-medium">{opt.label}</p>
                <p className={`text-xs mt-0.5 ${defaultStyle === opt.value ? "text-white/70 dark:text-[#1e1e1e]/70" : "text-gray-400 dark:text-gray-500"}`}>{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Clock format */}
        <div className="mt-6 border-t border-gray-100 pt-6 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Time format</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">How activity times appear in your itinerary.</p>
            </div>
            <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-sm font-medium">
              {(["12h", "24h"] as ClockFormat[]).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => { setClockFormatState(fmt); setClockFormat(fmt); }}
                  className={`px-3 py-1.5 transition-colors ${
                    clockFormat === fmt
                      ? "bg-[#1e1e1e] dark:bg-[#cadede] text-white dark:text-[#1e1e1e]"
                      : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dark mode — lives outside the form, saves instantly */}
        <div className="mt-6 border-t border-gray-100 pt-6 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Dark mode</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Switch between light and dark appearance.</p>
            </div>
            <button
              type="button"
              onClick={toggleDark}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
                isDark ? "bg-brand-600" : "bg-gray-200"
              }`}
              role="switch"
              aria-checked={isDark}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                  isDark ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Travel preferences */}
        <div className="mt-6 border-t border-gray-100 pt-6 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">AI travel preferences</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Used to personalise AI itinerary suggestions across all your trips.</p>

          {/* Pace */}
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Travel pace</p>
            <div className="flex gap-2 flex-wrap">
              {PACE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateTravelPrefs({ pace: opt.value })}
                  className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                    travelPrefs.pace === opt.value
                      ? "border-[#1e1e1e] dark:border-[#cadede] bg-[#1e1e1e] dark:bg-[#cadede] text-white dark:text-[#1e1e1e]"
                      : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                  }`}
                >
                  <p className="text-xs font-semibold">{opt.label}</p>
                  <p className={`text-[10px] mt-0.5 ${travelPrefs.pace === opt.value ? "text-white/70 dark:text-[#1e1e1e]/70" : "text-gray-400"}`}>{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Style */}
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Travel style</p>
            <div className="flex gap-2 flex-wrap">
              {STYLE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateTravelPrefs({ style: opt.value })}
                  className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                    travelPrefs.style === opt.value
                      ? "border-[#1e1e1e] dark:border-[#cadede] bg-[#1e1e1e] dark:bg-[#cadede] text-white dark:text-[#1e1e1e]"
                      : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                  }`}
                >
                  <p className="text-xs font-semibold">{opt.label}</p>
                  <p className={`text-[10px] mt-0.5 ${travelPrefs.style === opt.value ? "text-white/70 dark:text-[#1e1e1e]/70" : "text-gray-400"}`}>{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Interests */}
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Interests</p>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((interest) => {
                const active = travelPrefs.interests.includes(interest);
                return (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => updateTravelPrefs({
                      interests: active
                        ? travelPrefs.interests.filter((i) => i !== interest)
                        : [...travelPrefs.interests, interest],
                    })}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      active
                        ? "border-[#9fb8b8] bg-[#9fb8b8]/20 text-[#1e1e1e] dark:text-[#cadede]"
                        : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-[#9fb8b8]"
                    }`}
                  >
                    {interest}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dietary */}
          <div>
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Dietary needs</p>
            <div className="flex flex-wrap gap-2">
              {DIETARY_OPTIONS.map((diet) => {
                const active = travelPrefs.dietary.includes(diet);
                return (
                  <button
                    key={diet}
                    type="button"
                    onClick={() => updateTravelPrefs({
                      dietary: active
                        ? travelPrefs.dietary.filter((d) => d !== diet)
                        : [...travelPrefs.dietary, diet],
                    })}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      active
                        ? "border-[#9fb8b8] bg-[#9fb8b8]/20 text-[#1e1e1e] dark:text-[#cadede]"
                        : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-[#9fb8b8]"
                    }`}
                  >
                    {diet}
                  </button>
                );
              })}
            </div>
            {travelPrefs.dietary.includes("Other") && (
              <input
                type="text"
                value={travelPrefs.dietaryOther ?? ""}
                onChange={(e) => updateTravelPrefs({ dietaryOther: e.target.value })}
                placeholder="Describe your dietary need…"
                className="input mt-2 w-full text-sm"
              />
            )}
          </div>

          {/* Daily budget */}
          <div>
            <label className="label">Daily budget</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                <input
                  type="number"
                  min="0"
                  value={travelPrefs.daily_budget ?? ""}
                  onChange={(e) => updateTravelPrefs({ daily_budget: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="e.g. 50"
                  className="input pl-6"
                />
              </div>
              <select
                value={travelPrefs.currency ?? "USD"}
                onChange={(e) => updateTravelPrefs({ currency: e.target.value })}
                className="input w-28"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="AUD">AUD</option>
                <option value="CAD">CAD</option>
                <option value="NZD">NZD</option>
                <option value="JPY">JPY</option>
                <option value="KRW">KRW</option>
                <option value="TWD">TWD</option>
                <option value="HKD">HKD</option>
                <option value="CNY">CNY</option>
                <option value="SGD">SGD</option>
                <option value="THB">THB</option>
                <option value="MYR">MYR</option>
                <option value="IDR">IDR</option>
                <option value="VND">VND</option>
                <option value="PHP">PHP</option>
                <option value="INR">INR</option>
                <option value="AED">AED</option>
                <option value="MXN">MXN</option>
                <option value="BRL">BRL</option>
                <option value="ZAR">ZAR</option>
              </select>
            </div>
            <p className="mt-1 text-xs text-gray-400">Per day, all-in — helps the AI avoid over-budget suggestions</p>
          </div>

          {/* Fitness / mobility */}
          <div>
            <label className="label">Physical fitness / mobility</label>
            <input
              type="text"
              value={travelPrefs.fitness ?? ""}
              onChange={(e) => updateTravelPrefs({ fitness: e.target.value })}
              placeholder="e.g. happy to hike 15km, prefer flat walks, wheelchair user"
              className="input"
            />
          </div>

          {/* Things to avoid */}
          <div>
            <label className="label">Things to avoid</label>
            <input
              type="text"
              value={travelPrefs.avoid ?? ""}
              onChange={(e) => updateTravelPrefs({ avoid: e.target.value })}
              placeholder="e.g. early mornings, very crowded places, spicy food"
              className="input"
            />
          </div>

          {(travelPrefs.pace || travelPrefs.style || travelPrefs.interests.length > 0 || travelPrefs.dietary.length > 0) && (
            <p className="mt-3 text-[10px] text-gray-400 dark:text-[#9fb8b8]">
              AI prompt: &ldquo;{formatTravelPrefsForPrompt(travelPrefs)}&rdquo;
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
