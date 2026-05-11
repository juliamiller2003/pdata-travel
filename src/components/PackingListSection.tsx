"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type PackingItem = { id: string; name: string; category: string; packed: boolean };
type TemplateItem = { name: string; category: string };
type CustomTemplate = { id: string; name: string; items: TemplateItem[] };
type View = "list" | "select" | "edit";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  "Documents", "Clothing", "Outerwear", "Activewear", "Shoes", "Accessories", "Toiletries", "Electronics",
  "Health", "Sleep & Hostel", "Money", "Other",
];

const BUILTIN: Record<string, { label: string; sub: string; items: TemplateItem[] }> = {
  backpacker: {
    label: "Backpacker", sub: "50L pack · 30+ items",
    items: [
      { name: "Passport + copies",            category: "Documents"     },
      { name: "Travel insurance details",     category: "Documents"     },
      { name: "Visas",                         category: "Documents"     },
      { name: "Booking confirmations",        category: "Documents"     },
      { name: "T-shirts (3–4)",               category: "Clothing"      },
      { name: "Trousers (1)",                  category: "Clothing"      },
      { name: "Shorts (2)",                   category: "Clothing"      },
      { name: "Underwear (4–5)",              category: "Clothing"      },
      { name: "Socks (4–5)",                  category: "Clothing"      },
      { name: "Light jacket",                 category: "Outerwear"     },
      { name: "Rain jacket",                  category: "Outerwear"     },
      { name: "Swimwear",                     category: "Activewear"    },
      { name: "Flip flops",                   category: "Shoes"         },
      { name: "Walking shoes",                category: "Shoes"         },
      { name: "Toothbrush & toothpaste",      category: "Toiletries"    },
      { name: "Shampoo",                       category: "Toiletries"    },
      { name: "Deodorant",                    category: "Toiletries"    },
      { name: "Sunscreen",                    category: "Toiletries"    },
      { name: "Insect repellent",             category: "Toiletries"    },
      { name: "Razor",                        category: "Toiletries"    },
      { name: "Phone + charger",              category: "Electronics"   },
      { name: "Power bank",                   category: "Electronics"   },
      { name: "Universal adapter",            category: "Electronics"   },
      { name: "Earphones",                     category: "Electronics"   },
      { name: "Painkillers",                  category: "Health"        },
      { name: "Antihistamines",               category: "Health"        },
      { name: "Diarrhea medication",          category: "Health"        },
      { name: "Plasters",                      category: "Health"        },
      { name: "Prescribed medication",        category: "Health"        },
      { name: "Padlock",                       category: "Sleep & Hostel"},
      { name: "Quick-dry travel towel",       category: "Sleep & Hostel"},
      { name: "Earplugs",                     category: "Sleep & Hostel"},
      { name: "Eye mask",                     category: "Sleep & Hostel"},
      { name: "Sleeping bag liner",           category: "Sleep & Hostel"},
      { name: "Local cash",                   category: "Money"         },
      { name: "Travel card / debit card",     category: "Money"         },
      { name: "Backup card",                  category: "Money"         },
    ],
  },
  carryon: {
    label: "Carry-on", sub: "Minimal · 16 items",
    items: [
      { name: "Passport + copies",                        category: "Documents"     },
      { name: "Travel insurance details",                 category: "Documents"     },
      { name: "T-shirts (2)",                             category: "Clothing"      },
      { name: "1 versatile outfit",                       category: "Clothing"      },
      { name: "Underwear (3)",                            category: "Clothing"      },
      { name: "Socks (3)",                                category: "Clothing"      },
      { name: "Light jacket",                             category: "Outerwear"     },
      { name: "Toothbrush & toothpaste",                   category: "Toiletries"    },
      { name: "Deodorant",                                category: "Toiletries"    },
      { name: "Sunscreen",                                category: "Toiletries"    },
      { name: "Phone + charger",                          category: "Electronics"   },
      { name: "Power bank",                               category: "Electronics"   },
      { name: "Universal adapter",                        category: "Electronics"   },
      { name: "Painkillers",                              category: "Health"        },
      { name: "Antihistamines",                           category: "Health"        },
      { name: "Padlock",                                  category: "Sleep & Hostel"},
      { name: "Travel card / debit card",                 category: "Money"         },
      { name: "Local cash",                               category: "Money"         },
    ],
  },
  weekend: {
    label: "Weekend", sub: "Short trip · 10 items",
    items: [
      { name: "Passport + copies",        category: "Documents"  },
      { name: "T-shirts (2)",         category: "Clothing"   },
      { name: "1 going-out outfit",   category: "Clothing"   },
      { name: "Underwear (2)",        category: "Clothing"   },
      { name: "Socks (2)",            category: "Clothing"   },
      { name: "Toothbrush & toothpaste", category: "Toiletries" },
      { name: "Deodorant",               category: "Toiletries" },
      { name: "Phone + charger",      category: "Electronics"},
      { name: "Power bank",           category: "Electronics"},
      { name: "Painkillers",          category: "Health"     },
      { name: "Local cash",           category: "Money"      },
    ],
  },
  hiking: {
    label: "Hiking", sub: "Trails · 18 items",
    items: [
      { name: "Trail map (offline)",                  category: "Documents"  },
      { name: "Hiking boots",                          category: "Shoes"      },
      { name: "Moisture-wicking shirts",              category: "Activewear" },
      { name: "Hiking socks",                         category: "Activewear" },
      { name: "Rain jacket",                          category: "Outerwear"  },
      { name: "Sun hat",                              category: "Accessories"},
      { name: "Fleece",                               category: "Outerwear"  },
      { name: "Sunscreen",                            category: "Toiletries" },
      { name: "Insect repellent",                     category: "Toiletries" },
      { name: "Headlamp + spare batteries",           category: "Electronics"},
      { name: "First aid kit",                        category: "Health"     },
      { name: "Blister pads",                          category: "Health"     },
      { name: "Water purification",                   category: "Health"     },
      { name: "Trekking poles",                       category: "Other"      },
      { name: "Water bottle",                          category: "Other"      },
      { name: "Trail snacks",                          category: "Other"      },
      { name: "Day pack",                              category: "Other"      },
      { name: "Emergency whistle",                    category: "Other"      },
    ],
  },
  beach: {
    label: "Beach", sub: "Sun & sea · 22 items",
    items: [
      { name: "Passport + copies",                          category: "Documents"     },
      { name: "Travel insurance details",                   category: "Documents"     },
      { name: "Swimwear (2)",                               category: "Activewear"    },
      { name: "Rash guard",                                 category: "Activewear"    },
      { name: "Sarong / beach towel",                       category: "Accessories"   },
      { name: "Light shorts (2)",                           category: "Clothing"      },
      { name: "Flip flops",                                 category: "Shoes"         },
      { name: "Light dress / linen shirt",                  category: "Clothing"      },
      { name: "Sun hat",                                    category: "Accessories"   },
      { name: "Sunglasses",                                 category: "Accessories"   },
      { name: "Sunscreen",                                   category: "Toiletries"    },
      { name: "After-sun lotion",                           category: "Toiletries"    },
      { name: "Insect repellent",                           category: "Toiletries"    },
      { name: "Phone + charger",                            category: "Electronics"   },
      { name: "Waterproof phone case",                       category: "Electronics"   },
      { name: "Underwater camera",                           category: "Electronics"   },
      { name: "Rehydration sachets",                        category: "Health"        },
      { name: "Motion sickness meds",                       category: "Health"        },
      { name: "Antihistamines",                             category: "Health"        },
      { name: "Travel card / debit card",                   category: "Money"         },
      { name: "Local cash",                                 category: "Money"         },
      { name: "Day pack",                                   category: "Other"         },
    ],
  },
  winter: {
    label: "Winter", sub: "Sub-zero ready · 20 items",
    items: [
      { name: "Passport + copies",                               category: "Documents"  },
      { name: "Travel insurance details",                        category: "Documents"  },
      { name: "Thermal base layers (top & bottom)",              category: "Activewear" },
      { name: "Heavyweight socks (3–4 pairs)",                   category: "Clothing"   },
      { name: "Ski pants",                                       category: "Activewear" },
      { name: "Down jacket",                                     category: "Outerwear"  },
      { name: "Waterproof outer shell",                          category: "Outerwear"  },
      { name: "Fleece",                                          category: "Outerwear"  },
      { name: "Beanie",                                          category: "Accessories"},
      { name: "Gloves",                                          category: "Accessories"},
      { name: "Neck gaiter",                                     category: "Accessories"},
      { name: "Waterproof boots",                                category: "Shoes"      },
      { name: "Lip balm with SPF",                               category: "Toiletries" },
      { name: "Moisturiser (cold air dries skin)",               category: "Toiletries" },
      { name: "Hand warmers (disposable)",                       category: "Health"     },
      { name: "Cold & flu meds",                                 category: "Health"     },
      { name: "Phone + charger",                                 category: "Electronics"},
      { name: "Power bank",                                      category: "Electronics"},
      { name: "Snow goggles",                                    category: "Other"      },
      { name: "Local cash",                                      category: "Money"      },
    ],
  },
  city: {
    label: "City", sub: "Light & smart · 18 items",
    items: [
      { name: "Passport + copies",                                     category: "Documents"     },
      { name: "Travel insurance details",                          category: "Documents"     },
      { name: "T-shirts (3)",                                      category: "Clothing"      },
      { name: "Trousers (1–2)",                                    category: "Clothing"      },
      { name: "Evening outfit",                                     category: "Clothing"      },
      { name: "Walking shoes",                                      category: "Shoes"         },
      { name: "Light jacket",                                       category: "Outerwear"     },
      { name: "Toothbrush & toothpaste",                           category: "Toiletries"    },
      { name: "Sunscreen",                                         category: "Toiletries"    },
      { name: "Phone + charger",                                   category: "Electronics"   },
      { name: "Power bank",                                        category: "Electronics"   },
      { name: "Earphones",                                         category: "Electronics"   },
      { name: "Offline maps downloaded",                           category: "Electronics"   },
      { name: "Painkillers",                                        category: "Health"        },
      { name: "Antihistamines",                                     category: "Health"        },
      { name: "Padlock",                                            category: "Sleep & Hostel"},
      { name: "Day pack",                                           category: "Other"         },
      { name: "Travel card / debit card",                          category: "Money"         },
      { name: "Local cash",                                        category: "Money"         },
    ],
  },
  diving: {
    label: "Diving", sub: "Underwater · 18 items",
    items: [
      { name: "Passport + copies",                              category: "Documents"  },
      { name: "Dive certification card (PADI / SSI / etc.)",   category: "Documents"  },
      { name: "Travel insurance with dive cover",              category: "Documents"  },
      { name: "Swimwear (2–3)",                                 category: "Activewear" },
      { name: "Rash guard",                                     category: "Activewear" },
      { name: "Wetsuit (3mm–5mm depending on water temp)",      category: "Activewear" },
      { name: "Dive booties",                                   category: "Shoes"      },
      { name: "Sun hat",                                        category: "Accessories"},
      { name: "Sunglasses",                                     category: "Accessories"},
      { name: "Sunscreen",                                       category: "Toiletries" },
      { name: "After-sun lotion",                               category: "Toiletries" },
      { name: "Underwater camera + housing",                    category: "Electronics"},
      { name: "Waterproof phone case",                          category: "Electronics"},
      { name: "Dive computer",                                  category: "Electronics"},
      { name: "Motion sickness meds",                           category: "Health"     },
      { name: "Rehydration sachets",                            category: "Health"     },
      { name: "Dive logbook",                                   category: "Other"      },
      { name: "Mesh dive bag",                                  category: "Other"      },
      { name: "Local cash",                                     category: "Money"      },
    ],
  },
  festival: {
    label: "Festival", sub: "Outdoor events · 20 items",
    items: [
      { name: "Ticket / wristband confirmation",              category: "Documents"     },
      { name: "Passport + copies",                                category: "Documents"     },
      { name: "Festival outfit (1–2)",                        category: "Clothing"      },
      { name: "Walking shoes",                                 category: "Shoes"         },
      { name: "Wellies / waterproof boots",                   category: "Shoes"         },
      { name: "Rain jacket",                                   category: "Outerwear"     },
      { name: "Fleece",                                       category: "Outerwear"     },
      { name: "Sunscreen",                                    category: "Toiletries"    },
      { name: "Dry shampoo",                                  category: "Toiletries"    },
      { name: "Wet wipes",                                    category: "Toiletries"    },
      { name: "Hand sanitiser",                               category: "Toiletries"    },
      { name: "Phone + charger",                              category: "Electronics"   },
      { name: "Power bank",                                   category: "Electronics"   },
      { name: "Painkillers",                                   category: "Health"        },
      { name: "Earplugs",                                      category: "Sleep & Hostel"},
      { name: "Tent + sleeping bag (if camping)",             category: "Sleep & Hostel"},
      { name: "Water bottle",                                  category: "Other"         },
      { name: "Day pack",                                      category: "Other"         },
      { name: "Local cash",                                    category: "Money"         },
      { name: "Backup card",                                  category: "Money"         },
    ],
  },
  digital_nomad: {
    label: "Digital Nomad", sub: "Work & travel · 22 items",
    items: [
      { name: "Passport + copies",                              category: "Documents"     },
      { name: "Travel insurance details",                       category: "Documents"     },
      { name: "Laptop + charger",                               category: "Electronics"   },
      { name: "Laptop stand",                                   category: "Electronics"   },
      { name: "External keyboard + mouse",                      category: "Electronics"   },
      { name: "Phone + charger",                                category: "Electronics"   },
      { name: "Power bank",                                     category: "Electronics"   },
      { name: "Universal adapter",                              category: "Electronics"   },
      { name: "Noise-cancelling headphones",                    category: "Electronics"   },
      { name: "Local SIM / portable WiFi hotspot",              category: "Electronics"   },
      { name: "Cable organiser",                                category: "Electronics"   },
      { name: "T-shirts (3)",                                   category: "Clothing"      },
      { name: "One smart top (for video calls)",                category: "Clothing"      },
      { name: "Comfortable trousers (2)",                       category: "Clothing"      },
      { name: "Light jacket",                                   category: "Outerwear"     },
      { name: "Toothbrush & toothpaste",                         category: "Toiletries"    },
      { name: "Deodorant",                                       category: "Toiletries"    },
      { name: "Shampoo",                                         category: "Toiletries"    },
      { name: "Painkillers",                                     category: "Health"        },
      { name: "Antihistamines",                                  category: "Health"        },
      { name: "Blue-light glasses",                             category: "Health"        },
      { name: "Travel card / debit card",                       category: "Money"         },
      { name: "Backup card",                                    category: "Money"         },
      { name: "VPN subscription active",                        category: "Other"         },
      { name: "Laptop lock / cable lock",                       category: "Other"         },
    ],
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Normalise a packing item name for fuzzy-dedup.
 * - Strips parenthetical qualifiers: "Socks (4–5)" → "socks"
 * - Strips slash variants: "After-sun lotion / aloe vera" → "after-sun lotion"
 * - Strips SPF numbers: "Sunscreen SPF 50+" → "sunscreen"
 * - Strips size qualifiers: "Deodorant (travel size)" → "deodorant"
 * - Strips leading clothing/type modifiers: "Hiking socks" → "socks",
 *   "Heavyweight socks" → "socks", "Rain jacket" → "jacket"
 * - Strips leading numeric quantities: "1 versatile outfit" → "versatile outfit"
 */
function normaliseItemName(name: string): string {
  let s = name.toLowerCase();
  s = s.replace(/\s*\(.*?\)/g, "");          // strip (parenthetical)
  s = s.replace(/\s*\/.*$/, "");             // strip / slash variants
  s = s.replace(/\s*\+.*$/, "");            // strip + compound items ("Sun hat + sunglasses" → "sun hat")
  s = s.replace(/\s+spf\s*[\d+]+\+?/g, ""); // strip SPF numbers
  s = s.replace(/\s+(travel size|travel-size|mini)$/g, ""); // size qualifiers
  // Strip leading clothing/material modifiers repeatedly (handles chains like
  // "waterproof rain jacket" → "rain jacket" → "jacket").
  const MODIFIER_RE = /^(hiking|heavyweight|lightweight|quick-dry|moisture-wicking|thermal|waterproof|down|rain|light|smart|linen|casual|formal|evening|going-out|reef-safe|comfortable|insulated|warm|technical|merino|softshell|hardshell)\s+/;
  // eslint-disable-next-line no-constant-condition
  while (true) { const next = s.replace(MODIFIER_RE, ""); if (next === s) break; s = next; }
  s = s.replace(/^\d+\s+/, ""); // strip leading quantity "2 " / "3 "
  return s.trim();
}

/** Items whose names indicate they are footwear (used to fix miscategorised DB rows). */
const SHOE_RE = /\b(shoes?|boots?|sandals?|flip.?flops?|wellies|booties?|sneakers?|trainers?|heels?|loafers?)\b/i;

/** Items whose names indicate they are accessories (used to fix miscategorised DB rows). */
const ACCESSORY_RE = /\b(sunglasses|hat|beanie|gloves?|gaiter|sarong|scarf|belt|cap|headband|bandana|watch|jewellery|jewelry)\b/i;

/** Items whose names indicate they are outerwear (used to fix miscategorised DB rows). */
const OUTERWEAR_RE = /\b(jacket|fleece|coat|parka|windbreaker|shell|hoodie|jumper|sweater|cardigan|anorak)\b/i;

/** Items whose names indicate they are activewear (used to fix miscategorised DB rows). */
const ACTIVEWEAR_RE = /\b(swimwear|swimsuit|bikini|trunks|boardshorts|rash.?guard|wetsuit|base.?layer|ski.?pants|leggings?|sports?.?bra|workout|gym|yoga|running|cycling|wetsuit|wetsuit)\b/i;

/**
 * Generic/deprecated item names (normalised) that should always be deleted —
 * they add no value as individual packing items.
 */
const REMOVE_ALWAYS = new Set([
  "toiletries",
  "toiletry bag",
  "basic meds",
]);

/**
 * Rename aliases: maps a bad/mangled normalised name → the canonical normalised name
 * so the dedup can then collapse them correctly.
 */
const RENAME_ALIASES: Record<string, string> = {
  "toothbrush & toiletries": "toothbrush & toothpaste",
  // "Wellies / waterproof boots" → slash-drop → "wellies"; map to same key as "Waterproof boots" → "boots"
  "wellies": "boots",
  // "Comfortable shoes for long days" → strip "comfortable" → "shoes for long days"
  "shoes for long days": "walking shoes",
  // "Woolen hat / beanie" → slash-drop → "woolen hat"; map to the canonical template name
  "woolen hat": "beanie",
  // Outerwear variants → canonical keys
  "poncho":      "jacket",   // "Rain poncho / waterproof jacket" → "poncho"
  "outer shell": "jacket",   // "Waterproof outer shell" → "outer shell"
  "layer":       "jacket",   // "Light layer / jacket", "Warm layer / fleece" → "layer"
  "mid-layer":   "fleece",   // "Fleece / mid-layer", "Warm mid-layer / fleece" → "mid-layer"
};

function dedup(items: TemplateItem[]): TemplateItem[] {
  const seen = new Set<string>();
  return items.filter(({ name }) => {
    const key = normaliseItemName(name);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Dedup saved packing items by normalised name.
 * Also:
 *  - Deletes generic/deprecated items (toiletries, toiletry bag)
 *  - Renames mangled items to canonical forms before deduping
 *  - Fixes footwear items saved under "Clothing" before the Shoes category existed
 * Returns:
 *   unique    – deduplicated items with corrected categories
 *   toDelete  – IDs of rows to remove from DB
 *   toUpdate  – { id, category } for rows whose category needs updating in DB
 */
function dedupPackingItems(items: PackingItem[]): {
  unique: PackingItem[];
  toDelete: string[];
  toUpdate: { id: string; category: string }[];
} {
  const seen = new Set<string>();
  const unique: PackingItem[] = [];
  const toDelete: string[] = [];
  const toUpdate: { id: string; category: string }[] = [];
  for (const item of items) {
    const raw = normaliseItemName(item.name);

    // Always remove generic / deprecated items
    if (REMOVE_ALWAYS.has(raw)) {
      toDelete.push(item.id);
      continue;
    }

    // Apply rename aliases then dedup
    const key = RENAME_ALIASES[raw] ?? raw;
    if (seen.has(key)) {
      toDelete.push(item.id);
    } else {
      seen.add(key);
      // Remap items saved under "Clothing" before the Shoes / Accessories split
      if (item.category === "Clothing" && SHOE_RE.test(item.name)) {
        toUpdate.push({ id: item.id, category: "Shoes" });
        unique.push({ ...item, category: "Shoes" });
      } else if (item.category === "Clothing" && ACCESSORY_RE.test(item.name)) {
        toUpdate.push({ id: item.id, category: "Accessories" });
        unique.push({ ...item, category: "Accessories" });
      } else if (item.category === "Clothing" && OUTERWEAR_RE.test(item.name)) {
        toUpdate.push({ id: item.id, category: "Outerwear" });
        unique.push({ ...item, category: "Outerwear" });
      } else if (item.category === "Clothing" && ACTIVEWEAR_RE.test(item.name)) {
        toUpdate.push({ id: item.id, category: "Activewear" });
        unique.push({ ...item, category: "Activewear" });
      } else {
        unique.push(item);
      }
    }
  }
  return { unique, toDelete, toUpdate };
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props { tripId: string; initialItems: PackingItem[] }

export default function PackingListSection({ tripId, initialItems }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createClient() as any;

  // Deduplicate on load, fix shoe categories, clean up stale DB rows
  const { unique: dedupedInitial, toDelete: initialDupes, toUpdate: initialCategoryFixes } = dedupPackingItems(initialItems);

  // ── Packing list state ──────────────────────────────────────────────────────
  const [items, setItems]         = useState<PackingItem[]>(dedupedInitial);
  const [newItem, setNewItem]     = useState("");
  const [newCat, setNewCat]       = useState("Other");
  const [showAdd, setShowAdd]     = useState(false);
  const [clearing, setClearing]   = useState(false);

  // ── Inline item edit state ──────────────────────────────────────────────────
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemName, setEditItemName]   = useState("");
  const [editItemCat,  setEditItemCat]    = useState("Other");

  // ── View state ──────────────────────────────────────────────────────────────
  const [view, setView] = useState<View>(dedupedInitial.length === 0 ? "select" : "list");

  // ── Clean up DB duplicates + fix shoe categories on mount ───────────────────
  useEffect(() => {
    if (initialDupes.length > 0) {
      db.from("packing_items").delete().in("id", initialDupes);
    }
    initialCategoryFixes.forEach(({ id, category }) => {
      db.from("packing_items").update({ category }).eq("id", id);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Template selector state ─────────────────────────────────────────────────
  const [selBuiltin, setSelBuiltin]           = useState<Set<string>>(new Set());
  const [selCustom, setSelCustom]             = useState<Set<string>>(new Set());
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);
  const [tplsLoaded, setTplsLoaded]           = useState(false);
  const [applying, setApplying]               = useState(false);

  // ── Template editor state ───────────────────────────────────────────────────
  const [editingTpl, setEditingTpl]     = useState<CustomTemplate | null>(null);
  const [tplName, setTplName]           = useState("");
  const [tplItems, setTplItems]         = useState<TemplateItem[]>([]);
  const [tplNewItem, setTplNewItem]     = useState("");
  const [tplNewCat, setTplNewCat]       = useState("Other");
  const [tplSaving, setTplSaving]       = useState(false);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const packed = items.filter((i) => i.packed).length;
  const pct    = items.length > 0 ? Math.round((packed / items.length) * 100) : 0;

  const grouped = [
    ...CATEGORIES.map((cat) => ({ cat, items: items.filter((i) => i.category === cat) })).filter((g) => g.items.length > 0),
    ...(items.some((i) => !CATEGORIES.includes(i.category))
      ? [{ cat: "Other", items: items.filter((i) => !CATEGORIES.includes(i.category)) }]
      : []),
  ];

  const totalSelected = selBuiltin.size + selCustom.size;

  // ── Load custom templates ────────────────────────────────────────────────────
  async function loadTemplates() {
    if (tplsLoaded) return;
    const { data: { user } } = await db.auth.getUser();
    if (!user) return;
    const { data } = await db.from("packing_templates").select("*").eq("user_id", user.id).order("created_at");
    if (data) setCustomTemplates(data.map((t: { id: string; name: string; items: TemplateItem[] }) => ({
      id: t.id, name: t.name, items: t.items ?? [],
    })));
    setTplsLoaded(true);
  }

  function openSelect() { loadTemplates(); setView("select"); }

  // ── Packing list actions ─────────────────────────────────────────────────────
  async function togglePacked(item: PackingItem) {
    const updated = !item.packed;
    await db.from("packing_items").update({ packed: updated }).eq("id", item.id);
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, packed: updated } : i));
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newItem.trim()) return;
    const { data, error } = await db.from("packing_items")
      .insert({ trip_id: tripId, name: newItem.trim(), category: newCat, packed: false })
      .select().single();
    if (!error && data) setItems((prev) => [...prev, data]);
    setNewItem(""); setShowAdd(false);
  }

  async function deleteItem(id: string) {
    await db.from("packing_items").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function saveEditItem(e: React.FormEvent) {
    e.preventDefault();
    if (!editingItemId || !editItemName.trim()) return;
    const { data, error } = await db.from("packing_items")
      .update({ name: editItemName.trim(), category: editItemCat })
      .eq("id", editingItemId)
      .select().single();
    if (!error) {
      setItems((prev) => prev.map((i) =>
        i.id === editingItemId
          ? (data ?? { ...i, name: editItemName.trim(), category: editItemCat })
          : i
      ));
      setEditingItemId(null);
    }
  }

  async function clearAll() {
    if (!confirm("Clear all packing items?")) return;
    setClearing(true);
    await db.from("packing_items").delete().eq("trip_id", tripId);
    setItems([]); setClearing(false); openSelect();
  }

  // ── Apply selected templates ─────────────────────────────────────────────────
  async function applySelected() {
    if (totalSelected === 0) return;
    setApplying(true);

    const combined: TemplateItem[] = [];
    selBuiltin.forEach((key) => combined.push(...(BUILTIN[key]?.items ?? [])));
    selCustom.forEach((id) => {
      const tpl = customTemplates.find((t) => t.id === id);
      if (tpl) combined.push(...tpl.items);
    });

    const unique = dedup(combined);

    // Exclude items already in the list (using normalised names to catch variants)
    const existingNames = new Set(items.map((i) => normaliseItemName(i.name)));
    const toAdd = unique.filter(({ name }) => !existingNames.has(normaliseItemName(name)));

    if (toAdd.length > 0) {
      const { data, error } = await db.from("packing_items")
        .insert(toAdd.map((t) => ({ trip_id: tripId, name: t.name, category: t.category, packed: false })))
        .select();
      if (!error && data) setItems((prev) => [...prev, ...data]);
    }

    setSelBuiltin(new Set()); setSelCustom(new Set());
    setApplying(false); setView("list");
  }

  // ── Template editor actions ──────────────────────────────────────────────────
  function openCreateTemplate() {
    setEditingTpl(null); setTplName(""); setTplItems([]);
    setTplNewItem(""); setTplNewCat("Other"); setView("edit");
  }

  function openEditTemplate(tpl: CustomTemplate) {
    setEditingTpl(tpl); setTplName(tpl.name); setTplItems([...tpl.items]);
    setTplNewItem(""); setTplNewCat("Other"); setView("edit");
  }

  function addTplItem(e: React.FormEvent) {
    e.preventDefault();
    if (!tplNewItem.trim()) return;
    setTplItems((prev) => [...prev, { name: tplNewItem.trim(), category: tplNewCat }]);
    setTplNewItem("");
  }

  function removeTplItem(idx: number) {
    setTplItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function saveTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!tplName.trim()) return;
    setTplSaving(true);

    if (editingTpl) {
      const { data, error } = await db.from("packing_templates")
        .update({ name: tplName.trim(), items: tplItems })
        .eq("id", editingTpl.id).select().single();
      if (!error && data) {
        setCustomTemplates((prev) => prev.map((t) => t.id === editingTpl.id
          ? { id: t.id, name: data.name, items: data.items ?? [] } : t));
      }
    } else {
      const { data: { user } } = await db.auth.getUser();
      if (user) {
        const { data, error } = await db.from("packing_templates")
          .insert({ user_id: user.id, name: tplName.trim(), items: tplItems })
          .select().single();
        if (!error && data) {
          setCustomTemplates((prev) => [...prev, { id: data.id, name: data.name, items: data.items ?? [] }]);
        }
      }
    }
    setTplSaving(false); setView("select");
  }

  async function deleteTemplate(id: string) {
    if (!confirm("Delete this template?")) return;
    await db.from("packing_templates").delete().eq("id", id);
    setCustomTemplates((prev) => prev.filter((t) => t.id !== id));
    setSelCustom((prev) => { const s = new Set(prev); s.delete(id); return s; });
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <section className="mb-8">

      {/* ── Header ── */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-[#efefef] shrink-0">Packing List</h2>
          {items.length > 0 && (
            <span className="text-xs text-gray-400 dark:text-[#9fb8b8] shrink-0">{packed}/{items.length} packed</span>
          )}
          {items.length > 0 && view === "list" && (
            <button onClick={clearAll} disabled={clearing} className="text-xs text-gray-400 dark:text-[#9fb8b8] hover:text-red-400 transition-colors shrink-0">
              · Clear all
            </button>
          )}
        </div>
        {view === "list" && (
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={openSelect} className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-[#2e2e2e] bg-white dark:bg-transparent px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-[#9fb8b8] hover:border-[#9fb8b8] hover:text-[#9fb8b8] transition-colors">
              Templates
            </button>
            <button onClick={() => setShowAdd((v) => !v)} className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-[#2e2e2e] bg-white dark:bg-transparent px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-[#9fb8b8] hover:border-[#9fb8b8] hover:text-[#9fb8b8] transition-colors">
              + Add item
            </button>
          </div>
        )}
      </div>

      {/* ── LIST VIEW ── */}
      {view === "list" && (
        <>
          {/* Progress */}
          {items.length > 0 && (
            <div className="mb-4">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-[#2e2e2e]">
                <div className="h-full rounded-full bg-[#9fb8b8] transition-all" style={{ width: `${pct}%` }} />
              </div>
              {pct === 100 && <p className="mt-1.5 text-xs font-medium text-[#9fb8b8] text-center">All packed!</p>}
            </div>
          )}

          {/* Add item form */}
          {showAdd && (
            <form onSubmit={addItem} className="mb-4 flex gap-2 flex-wrap sm:flex-nowrap">
              <input type="text" value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="Item name" className="input flex-1 min-w-0" autoFocus />
              <select value={newCat} onChange={(e) => setNewCat(e.target.value)} className="input w-36 shrink-0">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <button type="submit" className="btn-primary shrink-0">Add</button>
              <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary shrink-0">Cancel</button>
            </form>
          )}

          {/* Items */}
          {items.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-gray-200 dark:border-[#2e2e2e] py-12 text-center text-sm text-gray-400 dark:text-[#9fb8b8]">
              No items yet.{" "}
              <button onClick={openSelect} className="underline hover:text-[#9fb8b8]">Start from a template</button>
            </div>
          ) : (
            <div className="space-y-4">
              {grouped.map(({ cat, items: catItems }) => (
                <div key={cat}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-[#9fb8b8] mb-2">{cat}</p>
                  <div className="space-y-1">
                    {catItems.map((item) =>
                      editingItemId === item.id ? (
                        <form key={item.id} onSubmit={saveEditItem} className="flex items-center gap-2 py-0.5">
                          <input
                            value={editItemName}
                            onChange={(e) => setEditItemName(e.target.value)}
                            className="input flex-1 min-w-0 text-sm py-1"
                            autoFocus
                          />
                          <select
                            value={editItemCat}
                            onChange={(e) => setEditItemCat(e.target.value)}
                            className="input w-32 shrink-0 text-xs py-1"
                          >
                            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <button type="submit" className="text-xs font-medium text-[#9fb8b8] hover:text-[#7a9e9e] transition-colors shrink-0">Save</button>
                          <button type="button" onClick={() => setEditingItemId(null)} className="text-xs text-gray-400 hover:text-gray-600 transition-colors shrink-0">Cancel</button>
                        </form>
                      ) : (
                        <div key={item.id} className="flex items-center gap-3 group">
                          <button
                            onClick={() => togglePacked(item)}
                            className={`h-6 w-6 sm:h-4 sm:w-4 shrink-0 rounded border flex items-center justify-center transition-colors ${item.packed ? "border-[#9fb8b8] bg-[#9fb8b8]" : "border-gray-300 dark:border-[#3a3a3a] bg-white dark:bg-transparent"}`}
                          >
                            {item.packed && (
                              <svg className="h-3.5 w-3.5 sm:h-2.5 sm:w-2.5 text-white dark:text-[#1e1e1e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                            )}
                          </button>
                          <span className={`flex-1 text-sm transition-colors ${item.packed ? "line-through text-gray-300 dark:text-[#3a3a3a]" : "text-gray-700 dark:text-[#efefef]"}`}>
                            {item.name}
                          </span>
                          <button
                            onClick={() => { setEditingItemId(item.id); setEditItemName(item.name); setEditItemCat(item.category); }}
                            className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-sky-400 transition-all"
                            title="Edit"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                            </svg>
                          </button>
                          <button onClick={() => deleteItem(item.id)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all" title="Delete">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── SELECT TEMPLATES VIEW ── */}
      {view === "select" && (
        <div className="rounded-xl border border-[#e0e0e0] dark:border-[#2e2e2e] overflow-hidden">
          <div className="px-4 py-3 bg-[#efefef] dark:bg-[#2e2e2e]/60 flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-600 dark:text-[#efefef]">Select templates to combine</p>
            <p className="text-[10px] text-gray-400 dark:text-[#9fb8b8]">Duplicates removed automatically</p>
          </div>

          <div className="p-4 space-y-5">
            {/* Built-in */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-[#9fb8b8] mb-2">Built-in</p>
              <div className="space-y-1">
                {Object.entries(BUILTIN).map(([key, tpl]) => (
                  <label key={key} className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-[#2e2e2e] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selBuiltin.has(key)}
                      onChange={() => setSelBuiltin((prev) => { const s = new Set(prev); s.has(key) ? s.delete(key) : s.add(key); return s; })}
                      className="h-4 w-4 rounded border-gray-300 dark:border-[#3a3a3a] accent-[#9fb8b8]"
                    />
                    <span className="flex-1 text-sm font-medium text-gray-800 dark:text-[#efefef]">{tpl.label}</span>
                    <span className="text-[10px] text-gray-400 dark:text-[#9fb8b8]">{tpl.sub}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Custom */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-[#9fb8b8]">My Templates</p>
                <button onClick={openCreateTemplate} className="text-[10px] font-medium text-[#9fb8b8] hover:underline">+ Create template</button>
              </div>
              {!tplsLoaded ? (
                <p className="text-xs text-gray-400 dark:text-[#9fb8b8] px-3">Loading…</p>
              ) : customTemplates.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-[#9fb8b8] px-3">No custom templates yet.</p>
              ) : (
                <div className="space-y-1">
                  {customTemplates.map((tpl) => (
                    <div key={tpl.id} className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-[#2e2e2e]">
                      <input
                        type="checkbox"
                        checked={selCustom.has(tpl.id)}
                        onChange={() => setSelCustom((prev) => { const s = new Set(prev); s.has(tpl.id) ? s.delete(tpl.id) : s.add(tpl.id); return s; })}
                        className="h-4 w-4 rounded border-gray-300 dark:border-[#3a3a3a] accent-[#9fb8b8]"
                      />
                      <span className="flex-1 text-sm font-medium text-gray-800 dark:text-[#efefef]">{tpl.name}</span>
                      <span className="text-[10px] text-gray-400 dark:text-[#9fb8b8]">{tpl.items.length} items</span>
                      <button onClick={() => openEditTemplate(tpl)} className="text-gray-300 hover:text-sky-500 transition-colors ml-1">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                        </svg>
                      </button>
                      <button onClick={() => deleteTemplate(tpl.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer actions */}
          <div className="border-t border-[#e0e0e0] dark:border-[#2e2e2e] px-4 py-3 flex items-center gap-3">
            <button
              onClick={applySelected}
              disabled={totalSelected === 0 || applying}
              className="btn-primary flex-1"
            >
              {applying ? "Applying…" : totalSelected === 0 ? "Select templates above" : `Apply ${totalSelected} template${totalSelected > 1 ? "s" : ""} →`}
            </button>
            {items.length > 0 && (
              <button onClick={() => setView("list")} className="btn-secondary">Cancel</button>
            )}
          </div>
        </div>
      )}

      {/* ── EDIT TEMPLATE VIEW ── */}
      {view === "edit" && (
        <form onSubmit={saveTemplate} className="rounded-xl border border-[#e0e0e0] dark:border-[#2e2e2e] overflow-hidden">
          <div className="px-4 py-3 bg-[#efefef] dark:bg-[#2e2e2e]/60">
            <p className="text-xs font-semibold text-gray-600 dark:text-[#efefef]">
              {editingTpl ? "Edit template" : "Create template"}
            </p>
          </div>

          <div className="p-4 space-y-4">
            <div>
              <label className="label">Template name *</label>
              <input
                type="text"
                required
                value={tplName}
                onChange={(e) => setTplName(e.target.value)}
                placeholder="e.g. Diving, Winter, Festival…"
                className="input"
                autoFocus
              />
            </div>

            {/* Add item to template */}
            <div>
              <label className="label">Add items</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tplNewItem}
                  onChange={(e) => setTplNewItem(e.target.value)}
                  placeholder="Item name"
                  className="input flex-1 min-w-0"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (tplNewItem.trim()) { setTplItems((p) => [...p, { name: tplNewItem.trim(), category: tplNewCat }]); setTplNewItem(""); } } }}
                />
                <select value={tplNewCat} onChange={(e) => setTplNewCat(e.target.value)} className="input w-32 shrink-0">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <button type="button" onClick={(e) => { e.preventDefault(); if (tplNewItem.trim()) { setTplItems((p) => [...p, { name: tplNewItem.trim(), category: tplNewCat }]); setTplNewItem(""); } }} className="btn-secondary shrink-0">
                  Add
                </button>
              </div>
            </div>

            {/* Items list in editor */}
            {tplItems.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-[#9fb8b8] mb-2">
                  {tplItems.length} item{tplItems.length !== 1 ? "s" : ""}
                </p>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {CATEGORIES.map((cat) => {
                    const catItems = tplItems.map((item, idx) => ({ ...item, idx })).filter((i) => i.category === cat);
                    if (catItems.length === 0) return null;
                    return (
                      <div key={cat}>
                        <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-300 dark:text-[#3a3a3a] mt-2 mb-1">{cat}</p>
                        {catItems.map(({ name, idx }) => (
                          <div key={idx} className="flex items-center gap-2 py-1 group">
                            <span className="flex-1 text-sm text-gray-700 dark:text-[#efefef]">{name}</span>
                            <button type="button" onClick={() => removeTplItem(idx)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all">
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-[#e0e0e0] dark:border-[#2e2e2e] px-4 py-3 flex gap-2">
            <button type="submit" disabled={tplSaving || !tplName.trim()} className="btn-primary flex-1">
              {tplSaving ? "Saving…" : editingTpl ? "Save changes" : "Create template"}
            </button>
            <button type="button" onClick={() => setView("select")} className="btn-secondary">Cancel</button>
          </div>
        </form>
      )}
    </section>
  );
}
