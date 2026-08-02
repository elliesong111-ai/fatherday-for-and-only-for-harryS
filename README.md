# Sketch to Chart

Photograph a handwritten chart sketch (a napkin drawing, a notebook page, a whiteboard photo)
and get back a clean, real chart — bar, line, or pie — read with Claude's vision and rendered
with the [dataviz design system](https://github.com/anthropics) color/mark rules (validated
categorical palette, accessible contrast, legend + data table, light/dark mode).

## How it works

1. **Capture.** The home page has a "Take a photo" button (opens the camera directly via
   `<input capture="environment">`) and a "Choose existing photo" button for anything already
   in your gallery or a notes app.
2. **Read.** The image is sent to `POST /api/analyze`, which calls Claude (vision) with a
   prompt that extracts a structured `{ title, type, unit, categories, series }` shape from
   the sketch, inferring bar/line/pie from what was drawn.
3. **Render.** `lib/chart.ts` turns that structured data into an inline SVG chart — fixed
   categorical palette, 4px rounded bar caps, 2px lines with end markers, legend for 2+
   series, a collapsible data table for accessibility, and dark-mode-aware CSS custom
   properties. The same renderer is used both in the browser and server-side, so the result
   is identical everywhere.

## "Works from anywhere" — the Android share sheet

True system-wide overlays that inject a button into the Camera app itself require a native
app with OS-level permissions (Android `SYSTEM_ALERT_WINDOW` + a foreground service, or an
iOS extension) — that's a separate, much larger native project.

What this app does instead, and what's realistic to ship as a web app: it registers as a
**Web Share Target** (`public/manifest.json`). Once installed to the home screen on Android
(Chrome menu → "Add to Home screen" / "Install app"), the app shows up in the native
**Share** sheet from Camera, Gallery, and most notes apps — share any photo of a sketch, pick
"Sketch to Chart", and `app/share-target/route.ts` analyzes it and renders the chart
immediately, no need to open the app first.

iOS Safari does not currently support sharing files into installed web apps, so on iPhone use
the in-app camera/gallery buttons instead — that path works identically on both platforms.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in ANTHROPIC_API_KEY
npm run dev
```

Open http://localhost:3000. The share-target flow only works once the app is served over
HTTPS and installed to a home screen (e.g. after deploying to Vercel/similar and visiting the
deployed URL on an Android phone).

## Project layout

```
app/
  page.tsx              home screen: camera/gallery capture + chart display
  api/analyze/route.ts  image -> Claude vision -> structured chart data (JSON)
  share-target/route.ts receives OS share-sheet POSTs, renders the chart as a full page
lib/
  vision.ts             Claude vision call + prompt + response parsing
  chart.ts              structured data -> accessible SVG chart (palette, marks, legend, table)
public/
  manifest.json          PWA manifest incl. share_target
  sw.js                  minimal service worker (installability + app-shell cache)
  icons/icon.svg
```

## Known limitations / next steps

- No persistence — each sketch is analyzed on demand and not saved.
- Icons are a single SVG; add real PNG/maskable icons before a store-quality install prompt.
- No true OS-wide floating overlay (see above) — that would be a native Android/iOS phase 2.
- Vision extraction is only as good as the handwriting/photo quality; ambiguous sketches may
  need a manual re-take.
