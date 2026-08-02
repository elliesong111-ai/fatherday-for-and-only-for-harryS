import type { ChartData } from "./vision";

const CATEGORICAL = [
  { light: "#2a78d6", dark: "#3987e5" }, // blue
  { light: "#eb6834", dark: "#d95926" }, // orange
  { light: "#1baf7a", dark: "#199e70" }, // aqua
  { light: "#eda100", dark: "#c98500" }, // yellow
  { light: "#e87ba4", dark: "#d55181" }, // magenta
  { light: "#008300", dark: "#008300" }, // green
  { light: "#4a3aa7", dark: "#9085e9" }, // violet
  { light: "#e34948", dark: "#e66767" }, // red
];

const CHROME = `
  color-scheme: light;
  --surface-1: #fcfcfb;
  --text-primary: #0b0b0b;
  --text-secondary: #52514e;
  --text-muted: #898781;
  --gridline: #e1e0d9;
  --baseline: #c3c2b7;
  ${CATEGORICAL.map((c, i) => `--series-${i + 1}: ${c.light};`).join("\n  ")}
`;

const CHROME_DARK = `
  color-scheme: dark;
  --surface-1: #1a1a19;
  --text-primary: #ffffff;
  --text-secondary: #c3c2b7;
  --text-muted: #898781;
  --gridline: #2c2c2a;
  --baseline: #383835;
  ${CATEGORICAL.map((c, i) => `--series-${i + 1}: ${c.dark};`).join("\n  ")}
`;

function esc(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function niceMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const residual = value / magnitude;
  let niceResidual = 10;
  if (residual <= 1) niceResidual = 1;
  else if (residual <= 2) niceResidual = 2;
  else if (residual <= 5) niceResidual = 5;
  return niceResidual * magnitude;
}

function formatNumber(n: number, unit: string): string {
  const rounded = Math.round(n * 100) / 100;
  const withComma = rounded.toLocaleString();
  return unit === "%" ? `${withComma}%` : unit ? `${unit}${withComma}` : withComma;
}

function roundedTopRectPath(x: number, y: number, w: number, h: number, r: number): string {
  const rad = Math.min(r, w / 2, Math.max(h, 0));
  if (h <= 0) return "";
  if (rad <= 0) return `M${x},${y + h} L${x},${y} L${x + w},${y} L${x + w},${y + h} Z`;
  return `M${x},${y + h} L${x},${y + rad} Q${x},${y} ${x + rad},${y} L${x + w - rad},${y} Q${x + w},${y} ${x + w},${y + rad} L${x + w},${y + h} Z`;
}

function styleBlock(scopeClass: string): string {
  return `<style>
.${scopeClass} { ${CHROME} background: var(--surface-1); }
@media (prefers-color-scheme: dark) {
  :root:where(:not([data-theme="light"])) .${scopeClass} { ${CHROME_DARK} }
}
:root[data-theme="dark"] .${scopeClass} { ${CHROME_DARK} }
.${scopeClass} { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; color: var(--text-primary); border-radius: 12px; padding: 20px; }
.${scopeClass} h2 { font-size: 15px; font-weight: 600; margin: 0 0 12px; color: var(--text-primary); }
.${scopeClass} .viz-svg-wrap { width: 100%; overflow-x: auto; }
.${scopeClass} .legend { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 10px; }
.${scopeClass} .legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-secondary); }
.${scopeClass} .legend-swatch { width: 10px; height: 10px; border-radius: 2px; flex: none; }
.${scopeClass} details { margin-top: 14px; }
.${scopeClass} summary { cursor: pointer; font-size: 12px; color: var(--text-secondary); }
.${scopeClass} table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
.${scopeClass} th, .${scopeClass} td { text-align: left; padding: 4px 8px; border-bottom: 1px solid var(--gridline); color: var(--text-secondary); font-variant-numeric: tabular-nums; }
.${scopeClass} th { color: var(--text-muted); font-weight: 500; }
</style>`;
}

