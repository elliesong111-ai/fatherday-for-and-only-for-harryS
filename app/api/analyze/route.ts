import { NextRequest, NextResponse } from "next/server";
import { analyzeSketch } from "@/lib/vision";

export const runtime = "nodejs";

function mediaTypeOf(file: File): "image/jpeg" | "image/png" | "image/webp" {
  if (file.type === "image/png") return "image/png";
  if (file.type === "image/webp") return "image/webp";
  return "image/jpeg";
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("image");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No image file provided." }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const imageBase64 = bytes.toString("base64");
    const data = await analyzeSketch(imageBase64, mediaTypeOf(file));

    return NextResponse.json({ data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to analyze sketch.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
