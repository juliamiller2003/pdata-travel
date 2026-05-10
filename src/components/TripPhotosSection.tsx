"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface TripPhotosSectionProps {
  tripId: string;
  initialPhotos: string[];
  initialCaptions: Record<string, string>;
}

export default function TripPhotosSection({ tripId, initialPhotos, initialCaptions }: TripPhotosSectionProps) {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const inputRef = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<string[]>(initialPhotos);
  const [captions, setCaptions] = useState<Record<string, string>>(initialCaptions);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveToDb(newPhotos: string[], newCaptions: Record<string, string>) {
    await db.from("trips").update({ photos: newPhotos, photo_captions: newCaptions }).eq("id", tripId);
  }

  async function handleFiles(files: FileList) {
    setUploading(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUploading(false); return; }

    const uploaded: string[] = [];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;

      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("trip-photos")
        .upload(path, file, { upsert: false });

      if (uploadError) {
        setError(`Failed to upload ${file.name}: ${uploadError.message}`);
        continue;
      }

      const { data: { publicUrl } } = supabase.storage.from("trip-photos").getPublicUrl(path);
      uploaded.push(publicUrl);
    }

    setUploading(false);

    const newPhotos = [...photos, ...uploaded];
    setPhotos(newPhotos);
    await saveToDb(newPhotos, captions);
  }

  async function removePhoto(url: string) {
    const newPhotos = photos.filter((p) => p !== url);
    const newCaptions = { ...captions };
    delete newCaptions[url];
    setPhotos(newPhotos);
    setCaptions(newCaptions);
    await saveToDb(newPhotos, newCaptions);
  }

  async function handleCaptionBlur(url: string) {
    await saveToDb(photos, captions);
  }

  function updateCaption(url: string, value: string) {
    const newCaptions = { ...captions, [url]: value };
    if (!value) delete newCaptions[url];
    setCaptions(newCaptions);
  }

  return (
    <div className="space-y-3 mt-4">
      {/* Upload zone */}
      <div
        onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files); }}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 dark:border-[#2e2e2e] bg-gray-50 dark:bg-transparent p-5 text-center hover:border-[#9fb8b8] transition-colors"
      >
        {uploading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
            Uploading…
          </div>
        ) : (
          <>
            <svg className="h-7 w-7 text-gray-300 dark:text-[#9fb8b8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <p className="text-sm text-gray-500 dark:text-[#9fb8b8]">
              <span className="font-medium text-sky-600 dark:text-[#cadede]">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-400 dark:text-[#9fb8b8]">PNG, JPG, WEBP</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {/* Photo grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {photos.map((url) => (
            <div key={url} className="space-y-1">
              <div className="relative group aspect-square overflow-hidden rounded-lg bg-black isolate">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={captions[url] ?? ""} className="h-full w-full object-cover" style={{ filter: "brightness(0.6) contrast(1.15) saturate(1.05)" }} />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removePhoto(url); }}
                    className="rounded-full bg-red-500/90 px-2 py-1 text-[10px] font-semibold text-white hover:bg-red-600"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <input
                type="text"
                value={captions[url] ?? ""}
                onChange={(e) => updateCaption(url, e.target.value)}
                onBlur={() => handleCaptionBlur(url)}
                placeholder="Caption…"
                className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 placeholder-gray-300 focus:border-sky-400 focus:outline-none"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          ))}
        </div>
      )}

      {photos.length > 0 && (
        <p className="text-xs text-gray-400">Set the cover photo in trip settings.</p>
      )}
    </div>
  );
}
