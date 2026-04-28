"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { SORTED_COUNTRIES } from "@/lib/countries";
import type { MapView } from "@/types/database";

export default function SettingsPage() {
  const [isDark, setIsDark] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const [mapView, setMapView] = useState<MapView>("world");
  const [homeCountry, setHomeCountry] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const preferred = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsDark(stored ? stored === "dark" : preferred);
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

      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!error && data) {
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

    await supabase.from("user_settings").upsert({
      user_id: user.id,
      map_view: mapView,
      home_country_code: homeCountry || null,
    });

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
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

      <div className="card p-6">
        <h1 className="mb-6 text-xl font-bold text-gray-900">Settings</h1>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Map view preference */}
          <div>
            <p className="label mb-2">Map view</p>
            <p className="text-xs text-gray-500 mb-3">
              Choose whether to show a world map or zoom into your home country by default.
            </p>
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
      </div>
    </div>
  );
}
