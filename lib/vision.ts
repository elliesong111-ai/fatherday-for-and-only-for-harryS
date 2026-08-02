import Anthropic from "@anthropic-ai/sdk";

export type ChartType = "bar" | "line" | "pie";

export type ChartSeries = {
  name: string;
  values: number[];
};

export type ChartData = {
  title: string;
  type: ChartType;
  unit: string;
  categories: string[];
  series: ChartSeries[];
};

const SYSTEM_PROMPT = `You read a photo of a handwritten/hand-drawn chart sketch (a napkin
sketch, notebook page, or whiteboard photo) and convert it into clean structured chart data.

The sketch may be a rough bar chart, line chart, pie chart, a scribbled table of numbers, or
just labeled amounts written next to each other. Infer the author's intent:
- If bars/columns are drawn, or category + value pairs are listed -> "bar"
- If a rising/falling line or dots connected across a timeline are drawn -> "line"
- If a circle divided into wedges (or percentages that sum near 100) is drawn -> "pie"

Read every handwritten number and label as carefully as possible, including numbers that are
crossed out, corrected, or written in the margin (use the corrected value). If a value is
truly illegible, make the closest reasonable estimate from the drawn bar/line height rather
than leaving it blank.

Respond with ONLY a single JSON object, no prose, no markdown fences, matching exactly:
{
  "title": string,          // short title, inferred from the sketch or a sensible generic one
  "type": "bar" | "line" | "pie",
  "unit": string,           // e.g. "$", "%", "" if unitless
  "categories": string[],   // x-axis / wedge labels, in the order drawn
  "series": [ { "name": string, "values": number[] } ]  // one entry per series/line; values align with categories
}`;

export async function analyzeSketch(
  imageBase64: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp"
): Promise<ChartData> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to your environment to enable sketch analysis."
    );
  }

  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: imageBase64 },
          },
          {
            type: "text",
            text: "Extract this hand-drawn sketch into the JSON chart schema.",
          },
        ],
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from the vision model.");
  }

  return parseChartData(textBlock.text);
}

function parseChartData(raw: string): ChartData {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Could not find JSON in the model response.");
  }

  const parsed = JSON.parse(jsonMatch[0]);

  if (!parsed.categories || !parsed.series) {
    throw new Error("Model response is missing categories or series.");
  }

  return {
    title: String(parsed.title ?? "Untitled sketch"),
    type: (["bar", "line", "pie"] as const).includes(parsed.type) ? parsed.type : "bar",
    unit: String(parsed.unit ?? ""),
    categories: parsed.categories.map((c: unknown) => String(c)),
    series: parsed.series.map((s: { name?: unknown; values?: unknown[] }) => ({
      name: String(s.name ?? "Series"),
      values: (s.values ?? []).map((v: unknown) => Number(v) || 0),
    })),
  };
}
