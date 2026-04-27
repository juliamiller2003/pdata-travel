"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface PhotoUploaderProps {
  photos: string[];
  coverUrl: string;
  onChange: (photos: string[], coverUrl: string) => void;
}

export default function PhotoUploader({ photos, coverUrl, onChange }: PhotoUploaderProps) {
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      const { data: { publicUrl } } = supabase.storage
        .from("trip-photos")
        .getPublicUrl(path);

      uploaded.push(publicUrl);
    }

    setUploading(false);

    const newPhotos = [...photos, ...uploaded];
    // Auto-select first uploaded photo as cover if none set
    const newCover = coverUrl || uploaded[0] || "";
    onChange(newPhotos, newCover);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  }

  function removePhoto(url: string) {
    const newPhotos = photos.filter((p) => p !== url);
    const newCover = coverUrl === url ? newPhotos[0] ?? "" : coverUrl;
    onChange(newPhotos, newCover);
  }

  function setCover(url: string) {
    onChange(photos, url);
  }

  return (
    <div className="space-y-3">
      <label className="label">Photos</label>

      {/* Upload zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-6 text-center hover:border-sky-300 hover:bg-sky-50 transition-colors"
      >
        {uploading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
            Uploading…
          </div>
        ) : (
          <>
            <svg className="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <p className="text-sm text-gray-500">
              <span className="font-medium text-sky-600">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-400">PNG, JPG, WEBP</p>
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
        <div className="grid grid-cols-3 gap-2">
          {photos.map((url) => {
            const isCover = url === coverUrl;
            return (
              <div key={url} className="relative group aspect-square overflow-hidden rounded-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />

                {/* Cover badge */}
                {isCover && (
                  <div className="absolute top-1 left-1 rounded-full bg-sky-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    Cover
                  </div>
                )}

                {/* Hover actions */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!isCover && (
                    <button
                      type="button"
                      onClick={() => setCover(url)}
                      className="rounded-full bg-white/90 px-2 py-1 text-[10px] font-semibold text-gray-800 hover:bg-white"
                    >
                      Set cover
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removePhoto(url)}
                    className="rounded-full bg-red-500/90 px-2 py-1 text-[10px] font-semibold text-white hover:bg-red-600"
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {photos.length > 0 && (
        <p className="text-xs text-gray-400">
          Hover a photo to set it as the cover or remove it.
        </p>
      )}
    </div>
  );
}
