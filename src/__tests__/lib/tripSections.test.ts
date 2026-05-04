import { getSectionVisibility, setSectionVisibility, TRIP_SECTIONS } from "@/lib/tripSections";

// ─── localStorage mock ────────────────────────────────────────────────────────

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(global, "localStorage", { value: localStorageMock, writable: true });

beforeEach(() => localStorageMock.clear());

// ─── TRIP_SECTIONS constant ───────────────────────────────────────────────────

describe("TRIP_SECTIONS", () => {
  it("contains the required section keys", () => {
    const keys = TRIP_SECTIONS.map((s) => s.key);
    expect(keys).toContain("itinerary");
    expect(keys).toContain("map");
    expect(keys).toContain("flights");
    expect(keys).toContain("expenses");
    expect(keys).toContain("journal");
  });

  it("every section has a non-empty label", () => {
    TRIP_SECTIONS.forEach((s) => {
      expect(s.label.length).toBeGreaterThan(0);
    });
  });
});

// ─── getSectionVisibility ─────────────────────────────────────────────────────

describe("getSectionVisibility", () => {
  it("returns all sections visible by default when localStorage is empty", () => {
    const prefs = getSectionVisibility();
    expect(prefs.itinerary).toBe(true);
    expect(prefs.map).toBe(true);
    expect(prefs.flights).toBe(true);
    expect(prefs.expenses).toBe(true);
    expect(prefs.journal).toBe(true);
  });

  it("merges stored prefs with defaults (partial override)", () => {
    localStorageMock.setItem("trip_sections_visible", JSON.stringify({ map: false }));
    const prefs = getSectionVisibility();
    expect(prefs.map).toBe(false);
    expect(prefs.itinerary).toBe(true); // default preserved
    expect(prefs.journal).toBe(true);   // default preserved
  });

  it("returns all-true defaults when localStorage contains invalid JSON", () => {
    localStorageMock.setItem("trip_sections_visible", "not-valid-json{{");
    const prefs = getSectionVisibility();
    expect(prefs.itinerary).toBe(true);
    expect(prefs.map).toBe(true);
  });

  it("returns complete object with all section keys even if stored data has extras", () => {
    localStorageMock.setItem(
      "trip_sections_visible",
      JSON.stringify({ itinerary: false, unknownSection: true })
    );
    const prefs = getSectionVisibility();
    // All required keys present
    expect(Object.keys(prefs)).toEqual(
      expect.arrayContaining(["itinerary", "map", "flights", "expenses", "journal"])
    );
    expect(prefs.itinerary).toBe(false);
  });
});

// ─── setSectionVisibility ─────────────────────────────────────────────────────

describe("setSectionVisibility", () => {
  it("persists preferences to localStorage", () => {
    const prefs = { itinerary: true, map: false, flights: true, expenses: false, journal: true };
    setSectionVisibility(prefs);
    const stored = JSON.parse(localStorageMock.getItem("trip_sections_visible") ?? "{}");
    expect(stored.map).toBe(false);
    expect(stored.expenses).toBe(false);
    expect(stored.itinerary).toBe(true);
  });

  it("round-trips correctly: set then get returns same values", () => {
    const original = { itinerary: false, map: false, flights: true, expenses: true, journal: false };
    setSectionVisibility(original);
    const retrieved = getSectionVisibility();
    expect(retrieved).toMatchObject(original);
  });

  it("overwrites previous stored value", () => {
    setSectionVisibility({ itinerary: true, map: true, flights: true, expenses: true, journal: true });
    setSectionVisibility({ itinerary: false, map: false, flights: false, expenses: false, journal: false });
    const prefs = getSectionVisibility();
    expect(prefs.itinerary).toBe(false);
    expect(prefs.map).toBe(false);
  });
});
