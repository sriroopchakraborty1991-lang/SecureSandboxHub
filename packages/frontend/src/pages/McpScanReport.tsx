import React from 'react';
import {Link, useParams} from 'react-router-dom';
import {getMcpScan, type McpFinding, type McpScan} from '../services/api';

function fmtTs(ts: number): string {
  return new Date(ts).toLocaleString();
}

function sevColor(sev: string): string {
  if (sev === 'high') return '#b91c1c';
  if (sev === 'medium') return '#b45309';
  return '#0f172a';
}

export default function McpScanReportPage() {
  const params = useParams();
  const scanId = params.id!;

  const [scan, setScan] = React.useState<McpScan | null>(null);
  const [findings, setFindings] = React.useState<McpFinding[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    const res = await getMcpScan(scanId);
    setScan(res.scan);
    setFindings(res.findings);
  }, [scanId]);

  React.useEffect(() => {
    refresh().catch((e) => setError(String((e as any)?.message ?? e)));
  }, [refresh]);

  const summary = (scan?.summary ?? {}) as any;

  return (
    <div className="stack">
      <div className="row" style={{justifyContent: 'space-between'}}>
        <div className="stack" style={{gap: 4}}>
          <Link to="/mcp" className="muted">
            ← Back
          </Link>
          <div style={{fontSize: 20, fontWeight: 800}}>MCP Scan Report</div>
          <div className="muted mono" style={{fontSize: 13}}>
            {scanId}
          </div>
        </div>
        <div className="row">
          <button
            className="btn secondary"
            disabled={!scan}
            onClick={() => {
              if (!scan) return;
              const payload = JSON.stringify({scan, findings}, null, 2);
              const blob = new Blob([payload], {type: 'application/json'});
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `mcp-findings-${scanId}.json`;
              a.click();
              setTimeout(() => URL.revokeObjectURL(url), 0);
            }}
          >
            Download findings.json
          </button>
          <button className="btn" onClick={() => window.print()}>
            Print / Save PDF
          </button>
        </div>
      </div>

      {error ? <div style={{color: '#b91c1c'}}>{error}</div> : null}

      <div className="row" style={{alignItems: 'stretch'}}>
        <div className="card" style={{flex: 1}}>
          <div className="stack">
            <div style={{fontWeight: 700}}>Summary</div>
            <div className="row">
              <span className="badge">level:{String(summary.level ?? 'unknown')}</span>
              <span className="badge">score:{String(summary.score ?? '-')}</span>
              <span className="badge">tools:{String(summary.toolCount ?? '-')}</span>
              <span className="badge">findings:{String(summary.findingCount ?? '-')}</span>
            </div>
            {scan ? <div className="muted">created: {fmtTs(scan.createdAt)}</div> : null}
            {summary.hasBaseline ? <div className="muted">baseline: enabled (drift checks active)</div> : <div className="muted">baseline: none (first scan)</div>}
          </div>
        </div>

        <div className="card" style={{flex: 1}}>
          <div className="stack">
            <div style={{fontWeight: 700}}>Severity breakdown</div>
            <div className="row">
              <span className="badge">high:{String(summary.severityCounts?.high ?? 0)}</span>
              <span className="badge">medium:{String(summary.severityCounts?.medium ?? 0)}</span>
              <span className="badge">low:{String(summary.severityCounts?.low ?? 0)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="stack">
          <div className="row" style={{justifyContent: 'space-between'}}>
            <div style={{fontWeight: 700}}>Findings</div>
            <div className="muted">count: {findings.length}</div>
          </div>

          {findings.length === 0 ? (
            <div className="muted">No findings.</div>
          ) : (
            <div className="stack" style={{gap: 12}}>
              {findings.map((f) => (
                <div key={f.id} className="card" style={{padding: 12, borderColor: '#e2e8f0'}}>
                  <div className="row" style={{justifyContent: 'space-between'}}>
                    <div className="row" style={{gap: 10}}>
                      <span className="badge" style={{borderColor: sevColor(f.severity), color: sevColor(f.severity)}}>
                        {f.severity}
                      </span>
                      <span className="badge">{f.category}</span>
                      {f.toolName ? <span className="badge">tool:{f.toolName}</span> : null}
                    </div>
                    <span className="muted" style={{fontSize: 12}}>
                      {fmtTs(f.createdAt)}
                    </span>
                  </div>
                  <div style={{marginTop: 8, fontWeight: 800}}>{f.title}</div>
                  {f.recommendation ? <div className="muted" style={{marginTop: 6}}>{f.recommendation}</div> : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
