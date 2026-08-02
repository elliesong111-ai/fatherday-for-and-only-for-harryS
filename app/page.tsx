"use client";

import { useRef, useState } from "react";
import type { ChartData } from "@/lib/vision";
import { renderChartHtml } from "@/lib/chart";

type Status = "idle" | "loading" | "error";

export default function HomePage() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [chartHtml, setChartHtml] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined | null) {
    if (!file) return;
    setStatus("loading");
    setError(null);
    setChartHtml(null);

    try {
      const form = new FormData();
      form.append("image", file);
      const res = await fetch("/api/analyze", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Something went wrong.");
      const data: ChartData = json.data;
      setChartHtml(renderChartHtml(data));
      setStatus("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <h1 className="text-xl font-semibold">Sketch to Chart</h1>
      <p className="mt-2 text-sm text-neutral-500">
        Photograph a handwritten chart sketch — from your camera, a notebook page, or a photo
        already in your gallery — and get a clean chart back.
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          onClick={() => cameraInputRef.current?.click()}
          className="flex-1 rounded-lg bg-[#2a78d6] px-4 py-3 text-sm font-semibold text-white active:opacity-90"
        >
          📷 Take a photo
        </button>
        <button
          onClick={() => galleryInputRef.current?.click()}
          className="flex-1 rounded-lg border border-neutral-300 px-4 py-3 text-sm font-semibold text-neutral-700 active:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200"
        >
          🖼️ Choose existing photo
        </button>
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {status === "loading" && (
        <p className="mt-6 text-sm text-neutral-500">Reading your sketch…</p>
      )}

      {status === "error" && error && (
        <p className="mt-6 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {chartHtml && (
        <div className="mt-6" dangerouslySetInnerHTML={{ __html: chartHtml }} />
      )}

      <details className="mt-10 text-xs text-neutral-500">
        <summary className="cursor-pointer">Use it from your camera or notes app directly</summary>
        <p className="mt-2 leading-relaxed">
          On Android, add this app to your home screen (browser menu → &ldquo;Add to Home
          screen&rdquo;/&ldquo;Install app&rdquo;). After that, any photo you take or any image in
          Camera, Gallery, or a notes app can be sent here with the native <strong>Share</strong>{" "}
          button — pick &ldquo;Sketch to Chart&rdquo; from the share sheet and the chart opens
          immediately. iOS Safari does not yet support sharing images into installed web apps, so
          on iPhone use the buttons above instead.
        </p>
      </details>
    </main>
  );
}