function legendHtml(names: string[]): string {
  if (names.length < 2) return "";
  return `<div class="legend">${names
    .map(
      (name, i) =>
        `<div class="legend-item"><span class="legend-swatch" style="background:var(--series-${
          (i % 8) + 1
        })"></span>${esc(name)}</div>`
    )
    .join("")}</div>`;
}

function tableHtml(data: ChartData): string {
  const rows = data.categories
    .map((cat, i) => {
      const cells = data.series.map((s) => `<td>${esc(formatNumber(s.values[i] ?? 0, data.unit))}</td>`).join("");
      return `<tr><td>${esc(cat)}</td>${cells}</tr>`;
    })
    .join("");
  const head = data.series.map((s) => `<th>${esc(s.name)}</th>`).join("");
  return `<details><summary>Data table</summary><table><thead><tr><th></th>${head}</tr></thead><tbody>${rows}</tbody></table></details>`;
}

function renderBarOrLine(data: ChartData, kind: "bar" | "line"): string {
  const width = 640;
  const height = 320;
  const marginLeft = 44;
  const marginRight = kind === "line" ? 36 : 16;
  const marginTop = 16;
  const marginBottom = 32;
  const plotW = width - marginLeft - marginRight;
  const plotH = height - marginTop - marginBottom;

  const allValues = data.series.flatMap((s) => s.values);
  const rawMax = Math.max(...allValues, 0);
  const yMax = niceMax(rawMax);
  const ticks = 4;
  const yScale = (v: number) => marginTop + plotH - (v / yMax) * plotH;

  const gridlines = Array.from({ length: ticks + 1 }, (_, i) => {
    const value = (yMax / ticks) * i;
    const y = yScale(value);
    return `<line x1="${marginLeft}" y1="${y}" x2="${width - marginRight}" y2="${y}" stroke="var(--gridline)" stroke-width="1" />
<text x="${marginLeft - 8}" y="${y + 4}" text-anchor="end" font-size="11" fill="var(--text-muted)">${formatNumber(value, data.unit)}</text>`;
  }).join("\n");

  const n = data.categories.length;
  const bandW = n > 0 ? plotW / n : plotW;

  let marks = "";
  let categoryLabels = "";

  if (kind === "bar") {
    const seriesCount = data.series.length;
    const gap = 2;
    const maxBarThickness = 24;
    const groupPad = bandW * 0.15;
    const availableForBars = bandW - groupPad * 2;
    const barW = Math.min(maxBarThickness, (availableForBars - gap * (seriesCount - 1)) / seriesCount);
    const groupW = barW * seriesCount + gap * (seriesCount - 1);

    data.categories.forEach((cat, ci) => {
      const groupX = marginLeft + ci * bandW + (bandW - groupW) / 2;
      data.series.forEach((s, si) => {
        const v = s.values[ci] ?? 0;
        const barH = (v / yMax) * plotH;
        const x = groupX + si * (barW + gap);
        const y = yScale(v);
        const path = roundedTopRectPath(x, y, barW, marginTop + plotH - y, 4);
        marks += `<path d="${path}" fill="var(--series-${(si % 8) + 1})"><title>${esc(cat)} – ${esc(
          s.name
        )}: ${esc(formatNumber(v, data.unit))}</title></path>\n`;
        if (seriesCount === 1) {
          marks += `<text x="${x + barW / 2}" y="${y - 6}" text-anchor="middle" font-size="11" fill="var(--text-secondary)">${esc(
            formatNumber(v, data.unit)
          )}</text>\n`;
        }
      });
      categoryLabels += `<text x="${marginLeft + ci * bandW + bandW / 2}" y="${height - marginBottom + 18}" text-anchor="middle" font-size="11" fill="var(--text-muted)">${esc(
        cat
      )}</text>\n`;
    });
  } else {
    const x = (i: number) => marginLeft + (n > 1 ? (i * plotW) / (n - 1) : plotW / 2);

    data.series.forEach((s, si) => {
      const points = s.values.map((v, i) => `${x(i)},${yScale(v)}`).join(" ");
      marks += `<polyline points="${points}" fill="none" stroke="var(--series-${(si % 8) + 1})" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />\n`;
      s.values.forEach((v, i) => {
        marks += `<circle cx="${x(i)}" cy="${yScale(v)}" r="4" fill="var(--series-${(si % 8) + 1})" stroke="var(--surface-1)" stroke-width="2"><title>${esc(
          data.categories[i] ?? ""
        )} – ${esc(s.name)}: ${esc(formatNumber(v, data.unit))}</title></circle>\n`;
      });
      const lastIdx = s.values.length - 1;
      if (lastIdx >= 0) {
        marks += `<text x="${x(lastIdx) + 8}" y="${yScale(s.values[lastIdx]) + 4}" font-size="11" fill="var(--text-secondary)">${esc(
          formatNumber(s.values[lastIdx], data.unit)
        )}</text>\n`;
      }
    });

    data.categories.forEach((cat, i) => {
      categoryLabels += `<text x="${x(i)}" y="${height - marginBottom + 18}" text-anchor="middle" font-size="11" fill="var(--text-muted)">${esc(
        cat
      )}</text>\n`;
    });
  }

  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(data.title)}" style="width:100%;height:auto;display:block">
<line x1="${marginLeft}" y1="${marginTop + plotH}" x2="${width - marginRight}" y2="${marginTop + plotH}" stroke="var(--baseline)" stroke-width="1" />
${gridlines}
${marks}
${categoryLabels}
</svg>`;
}

