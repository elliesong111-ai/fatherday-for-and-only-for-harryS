import { NextRequest } from "next/server";
import { analyzeSketch } from "@/lib/vision";
import { renderChartHtml } from "@/lib/chart";

export const runtime = "nodejs";

function mediaTypeOf(file: File): "image/jpeg" | "image/png" | "image/webp" {
  if (file.type === "image/png") return "image/png";
  if (file.type === "image/webp") return "image/webp";
  return "image/jpeg";
}

function page(bodyHtml: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Sketch to Chart</title>
<style>
  body { margin: 0; padding: 24px 16px 48px; background: #f9f9f7; }
  @media (prefers-color-scheme: dark) { body { background: #0d0d0d; } }
  .wrap { max-width: 640px; margin: 0 auto; }
  a.back { display: inline-block; margin-top: 20px; font: 14px system-ui, sans-serif; color: #2a78d6; text-decoration: none; }
</style>
</head>
<body>
<div class="wrap">${bodyHtml}<a class="back" href="/">&larr; Analyze another sketch</a></div>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("image");
    if (!(file instanceof File)) {
      return new Response(
        page(`<p style="font:14px system-ui,sans-serif;color:#c00">No image was shared.</p>`),
        { headers: { "content-type": "text/html; charset=utf-8" } }
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const imageBase64 = bytes.toString("base64");
    const data = await analyzeSketch(imageBase64, mediaTypeOf(file));
    const chartHtml = renderChartHtml(data);

    return new Response(page(chartHtml), {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to analyze sketch.";
    return new Response(
      page(`<p style="font:14px system-ui,sans-serif;color:#c00">${message}</p>`),
      { status: 500, headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }
}
