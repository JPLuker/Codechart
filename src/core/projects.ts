import LZString from 'lz-string';
export type Project = { format: 'codechart'; version: 1; title: string; source: string; updatedAt: string };
export const makeProject = (title: string, source: string): Project => ({ format: 'codechart', version: 1, title, source, updatedAt: new Date().toISOString() });
export function readProject(input: unknown): Project {
  if (!input || typeof input !== 'object') throw new Error('This is not a Codechart project.');
  const p = input as Partial<Project>;
  if (p.format !== 'codechart' || p.version !== 1 || typeof p.title !== 'string' || typeof p.source !== 'string') throw new Error('Unsupported project format. Open a .flow file exported by Codechart.');
  if (p.source.length > 100000 || p.title.length > 120) throw new Error('This project exceeds the supported size.');
  return makeProject(p.title, p.source);
}
export function shareURL(project: Project): string {
  const encoded = LZString.compressToEncodedURIComponent(JSON.stringify({ title: project.title, source: project.source }));
  if (encoded.length > 14000) throw new Error('This project is too large for a share link. Save a .flow file instead.');
  return `${location.origin}${location.pathname}#project=${encoded}`;
}
export function decodeShare(hash: string): Project | null {
  if (!hash.startsWith('#project=')) return null;
  try { if (hash.length > 14009) throw new Error(); const raw = LZString.decompressFromEncodedURIComponent(hash.slice(9)); if (!raw || raw.length > 110000) throw new Error(); const p = JSON.parse(raw); return readProject({ ...p, format: 'codechart', version: 1 }); } catch { throw new Error('This share link is invalid or too large.'); }
}
export function filename(title: string) { return title.trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').slice(0, 80) || 'codechart'; }
export function download(blob: Blob, name: string) { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
