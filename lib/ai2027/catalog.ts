import * as cheerio from 'cheerio';
const ORIGIN = 'https://ai-2027.com';
const ASSET_RE = /\.(png|jpe?g|gif|webp|svg|pdf|ico)(\?|$)/i;
const HREF_RE = /href="(\/[a-zA-Z0-9_\-.?=&]+)"/g;
const INITIAL_PATHS = [
  '/',
  '/about',
  '/footnotes',
  '/race',
  '/slowdown',
  '/summary',
  '/research',
  '/research/ai-goals-forecast',
  '/research/compute-forecast',
  '/research/security-forecast',
  '/research/takeoff-forecast',
  '/research/timelines-forecast',
];
export type ImageChart = { url: string; label: string; sourcePage: string };
export type InlineSvgChart = { id: string; sourcePage: string; width: string; height: string; pathCount: number };
export type NumericSnippet = { sourcePage: string; text: string };
export type HtmlTableData = { sourcePage: string; headers: string[]; rows: string[][] };
export type Catalog = {
  fetchedAt: string;
  pages: string[];
  imageCharts: ImageChart[];
  inlineSvgs: InlineSvgChart[];
  numericSnippets: NumericSnippet[];
  htmlTables: HtmlTableData[];
};
const isHtmlPath = (path: string) => {
  if (!path.startsWith('/')) return false;
  if (path.startsWith('/_')) return false;
  return !ASSET_RE.test(path.split('?')[0] ?? '');
};
const normalizePath = (raw: string) => {
  const noHash = raw.split('#')[0] ?? raw;
  return (noHash.split('?')[0] ?? noHash) || '/';
};
const extractLinkedPaths = (html: string) => {
  const paths: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = HREF_RE.exec(html)) !== null) {
    const path = normalizePath(match[1]);
    if (path === '/') continue;
    paths.push(path);
  }
  return paths;
};
const resolveUrl = (src: string, pagePath: string) => {
  if (src.startsWith('http://') || src.startsWith('https://')) return src;
  if (src.startsWith('//')) return `https:${src}`;
  if (src.startsWith('/')) return `${ORIGIN}${src}`;
  return `${ORIGIN}${pagePath.replace(/\/[^/]*$/, '/')}${src}`;
};
const canonicalImageUrl = (url: string) => {
  try {
    const u = new URL(url);
    if (u.hostname !== 'ai-2027.com' && u.hostname !== 'www.ai-2027.com') return url;
    if (u.pathname !== '/_next/image') return url;
    const inner = u.searchParams.get('url');
    if (!inner) return url;
    const path = decodeURIComponent(inner);
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `${ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
  } catch {
    return url;
  }
};
const looksNumeric = (s: string) => {
  if (s.length < 6 || s.length > 400) return false;
  return /[$€£]|\d\s*%|[\d,]+\s*%\s|(?:\d|\))\s*x\s|FLOP|flops|\btrillion\b|\bbillion\b|\bmillion\b|10\s*\^|×\s*10|\d\s*GW\b|\d\s*TW\b|\$\s*\d|over\s+\d|under\s+\d|~\d|\b\d{1,3}(?:,\d{3})+\b|\d+,\d{3}|\b\d{2,4}x\b/i.test(s);
};
async function fetchHtml(path: string): Promise<string> {
  const res = await fetch(`${ORIGIN}${path}`, {
    headers: {
      'User-Agent': 'grading-ai-2027/1.0 (+https://github.com/LessWrong2/grading-ai-2027)',
      Accept: 'text/html,application/xhtml+xml',
    },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return res.text();
}
export async function buildCatalog(): Promise<Catalog> {
  const queued = new Set<string>();
  const queue: string[] = [];
  const enqueue = (path: string) => {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    const p = normalizePath(normalized);
    if (!isHtmlPath(p) || queued.has(p)) return;
    queued.add(p);
    queue.push(p);
  };
  for (const seedPath of INITIAL_PATHS) enqueue(seedPath);
  const pageBodies: { path: string; html: string }[] = [];
  while (queue.length) {
    const batch = queue.splice(0, 8);
    const results = await Promise.all(
      batch.map(async (path) => {
        try {
              const html = await fetchHtml(path);
              return { path, html };
        } catch {
              return null;
        }
      })
    );
    for (const item of results) {
      if (!item) continue;
      pageBodies.push({ path: item.path, html: item.html });
      for (const linkPath of extractLinkedPaths(item.html)) enqueue(linkPath);
    }
  }
  pageBodies.sort((a, b) => a.path.localeCompare(b.path));
  const pages = pageBodies.map((p) => p.path);
  const imageByUrl = new Map<string, ImageChart>();
  const inlineSvgs: InlineSvgChart[] = [];
  const numericKeys = new Set<string>();
  const numericSnippets: NumericSnippet[] = [];
  const htmlTables: HtmlTableData[] = [];
  for (const { path, html } of pageBodies) {
    const $ = cheerio.load(html);
    $('link[rel="preload"][as="image"]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      const url = canonicalImageUrl(resolveUrl(href, path));
      if (!imageByUrl.has(url)) imageByUrl.set(url, { url, label: href, sourcePage: path });
    });
    $('meta[property="og:image"]').each((_, el) => {
      const content = $(el).attr('content');
      if (!content) return;
      const url = canonicalImageUrl(resolveUrl(content, path));
      if (!imageByUrl.has(url)) imageByUrl.set(url, { url, label: 'og:image', sourcePage: path });
    });
    $('img').each((_, el) => {
      const src = $(el).attr('src');
      if (!src) return;
      const url = canonicalImageUrl(resolveUrl(src, path));
      const alt = ($(el).attr('alt') || '').trim();
      if (!imageByUrl.has(url)) imageByUrl.set(url, { url, label: alt || src, sourcePage: path });
    });
    $('img[srcset]').each((_, el) => {
      const ss = $(el).attr('srcset');
      if (!ss) return;
      for (const part of ss.split(',')) {
        const piece = part.trim().split(/\s+/)[0];
        if (!piece) continue;
        const url = canonicalImageUrl(resolveUrl(piece, path));
        if (!imageByUrl.has(url)) imageByUrl.set(url, { url, label: 'srcset', sourcePage: path });
      }
    });
    $('svg').each((idx, el) => {
      const $svg = $(el);
      const width = ($svg.attr('width') || '').trim() || '—';
      const height = ($svg.attr('height') || '').trim() || '—';
      const pathCount = $svg.find('path').length;
      if (pathCount === 0 && !$svg.find('line, polyline, rect, circle, text').length) return;
      inlineSvgs.push({
        id: `${path}#svg-${idx + 1}`,
        sourcePage: path,
        width,
        height,
        pathCount,
      });
    });
    const bodyClone = $('body').clone();
    bodyClone.find('script, style, noscript').remove();
    const rawText = bodyClone.text().replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
    const chunks = rawText.split(/(?<=[.!?])\s+/);
    for (const chunk of chunks) {
      const t = chunk.trim();
      if (!looksNumeric(t)) continue;
      const key = `${path}::${t}`;
      if (numericKeys.has(key)) continue;
      numericKeys.add(key);
      numericSnippets.push({ sourcePage: path, text: t });
    }
    $('table').each((_, table) => {
      const $table = $(table);
      const headers: string[] = [];
      $table.find('tr').first().find('th,td').each((__, cell) => {
        headers.push($(cell).text().replace(/\s+/g, ' ').trim());
      });
      const rows: string[][] = [];
      $table.find('tr').each((ri, tr) => {
        if (ri === 0 && $(tr).find('th').length) return;
        const row: string[] = [];
        $(tr)
          .find('td,th')
          .each((__, cell) => {
            row.push($(cell).text().replace(/\s+/g, ' ').trim());
          });
        if (row.length) rows.push(row);
      });
      if (headers.length && rows.length) htmlTables.push({ sourcePage: path, headers, rows });
    });
  }
  const imageCharts = [...imageByUrl.values()].sort((a, b) => a.url.localeCompare(b.url));
  inlineSvgs.sort((a, b) => a.id.localeCompare(b.id));
  numericSnippets.sort((a_1, b_1) => a_1.sourcePage.localeCompare(b_1.sourcePage) || a_1.text.localeCompare(b_1.text));
  htmlTables.sort((a_2, b_2) => a_2.sourcePage.localeCompare(b_2.sourcePage));
  return {
    fetchedAt: new Date().toISOString(),
    pages,
    imageCharts,
    inlineSvgs,
    numericSnippets,
    htmlTables,
  };
}
