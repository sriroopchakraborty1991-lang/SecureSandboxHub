import React from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {createMcpServer, getMcpOverview, listMcpServers, runMcpScan, type McpOverview, type McpServer} from '../services/api';

export default function McpServersPage() {
  const nav = useNavigate();
  const [servers, setServers] = React.useState<McpServer[]>([]);
  const [overview, setOverview] = React.useState<McpOverview | null>(null);
  const [name, setName] = React.useState('');
  const [environment, setEnvironment] = React.useState<McpServer['environment']>('local');
  const [endpoint, setEndpoint] = React.useState('');
  const [authType, setAuthType] = React.useState<McpServer['authType']>('none');
  const [authToken, setAuthToken] = React.useState('');
  const [ownerTag, setOwnerTag] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const refresh = React.useCallback(async () => {
    const [s, o] = await Promise.all([listMcpServers(), getMcpOverview()]);
    setServers(s);
    setOverview(o);
  }, []);

  React.useEffect(() => {
    refresh().catch((e) => setError(String((e as any)?.message ?? e)));
  }, [refresh]);

  return (
    <div className="stack">
      <div>
        <div style={{fontSize: 20, fontWeight: 800}}>MCP Security Testing</div>
        <div className="muted">Register MCP servers, import tools, run scans, and download reports (JSON + PDF).</div>
      </div>

      <div className="card">
        <div className="stack">
          <div className="row" style={{justifyContent: 'space-between'}}>
            <div style={{fontWeight: 700}}>Scan reports</div>
            <div className="muted">recent: {overview?.recentScans?.length ?? 0}</div>
          </div>

          {!overview ? (
            <div className="muted">Loading…</div>
          ) : overview.recentScans.length === 0 ? (
            <div className="muted">No scans yet. Import tools for a server, then run a scan.</div>
          ) : (
            <div className="stack">
              {overview.recentScans.slice(0, 8).map((s) => (
                <div key={s.id} className="row" style={{justifyContent: 'space-between', alignItems: 'center'}}>
                  <Link to={`/mcp/scans/${s.id}`} className="mono">
                    {s.id}
                  </Link>
                  <div className="row">
                    <span className="badge">{String((s.summary as any)?.level ?? 'unknown')}</span>
                    <Link className="btn" to={`/mcp/scans/${s.id}`}>
                      View / PDF
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="stack">
          <div className="row" style={{justifyContent: 'space-between'}}>
            <div style={{fontWeight: 700}}>Registered servers</div>
            <div className="muted">count: {servers.length}</div>
          </div>

          {servers.length === 0 ? (
            <div className="stack">
              <div className="muted">No MCP servers yet.</div>
              <div className="muted" style={{fontSize: 13}}>
                Create a server below, then click Open → import tools → Run scan to generate the report.
              </div>
            </div>
          ) : (
            <div className="stack">
              {servers.map((s) => (
                <div key={s.id} className="card" style={{padding: 12}}>
                  <div className="row" style={{justifyContent: 'space-between', alignItems: 'flex-start'}}>
                    <div className="stack" style={{gap: 4}}>
                      <Link to={`/mcp/servers/${s.id}`} style={{fontWeight: 800}}>
                        {s.name}
                      </Link>
                      <div className="muted mono" style={{fontSize: 13}}>
                        {s.id}
                      </div>
                      <div className="muted" style={{fontSize: 13}}>
                        env: <span className="badge">{s.environment}</span> · auth: <span className="badge">{s.authType}</span>
                      </div>
                      <div className="row" style={{marginTop: 6}}>
                        <Link className="btn secondary" to={`/mcp/servers/${s.id}`}>
                          Open
                        </Link>
                        <button
                          className="btn"
                          onClick={async () => {
                            setLoading(true);
                            setError(null);
                            try {
                              const res = await runMcpScan(s.id);
                              nav(`/mcp/scans/${res.scan.id}`);
                            } catch (e: any) {
                              setError(String(e?.message ?? e));
                            } finally {
                              setLoading(false);
                            }
                          }}
                        >
                          Run scan
                        </button>
                      </div>
                    </div>
                    <div className="stack" style={{gap: 6, alignItems: 'flex-end'}}>
                      <div className="muted" style={{fontSize: 13}}>
                        endpoint:
                      </div>
                      <div className="mono" style={{maxWidth: 420, wordBreak: 'break-word', textAlign: 'right'}}>
                        {s.endpoint}
                      </div>
                      {s.ownerTag ? <span className="badge">owner:{s.ownerTag}</span> : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="stack">
          <div style={{fontWeight: 700}}>Add MCP server</div>

          <div className="row">
            <input className="input" style={{flex: 1}} value={name} onChange={(e) => setName(e.target.value)} placeholder="Server name" />
            <select className="input" style={{maxWidth: 160}} value={environment} onChange={(e) => setEnvironment(e.target.value as any)}>
              <option value="local">local</option>
              <option value="dev">dev</option>
              <option value="staging">staging</option>
              <option value="prod">prod</option>
            </select>
          </div>

          <div>
            <div className="muted" style={{fontSize: 13}}>
              Endpoint (URL or command descriptor)
            </div>
            <input className="input" value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="http://localhost:..." />
          </div>

          <div className="row">
            <select className="input" style={{maxWidth: 160}} value={authType} onChange={(e) => setAuthType(e.target.value as any)}>
              <option value="none">auth:none</option>
              <option value="token">auth:token</option>
            </select>
            {authType === 'token' ? (
              <input className="input" style={{flex: 1}} value={authToken} onChange={(e) => setAuthToken(e.target.value)} placeholder="Token (stored locally)" />
            ) : null}
          </div>

          <input className="input" value={ownerTag} onChange={(e) => setOwnerTag(e.target.value)} placeholder="Owner tag (optional)" />

          {error ? <div style={{color: '#b91c1c'}}>{error}</div> : null}

          <div className="row">
            <button
              className="btn"
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                setError(null);
                try {
                  await createMcpServer({
                    name: name.trim() || 'Untitled MCP Server',
                    environment,
                    endpoint: endpoint.trim() || 'unknown',
                    authType,
                    authToken: authType === 'token' ? authToken : null,
                    ownerTag: ownerTag.trim() || null
                  });
                  setName('');
                  setEndpoint('');
                  setAuthToken('');
                  setOwnerTag('');
                  await refresh();
                } catch (e: any) {
                  setError(String(e?.message ?? e));
                } finally {
                  setLoading(false);
                }
              }}
            >
              {loading ? 'Saving…' : 'Save'}
            </button>
            <button className="btn secondary" onClick={() => refresh()}>
              Refresh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
