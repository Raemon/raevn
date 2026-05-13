import { buildCatalog } from '@/lib/ai2027/catalog';
const HomePage = async () => {
  const c = await buildCatalog();
  const clip = (s: string, n: number) => (s.length <= n ? s : `${s.slice(0, n)}…`);
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 1100, margin: '0 auto', padding: '1rem' }}>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>ai-2027.com — public charts & numbers</h1>
      <p style={{ fontSize: 13, color: '#444' }}>
        Crawled {c.pages.length} HTML pages from {c.fetchedAt}. Source:{' '}
        <a href="https://ai-2027.com">ai-2027.com</a>
      </p>
      <h2 style={{ fontSize: '1.05rem', marginTop: '1.25rem' }}>Raster / image figures ({c.imageCharts.length})</h2>
      <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '4px 8px 4px 0' }}>URL</th>
            <th style={{ textAlign: 'left', padding: '4px 8px' }}>Label</th>
            <th style={{ textAlign: 'left', padding: '4px 8px' }}>Page</th>
          </tr>
        </thead>
        <tbody>
          {c.imageCharts.map((row) => (
            <tr key={row.url}>
              <td style={{ padding: '4px 8px 4px 0', verticalAlign: 'top' }}>
                <a href={row.url}>{clip(row.url.replace(/^https:\/\/ai-2027\.com/, ''), 72)}</a>
              </td>
              <td style={{ padding: '4px 8px', verticalAlign: 'top' }}>{clip(row.label, 80)}</td>
              <td style={{ padding: '4px 8px', verticalAlign: 'top' }}>{row.sourcePage}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2 style={{ fontSize: '1.05rem', marginTop: '1.25rem' }}>Inline SVG graphics ({c.inlineSvgs.length})</h2>
      <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '4px 8px 4px 0' }}>Id</th>
            <th style={{ textAlign: 'left', padding: '4px 8px' }}>Page</th>
            <th style={{ textAlign: 'left', padding: '4px 8px' }}>Size</th>
            <th style={{ textAlign: 'left', padding: '4px 8px' }}>&lt;path&gt; count</th>
          </tr>
        </thead>
        <tbody>
          {c.inlineSvgs.map((row) => (
            <tr key={row.id}>
              <td style={{ padding: '4px 8px 4px 0', verticalAlign: 'top', fontFamily: 'monospace', fontSize: 12 }}>
                {row.id}
              </td>
              <td style={{ padding: '4px 8px', verticalAlign: 'top' }}>{row.sourcePage}</td>
              <td style={{ padding: '4px 8px', verticalAlign: 'top' }}>
                {row.width}×{row.height}
              </td>
              <td style={{ padding: '4px 8px', verticalAlign: 'top' }}>{row.pathCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2 style={{ fontSize: '1.05rem', marginTop: '1.25rem' }}>Numeric sentences ({c.numericSnippets.length})</h2>
      <p style={{ fontSize: 12, color: '#555' }}>Heuristic extraction of sentences mentioning money, units, FLOP, percentages, etc.</p>
      <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '4px 8px 4px 0' }}>Page</th>
            <th style={{ textAlign: 'left', padding: '4px 8px' }}>Snippet</th>
          </tr>
        </thead>
        <tbody>
          {c.numericSnippets.map((row, i) => (
            <tr key={`${row.sourcePage}-${i}`}>
              <td style={{ padding: '4px 8px 4px 0', verticalAlign: 'top', whiteSpace: 'nowrap' }}>{row.sourcePage}</td>
              <td style={{ padding: '4px 8px', verticalAlign: 'top' }}>{row.text}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2 style={{ fontSize: '1.05rem', marginTop: '1.25rem' }}>HTML tables ({c.htmlTables.length})</h2>
      {c.htmlTables.map((tbl, ti) => (
        <section key={`${tbl.sourcePage}-${ti}`} style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: 13, marginBottom: 4 }}>{tbl.sourcePage}</div>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {tbl.headers.map((h, hi) => (
                  <th key={hi} style={{ textAlign: 'left', padding: '4px 8px 4px 0' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tbl.rows.map((r, ri) => (
                <tr key={ri}>
                  {r.map((cell, ci) => (
                    <td key={ci} style={{ padding: '4px 8px 4px 0', verticalAlign: 'top' }}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </main>
  );
};
export default HomePage;