function renderPie(data: ChartData): string {
  const size = 320;
  const cx = size / 2 - 40;
  const cy = size / 2;
  const rOuter = 110;
  const rInner = 56;
  const values = data.series[0]?.values ?? [];
  const total = values.reduce((a, b) => a + b, 0) || 1;

  let angle = -Math.PI / 2;
  let slices = "";
  data.categories.forEach((cat, i) => {
    const v = values[i] ?? 0;
    const frac = v / total;
    const start = angle;
    const end = angle + frac * Math.PI * 2;
    angle = end;
    const largeArc = end - start > Math.PI ? 1 : 0;
    const x0o = cx + rOuter * Math.cos(start);
    const y0o = cy + rOuter * Math.sin(start);
    const x1o = cx + rOuter * Math.cos(end);
    const y1o = cy + rOuter * Math.sin(end);
    const x0i = cx + rInner * Math.cos(end);
    const y0i = cy + rInner * Math.sin(end);
    const x1i = cx + rInner * Math.cos(start);
    const y1i = cy + rInner * Math.sin(start);
    const path = `M${x0o},${y0o} A${rOuter},${rOuter} 0 ${largeArc} 1 ${x1o},${y1o} L${x0i},${y0i} A${rInner},${rInner} 0 ${largeArc} 0 ${x1i},${y1i} Z`;
    slices += `<path d="${path}" fill="var(--series-${(i % 8) + 1})" stroke="var(--surface-1)" stroke-width="2"><title>${esc(
      cat
    )}: ${esc(formatNumber(v, data.unit))} (${Math.round(frac * 100)}%)</title></path>\n`;
  });

  return `<svg viewBox="0 0 ${size} ${size}" role="img" aria-label="${esc(data.title)}" style="width:100%;max-width:320px;height:auto;display:block;margin:0 auto">
<g>${slices}</g>
</svg>`;
}

export function renderChartHtml(data: ChartData): string {
  const scopeClass = "viz-root";
  const body =
    data.type === "pie" ? renderPie(data) : renderBarOrLine(data, data.type);
  const legendNames =
    data.type === "pie" ? data.categories : data.series.map((s) => s.name);

  return `<div class="${scopeClass}">
${styleBlock(scopeClass)}
<h2>${esc(data.title)}</h2>
<div class="viz-svg-wrap">${body}</div>
${legendHtml(legendNames)}
${tableHtml(data)}
</div>`;
}
