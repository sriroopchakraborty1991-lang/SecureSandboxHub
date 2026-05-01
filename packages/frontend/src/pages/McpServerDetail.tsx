import React from 'react';
import {Link, useNavigate, useParams} from 'react-router-dom';
import {getMcpServer, importMcpTools, runMcpScan, type McpScan, type McpTool} from '../services/api';

export default function McpServerDetailPage() {
  const params = useParams();
  const nav = useNavigate();
  const serverId = params.id!;

  const [server, setServer] = React.useState<any | null>(null);
  const [tools, setTools] = React.useState<McpTool[]>([]);
  const [scans, setScans] = React.useState<McpScan[]>([]);
  const [manifestText, setManifestText] = React.useState(
    JSON.stringify(
      {
        tools: [
          {name: 'exampleTool', description: 'Describe what it does', inputSchema: {type: 'object', properties: {path: {type: 'string'}}}}
        ]
      },
      null,
      2
    )
  );
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const refresh = React.useCallback(async () => {
    const res = await getMcpServer(serverId);
    setServer(res.server);
    setTools(res.tools);
    setScans(res.scans);
  }, [serverId]);

  React.useEffect(() => {
    refresh().catch((e) => setError(String((e as any)?.message ?? e)));
  }, [refresh]);

  return (
    <div className="stack">
      <div className="row" style={{justifyContent: 'space-between'}}>
        <div className="stack" style={{gap: 4}}>
          <Link to="/mcp" className="muted">
            ← Back
          </Link>
          <div style={{fontSize: 20, fontWeight: 800}}>{server?.name ?? 'MCP Server'}</div>
          <div className="muted mono" style={{fontSize: 13}}>
            {serverId}
          </div>
        </div>
        <div className="row">
          <button className="btn secondary" onClick={() => refresh()}>
            Refresh
          </button>
          <button
            className="btn"
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              setError(null);
              try {
                const res = await runMcpScan(serverId);
                nav(`/mcp/scans/${res.scan.id}`);
              } catch (e: any) {
                setError(String(e?.message ?? e));
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? 'Scanning…' : 'Run scan'}
          </button>
        </div>
      </div>

      {error ? <div style={{color: '#b91c1c'}}>{error}</div> : null}

      <div className="row" style={{alignItems: 'stretch'}}>
        <div className="card" style={{flex: 1, minWidth: 520}}>
          <div className="stack">
            <div style={{fontWeight: 700}}>Import tools (manifest)</div>
            <div className="muted" style={{fontSize: 13}}>
              Paste JSON with shape: <span className="mono">{`{ "tools": [ { "name": "...", "description": "...", "inputSchema": {...} } ] }`}</span>
            </div>
            <textarea className="input mono" style={{minHeight: 220}} value={manifestText} onChange={(e) => setManifestText(e.target.value)} />
            <div className="row">
              <button
                className="btn"
                onClick={async () => {
                  setLoading(true);
                  setError(null);
                  try {
                    const parsed = JSON.parse(manifestText);
                    await importMcpTools(serverId, parsed);
                    await refresh();
                  } catch (e: any) {
                    setError(String(e?.message ?? e));
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                Import
              </button>
            </div>
          </div>
        </div>

        <div className="card" style={{flex: 1, minWidth: 520}}>
          <div className="stack">
            <div className="row" style={{justifyContent: 'space-between'}}>
              <div style={{fontWeight: 700}}>Tools</div>
              <div className="muted">count: {tools.length}</div>
            </div>

            {tools.length === 0 ? (
              <div className="muted">No tools imported yet.</div>
            ) : (
              <div className="stack" style={{gap: 10}}>
                {tools.map((t) => (
                  <div key={t.id} style={{borderBottom: '1px solid #e2e8f0', paddingBottom: 10}}>
                    <div className="row" style={{justifyContent: 'space-between'}}>
                      <div style={{fontWeight: 800}}>{t.name}</div>
                      <span className="badge">{t.toolHash.slice(0, 8)}…</span>
                    </div>
                    {t.description ? <div className="muted" style={{marginTop: 6}}>{t.description}</div> : <div className="muted">No description</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="stack">
          <div className="row" style={{justifyContent: 'space-between'}}>
            <div style={{fontWeight: 700}}>Recent scans</div>
            <div className="muted">showing {Math.min(10, scans.length)}</div>
          </div>

          {scans.length === 0 ? (
            <div className="muted">No scans yet.</div>
          ) : (
            <div className="stack">
              {scans.slice(0, 10).map((s) => (
                <div key={s.id} className="card" style={{padding: 12}}>
                  <div className="row" style={{justifyContent: 'space-between'}}>
                    <Link to={`/mcp/scans/${s.id}`} className="mono">
                      {s.id}
                    </Link>
                    <div className="row">
                      <span className="badge">{String((s.summary as any)?.level ?? 'unknown')}</span>
                      <span className="badge">score:{String((s.summary as any)?.score ?? '-') }</span>
                    </div>
                  </div>
                  <div className="muted" style={{fontSize: 13, marginTop: 6}}>
                    {new Date(s.createdAt).toLocaleString()} · tools:{String((s.summary as any)?.toolCount ?? '-') } · findings:{String((s.summary as any)?.findingCount ?? '-') }
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

