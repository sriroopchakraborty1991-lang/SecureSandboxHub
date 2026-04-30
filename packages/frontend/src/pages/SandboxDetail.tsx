import React from 'react';
import {Link, useParams} from 'react-router-dom';
import {
  getSandbox,
  listEvents,
  listPolicies,
  sandboxEventsStreamUrl,
  stopSandbox,
  threatAnalysis,
  type Policy,
  type Sandbox,
  type SandboxEvent,
  type ThreatAnalysis
} from '../services/api';

function formatTs(ts: number): string {
  return new Date(ts).toLocaleString();
}

export default function SandboxDetailPage() {
  const params = useParams();
  const sandboxId = params.id!;

  const [sandbox, setSandbox] = React.useState<Sandbox | null>(null);
  const [policies, setPolicies] = React.useState<Policy[]>([]);
  const [events, setEvents] = React.useState<SandboxEvent[]>([]);
  const [analysis, setAnalysis] = React.useState<ThreatAnalysis | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const refresh = React.useCallback(async () => {
    const [s, ev, ps] = await Promise.all([getSandbox(sandboxId), listEvents(sandboxId), listPolicies()]);
    setSandbox(s);
    setEvents(ev);
    setPolicies(ps);
  }, [sandboxId]);

  React.useEffect(() => {
    refresh().catch((e) => setError(String((e as any)?.message ?? e)));
  }, [refresh]);

  React.useEffect(() => {
    const url = sandboxEventsStreamUrl(sandboxId);
    const es = new EventSource(url);
    es.addEventListener('sandbox_event', (msg: any) => {
      try {
        const ev = JSON.parse(msg.data) as SandboxEvent;
        setEvents((prev) => {
          const next = prev.concat(ev);
          return next.length > 500 ? next.slice(next.length - 500) : next;
        });
      } catch {}
    });
    es.onerror = () => {};
    return () => es.close();
  }, [sandboxId]);

  const policy = sandbox ? policies.find((p) => p.id === sandbox.policyId) : null;

  const dockerRun = React.useMemo(() => {
    if (!sandbox || !policy) return null;
    const args: string[] = ['docker run --rm'];
    args.push(policy.rules.allowNetwork ? '--network bridge' : '--network none');
    args.push(`--memory ${policy.rules.memoryLimitMb}m`);
    args.push(`--cpus ${policy.rules.cpuLimit}`);
    if (policy.rules.readOnlyRootFs) args.push('--read-only');
    args.push(sandbox.image);
    if (sandbox.command?.length) args.push(...sandbox.command);
    return args.join(' ');
  }, [sandbox, policy]);

  return (
    <div className="stack">
      <div className="row" style={{justifyContent: 'space-between'}}>
        <div className="stack" style={{gap: 4}}>
          <div className="row" style={{gap: 10}}>
            <Link to="/sandboxes" className="muted">
              ← Back
            </Link>
            <div style={{fontSize: 18, fontWeight: 800}}>Sandbox</div>
            <span className="badge">{sandbox?.status ?? 'loading'}</span>
          </div>
          <div className="muted mono" style={{fontSize: 13}}>
            {sandboxId}
          </div>
        </div>
        <div className="row">
          <button
            className="btn secondary"
            onClick={() => {
              refresh().catch((e) => setError(String((e as any)?.message ?? e)));
            }}
          >
            Refresh
          </button>
          <button
            className="btn danger"
            disabled={!sandbox || sandbox.status !== 'running'}
            onClick={async () => {
              if (!sandbox) return;
              setLoading(true);
              setError(null);
              try {
                const s = await stopSandbox(sandbox.id);
                setSandbox(s);
              } catch (e: any) {
                setError(String(e?.message ?? e));
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? 'Stopping…' : 'Stop'}
          </button>
        </div>
      </div>

      {error ? <div style={{color: '#b91c1c'}}>{error}</div> : null}

      <div className="row" style={{alignItems: 'stretch'}}>
        <div className="card" style={{flex: 1}}>
          <div className="stack">
            <div style={{fontWeight: 700}}>Info</div>
            {sandbox ? (
              <>
                <div>
                  <div className="muted" style={{fontSize: 13}}>
                    Image
                  </div>
                  <div className="mono">{sandbox.image}</div>
                </div>
                <div>
                  <div className="muted" style={{fontSize: 13}}>
                    Policy
                  </div>
                  <div className="mono">{sandbox.policyId}</div>
                </div>
                <div>
                  <div className="muted" style={{fontSize: 13}}>
                    Created
                  </div>
                  <div>{formatTs(sandbox.createdAt)}</div>
                </div>
              </>
            ) : (
              <div className="muted">Loading…</div>
            )}
          </div>
        </div>

        <div className="card" style={{flex: 1}}>
          <div className="stack">
            <div style={{fontWeight: 700}}>Risk Score</div>
            <button
              className="btn"
              disabled={!sandbox}
              onClick={async () => {
                if (!sandbox) return;
                setError(null);
                try {
                  const a = await threatAnalysis(sandbox.id);
                  setAnalysis(a);
                } catch (e: any) {
                  setError(String(e?.message ?? e));
                }
              }}
            >
              Run analysis
            </button>
            {analysis ? (
              <div className="stack" style={{gap: 8}}>
                <div className="row">
                  <span className="badge">score:{analysis.score}</span>
                  <span className="badge">level:{analysis.level}</span>
                </div>
                <div className="stack" style={{gap: 6}}>
                  {analysis.reasons.map((r) => (
                    <div key={r} className="muted">
                      {r}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="muted">No analysis yet.</div>
            )}
          </div>
        </div>
      </div>

      {dockerRun ? (
        <div className="card">
          <div className="stack">
            <div style={{fontWeight: 700}}>Reproduce locally</div>
            <div className="mono" style={{whiteSpace: 'pre-wrap'}}>
              {dockerRun}
            </div>
          </div>
        </div>
      ) : null}

      <div className="card">
        <div className="stack">
          <div className="row" style={{justifyContent: 'space-between'}}>
            <div style={{fontWeight: 700}}>Live events</div>
            <div className="muted">Showing last {events.length} events</div>
          </div>
          <div className="stack" style={{gap: 8}}>
            {events.length === 0 ? (
              <div className="muted">No events yet.</div>
            ) : (
              events
                .slice()
                .reverse()
                .map((e) => (
                  <div key={e.id} style={{borderBottom: '1px solid #e2e8f0', paddingBottom: 8}}>
                    <div className="row" style={{justifyContent: 'space-between'}}>
                      <span className="badge">{e.type}</span>
                      <span className="muted" style={{fontSize: 12}}>
                        {formatTs(e.ts)}
                      </span>
                    </div>
                    <div className="mono" style={{whiteSpace: 'pre-wrap', marginTop: 6}}>
                      {e.message}
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

