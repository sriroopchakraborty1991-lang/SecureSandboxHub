import React from 'react';
import {Link} from 'react-router-dom';
import {monitoringAlerts, monitoringHistory, monitoringSessions, monitoringStreamUrl, type MonitoringSession, type Sandbox, type SandboxEvent} from '../services/api';

function fmtTs(ts: number): string {
  return new Date(ts).toLocaleString();
}

function fmtBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)}GiB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)}MiB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)}KiB`;
  return `${bytes}B`;
}

export default function MonitoringPage() {
  const [sessions, setSessions] = React.useState<MonitoringSession[]>([]);
  const [alerts, setAlerts] = React.useState<SandboxEvent[]>([]);
  const [history, setHistory] = React.useState<Sandbox[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const refreshSidePanels = React.useCallback(async () => {
    const [a, h] = await Promise.all([monitoringAlerts(50), monitoringHistory(50)]);
    setAlerts(a);
    setHistory(h);
  }, []);

  const refreshSessionsOnce = React.useCallback(async () => {
    const s = await monitoringSessions();
    setSessions(s);
  }, []);

  React.useEffect(() => {
    refreshSessionsOnce().catch((e) => setError(String((e as any)?.message ?? e)));
    refreshSidePanels().catch((e) => setError(String((e as any)?.message ?? e)));
  }, [refreshSessionsOnce, refreshSidePanels]);

  React.useEffect(() => {
    const es = new EventSource(monitoringStreamUrl());
    es.addEventListener('monitoring_snapshot', (msg: any) => {
      try {
        const data = JSON.parse(msg.data) as {sessions: MonitoringSession[]};
        setSessions(data.sessions);
      } catch {}
    });
    es.onerror = () => {};
    return () => es.close();
  }, []);

  React.useEffect(() => {
    const t = setInterval(() => {
      refreshSidePanels().catch(() => {});
    }, 10000);
    return () => clearInterval(t);
  }, [refreshSidePanels]);

  const activeCount = sessions.length;

  return (
    <div className="stack">
      <div className="row" style={{justifyContent: 'space-between'}}>
        <div>
          <div style={{fontSize: 20, fontWeight: 800}}>Monitoring</div>
          <div className="muted">Active sessions, live resource usage, alerts, and history.</div>
        </div>
        <div className="row">
          <span className="badge">active:{activeCount}</span>
          <button
            className="btn secondary"
            onClick={() => {
              setError(null);
              refreshSessionsOnce().catch((e) => setError(String((e as any)?.message ?? e)));
              refreshSidePanels().catch((e) => setError(String((e as any)?.message ?? e)));
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      {error ? <div style={{color: '#b91c1c'}}>{error}</div> : null}

      <div className="row" style={{alignItems: 'stretch'}}>
        <div className="card" style={{flex: 2, minWidth: 520}}>
          <div className="stack">
            <div className="row" style={{justifyContent: 'space-between'}}>
              <div style={{fontWeight: 700}}>Active Sessions</div>
              <div className="muted">Updates every ~5s</div>
            </div>

            {sessions.length === 0 ? (
              <div className="muted">No active sessions.</div>
            ) : (
              <div className="stack" style={{gap: 10}}>
                {sessions.map((s) => {
                  const cpu = s.stats ? `${s.stats.cpuPercent.toFixed(1)}%` : '—';
                  const mem = s.stats ? `${fmtBytes(s.stats.memoryBytes)} / ${fmtBytes(s.stats.memoryLimitBytes || 0)}` : '—';
                  const memPct =
                    s.stats && s.stats.memoryLimitBytes
                      ? `${((s.stats.memoryBytes / s.stats.memoryLimitBytes) * 100).toFixed(1)}%`
                      : null;

                  return (
                    <div key={s.sandboxId} className="card" style={{padding: 12}}>
                      <div className="row" style={{justifyContent: 'space-between', alignItems: 'flex-start'}}>
                        <div className="stack" style={{gap: 4}}>
                          <Link to={`/sandboxes/${s.sandboxId}`} style={{fontWeight: 800}}>
                            {s.sandboxId}
                          </Link>
                          <div className="muted" style={{fontSize: 13}}>
                            image: <span className="mono">{s.image}</span>
                          </div>
                          <div className="muted" style={{fontSize: 13}}>
                            policy: <span className="mono">{s.policyName}</span>
                          </div>
                          <div className="muted" style={{fontSize: 13}}>
                            started: {fmtTs(s.createdAt)}
                          </div>
                        </div>

                        <div className="stack" style={{gap: 6, alignItems: 'flex-end'}}>
                          <div className="row">
                            <span className="badge">cpu:{cpu}</span>
                            <span className="badge">
                              mem:{mem}
                              {memPct ? ` (${memPct})` : ''}
                            </span>
                          </div>
                          {s.warnings.length ? <div className="muted">warnings: {s.warnings.join(', ')}</div> : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="stack" style={{flex: 1, minWidth: 340}}>
          <div className="card">
            <div className="stack">
              <div className="row" style={{justifyContent: 'space-between'}}>
                <div style={{fontWeight: 700}}>Alerts</div>
                <div className="muted">Last {alerts.length}</div>
              </div>

              {alerts.length === 0 ? (
                <div className="muted">No alerts.</div>
              ) : (
                <div className="stack" style={{gap: 10}}>
                  {alerts.slice(0, 10).map((a) => (
                    <div key={a.id} style={{borderBottom: '1px solid #e2e8f0', paddingBottom: 8}}>
                      <div className="row" style={{justifyContent: 'space-between'}}>
                        <Link to={`/sandboxes/${a.sandboxId}`} className="mono">
                          {a.sandboxId.slice(0, 8)}…
                        </Link>
                        <span className="muted" style={{fontSize: 12}}>
                          {fmtTs(a.ts)}
                        </span>
                      </div>
                      <div className="mono" style={{marginTop: 6}}>
                        {a.message}
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
                <div style={{fontWeight: 700}}>Session History</div>
                <div className="muted">Last {history.length}</div>
              </div>

              {history.length === 0 ? (
                <div className="muted">No sessions yet.</div>
              ) : (
                <div className="stack" style={{gap: 10}}>
                  {history.slice(0, 10).map((h) => (
                    <div key={h.id} style={{borderBottom: '1px solid #e2e8f0', paddingBottom: 8}}>
                      <div className="row" style={{justifyContent: 'space-between'}}>
                        <Link to={`/sandboxes/${h.id}`} className="mono">
                          {h.id.slice(0, 8)}…
                        </Link>
                        <span className="badge">{h.status}</span>
                      </div>
                      <div className="muted" style={{fontSize: 13, marginTop: 6}}>
                        {fmtTs(h.createdAt)} · <span className="mono">{h.image}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

