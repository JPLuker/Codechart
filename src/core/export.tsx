import { renderToStaticMarkup } from 'react-dom/server';
import type { Chart } from './graph';
import { ChartArtwork, chartColors } from '../components/Diagram';
import { download, filename } from './projects';
export function svgText(chart: Chart, title: string, dark = false): string {
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + renderToStaticMarkup(<svg xmlns="http://www.w3.org/2000/svg" width={chart.width} height={chart.height + 70} viewBox={`0 0 ${chart.width} ${chart.height + 70}`}><title>{title} — {chart.name}</title><rect width="100%" height="100%" fill={chartColors(dark).background}/><text x="30" y="34" fill={chartColors(dark).text} fontFamily="Arial, sans-serif" fontSize="16" fontWeight="600">{title}</text><text x="30" y="55" fill={chartColors(dark).edge} fontFamily="Arial, sans-serif" fontSize="11">{chart.name} · Codechart</text><g transform="translate(0 70)"><ChartArtwork chart={chart} dark={dark} exportMode/></g></svg>);
}
export function exportSVG(chart: Chart, title: string, dark = false) { download(new Blob([svgText(chart, title, dark)], { type: 'image/svg+xml' }), `${filename(title)}.svg`); }
export async function exportPNG(chart: Chart, title: string, dark = false) {
  const svg = new Blob([svgText(chart, title, dark)], { type: 'image/svg+xml' }); const url = URL.createObjectURL(svg);
  try { const image = new Image(); image.src = url; await image.decode();
    // Keep browser canvas allocations bounded even for very large diagrams.
    const scale = Math.min(2, 16000 / Math.max(chart.width, chart.height + 70), Math.sqrt(32000000 / (chart.width * (chart.height + 70))));
    const canvas = document.createElement('canvas'); canvas.width = Math.ceil(chart.width * scale); canvas.height = Math.ceil((chart.height + 70) * scale);
    const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Your browser could not create an image. Try SVG export.'); ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('PNG export failed. Try SVG export.')), 'image/png'));
    download(blob, `${filename(title)}.png`);
  } finally { URL.revokeObjectURL(url); }
}
export function printChart(chart: Chart, title: string) {
  const popup = window.open('', '_blank'); if (!popup) throw new Error('Allow pop-ups to open the print / PDF view.');
  // Title and chart labels are escaped by React; user text never becomes raw HTML.
  const markup = svgText(chart, title).replace(/^<\?xml[^>]+>\s*/, '');
  popup.document.write(`<!doctype html><html><head><title>Codechart PDF</title><style>@page{size:A4 portrait;margin:12mm}body{margin:0;font-family:Arial}svg{display:block;width:100%;height:auto;max-height:265mm}button{padding:10px 18px;margin:12px;border:1px solid #ddd;border-radius:8px;background:#eff7dc;cursor:pointer}@media print{button{display:none}}</style></head><body><button id="print">Print / Save as PDF</button>${markup}</body></html>`);
  popup.document.close(); popup.document.getElementById('print')?.addEventListener('click', () => popup.print()); popup.focus(); setTimeout(() => popup.print(), 350);
}
